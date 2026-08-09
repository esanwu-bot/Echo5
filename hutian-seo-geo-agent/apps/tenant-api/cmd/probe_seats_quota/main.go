// Package main — T9.7 席位竞态回归探针（ADR 验收表第 8 条）
//
// 补 ADR-open-api 验收表第 8 条"席位竞态回归：seats_limit 并发不超限"。
// T9.3 修复了 admin CreateSeat + portal TenantInviteSeat 的 TOCTOU
// （事务 + FOR UPDATE 锁 subscription 行，Count+Create 同事务），但无并发回归断言。
//
// 策略（连 DB 预置/清理/验证，并发用 HTTP 调 admin CreateSeat，风格同 probe_quota）：
//
//	① 并发 5 个 POST /admin/api/v1/seats（不同 user_id），成功数 == 允许新增数（不多）
//	② 其余返回 409 "seats_limit exceeded"（不少）
//	③ DB 实查 active seats == 原数 + 允许新增数（不超额，TOCTOU 回归核心断言）
//
// 预置：建 5 个临时 user；设 seats_limit = 当前 active 数 + 2（允许新增 2）
// 清理：删探针建的 seats + users，恢复 seats_limit 原值
//
// 依赖：tenant-api 已启动 + admin token + seed（tenant-a subscription 存在）
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
	"sync/atomic"
	"time"

	"gorm.io/gorm"

	"hutian-tenant-api/config"
	"hutian-tenant-api/db"
	"hutian-tenant-api/models"
)

const (
	apiBase    = "http://localhost:4318"
	adminToken = "dev-admin-token-change-in-prod"
)

type assertion struct {
	name   string
	pass   bool
	detail string
}

func main() {
	log.SetFlags(0)
	var asserts []assertion

	if !checkHealth() {
		log.Fatalf("[fatal] tenant-api not reachable at %s", apiBase)
	}
	log.Println("[setup] tenant-api reachable")

	cfg := config.Load()
	gormDB, err := db.Connect(cfg)
	if err != nil {
		log.Fatalf("[fatal] connect db: %v", err)
	}

	// 查 tenant-a
	var tenant models.Tenant
	if err := gormDB.Where("slug = ?", "tenant-a").First(&tenant).Error; err != nil {
		log.Fatalf("[fatal] tenant-a not found: %v", err)
	}
	tenantID := tenant.ID
	log.Printf("[setup] tenant-a id=%d", tenantID)

	// 查 subscription，记原 seats_limit（测后恢复）
	var sub models.Subscription
	if err := gormDB.Where("tenant_id = ?", tenantID).First(&sub).Error; err != nil {
		log.Fatalf("[fatal] subscription not found for tenant-a: %v", err)
	}
	origSeatsLimit := sub.SeatsLimit
	log.Printf("[setup] subscription id=%d orig seats_limit=%d", sub.ID, origSeatsLimit)

	// 查当前 active seats 数（不动原有 seat，避免破坏 seed）
	var origActiveCount int64
	gormDB.Model(&models.Seat{}).
		Where("tenant_id = ? AND status = ?", tenantID, models.SeatStatusActive).
		Count(&origActiveCount)
	log.Printf("[setup] current active seats=%d", origActiveCount)

	// 预置 5 个临时 user（pending，独特 email）
	ts := time.Now().UnixNano()
	emails := make([]string, 5)
	userIDs := make([]int64, 5)
	for i := 0; i < 5; i++ {
		emails[i] = fmt.Sprintf("probe-seat-%d-%d@hutian.dev", ts, i)
		u := models.User{
			Email:        emails[i],
			PasswordHash: "probe-no-login",
			Status:       models.UserStatusPendingInvite,
			DisplayName:  fmt.Sprintf("probe-seat-%d", i),
		}
		if err := gormDB.Create(&u).Error; err != nil {
			log.Fatalf("[fatal] create temp user %d: %v", i, err)
		}
		userIDs[i] = u.ID
	}
	log.Printf("[setup] created 5 temp users: %v", userIDs)

	// defer 兜底清理：保证任何退出路径都恢复 seats_limit + 删临时 user/seat
	// 注意 log.Fatalf/os.Exit 不执行 defer，所以后续 fatal 改用 log.Printf+return
	defer func() {
		cleanup(gormDB, userIDs)
		if err := gormDB.Model(&sub).Update("seats_limit", origSeatsLimit).Error; err != nil {
			log.Printf("[cleanup] WARN: restore seats_limit failed: %v", err)
		} else {
			log.Printf("[cleanup] seats_limit restored to %d", origSeatsLimit)
		}
	}()

	// 设 seats_limit = 当前 active 数 + 2（允许新增 2 个）
	allowNew := 2
	newLimit := int(origActiveCount) + allowNew
	if err := gormDB.Model(&sub).Update("seats_limit", newLimit).Error; err != nil {
		log.Printf("[fatal] set seats_limit=%d: %v", newLimit, err)
		return
	}
	log.Printf("[setup] seats_limit set to %d (orig active=%d, allow new=%d)", newLimit, origActiveCount, allowNew)

	// ── 并发 5 个 CreateSeat（不同 user_id），barrier 让 5 个同一瞬间放行 ──
	var wg sync.WaitGroup
	var successCount, conflictCount, otherCount int64
	results := make([]int, 5) // 每个请求的 status code
	barrier := make(chan struct{})
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func(idx, uid int64) {
			defer wg.Done()
			<-barrier // 等所有 goroutine 就绪，close(barrier) 后同一瞬间放行，最大化并发重叠
			code := doCreateSeat(tenantID, uid)
			incrementCounter(code, &successCount, &conflictCount, &otherCount)
			results[idx] = code
		}(int64(i), userIDs[i])
	}
	close(barrier) // 5 个 goroutine 同一瞬间放行
	wg.Wait()
	log.Printf("[run] concurrent results: %v", results)

	// ── ① 成功数 == allowNew（不多）──
	pass1 := atomic.LoadInt64(&successCount) == int64(allowNew)
	asserts = append(asserts, assertion{
		name:   fmt.Sprintf("① 并发 CreateSeat 成功数 == %d（不多于 seats_limit 允许）", allowNew),
		pass:   pass1,
		detail: fmt.Sprintf("success=%d conflict=%d other=%d", successCount, conflictCount, otherCount),
	})

	// ── ② 其余 409 "seats_limit exceeded"（不少）──
	expectConflict := int64(5 - allowNew)
	pass2 := conflictCount == expectConflict
	asserts = append(asserts, assertion{
		name:   fmt.Sprintf("② 其余返回 409 seats_limit exceeded（== %d）", expectConflict),
		pass:   pass2,
		detail: fmt.Sprintf("conflict=%d expect=%d success=%d other=%d", conflictCount, expectConflict, successCount, otherCount),
	})

	// ── ③ DB 实查 active seats == 原数 + allowNew（不超额，TOCTOU 核心）──
	var finalActiveCount int64
	gormDB.Model(&models.Seat{}).
		Where("tenant_id = ? AND status = ?", tenantID, models.SeatStatusActive).
		Count(&finalActiveCount)
	expectFinal := int64(int(origActiveCount) + allowNew)
	pass3 := finalActiveCount == expectFinal
	asserts = append(asserts, assertion{
		name:   fmt.Sprintf("③ DB active seats == %d（原 %d + 新增 %d，不超额）", expectFinal, origActiveCount, allowNew),
		pass:   pass3,
		detail: fmt.Sprintf("final=%d expect=%d", finalActiveCount, expectFinal),
	})

	// ── 显式清理（printSummary 的 os.Exit 不执行 defer，所以显式清理 + defer 双保险）──
	// defer 保留作 panic 兜底；显式清理保证断言失败 os.Exit 前也清理。
	// 重复执行无害：cleanup 第二次删空集，seats_limit 恢复幂等。
	cleanup(gormDB, userIDs)
	if err := gormDB.Model(&sub).Update("seats_limit", origSeatsLimit).Error; err != nil {
		log.Printf("[cleanup] WARN: restore seats_limit failed: %v", err)
	} else {
		log.Printf("[cleanup] seats_limit restored to %d", origSeatsLimit)
	}

	printSummary(asserts)
	// 清理由 defer 兜底（保证 os.Exit/return 都清理）
}

