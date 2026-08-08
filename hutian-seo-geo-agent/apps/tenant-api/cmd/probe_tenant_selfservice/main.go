// Package main — T7.4 租户自服务后台正向隔离探针（M5 cookie 认证适配版）
//
// 目标：验证 /portal/api/v1/* 接口族满足以下安全契约：
//   ① 无凭证 / 错误凭证 → 401
//   ② A 租户只能看到 A 的数据（tenant/workspace 边界）
//   ③ B 租户只能看到 B 的数据
//   ④ 凭证接口只返回元信息，绝不暴露 encrypted_secret 等敏感字段
//   ⑤ admin 的 X-Admin-Token 无法进入 portal 路由（物理双轨）
//
// M5 适配（尾巴四）：登录响应不再返回可用 access_token（M5 置空防 XSS 偷 token），
// 身份落在 httpOnly cookie HUTIAN_TENANT_TOKEN。本探针原版用 Authorization: Bearer
// 携带登录返回的 token，M5 后该路径失效（5/13 红）。现改为：
//   - login 返回带 cookiejar 的 client，后续请求 cookie 自动携带
//   - 写请求按 M5 契约补 CSRF 双因子：X-Hutian-Tenant + X-Hutian-Nonce（nonce 从
//     cookie HUTIAN_TENANT_NONCE 取，每次响应后服务端轮换，发前实时提取）
//
// 前置：
//   1. tenant-api 已启动（:4318）
//   2. 已执行 mysql hutian < cmd/probe_tenant_isolation/seed.sql
//   3. 已执行 go run ./cmd/seed_portal_user
//
// 运行：go run ./cmd/probe_tenant_selfservice
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
	"strings"
	"time"
)

const apiBase = "http://localhost:4318"

type assert struct {
	name   string
	pass   bool
	detail string
}

