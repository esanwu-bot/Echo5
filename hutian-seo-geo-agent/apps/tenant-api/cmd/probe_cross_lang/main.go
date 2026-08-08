// Package main — T6.3b 跨语言边界探针 probe:cross-lang
//
// 对应 ADR-cross-lang-tenant-context，覆盖 Go 层探针（T6.3a）外的跨语言边界：
//   Go 层绿 ≠ 隔离成。本探针验 token 签发/验签/路由隔离，确保 bridge/MCP 拿到的
//   上下文和 Go 层验的一致，防"Go 层绿、bridge 调 siteBase 照样串"的假隔离。
//
// P0-1 终态（尾巴一）：签发链统一走 portal JWT 版本 GET /portal/api/v1/internal/token，
// 旧端点 POST /api/v1/internal/token（X-Tenant-ID/X-Workspace-ID 明文自报 header）已删除。
// 本探针相应改走真实登录链：portal login → httpOnly cookie → GET 签发端点。
//
// 断言：
//   ① A 经 portal JWT 链签发的 token payload 含 A 的 tenant/workspace/sitebase（不是 B 的）
//   ② B 经 portal JWT 链签发的 token payload 含 B 的 tenant/workspace/sitebase（不是 A 的）
//   ③ A vs B 的 token sitebase_base_url 不同（防 A 调到 B 的 siteBase 实例）
//   ④ 篡改 token payload → 验签失败（防下游伪造）
//   ⑤ 无 cookie 请求 /portal/api/v1/internal/token = 401（签发也要守门人）
//   ⑥ 旧端点 POST /api/v1/internal/token 已删除 = 404（明文 header 自报签发路径物理消灭）
//
// 运行：
//   1. 起服务：verify.ps1（或手动配 TENANT_INTERNAL_TOKEN_KEY/TENANT_JWT_KEY）
//   2. 跑探针：$env:TENANT_INTERNAL_TOKEN_KEY="dev-secret-key-change-in-prod"; go run ./cmd/probe_cross_lang
package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/cookiejar"
	"os"
	"strings"
	"time"

	"hutian-tenant-api/token"
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

	// ── ① A 经 portal JWT 链签发 token，payload 含 A 的 tenant/workspace/sitebase ──
	tokenA, respA, okA := issueTokenViaPortal("owner-a@hutian.dev", "tenant-a", "ws-a")
	passA := okA && respA.TenantID == 1 && respA.WorkspaceID == 10 && respA.SitebaseURL == "http://localhost:8001/api/v1"
	asserts = append(asserts, assert{
		name:   "① A 经 portal JWT 链签发 token payload 含 A 的 tenant=1/ws=10/sitebase=8001",
		pass:   passA,
		detail: fmt.Sprintf("ok=%v resp=%+v token=%s", okA, respA, truncate(tokenA, 60)),
	})

	// ── ② B 经 portal JWT 链签发 token，payload 含 B 的 tenant/workspace/sitebase ──
	tokenB, respB, okB := issueTokenViaPortal("admin-b@hutian.dev", "tenant-b", "ws-b")
	passB := okB && respB.TenantID == 2 && respB.WorkspaceID == 20 && respB.SitebaseURL == "http://localhost:8002/api/v1"
	asserts = append(asserts, assert{
		name:   "② B 经 portal JWT 链签发 token payload 含 B 的 tenant=2/ws=20/sitebase=8002",
		pass:   passB,
		detail: fmt.Sprintf("ok=%v resp=%+v token=%s", okB, respB, truncate(tokenB, 60)),
	})

	// ── ③ A vs B 的 token sitebase_base_url 不同（路由隔离）──
	passC := passA && passB && respA.SitebaseURL != respB.SitebaseURL
	asserts = append(asserts, assert{
		name:   "③ A vs B 的 sitebase_base_url 不同（防 A 调到 B 的 siteBase 实例）",
		pass:   passC,
		detail: fmt.Sprintf("A=%s B=%s", respA.SitebaseURL, respB.SitebaseURL),
	})

	// ── ④ 篡改 token payload → 验签失败 ──
	// 用 Go Verifier 验签（模拟下游 bridge/MCP 的验签逻辑）
	// 篡改：把 A 的 token payload 解出，改 tenant_id=2（B 的），重编码，用原签名 → 验签应失败
	passD := false
	if tokenA != "" {
		verifier, err := token.NewVerifier()
		if err != nil {
			passD = false
		} else {
			// 先验原 token OK
			pOrig, err := verifier.Verify(tokenA)
			if err != nil {
				passD = false
			} else if pOrig.TenantID != 1 {
				passD = false
			} else {
				// 篡改：构造假 token（A payload 改 tenant_id=2 + 原 A 签名）
				tampered := tamperTokenTenant(tokenA, 2)
				_, errTampered := verifier.Verify(tampered)
				// 验签应失败
				if errTampered != nil && strings.Contains(errTampered.Error(), "signature verification failed") {
					passD = true
				}
			}
		}
	}
	asserts = append(asserts, assert{
		name:   "④ 篡改 token payload tenant_id → 验签失败",
		pass:   passD,
		detail: "tampered with A's signature, expect verify failure",
	})

	// ── ⑤ 无 cookie 请求 /portal/api/v1/internal/token = 401 ──
	code, body := rawPortalGet("")
	asserts = append(asserts, assert{
		name:   "⑤ 无 cookie 请求 /portal/api/v1/internal/token = 401（签发也要守门人）",
		pass:   code == 401,
		detail: fmt.Sprintf("got status=%d body=%s", code, truncate(body, 120)),
	})

	// ── ⑥ 旧端点 POST /api/v1/internal/token 已删除 = 404 ──
	// 终态确认：明文自报 header（X-Tenant-ID/X-Workspace-ID）的签发路径物理消灭，
	// 带不带 X-Internal-Secret 都应该是 404（路由不存在），而不是 200/401
	code, body = doRequest("POST", "/api/v1/internal/token")
	asserts = append(asserts, assert{
		name:   "⑥ 旧端点 POST /api/v1/internal/token 已删除 = 404（明文 header 自报路径消灭）",
		pass:   code == 404,
		detail: fmt.Sprintf("got status=%d body=%s", code, truncate(body, 120)),
	})

	// ── 汇总 ──
	passed := 0
	failed := 0
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
	fmt.Printf("\nprobe:cross-lang: %d/%d passed\n", passed, passed+failed)
	if failed > 0 {
		os.Exit(1)
	}
}

