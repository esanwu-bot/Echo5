// Package main — T9.1 开放 API key 管理探针
//
// 验证 ADR-open-api D5（API key 模型 + ApiKeyContext 中间件 + key 管理端点）：
//  ① 创建 key → 返回明文（仅此一次）
//  ② 列出 key → 不含明文/hash，含 key_prefix
//  ③ 用明文 key 调 /open/v1/whoami → 200，注入 tenant/workspace/scopes 正确
//  ④ 无效 key 调 whoami → 401
//  ⑤ 缺 Authorization 调 whoami → 401
//  ⑥ 吊销 key → 200
//  ⑦ 吊销后用该 key 调 whoami → 401
//  ⑧ 越权：B revoke A 的 key → 404（不泄存在性）
//
// 依赖：tenant-api 已启动 + seed（owner-a@hutian.dev / owner-b@hutian.dev）
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

	// 登录 A
	jarA, _ := cookiejar.New(nil)
	clientA := &http.Client{Timeout: 6 * time.Second, Jar: jarA}
	if ok, _ := doLogin(clientA, "owner-a@hutian.dev", "tenant-a", "ws-a"); !ok {
		log.Fatalf("[fatal] login A failed")
	}
	log.Println("[setup] login A ok")

	// ① 创建 key
	nonce := extractNonceCookie(jarA)
	code, body := doWrite(clientA, "POST", "/portal/api/v1/api-keys",
		map[string]string{"name": "probe-key"}, true, true, nonce)
	plaintext, keyID, createOK := parseCreate(body, code)
	asserts = append(asserts, assertion{
		name:   "① 创建 key → 返回明文（仅此一次）",
		pass:   createOK && plaintext != "" && strings.HasPrefix(plaintext, "hsk_test_"),
		detail: fmt.Sprintf("status=%d key_prefix=%s id=%d", code, ellipsis(plaintext, 20), keyID),
	})

	// ② 列出 key（不含明文/hash，含 prefix）
	code, body = doGetWithCookies(clientA, "/portal/api/v1/api-keys")
	listOK := code == 200 && !strings.Contains(body, "\"key\"") && !strings.Contains(body, "key_hash") && strings.Contains(body, "key_prefix")
	asserts = append(asserts, assertion{
		name:   "② 列出 key → 不含明文/hash，含 key_prefix",
		pass:   listOK,
		detail: fmt.Sprintf("status=%d has_plaintext=%v has_hash=%v has_prefix=%v", code,
			strings.Contains(body, "\"key\""), strings.Contains(body, "key_hash"), strings.Contains(body, "key_prefix")),
	})

	// ③ 用明文 key 调 whoami → 200，注入正确
	wCode, wBody := doGetWithBearer(plaintext, "/open/v1/whoami")
	tenantID := jsonPathInt(wBody, "tenant_id")
	wsID := jsonPathInt(wBody, "workspace_id")
	scopes := jsonPathStr(wBody, "scopes")
	asserts = append(asserts, assertion{
		name:   "③ 用明文 key 调 /open/v1/whoami → 200，注入 tenant=1/ws=10/scopes 正确",
		pass:   wCode == 200 && tenantID == 1 && wsID == 10 && scopes != "",
		detail: fmt.Sprintf("status=%d tenant_id=%d workspace_id=%d scopes=%q", wCode, tenantID, wsID, scopes),
	})

	// ④ 无效 key → 401
	badCode, _ := doGetWithBearer("hsk_test_invalid_key_xyz_0000000000000000000000000000000000000000", "/open/v1/whoami")
	asserts = append(asserts, assertion{
		name:   "④ 无效 key 调 whoami → 401",
		pass:   badCode == 401,
		detail: fmt.Sprintf("status=%d", badCode),
	})

	// ⑤ 缺 Authorization → 401
	noAuthCode, _ := httpGetNoAuth("/open/v1/whoami")
	asserts = append(asserts, assertion{
		name:   "⑤ 缺 Authorization 调 whoami → 401",
		pass:   noAuthCode == 401,
		detail: fmt.Sprintf("status=%d", noAuthCode),
	})

	// ⑥ 吊销 key
	nonce = extractNonceCookie(jarA)
	code, body = doWrite(clientA, "POST", fmt.Sprintf("/portal/api/v1/api-keys/%d/revoke", keyID),
		nil, true, true, nonce)
	asserts = append(asserts, assertion{
		name:   "⑥ 吊销 key → 200",
		pass:   code == 200,
		detail: fmt.Sprintf("status=%d body=%s", code, truncate(body, 120)),
	})

	// ⑦ 吊销后用该 key 调 whoami → 401
	revCode, _ := doGetWithBearer(plaintext, "/open/v1/whoami")
	asserts = append(asserts, assertion{
		name:   "⑦ 吊销后用该 key 调 whoami → 401",
		pass:   revCode == 401,
		detail: fmt.Sprintf("status=%d", revCode),
	})

	// ⑧ 越权：B revoke A 的另一个 key → 404
	//    先用 A 再建一个 key，然后 B 尝试吊销它
	nonce = extractNonceCookie(jarA)
	_, body = doWrite(clientA, "POST", "/portal/api/v1/api-keys",
		map[string]string{"name": "probe-key-2"}, true, true, nonce)
	_, keyID2, ok2 := parseCreate(body, code)
	if ok2 {
		jarB, _ := cookiejar.New(nil)
		clientB := &http.Client{Timeout: 6 * time.Second, Jar: jarB}
		if ok, _ := doLogin(clientB, "admin-b@hutian.dev", "tenant-b", "ws-b"); ok {
			nonceB := extractNonceCookie(jarB)
			code, body := doWrite(clientB, "POST", fmt.Sprintf("/portal/api/v1/api-keys/%d/revoke", keyID2),
				nil, true, true, nonceB)
			asserts = append(asserts, assertion{
				name:   "⑧ 越权：B revoke A 的 key → 404（不泄存在性）",
				pass:   code == 404,
				detail: fmt.Sprintf("status=%d body=%s", code, truncate(body, 120)),
			})
		} else {
			asserts = append(asserts, assertion{name: "⑧ 越权：B revoke A 的 key → 404", pass: false, detail: "login B failed"})
		}
	} else {
		asserts = append(asserts, assertion{name: "⑧ 越权：B revoke A 的 key → 404", pass: false, detail: "create key-2 failed"})
	}

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

