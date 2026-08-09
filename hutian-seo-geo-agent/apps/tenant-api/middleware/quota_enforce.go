// Package middleware — 配额执行中间件（T9.3 ADR-open-api 5.5 D3）
//
// 把声明式的 plan_quotas + usage_meters 第一次运行化。
//
// 核心算法：先递增后读回（防空窗口首调竞态）
//
//	BEGIN
//	① INSERT INTO usage_meters (...) VALUES (...,count=1)
//	     ON DUPLICATE KEY UPDATE count = count + 1     ← 原子递增+行锁串行化
//	     （行不存在时 INSERT 创建并锁；行存在时 ON DUPLICATE KEY 获取排他锁，并发串行化）
//	② SELECT count FROM usage_meters ... FOR UPDATE    ← 读回递增后的值，锁行到事务结束
//	③ SELECT limit_per_window, overage_policy FROM plan_quotas
//	④ IF limit >= 0 AND count > limit:                  ← 注意是 >（已递增）
//	     overage_policy=reject  → UPDATE count=count-1（递减，不消耗配额）→ 429
//	     overage_policy=degrade → 同 reject（MVP，T9.7 再细化降级响应）→ 429
//	     overage_policy=allow   → 放行（已递增，保留用量）
//	⑤ ELSE: COMMIT 放行
//	COMMIT
//
// 为什么不用"先查 FOR UPDATE 再递增"：
//
//	FOR UPDATE 锁不住"不存在的行"。两个并发首调同一 tenant+meter+window（行还不存在）时，
//	SELECT FOR UPDATE 都读到"无行"、都通过检查、都递增——READ COMMITTED 下静默超额，
//	REPEATABLE READ 下可能 gap-lock 死锁。"先递增后读回"与隔离级别无关，始终正确。
//
// fail-closed：DB 不可用 / 事务失败 → 503（绝不 fail-open 放行）
// 超额 → 429（客户端不重试）；配额服务故障 → 503（客户端可重试）
//
// 退配额策略（ADR 5.5 开放问题，显式决策）：
//
//	① 配额超额被 reject → 递减回去（不消耗配额，请求未到工具层）
//	② 配额通过但工具调用失败 → 不退（ADR 倾向，记为 failed 调用；预扣已 commit，不回滚）
//	理由：reject 是"拒绝服务"不应消耗配额；工具失败是"已服务但失败"消耗了资源
package middleware

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"hutian-tenant-api/models"
)

// QuotaEnforce 配额执行中间件
// meterKind 按端点注入（route→meter_kind 显式映射在 main.go 路由注册处）：
//
//	diagnose       → seo_audits
//	schema/check   → seo_audits
//	sitemap/submit → seo_audits
//
// 必须挂在 ApiKeyContext 之后（依赖 MustTenantID）
func QuotaEnforce(db *gorm.DB, meterKind models.MeterKind) gin.HandlerFunc {
	return func(c *gin.Context) {
		tenantID := MustTenantID(c)
		windowStart := currentMonthStart()

		tx := db.Begin()
		if tx.Error != nil {
			failClosedQuota(c, "quota service unavailable (begin tx)")
			return
		}
		committed := false
		defer func() {
			if !committed {
				tx.Rollback()
			}
			if r := recover(); r != nil {
				panic(r)
			}
		}()

		// ① 原子递增：INSERT ... ON DUPLICATE KEY UPDATE count = count + 1
		//    行不存在时 INSERT 创建（count=1）并获取行锁；
		//    行存在时 ON DUPLICATE KEY 获取排他锁后递增。
		//    并发请求在此串行化（InnoDB 唯一键冲突时等持行锁），与隔离级别无关。
		if err := tx.Exec(`
			INSERT INTO usage_meters (tenant_id, meter_kind, window_start, count, created_at, updated_at, deleted_at)
			VALUES (?, ?, ?, 1, NOW(), NOW(), NULL)
			ON DUPLICATE KEY UPDATE count = count + 1, updated_at = NOW(), deleted_at = NULL
		`, tenantID, meterKind, windowStart).Error; err != nil {
			failClosedQuota(c, "quota increment failed")
			return
		}

		// ② FOR UPDATE 读回递增后的值（锁行到 COMMIT，防后续并发在 check 间隙插入）
		// T9.7 修复：GORM v2 的 gorm:query_option 不生效（DryRun 实测 SQL 不含 FOR UPDATE），
		// 改用 clause.Locking{Strength:"UPDATE"}。配额是"先递增后读回"型，正确性靠 ① 的
		// INSERT ON DUPLICATE KEY UPDATE 原子递增兜底，FOR UPDATE 是冗余保险，但失效写法
		// 一并改掉消除认知负担（与 admin.go/portal.go 席位两处一致）。
		var meter models.UsageMeter
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("tenant_id = ? AND meter_kind = ? AND window_start = ?",
				tenantID, meterKind, windowStart).
			First(&meter).Error; err != nil {
			failClosedQuota(c, "quota read-back failed")
			return
		}

		// ③ 查租户订阅 + 配额
		var sub models.Subscription
		if err := tx.Where("tenant_id = ?", tenantID).First(&sub).Error; err != nil {
			failClosedQuota(c, "subscription not found for tenant")
			return
		}

		var quota models.PlanQuota
		err := tx.Where("plan = ? AND meter_kind = ?", sub.Plan, meterKind).First(&quota).Error
		if err != nil {
			// 查不到配额 → 该 plan 未配置此 meter 的限制 → 无限制放行（已递增，保留用量）
			// 产品决策：缺席=无限（宁可多服务不可打断），但 0006 seed 写全配额是配套护栏
			tx.Commit()
			committed = true
			c.Next()
			return
		}

		// ④ 判断超额（注意 count 已递增，用 > 而非 >=；limit=-1 表示无限）
		if quota.LimitPerWindow >= 0 && meter.Count > quota.LimitPerWindow {
			policy := quota.OveragePolicy
			switch policy {
			case models.OverageAllow:
				// allow 策略：超额仍放行（已递增，保留用量）
				tx.Commit()
				committed = true
				c.Next()
				return
			default:
				// reject / degrade（MVP degrade 当 reject）
				// 递减回去：被拒绝的请求不消耗配额（未到工具层，未提供服务）
				tx.Model(&meter).UpdateColumn("count", gorm.Expr("count - 1"))
				tx.Commit()
				committed = true
				c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
					"error":        "quota exceeded",
					"meter":        string(meterKind),
					"limit":        quota.LimitPerWindow,
					"current":      meter.Count - 1, // 递减后的值
					"window_start": windowStart.Format(time.RFC3339),
					"policy":       string(policy),
				})
				return
			}
		}

		// ⑤ 放行（配额未超 or limit=-1 无限）
		tx.Commit()
		committed = true
		c.Next()
	}
}

// failClosedQuota 配额服务故障时拒绝请求（绝不放行）
// 用 503 而非 429：配额服务故障是"服务端问题"（客户端可重试），
// 不是"请求过多"（客户端不应重试）
func failClosedQuota(c *gin.Context, reason string) {
	c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
		"error":  "quota enforcement failed (fail-closed)",
		"reason": reason,
	})
}

// currentMonthStart 返回当月 1 号 00:00:00（本地时区，与 DSN loc=Local 对齐）
// usage_meters 按 window_start=月首 聚合，window_kind=month
func currentMonthStart() time.Time {
	now := time.Now()
	return time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
}
