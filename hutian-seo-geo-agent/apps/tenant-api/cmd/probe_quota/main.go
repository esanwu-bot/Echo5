// Package main — T9.3 配额执行链路探针
//
// 验证 ADR-open-api 5.5（D3 配额执行原子性）：
//  ① 配额拦截（顺序）：seed limit=2 → 1st/2nd 放行(not-429)，3rd 拒绝(429)
//  ② 空窗口并发首调 TOCTOU：删行后 5 并发 → 放行≤2 拒绝≥3
//     （此 case 覆盖"行不存在时 FOR UPDATE 锁不住"的竞态——先递增后读回保证正确）
//  ③ 无配额=无限制：删 plan_quotas → 放行(not-429)
//  ④ OveragePolicy=allow：超额仍放行(429→放行)
//
// 断言策略：quota 通过 = not 429（可能是 200 工具成功 / 503 工具不可达），
// quota 拒绝 = 429。这样探针不依赖 tool-executor 是否在线（CI 鲁棒）。
//
// 依赖：tenant-api 已启动。tool-executor 可选（影响 200 vs 503，不影响 429 判定）。
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"os"
	"sync"
	"sync/atomic"
	"time"

	"gorm.io/gorm"

	"hutian-tenant-api/config"
	"hutian-tenant-api/db"
	"hutian-tenant-api/models"
)