func doGetWithBearer(token, path string) (int, string) {
	req, _ := http.NewRequest("GET", apiBase+path, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return -1, err.Error()
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, string(b)
}

func httpGetNoAuth(path string) (int, string) {
	resp, err := http.Get(apiBase + path)
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

func extractNonceCookie(jar http.CookieJar) string {
	u, _ := apiBaseParsed()
	for _, c := range jar.Cookies(u) {
		if c.Name == "HUTIAN_TENANT_NONCE" {
			return c.Value
		}
	}
	return ""
}

func apiBaseParsed() (*url.URL, error) {
	return url.Parse(apiBase)
}

func parseCreate(body string, code int) (plaintext string, keyID int64, ok bool) {
	if code != 200 {
		return "", 0, false
	}
	var r struct {
		Data struct {
			Key string `json:"key"`
			ID  int64  `json:"id"`
		} `json:"data"`
	}
	if err := json.Unmarshal([]byte(body), &r); err != nil {
		return "", 0, false
	}
	return r.Data.Key, r.Data.ID, r.Data.Key != ""
}

func jsonPathInt(body, key string) int64 {
	var m map[string]interface{}
	if err := json.Unmarshal([]byte(body), &m); err != nil {
		return 0
	}
	v, ok := m[key]
	if !ok {
		return 0
	}
	switch n := v.(type) {
	case float64:
		return int64(n)
	case json.Number:
		i, _ := n.Int64()
		return i
	}
	return 0
}

func jsonPathStr(body, key string) string {
	var m map[string]interface{}
	if err := json.Unmarshal([]byte(body), &m); err != nil {
		return ""
	}
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func ellipsis(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
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
	fmt.Printf("\nprobe:api-keys: %d/%d passed\n", passed, passed+failed)
	if failed > 0 {
		os.Exit(1)
	}
}
