// Package middleware — 平台 admin 鉴权中间件（与租户中间件双轨）
//
// 接缝设计（admin 后台接入）：
//   - 业务路由 /api/v1/* 挂 TenantContext（强制 X-Tenant-ID，租户内隔离）
//   - 平台路由 /admin/api/v1/* 挂 AdminContext（强制 X-Admin-Token，跨租户查）
//   - 两条路物理隔离：admin 不带 tenant_id，租户 token 进不了 admin 路由
//
// 鉴权方式：长期 super-admin token（env TENANT_ADMIN_TOKEN）
//   - 与租户内部 HMAC token（5min 过期）物理隔离，admin token 长期有效
//   - 恒定时间比较防时序攻击
//   - env 未配 → admin 路由全 401（NFR-T01 红线：admin 不得裸奔）
//
// 球门：admin 后台可跨租户 CRUD（用 RawRepo），但必须先过 token 验证
package middleware

import (
	"crypto/subtle"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// 上下文键
const (
	CtxAdminAuthenticated = "ctx.admin_authenticated"
	CtxAdminActor         = "ctx.admin_actor" // admin 操作人（用于审计 actor_kind=human）
)

// AdminContext 平台 admin 鉴权中间件
// 从 X-Admin-Token 头读 token，与 cfg.AdminToken 恒定时间比较
// 缺/错 → 401；通过 → 注入 CtxAdminAuthenticated，handler 可用 RawRepo 跨租户查
func AdminContext(expectedToken string) gin.HandlerFunc {
	return func(c *gin.Context) {
		got := c.GetHeader("X-Admin-Token")
		if expectedToken == "" {
			// env 未配 admin token — admin 路由全 401（NFR-T01 红线），
			// 让前端统一走 401 清 token + 跳登录，避免 503 被吞掉无反馈。
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":  "admin disabled",
				"reason": "TENANT_ADMIN_TOKEN env not configured",
			})
			return
		}
		if got == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":  "admin token required",
				"reason": "missing X-Admin-Token header",
			})
			return
		}
		// 恒定时间比较防时序攻击
		if subtle.ConstantTimeCompare([]byte(got), []byte(expectedToken)) != 1 {
			log.Printf("[admin-auth] token mismatch: got len=%d, expected len=%d", len(got), len(expectedToken))
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":  "admin token invalid",
				"reason": "token mismatch",
			})
			return
		}
		c.Set(CtxAdminAuthenticated, true)
		// admin 操作人（审计用，默认 super-admin，后续接 SSO 时从 token 解）
		c.Set(CtxAdminActor, "super-admin")
		c.Next()
	}
}

// RequireAdmin 业务路由用：强制要求已通过 AdminContext
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, ok := c.Get(CtxAdminAuthenticated); !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "no admin context — route requires AdminContext middleware",
			})
			return
		}
		c.Next()
	}
}

// MustAdminActor 从 context 取 admin 操作人（审计 actor 用）
func MustAdminActor(c *gin.Context) string {
	if v, exists := c.Get(CtxAdminActor); exists {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return "super-admin"
}
