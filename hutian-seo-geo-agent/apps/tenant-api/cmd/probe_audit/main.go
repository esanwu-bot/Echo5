// Package main — T9.6 开放 API 审计探针
//
// 验证 ADR-open-api 5.7：开放 API 每次调用都记审计
//
//	① 成功 diagnose → audit_logs 有 action=open_api.diagnose 行
//	② 该行 actor_kind == "agent"（API 调用是非人类系统，ADR"不动枚举"用现有 agent）
//	③ 该行 meta_json.access_kind == "api"
//	④ 该行 meta_json.api_key_id == 当前 key id（三元 tenant/workspace 由 admin 过滤保证匹配）
//	⑤ 成功 schema_check → audit_logs 有 action=open_api.schema_check 行
//	⑥ 失败 diagnose（400 缺 url）→ audit_logs 也有审计行且 meta.status == 400（失败也审）
//
// 验证方式：纯 HTTP。调开放 API 端点产生审计，再用 admin 端点
// GET /admin/api/v1/audit-logs?action=open_api.&actor_kind=agent&tenant_id=&workspace_id= 查回验。
// 用 meta_json.api_key_id 精确匹配本次探针新建 key 产生的行（与其它探针的 key 隔离）。
//
// 依赖：tenant-api 已启动（admin token + 开放 API 都通）
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
	"time"
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

// auditMeta 审计行 meta_json 解析结构
type auditMeta struct {
	AccessKind string `json:"access_kind"`
	ApiKeyID   int64  `json:"api_key_id"`
	Status     int    `json:"status"`
}

// auditRow 审计行（只取断言需要的字段）
type auditRow struct {
	ActorKind string `json:"actor_kind"`
	Action    string `json:"action"`
	MetaJSON  string `json:"meta_json"`
	Meta      auditMeta
}

func main() {
	log.SetFlags(0)
	var asserts []assertion

	if !checkHealth() {
		log.Fatalf("[fatal] tenant-api not reachable at %s", apiBase)
	}
	log.Println("[setup] tenant-api reachable")

	// 前面探针（rate-limit/ownership）可能打满限流桶，等窗口重置
	log.Println("[setup] waiting for rate-limit window reset...")
	sleepToNextMinute()

	// 登录 tenant-a 建 API key
	jar, _ := cookiejar.New(nil)
	client := &http.Client{Timeout: 10 * time.Second, Jar: jar}
	if ok, _ := doLogin(client, "owner-a@hutian.dev", "tenant-a", "ws-a"); !ok {
		log.Fatalf("[fatal] login failed")
	}
	log.Println("[setup] login ok (tenant-a)")
	nonce := extractNonceCookie(jar)
	_, body := doWrite(client, "POST", "/portal/api/v1/api-keys",
		map[string]string{"name": "probe-audit"}, true, true, nonce)
	apiKey := parseKey(body)
	if apiKey == "" {
		log.Fatalf("[fatal] create api key failed: %s", body)
	}
	log.Printf("[setup] api key created: %s...", apiKey[:20])

	// 用 whoami 拿 api_key_id / tenant_id / workspace_id（whoami 不审，干净）
	whoamiCode, whoamiBody := doGetBearer(apiKey, "/open/v1/whoami")
	if whoamiCode != 200 {
		log.Fatalf("[fatal] whoami failed: %d %s", whoamiCode, whoamiBody)
	}
	myKeyID, myTenantID, myWorkspaceID := parseWhoami(whoamiBody)
	log.Printf("[setup] api_key_id=%d tenant_id=%d workspace_id=%d", myKeyID, myTenantID, myWorkspaceID)

	// ── ① 成功 diagnose ──
	code1, _ := doPostBearer(apiKey, "/open/v1/diagnose",
		map[string]string{"url": "https://example.com"})
	diagAudit := findAuditRow("open_api.diagnose", myKeyID, myTenantID, myWorkspaceID)
	asserts = append(asserts, assertion{
		name:   "① 成功 diagnose → audit_logs 有 action=open_api.diagnose 行",
		pass:   diagAudit != nil && code1 == 200,
		detail: fmt.Sprintf("code=%d audit_found=%v", code1, diagAudit != nil),
	})

	// ── ② actor_kind == agent ──
	actorOK := diagAudit != nil && diagAudit.ActorKind == "agent"
	asserts = append(asserts, assertion{
		name:   "② 审计行 actor_kind == agent",
		pass:   actorOK,
		detail: fmt.Sprintf("actor_kind=%s", actorKindStr(diagAudit)),
	})

	// ── ③ meta_json.access_kind == api ──
	accessOK := diagAudit != nil && diagAudit.Meta.AccessKind == "api"
	asserts = append(asserts, assertion{
		name:   "③ 审计行 meta_json.access_kind == api",
		pass:   accessOK,
		detail: fmt.Sprintf("access_kind=%s", accessKindStr(diagAudit)),
	})

	// ── ④ meta_json.api_key_id 匹配（三元由 admin 过滤保证）──
	keyMatch := diagAudit != nil && diagAudit.Meta.ApiKeyID == myKeyID
	asserts = append(asserts, assertion{
		name:   "④ 审计行 meta_json.api_key_id == 当前 key id（三元由过滤保证）",
		pass:   keyMatch,
		detail: fmt.Sprintf("meta.api_key_id=%d expect=%d match=%v", keyIDOf(diagAudit), myKeyID, keyMatch),
	})

	// ── ⑤ 成功 schema_check 产生审计行 ──
	doPostBearer(apiKey, "/open/v1/schema/check",
		map[string]string{"url": "https://example.com", "expected_type": "Product"})
	schemaAudit := findAuditRow("open_api.schema_check", myKeyID, myTenantID, myWorkspaceID)
	asserts = append(asserts, assertion{
		name:   "⑤ 成功 schema_check → audit_logs 有 action=open_api.schema_check 行",
		pass:   schemaAudit != nil,
		detail: fmt.Sprintf("audit_found=%v", schemaAudit != nil),
	})

	// ── ⑥ 失败 diagnose（400 缺 url）也产生审计行 ──
	code6, _ := doPostBearer(apiKey, "/open/v1/diagnose", map[string]string{})
	failAudit := findAuditRow("open_api.diagnose", myKeyID, myTenantID, myWorkspaceID)
	failStatusOK := failAudit != nil && failAudit.Meta.Status == 400
	asserts = append(asserts, assertion{
		name:   "⑥ 失败 diagnose（400 缺 url）→ 也有审计行 + meta.status==400",
		pass:   code6 == 400 && failStatusOK,
		detail: fmt.Sprintf("code=%d audit_status=%d", code6, statusOf(failAudit)),
	})

	printSummary(asserts)
}

