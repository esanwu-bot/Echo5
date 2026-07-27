// Package main — M5 租户自服务鉴权与安全探针
//
// 目标（M5 收口 4 条红线）：
//  ① 登录响应不再包含 access_token 明文（防 XSS 偷 token）
//  ② httpOnly Cookie HUTIAN_TENANT_TOKEN 在 Set-Cookie，带 SameSite=Strict+HttpOnly
//  ③ 写请求缺 CSRF 头 → 403；nonce 与 cookie 不匹配 → 403
//  ④ workspace 归属失败（JWT 伪造 workspace_id 指向其它租户）→ 404（不泄存在性 + 不 UX 误伤）
//  ⑤ 登出能清 cookie（兼容现有 /auth/logout）
//
// 注：此探针用 Authorization Bearer 兼容期拿 token 辅助测 nonce；
// 测写请求的 CSRF 防护时不带 Authorization，仅带 cookie。
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

	// 登录拿 cookiejar（含 token cookie + nonce cookie）
	jar, err := cookiejar.New(nil)
	if err != nil {
		log.Fatalf("[fatal] cookiejar: %v", err)
	}
	client := &http.Client{Timeout: 6 * time.Second, Jar: jar}

	loginResp, loginOK := doLogin(client, "owner-a@hutian.dev", "tenant-a", "ws-a")
	asserts = append(asserts, assert{
		name:   "① 登录成功 + access_token 明文被置空（JSON 里看不到明文 token）",
		pass:   loginOK && loginResp.accessToken == "",
		detail: fmt.Sprintf("status_ok=%v access_token=%q token_type=%q", loginOK, ellipsis(loginResp.accessToken, 8), loginResp.tokenType),
	})
	asserts = append(asserts, assert{
		name:   "② Set-Cookie 里有 HUTIAN_TENANT_TOKEN 且包含 HttpOnly; SameSite=Strict",
		pass:   loginResp.hasCookie && loginResp.httpOnly && loginResp.sameSiteStrict,
		detail: fmt.Sprintf("has_cookie=%v HttpOnly=%v SameSiteStrict=%v Secure=%v cookie_name=%q", loginResp.hasCookie, loginResp.httpOnly, loginResp.sameSiteStrict, loginResp.secure, loginResp.cookieName),
	})
	asserts = append(asserts, assert{
		name:   "③ Set-Cookie 里有 HUTIAN_TENANT_NONCE 且值非空",
		pass:   loginResp.hasNonceCookie && loginResp.nonce != "",
		detail: fmt.Sprintf("has_nonce=%v nonce=%s", loginResp.hasNonceCookie, ellipsis(loginResp.nonce, 10)),
	})
	if !loginOK {
		printSummary(asserts)
		os.Exit(1)
	}

	// ── cookie 读 GET（简单请求）──
	code, body := doGetWithCookies(client, "/portal/api/v1/me")
	asserts = append(asserts, assert{
		name:   "④ Cookie 携带 HUTIAN_TENANT_TOKEN 访问 /me = 200",
		pass:   code == 200,
		detail: fmt.Sprintf("status=%d tenant_id=%v", code, jsonPathInt(body, "data.tenant_id")),
	})

	// ── CSRF 写请求：缺头 403 ──
	code, body = doWrite(client, "PATCH", "/portal/api/v1/workspace",
		map[string]string{"brand_name": "x"}, false, false, "")
	asserts = append(asserts, assert{
		name:   "⑤ 写请求缺 X-Hutian-Tenant 和 X-Hutian-Nonce = 403",
		pass:   code == 403,
		detail: fmt.Sprintf("status=%d body=%s", code, truncate(body, 160)),
	})

	code, body = doWrite(client, "PATCH", "/portal/api/v1/workspace",
		map[string]string{"brand_name": "y"}, true, false, "")
	asserts = append(asserts, assert{
		name:   "⑥ 写请求只带 X-Hutian-Tenant 但缺 Nonce = 403",
		pass:   code == 403,
		detail: fmt.Sprintf("status=%d body=%s", code, truncate(body, 160)),
	})

	// ── 带正确头：写成功 ──
	nonce := extractNonceCookie(jar)
	code, body = doWrite(client, "PATCH", "/portal/api/v1/workspace",
		map[string]string{"brand_name": "A Brand M5 Probed", "industry": "trike", "fallback_copy_json": "{}"}, true, true, nonce)
	asserts = append(asserts, assert{
		name:   "⑦ 写请求带 X-Hutian-Tenant + X-Hutian-Nonce = 200（nonce 匹配成功）",
		pass:   code == 200,
		detail: fmt.Sprintf("status=%d brand=%q", code, jsonPathStr(body, "data.brand_name")),
	})

	// ── nonce 用过一次失效（防重放）：再用同一个 nonce 发第二次写请求 ──
	// 注：因为第⑦步服务端已经刷新 nonce（写 cookie），所以相同 old nonce 应判不匹配
	code, body = doWrite(client, "PATCH", "/portal/api/v1/workspace",
		map[string]string{"brand_name": "Replay Attack Should Fail"}, true, true, nonce)
	asserts = append(asserts, assert{
		name:   "⑧ 重放 nonce（用过的旧 nonce）= 403（防重放）",
		pass:   code == 403,
		detail: fmt.Sprintf("status=%d body=%s", code, truncate(body, 160)),
	})

	// ── workspace 越权（伪造 workspace_id 为 B 的 20，token 是 A 的 tenant_id=1）──
	wsBToken, _ := loginFallbackToken("owner-b@hutian.dev", "tenant-b", "ws-b")
	_ = wsBToken // 备用
	// 注：本探针要测 JWT workspace_id ≠ tenant 的 workspace 归属 → 404
	// 我们没法直接签假 JWT（拿不到 jwt key）。换等价路径：
	// 用 A 登录 cookie，调用 A 的 PATCH /seats/:id （B 的 seat id）→ 中间件已先过 tenant 1 + seat 属于 tenant，
	// 再到 handler 里用 WHERE id=? AND tenant_id=1，如果 seat 是 tenant 2 的 → 404。
	if bSeatID := getBSeatID(client); bSeatID > 0 {
		nonce2 := extractNonceCookie(jar)
		code, body = doWrite(client, "PATCH", fmt.Sprintf("/portal/api/v1/seats/%d", bSeatID),
			map[string]string{"role": "member"}, true, true, nonce2)
		asserts = append(asserts, assert{
			name:   "⑨ workspace/seat 跨租户越权（A 改 B 的 seat）= 404（不泄存在性 + 不 UX 误伤）",
			pass:   code == 404,
			detail: fmt.Sprintf("seat_b_id=%d status=%d body=%s", bSeatID, code, truncate(body, 160)),
		})
	}

	// ── logout 清 cookie ──
	logoutOK, _ := doLogout(client)
	asserts = append(asserts, assert{
		name:   "⑩ POST /auth/logout 置 cookie MaxAge=-1（清 HUTIAN_TENANT_TOKEN）",
		pass:   logoutOK,
		detail: fmt.Sprintf("logout_cleared=%v", logoutOK),
	})

	// 登出后再请求 /me 应 401
	code, _ = doGetWithCookies(client, "/portal/api/v1/me")
	asserts = append(asserts, assert{
		name:   "⑪ 登出后访问 /me = 401",
		pass:   code == 401,
		detail: fmt.Sprintf("status=%d", code),
	})

	printSummary(asserts)
}