const apiBase = "http://localhost:4318"

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

	// 查 tenant-a 的 ID
	var tenant models.Tenant
	if err := gormDB.Where("slug = ?", "tenant-a").First(&tenant).Error; err != nil {
		log.Fatalf("[fatal] tenant-a not found: %v", err)
	}
	tenantID := tenant.ID
	log.Printf("[setup] tenant-a id=%d", tenantID)

	// 登录创建 API key
	jar, _ := cookiejar.New(nil)
	client := &http.Client{Timeout: 10 * time.Second, Jar: jar}
	if ok, _ := doLogin(client, "owner-a@hutian.dev", "tenant-a", "ws-a"); !ok {
		log.Fatalf("[fatal] login failed")
	}
	log.Println("[setup] login ok")

	nonce := extractNonceCookie(jar)
	_, body := doWrite(client, "POST", "/portal/api/v1/api-keys",
		map[string]string{"name": "probe-quota"}, true, true, nonce)
	apiKey := parseKey(body)
	if apiKey == "" {
		log.Fatalf("[fatal] create api key failed: %s", body)
	}
	log.Printf("[setup] api key created: %s...", apiKey[:20])

	// 确保 tenant-a 的 subscription 是 free plan（探针假设 free）
	var sub models.Subscription
	if err := gormDB.Where("tenant_id = ?", tenantID).First(&sub).Error; err != nil {
		log.Fatalf("[fatal] subscription not found: %v", err)
	}
	if sub.Plan != models.PlanFree {
		// 临时改为 free 用于探针，测完恢复
		origPlan := sub.Plan
		gormDB.Model(&sub).Update("plan", models.PlanFree)
		defer gormDB.Model(&sub).Update("plan", origPlan)
		log.Printf("[setup] tenant-a plan %s → free (临时，测完恢复)", origPlan)
	}

	windowStart := currentMonthStart()
	_ = windowStart // 保留用于未来按窗口精确清理（当前 resetUsage 删全部 seo_audits 行）

	// ── save/restore 原始配额（避免破坏 0006 seed baseline）──
	// 探针会临时覆盖 free+seo_audits 的配额，测完恢复原值（不删 0006 seed 数据）
	origQuota, origQuotaExists := saveQuota(gormDB, models.PlanFree, models.MeterSEOAudits)
	log.Printf("[setup] original quota exists=%v", origQuotaExists)

	// 清掉残留的 seo_audits 用量（硬删，避免软删+唯一索引冲突）
	resetUsage(gormDB, tenantID)
	defer func() {
		resetUsage(gormDB, tenantID)
		// 恢复原始配额（upsert：如果 0006 seed 过，恢复 seed 值；否则删除）
		if origQuotaExists {
			seedQuota(gormDB, models.PlanFree, models.MeterSEOAudits,
				origQuota.LimitPerWindow, origQuota.OveragePolicy)
		} else {
			cleanupQuota(gormDB, models.PlanFree, models.MeterSEOAudits)
		}
		log.Println("[cleanup] usage reset + quota restored")
	}()

	// ── ① 配额拦截（顺序）：limit=2 → 1st/2nd 放行，3rd 429 ──
	seedQuota(gormDB, models.PlanFree, models.MeterSEOAudits, 2, models.OverageReject)
	log.Println("[①] seeded quota: free+seo_audits limit=2 reject")

	code1, _ := doPostBearer(apiKey, "/open/v1/diagnose", map[string]string{"url": "https://example.com"})
	code2, _ := doPostBearer(apiKey, "/open/v1/diagnose", map[string]string{"url": "https://example.com"})
	code3, _ := doPostBearer(apiKey, "/open/v1/diagnose", map[string]string{"url": "https://example.com"})
	pass1 := not429(code1) && not429(code2) && code3 == 429
	asserts = append(asserts, assertion{
		name:   "① 配额拦截：limit=2 → 1st/2nd 放行(not-429)，3rd=429",
		pass:   pass1,
		detail: fmt.Sprintf("code1=%d code2=%d code3=%d (want not-429,not-429,429)", code1, code2, code3),
	})

	// ── ② 空窗口并发首调 TOCTOU：删行后 5 并发 → 放行≤2 拒绝≥3 ──
	//    此 case 覆盖"行不存在时 FOR UPDATE 锁不住"的竞态：
	//    resetUsage 硬删 usage_meters 行，5 个并发请求同时首调（空窗口），
	//    "先递增后读回"保证 INSERT ON DUPLICATE KEY 串行化，不会超额。
	resetUsage(gormDB, tenantID)
	log.Println("[②] hard-deleted usage row (empty window), firing 5 concurrent first-calls...")

	var wg sync.WaitGroup
	var passed int64
	var rejected int64
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			code, _ := doPostBearer(apiKey, "/open/v1/diagnose", map[string]string{"url": "https://example.com"})
			if code == 429 {
				atomic.AddInt64(&rejected, 1)
			} else {
				atomic.AddInt64(&passed, 1)
			}
		}()
	}
	wg.Wait()
	pass2 := passed <= 2 && rejected >= 3
	asserts = append(asserts, assertion{
		name:   "② 空窗口并发首调 TOCTOU：删行后 5 并发 → 放行≤2 拒绝≥3",
		pass:   pass2,
		detail: fmt.Sprintf("passed=%d rejected=%d (want passed<=2, rejected>=3)", passed, rejected),
	})

	// ── ③ 无配额=无限制：删 plan_quotas → 放行 ──
	resetUsage(gormDB, tenantID)
	cleanupQuota(gormDB, models.PlanFree, models.MeterSEOAudits)
	log.Println("[③] removed quota, testing unlimited...")

	code4, _ := doPostBearer(apiKey, "/open/v1/diagnose", map[string]string{"url": "https://example.com"})
	pass3 := not429(code4)
	asserts = append(asserts, assertion{
		name:   "③ 无配额记录=无限制：删 plan_quotas → 放行(not-429)",
		pass:   pass3,
		detail: fmt.Sprintf("code4=%d (want not-429)", code4),
	})

	// ── ④ OveragePolicy=allow：超额仍放行 ──
	resetUsage(gormDB, tenantID)
	seedQuota(gormDB, models.PlanFree, models.MeterSEOAudits, 1, models.OverageAllow)
	log.Println("[④] seeded quota: free+seo_audits limit=1 allow")

	// 第 1 次：count 0→1，放行
	code5, _ := doPostBearer(apiKey, "/open/v1/diagnose", map[string]string{"url": "https://example.com"})
	// 第 2 次：count 1>=1，但 policy=allow → 放行（不 429）
	code6, _ := doPostBearer(apiKey, "/open/v1/diagnose", map[string]string{"url": "https://example.com"})
	pass4 := not429(code5) && not429(code6)
	asserts = append(asserts, assertion{
		name:   "④ OveragePolicy=allow：超额仍放行(2 次都 not-429)",
		pass:   pass4,
		detail: fmt.Sprintf("code5=%d code6=%d (want both not-429)", code5, code6),
	})

	printSummary(asserts)
}

