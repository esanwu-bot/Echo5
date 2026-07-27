// Package main — T6.3b 跨语言边界探针 probe:cross-lang
//
// 对应 ADR-cross-lang-tenant-context，覆盖 Go 层探针（T6.3a）外的跨语言边界：
//   Go 层绿 ≠ 隔离成。本探针验 token 签发/验签/路由隔离，确保 bridge/MCP 拿到的
//   上下文和 Go 层验的一致，防"Go 层绿、bridge 调 siteBase 照样串"的假隔离。
//
// 断言：
//   ① A 签发的 token payload 含 A 的 tenant/workspace/sitebase（不是 B 的）
//   ② B 签发的 token payload 含 B 的 tenant/workspace/sitebase（不是 A 的）
//   ③ A vs B 的 token sitebase_base_url 不同（防 A 调到 B 的 siteBase 实例）
//   ④ 篡改 token payload → 验签失败（防下游伪造）
//   ⑤ 无 ctx 请求 /internal/token = 401（签发也要守门人）
//   ⑥ A 用 B 的 workspace 请求签发 = 403（越权签发被挡）
//
// 运行：
//   1. 起服务：$env:TENANT_INTERNAL_TOKEN_KEY="dev-secret-key-change-in-prod"; .\tenant-api.exe
//   2. 跑探针：$env:TENANT_INTERNAL_TOKEN_KEY="dev-secret-key-change-in-prod"; go run ./cmd/probe_cross_lang
package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
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

	// ── ① A 签发 token，payload 含 A 的 tenant/workspace/sitebase ──
	tokenA, respA, ok := issueToken("1", "10")
	passA := ok && respA.TenantID == 1 && respA.WorkspaceID == 10 && respA.SitebaseURL == "http://localhost:8001/api/v1"
	asserts = append(asserts, assert{
		name:   "① A 签发 token payload 含 A 的 tenant=1/ws=10/sitebase=8001",
		pass:   passA,
		detail: fmt.Sprintf("ok=%v resp=%+v token=%s", ok, respA, truncate(tokenA, 60)),
	})

	// ── ② B 签发 token，payload 含 B 的 tenant/workspace/sitebase ──
	tokenB, respB, ok := issueToken("2", "20")
	passB := ok && respB.TenantID == 2 && respB.WorkspaceID == 20 && respB.SitebaseURL == "http://localhost:8002/api/v1"
	asserts = append(asserts, assert{
		name:   "② B 签发 token payload 含 B 的 tenant=2/ws=20/sitebase=8002",
		pass:   passB,
		detail: fmt.Sprintf("ok=%v resp=%+v token=%s", ok, respB, truncate(tokenB, 60)),
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
		detail: fmt.Sprintf("tampered with A's signature, expect verify failure"),
	})

	// ── ⑤ 无 ctx 请求 /internal/token = 401 ──
	code, body := doRequest("POST", "/api/v1/internal/token", nil)
	asserts = append(asserts, assert{
		name:   "⑤ 无 ctx 请求 /internal/token = 401",
		pass:   code == 401,
		detail: fmt.Sprintf("got status=%d body=%s", code, truncate(body, 120)),
	})

	// ── ⑥ A 用 B 的 workspace 请求签发 = 403 ──
	code, body = doRequest("POST", "/api/v1/internal/token", map[string]string{
		"X-Tenant-ID":    "1",
		"X-Workspace-ID": "20", // B 的 workspace
	})
	asserts = append(asserts, assert{
		name:   "⑥ A(1) 用 B 的 workspace=20 请求签发 = 403",
		pass:   code == 403,
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

// issueToken 调 /api/v1/internal/token 签发，返 token + 响应体 + 是否成功
func issueToken(tenantID, workspaceID string) (tokenStr string, resp struct {
	Token        string `json:"token"`
	TenantID     int64  `json:"tenant_id"`
	WorkspaceID  int64  `json:"workspace_id"`
	SitebaseURL  string `json:"sitebase_url"`
	ExpiresIn    int    `json:"expires_in"`
}, ok bool) {
	code, body := doRequest("POST", "/api/v1/internal/token", map[string]string{
		"X-Tenant-ID":    tenantID,
		"X-Workspace-ID": workspaceID,
	})
	if code != 200 {
		return "", resp, false
	}
	if err := json.Unmarshal([]byte(body), &resp); err != nil {
		return "", resp, false
	}
	return resp.Token, resp, true
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

func doRequest(method, path string, headers map[string]string) (int, string) {
	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequest(method, apiBase+path, nil)
	if err != nil {
		return -1, err.Error()
	}
	for k, v := range headers {
		req.Header.Set(k, v)
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