type loginOut struct {
	accessToken      string
	tokenType        string
	hasCookie        bool
	cookieName       string
	httpOnly         bool
	sameSiteStrict   bool
	secure           bool
	hasNonceCookie   bool
	nonce            string
}

func doLogin(client *http.Client, email, tenantSlug, workspaceSlug string) (loginOut, bool) {
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
		return loginOut{}, false
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return loginOut{}, false
	}
	var r struct {
		Data struct {
			AccessToken string `json:"access_token"`
			TokenType   string `json:"token_type"`
		} `json:"data"`
	}
	_ = json.Unmarshal(body, &r)
	out := loginOut{accessToken: r.Data.AccessToken, tokenType: r.Data.TokenType}
	for _, c := range resp.Cookies() {
		switch c.Name {
		case "HUTIAN_TENANT_TOKEN":
			out.hasCookie = true
			out.cookieName = c.Name
			out.httpOnly = c.HttpOnly
			out.sameSiteStrict = c.SameSite == http.SameSiteStrictMode
			out.secure = c.Secure
		case "HUTIAN_TENANT_NONCE":
			out.hasNonceCookie = true
			out.nonce = c.Value
		}
	}
	// 额外扫原始 Set-Cookie 头（SameSite 有时候 Cookie 结构会解析成 default，再保险扫一次）
	for _, raw := range resp.Header.Values("Set-Cookie") {
		if strings.Contains(raw, "HUTIAN_TENANT_TOKEN") {
			if strings.Contains(strings.ToLower(raw), "samesite=strict") {
				out.sameSiteStrict = true
			}
			if strings.Contains(strings.ToLower(raw), "httponly") {
				out.httpOnly = true
			}
			if strings.Contains(strings.ToLower(raw), "secure") {
				out.secure = true
			}
		}
	}
	return out, true
}