// incrementCounter 根据 code 递增对应计数器
func incrementCounter(code int, success, conflict, other *int64) {
	switch code {
	case 200, 201:
		atomic.AddInt64(success, 1)
	case 409:
		atomic.AddInt64(conflict, 1)
	default:
		atomic.AddInt64(other, 1)
	}
}

// cleanup 删探针建的 seats（按 userIDs）+ users
func cleanup(gormDB *gorm.DB, userIDs []int64) {
	// 删 seats（Unscoped 硬删，避免软删残留影响后续）
	gormDB.Unscoped().Where("user_id IN ?", userIDs).Delete(&models.Seat{})
	// 删 users
	gormDB.Unscoped().Where("id IN ?", userIDs).Delete(&models.User{})
	log.Printf("[cleanup] deleted %d temp seats/users", len(userIDs))
}

func checkHealth() bool {
	resp, err := http.Get(apiBase + "/healthz")
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == 200
}

// doCreateSeat POST /admin/api/v1/seats（admin token，无 CSRF）
func doCreateSeat(tenantID, userID int64) int {
	body := map[string]int64{"tenant_id": tenantID, "user_id": userID}
	b, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", apiBase+"/admin/api/v1/seats", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Admin-Token", adminToken)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return -1
	}
	defer resp.Body.Close()
	io.ReadAll(resp.Body) // drain
	return resp.StatusCode
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}

func printSummary(asserts []assertion) {
	passed, failed := 0, 0
	for _, a := range asserts {
		if a.pass {
			passed++
			fmt.Printf("  [PASS] %s\n", a.name)
		} else {
			failed++
			fmt.Printf("  [FAIL] %s\n         %s\n", a.name, a.detail)
		}
	}
	fmt.Printf("\nprobe:seats-quota: %d/%d passed\n", passed, passed+failed)
	if failed > 0 {
		os.Exit(1)
	}
}