func main() {
	log.SetFlags(0)
	var asserts []assert

	if !checkHealth() {
		log.Fatalf("[fatal] tenant-api not reachable at %s", apiBase)
	}
	log.Println("[setup] tenant-api reachable")

	// ── 登录两租户（M5：身份落 httpOnly cookie，响应无可用明文 token）──
	clientA, errA := login("owner-a@hutian.dev", "tenant-a", "ws-a")
	clientB, errB := login("admin-b@hutian.dev", "tenant-b", "ws-b")
	asserts = append(asserts, assert{
		name:   "① A 租户 owner 登录成功",
		pass:   errA == nil,
		detail: detailErr(errA),
	})
	asserts = append(asserts, assert{
		name:   "② B 租户 admin 登录成功",
		pass:   errB == nil,
		detail: detailErr(errB),
	})

	// 登录失败直接退出，后续断言依赖 cookie
	if errA != nil || errB != nil {
		printSummary(asserts)
		os.Exit(1)
	}

	// ── 鉴权基础 ──
	code, body := portalGet(bareClient(), "/portal/api/v1/me")
	asserts = append(asserts, assert{
		name:   "③ 无凭证访问 /me = 401",
		pass:   code == 401,
		detail: fmt.Sprintf("status=%d body=%s", code, truncate(body, 120)),
	})

	code, body = portalGetWithHeader(bareClient(), "/portal/api/v1/me", "Authorization", "Bearer bad-token")
	asserts = append(asserts, assert{
		name:   "④ 错误 token（Bearer bad-token，无 cookie）访问 /me = 401",
		pass:   code == 401,
		detail: fmt.Sprintf("status=%d body=%s", code, truncate(body, 120)),
	})

	// ── A 租户正向访问（cookie 自动携带）──
	code, body = portalGet(clientA, "/portal/api/v1/me")
	asserts = append(asserts, assert{
		name:   "⑤ A cookie GET /me = 200 且 tenant_id=1",
		pass:   code == 200 && jsonPathInt(body, "data.tenant_id") == 1,
		detail: fmt.Sprintf("status=%d tenant_id=%v", code, jsonPathInt(body, "data.tenant_id")),
	})

	code, body = portalGet(clientA, "/portal/api/v1/workspace")
	asserts = append(asserts, assert{
		name:   "⑥ A cookie GET /workspace = 200 且 id=10",
		pass:   code == 200 && jsonPathInt(body, "data.id") == 10,
		detail: fmt.Sprintf("status=%d workspace_id=%v", code, jsonPathInt(body, "data.id")),
	})

	code, body = portalGet(clientA, "/portal/api/v1/seats")
	asserts = append(asserts, assert{
		name:   "⑦ A cookie GET /seats 只看到 A 的成员",
		pass:   code == 200 && !strings.Contains(body, `"tenant_id":2`),
		detail: fmt.Sprintf("status=%d", code),
	})

	code, body = portalGet(clientA, "/portal/api/v1/subscription")
	asserts = append(asserts, assert{
		name:   "⑧ A cookie GET /subscription = 200",
		pass:   code == 200,
		detail: fmt.Sprintf("status=%d", code),
	})

	// ── B 租户正向访问 ──
	code, body = portalGet(clientB, "/portal/api/v1/me")
	asserts = append(asserts, assert{
		name:   "⑨ B cookie GET /me = 200 且 tenant_id=2",
		pass:   code == 200 && jsonPathInt(body, "data.tenant_id") == 2,
		detail: fmt.Sprintf("status=%d tenant_id=%v", code, jsonPathInt(body, "data.tenant_id")),
	})

	code, body = portalGet(clientB, "/portal/api/v1/workspace")
	asserts = append(asserts, assert{
		name:   "⑩ B cookie GET /workspace = 200 且 id=20",
		pass:   code == 200 && jsonPathInt(body, "data.id") == 20,
		detail: fmt.Sprintf("status=%d workspace_id=%v", code, jsonPathInt(body, "data.id")),
	})

	// ── 写权限：A owner 可 PATCH workspace（M5 CSRF：X-Hutian-Tenant + X-Hutian-Nonce）──
	code, body = portalWrite(clientA, "PATCH", "/portal/api/v1/workspace",
		map[string]string{"brand_name": "A Brand Updated", "industry": "trike", "fallback_copy_json": "{}"})
	asserts = append(asserts, assert{
		name:   "⑪ A owner PATCH /workspace（带 CSRF 双因子）= 200",
		pass:   code == 200,
		detail: fmt.Sprintf("status=%d body=%s", code, truncate(body, 120)),
	})

	// ── 凭证不泄露明文 ──
	code, body = portalGet(clientA, "/portal/api/v1/credentials")
	asserts = append(asserts, assert{
		name:   "⑫ 凭证接口不暴露 encrypted_secret",
		pass:   code == 200 && !strings.Contains(body, "encrypted_secret"),
		detail: fmt.Sprintf("status=%d contains_secret=%v", code, strings.Contains(body, "encrypted_secret")),
	})

	// ── admin token 不能进 portal（双轨隔离）──
	code, body = portalGetWithHeader(bareClient(), "/portal/api/v1/me", "X-Admin-Token", "dev-admin-token-change-in-prod")
	asserts = append(asserts, assert{
		name:   "⑬ admin X-Admin-Token 访问 portal /me = 401",
		pass:   code == 401,
		detail: fmt.Sprintf("status=%d body=%s", code, truncate(body, 120)),
	})

	// ── A 的 cookie 访问 B 的具体资源 = 404（按本 tenant 查不到）──
	// 先拿 B 的 seat id（B 自己列出来）
	_, bSeatsBody := portalGet(clientB, "/portal/api/v1/seats")
	bSeatID := firstSeatID(bSeatsBody)
	if bSeatID > 0 {
		code, body = portalWrite(clientA, "PATCH", fmt.Sprintf("/portal/api/v1/seats/%d", bSeatID),
			map[string]string{"role": "member"})
		asserts = append(asserts, assert{
			name:   "⑭ A cookie 修改 B 的 seat = 404",
			pass:   code == 404,
			detail: fmt.Sprintf("status=%d body=%s", code, truncate(body, 120)),
		})
	}

	printSummary(asserts)
}