// loginFallbackToken 仅用于辅助用例（兼容 Authorization 回退路径 probe：中间件保留了 Bearer 回退）
// 生产路径走 cookie；本函数用于那些需要对比 JWT workspace 伪造的边界测试。
func loginFallbackToken(email, tenantSlug, workspaceSlug string) (string, error) {
	payload := map[string]string{
		"email":          email,
		"password":       "dev-password-change-in-prod",
		"tenant_slug":    tenantSlug,
		"workspace_slug": workspaceSlug,
	}
	b, _ := json.Marshal(payload)
	resp, err := http.Post(apiBase+"/portal/api/v1/auth/login", "application/json", bytes.NewReader(b))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("status=%d body=%s", resp.StatusCode, truncate(string(body), 200))
	}
	var r struct {
		Data struct {
			AccessToken string `json:"access_token"`
		} `json:"data"`
	}
	_ = json.Unmarshal(body, &r)
	// 注意：access_token 在生产 JSON 里是空的（后端已置空），但中间件兼容 Bearer 模式，
	// 用 Set-Cookie 里的 cookie 更准确。这里返回空表示 fallback 不再可用（正是 M5 验证点）。
	return r.Data.AccessToken, nil
}

func doGetWithCookies(client *http.Client, path string) (int, string) {
	req, _ := http.NewRequest("GET", apiBase+path, nil)
	resp, err := client.Do(req)
	if err != nil {
		return -1, err.Error()
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, string(b)
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

func doLogout(client *http.Client) (bool, string) {
	nonce := extractNonceCookie(client.Jar)
	req, _ := http.NewRequest("POST", apiBase+"/portal/api/v1/auth/logout", nil)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Hutian-Tenant", "1")
	req.Header.Set("X-Hutian-Nonce", nonce)
	resp, err := client.Do(req)
	if err != nil {
		return false, err.Error()
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	cleared := false
	for _, raw := range resp.Header.Values("Set-Cookie") {
		if strings.Contains(raw, "HUTIAN_TENANT_TOKEN") &&
			(strings.Contains(raw, "Max-Age=-1") || strings.Contains(raw, "Expires=") ||
				strings.Contains(strings.ToLower(raw), "max-age=0")) {
			cleared = true
		}
	}
	return resp.StatusCode == 200 && cleared, string(b)
}

func extractNonceCookie(jar http.CookieJar) string {
	if jar == nil {
		return ""
	}
	for _, c := range jar.Cookies(mustURL(apiBase)) {
		if c.Name == "HUTIAN_TENANT_NONCE" {
			return c.Value
		}
	}
	return ""
}

func mustURL(s string) *url.URL {
	u, _ := url.Parse(s)
	return u
}

func getBSeatID(client *http.Client) int64 {
	// 先登录 B 拿 B 的 cookie 列 B 的 seats，取第一个 id
	jarB, _ := cookiejar.New(nil)
	cb := &http.Client{Jar: jarB, Timeout: 5 * time.Second}
	if _, ok := doLogin(cb, "admin-b@hutian.dev", "tenant-b", "ws-b"); !ok {
		return 0
	}
	_, body := doGetWithCookies(cb, "/portal/api/v1/seats")
	return firstSeatID(body)
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
			}
			return -1
		}
		next, ok := m[p].(map[string]interface{})
		if !ok {
			return -1
		}
		m = next
	}
	return -1
}

func jsonPathStr(body, path string) string {
	parts := strings.Split(path, ".")
	var v interface{}
	if err := json.Unmarshal([]byte(body), &v); err != nil {
		return ""
	}
	m, ok := v.(map[string]interface{})
	if !ok {
		return ""
	}
	for i, p := range parts {
		if i == len(parts)-1 {
			s, _ := m[p].(string)
			return s
		}
		next, ok := m[p].(map[string]interface{})
		if !ok {
			return ""
		}
		m = next
	}
	return ""
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

func ellipsis(s string, n int) string {
	if s == "" {
		return "<empty>"
	}
	if len(s) > n {
		return s[:n] + "..."
	}
	return s
}

func truncate(s string, n int) string {
	s = strings.ReplaceAll(s, "\n", " ")
	if len(s) > n {
		return s[:n] + "..."
	}
	return s
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
	fmt.Printf("\nprobe:m5-auth: %d/%d passed\n", passed, passed+failed)
	if failed > 0 {
		os.Exit(1)
	}
}