// ── helpers ──

// findAuditRow 用 admin 端点查 audit-logs，找匹配 action + api_key_id 的最新行
// 过滤 actor_kind=agent + tenant_id + workspace_id 保证三元匹配；
// 遍历返回行（created_at DESC）找 meta_json.api_key_id 匹配的
func findAuditRow(action string, myKeyID, tenantID, workspaceID int64) *auditRow {
	path := fmt.Sprintf("/admin/api/v1/audit-logs?action=%s&actor_kind=agent&tenant_id=%d&workspace_id=%d&page=1&page_size=20",
		action, tenantID, workspaceID)
	code, body := doGetAdmin(path)
	if code != 200 {
		log.Printf("[findAuditRow] admin query failed: code=%d body=%s", code, truncate(body, 200))
		return nil
	}
	var resp struct {
		Data  []auditRow `json:"data"`
		Total int64      `json:"total"`
	}
	if err := json.Unmarshal([]byte(body), &resp); err != nil {
		log.Printf("[findAuditRow] unmarshal failed: %v body=%s", err, truncate(body, 200))
		return nil
	}
	for i := range resp.Data {
		var meta auditMeta
		if err := json.Unmarshal([]byte(resp.Data[i].MetaJSON), &meta); err == nil {
			if meta.ApiKeyID == myKeyID {
				resp.Data[i].Meta = meta
				return &resp.Data[i]
			}
		}
	}
	return nil
}

func checkHealth() bool {
	resp, err := http.Get(apiBase + "/healthz")
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == 200
}

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

func doGetBearer(token, path string) (int, string) {
	req, _ := http.NewRequest("GET", apiBase+path, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return -1, err.Error()
	}
	defer resp.Body.Close()
	rb, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, string(rb)
}

// doGetAdmin 用 X-Admin-Token 调 admin 端点
func doGetAdmin(path string) (int, string) {
	req, _ := http.NewRequest("GET", apiBase+path, nil)
	req.Header.Set("X-Admin-Token", adminToken)
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

func parseWhoami(body string) (keyID, tenantID, workspaceID int64) {
	var r struct {
		ApiKeyID    int64 `json:"api_key_id"`
		TenantID    int64 `json:"tenant_id"`
		WorkspaceID int64 `json:"workspace_id"`
	}
	json.Unmarshal([]byte(body), &r)
	return r.ApiKeyID, r.TenantID, r.WorkspaceID
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}

// sleepToNextMinute sleep 到下一个分钟窗口（让限流桶重置）
func sleepToNextMinute() {
	now := time.Now()
	next := now.Truncate(time.Minute).Add(time.Minute)
	dur := time.Until(next)
	if dur <= 0 {
		dur = time.Second
	}
	time.Sleep(dur + 100*time.Millisecond)
}

// ── 断言辅助（处理 nil auditRow 的显示）──

func actorKindStr(r *auditRow) string {
	if r == nil {
		return "<no row>"
	}
	return r.ActorKind
}
func accessKindStr(r *auditRow) string {
	if r == nil {
		return "<no row>"
	}
	return r.Meta.AccessKind
}
func keyIDOf(r *auditRow) int64 {
	if r == nil {
		return -1
	}
	return r.Meta.ApiKeyID
}
func statusOf(r *auditRow) int {
	if r == nil {
		return -1
	}
	return r.Meta.Status
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
	fmt.Printf("\nprobe:audit: %d/%d passed\n", passed, passed+failed)
	if failed > 0 {
		os.Exit(1)
	}
}