// login 走 M5 登录：身份落 httpOnly cookie（HUTIAN_TENANT_TOKEN + HUTIAN_TENANT_NONCE），
// 返回带 cookiejar 的 client，后续请求 cookie 自动携带
func login(email, tenantSlug, workspaceSlug string) (*http.Client, error) {
	jar, err := cookiejar.New(nil)
	if err != nil {
		return nil, err
	}
	client := &http.Client{Timeout: 6 * time.Second, Jar: jar}

	payload := map[string]string{
		"email":          email,
		"password":       "dev-password-change-in-prod",
		"tenant_slug":    tenantSlug,
		"workspace_slug": workspaceSlug,
	}
	b, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", apiBase+"/portal/api/v1/auth/login", bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("status=%d body=%s", resp.StatusCode, truncate(string(body), 200))
	}
	// 确认 httpOnly cookie 已落（没 cookie 后续全 401，提前报清楚）
	hasCookie := false
	for _, c := range resp.Cookies() {
		if c.Name == "HUTIAN_TENANT_TOKEN" && c.Value != "" {
			hasCookie = true
		}
	}
	if !hasCookie {
		return nil, fmt.Errorf("login 200 but no HUTIAN_TENANT_TOKEN cookie set")
	}
	return client, nil
}

// bareClient 无 cookiejar 的裸 client（测无凭证/错误凭证分支）
func bareClient() *http.Client {
	return &http.Client{Timeout: 5 * time.Second}
}

// portalGet cookie 自动携带的 GET
func portalGet(client *http.Client, path string) (int, string) {
	req, _ := http.NewRequest("GET", apiBase+path, nil)
	resp, err := client.Do(req)
	if err != nil {
		return -1, err.Error()
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, string(b)
}

// portalGetWithHeader 带额外 header 的 GET（测 Bearer/X-Admin-Token 分支）
func portalGetWithHeader(client *http.Client, path, headerKey, headerValue string) (int, string) {
	req, _ := http.NewRequest("GET", apiBase+path, nil)
	req.Header.Set(headerKey, headerValue)
	resp, err := client.Do(req)
	if err != nil {
		return -1, err.Error()
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, string(b)
}

// portalWrite 写请求：cookie + M5 CSRF 双因子（X-Hutian-Tenant + X-Hutian-Nonce）
// nonce 从 cookie HUTIAN_TENANT_NONCE 实时提取（服务端每次响应后轮换）
func portalWrite(client *http.Client, method, path string, body map[string]string) (int, string) {
	var bodyReader io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		bodyReader = bytes.NewReader(b)
	}
	req, _ := http.NewRequest(method, apiBase+path, bodyReader)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Hutian-Tenant", "1")
	if nonce := extractNonceCookie(client.Jar); nonce != "" {
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

func extractNonceCookie(jar http.CookieJar) string {
	if jar == nil {
		return ""
	}
	u, _ := url.Parse(apiBase)
	for _, c := range jar.Cookies(u) {
		if c.Name == "HUTIAN_TENANT_NONCE" {
			return c.Value
		}
	}
	return ""
}

func checkHealth() bool {
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get(apiBase + "/healthz")
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == 200
}

func jsonPathInt(body, path string) int64 {
	parts := strings.Split(path, ".")
	var v interface{}
	if err := json.Unmarshal([]byte(body), &v); err != nil {
		return -1
	}
	m, ok := v.(map[string]interface{})
	if !ok {
		return -1
	}
	for i, p := range parts {
		if i == len(parts)-1 {
			switch val := m[p].(type) {
			case float64:
				return int64(val)
			default:
				return -1
			}
		}
		next, ok := m[p].(map[string]interface{})
		if !ok {
			return -1
		}
		m = next
	}
	return -1
}

func firstSeatID(body string) int64 {
	var r struct {
		Data []struct {
			ID int64 `json:"id"`
		} `json:"data"`
	}
	if err := json.Unmarshal([]byte(body), &r); err != nil {
		return 0
	}
	if len(r.Data) == 0 {
		return 0
	}
	return r.Data[0].ID
}

func detailErr(err error) string {
	if err == nil {
		return "ok"
	}
	return err.Error()
}

func printSummary(asserts []assert) {
	passed, failed := 0, 0
	for _, a := range asserts {
		status := "PASS"
		if !a.pass {
			status = "FAIL"
			failed++
		} else {
			passed++
		}
		fmt.Printf("  [%s] %s\n", status, a.name)
		fmt.Printf("         %s\n", a.detail)
	}
	fmt.Printf("\nprobe:tenant-selfservice: %d/%d passed\n", passed, passed+failed)
	if failed > 0 {
		os.Exit(1)
	}
}

func truncate(s string, n int) string {
	s = strings.ReplaceAll(s, "\n", " ")
	if len(s) > n {
		return s[:n] + "..."
	}
	return s
}