type issueResp struct {
	Token       string `json:"token"`
	TenantID    int64  `json:"tenant_id"`
	WorkspaceID int64  `json:"workspace_id"`
	SitebaseURL string `json:"sitebase_url"`
	ExpiresIn   int    `json:"expires_in"`
}

// issueTokenViaPortal 走真实登录链：portal login → httpOnly cookie → GET /portal/api/v1/internal/token
// 签发端点不接受任何 tenant/workspace 参数，身份只从 JWT claims 解——A 只能签出 A 的 token
func issueTokenViaPortal(email, tenantSlug, workspaceSlug string) (string, issueResp, bool) {
	var empty issueResp
	jar, err := cookiejar.New(nil)
	if err != nil {
		return "", empty, false
	}
	client := &http.Client{Timeout: 6 * time.Second, Jar: jar}

	// 登录（M5：响应不含明文 token，身份落 httpOnly cookie）
	payload := map[string]string{
		"email":          email,
		"password":       "dev-password-change-in-prod",
		"tenant_slug":    tenantSlug,
		"workspace_slug": workspaceSlug,
	}
	b, _ := json.Marshal(payload)
	resp, err := client.Post(apiBase+"/portal/api/v1/auth/login", "application/json", bytes.NewReader(b))
	if err != nil {
		return "", empty, false
	}
	loginBody, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if resp.StatusCode != 200 {
		log.Printf("[setup] login %s failed: status=%d body=%s", email, resp.StatusCode, truncate(string(loginBody), 160))
		return "", empty, false
	}

	// 带 cookie 签发（GET 豁免 CSRF 头，cookie 由 jar 自动携带）
	code, body := portalGet(client)
	if code != 200 {
		log.Printf("[setup] issue token %s failed: status=%d body=%s", email, code, truncate(body, 160))
		return "", empty, false
	}
	var r struct {
		Data issueResp `json:"data"`
	}
	if err := json.Unmarshal([]byte(body), &r); err != nil {
		return "", empty, false
	}
	return r.Data.Token, r.Data, true
}

// portalGet 带 cookiejar 调 GET /portal/api/v1/internal/token
func portalGet(client *http.Client) (int, string) {
	req, err := http.NewRequest("GET", apiBase+"/portal/api/v1/internal/token", nil)
	if err != nil {
		return -1, err.Error()
	}
	resp, err := client.Do(req)
	if err != nil {
		return -1, err.Error()
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, string(body)
}

// rawPortalGet 不带任何认证调 GET /portal/api/v1/internal/token（cookie 参数留空占位）
func rawPortalGet(_ string) (int, string) {
	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequest("GET", apiBase+"/portal/api/v1/internal/token", nil)
	if err != nil {
		return -1, err.Error()
	}
	resp, err := client.Do(req)
	if err != nil {
		return -1, err.Error()
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, string(body)
}

// tamperTokenTenant 篡改 token 的 payload tenant_id（不动签名），用于验签测试
// payload 是 base64url(JSON)，解出改 tenant_id 再编码，签名保留原样
func tamperTokenTenant(tok string, newTenantID int64) string {
	parts := strings.Split(tok, ".")
	if len(parts) != 2 {
		return tok
	}
	payloadB64 := parts[0]
	sig := parts[1]

	payloadJSON, err := base64.RawURLEncoding.DecodeString(payloadB64)
	if err != nil {
		return tok
	}
	var p map[string]interface{}
	if err := json.Unmarshal(payloadJSON, &p); err != nil {
		return tok
	}
	p["tenant_id"] = newTenantID
	tamperedJSON, _ := json.Marshal(p)
	tamperedB64 := base64.RawURLEncoding.EncodeToString(tamperedJSON)
	return tamperedB64 + "." + sig
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

// doRequest 裸请求（不带 tenant ctx、不带服务密钥）——用于验旧端点已删除（404）
func doRequest(method, path string) (int, string) {
	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequest(method, apiBase+path, nil)
	if err != nil {
		return -1, err.Error()
	}
	resp, err := client.Do(req)
	if err != nil {
		return -1, err.Error()
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, string(body)
}

func truncate(s string, n int) string {
	s = strings.ReplaceAll(s, "\n", " ")
	if len(s) > n {
		return s[:n] + "..."
	}
	return s
}