// ── helpers ──

func checkHealth() bool {
	resp, err := http.Get(apiBase + "/healthz")
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == 200
}

func not429(code int) bool { return code != 429 }

func doLogin(client *http.Client, email, tenantSlug, workspaceSlug string) (bool, error) {
	payload := map[string]string{
		"email":          email,
		"password":       "dev-password-change-in-prod",
		"tenant_slug":    tenantSlug,
		"workspace_slug": workspaceSlug,
	}
	b, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", apiBase+"/portal/api/v1/auth/login", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	return resp.StatusCode == 200, nil
}

func doWrite(client *http.Client, method, path string, body map[string]string, withMarker, withNonce bool, nonce string) (int, string) {
	var bodyReader io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		bodyReader = bytes.NewReader(b)
	}
	req, _ := http.NewRequest(method, apiBase+path, bodyReader)
	req.Header.Set("Content-Type", "application/json")
	if withMarker {
		req.Header.Set("X-Hutian-Tenant", "1")
	}
	if withNonce {
		req.Header.Set("X-Hutian-Nonce", nonce)
	}
	resp, err := client.Do(req)
	if err != nil {
		return -1, err.Error()
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, string(b)
}

func doPostBearer(token, path string, body map[string]string) (int, string) {
	b, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", apiBase+path, bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return -1, err.Error()
	}
	defer resp.Body.Close()
	rb, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, string(rb)
}

func extractNonceCookie(jar http.CookieJar) string {
	u, _ := url.Parse(apiBase)
	for _, c := range jar.Cookies(u) {
		if c.Name == "HUTIAN_TENANT_NONCE" {
			return c.Value
		}
	}
	return ""
}

func parseKey(body string) string {
	var r struct {
		Data struct {
			Key string `json:"key"`
		} `json:"data"`
	}
	if err := json.Unmarshal([]byte(body), &r); err != nil {
		return ""
	}
	return r.Data.Key
}

// ── DB helpers ──

// saveQuota 读取当前 plan+meter 的配额（用于 save/restore，避免破坏 0006 seed）
func saveQuota(gormDB *gorm.DB, plan models.Plan, kind models.MeterKind) (models.PlanQuota, bool) {
	var q models.PlanQuota
	err := gormDB.Where("plan = ? AND meter_kind = ?", plan, kind).First(&q).Error
	return q, err == nil
}

// seedQuota 幂等 upsert plan_quotas（free+seo_audits, limit, policy）
func seedQuota(gormDB *gorm.DB, plan models.Plan, kind models.MeterKind, limit int64, policy models.OveragePolicy) {
	quota := models.PlanQuota{
		Plan:          plan,
		MeterKind:     kind,
		LimitPerWindow: limit,
		WindowKind:    models.WindowKindMonth,
		OveragePolicy: policy,
	}
	gormDB.Where("plan = ? AND meter_kind = ?", plan, kind).
		Assign(models.PlanQuota{LimitPerWindow: limit, OveragePolicy: policy, WindowKind: models.WindowKindMonth}).
		FirstOrCreate(&quota)
}

// cleanupQuota 硬删 plan_quotas（用 Unscoped 避免软删残留）
func cleanupQuota(gormDB *gorm.DB, plan models.Plan, kind models.MeterKind) {
	gormDB.Unscoped().Where("plan = ? AND meter_kind = ?", plan, kind).Delete(&models.PlanQuota{})
}

// resetUsage 硬删 usage_meters（tenant+seo_audits 当月窗口）
// 必须硬删：软删后唯一索引仍冲突，INSERT IGNORE 不创建新行，FOR UPDATE 查不到
func resetUsage(gormDB *gorm.DB, tenantID int64) {
	gormDB.Unscoped().
		Where("tenant_id = ? AND meter_kind = ?", tenantID, models.MeterSEOAudits).
		Delete(&models.UsageMeter{})
}

// currentMonthStart 当月 1 号 00:00:00（与 quota_enforce.go 对齐）
func currentMonthStart() time.Time {
	now := time.Now()
	return time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
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
	fmt.Printf("\nprobe:quota: %d/%d passed\n", passed, passed+failed)
	if failed > 0 {
		os.Exit(1)
	}
}
