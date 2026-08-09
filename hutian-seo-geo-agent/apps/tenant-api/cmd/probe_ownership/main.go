// Package main — T9.5 归属校验探针
//
// 验证 ADR-open-api 5.8 D4 归属校验：
//  ① A 的 key 提交 A 的 host（brand-a.com）→ 放行（not-403，可能是 200/503）
//  ② A 的 key 提交 B 的 host（brand-b.com）→ 403（防跨租户提交）
//  ③ A 的 key 提交 A 的子域名（www.brand-a.com）→ 放行（not-403，子域名匹配）
//  ④ A 的 key 提交不相关的 host（evil.com）→ 403
//
// 断言策略：归属校验通过 = not 403（可能是 200 工具成功 / 503 工具不可达），
// 归属校验失败 = 403。这样探针不依赖 tool-executor 是否在线。
//
// 依赖：tenant-api 已启动 + seed 数据（tenant-a ws=10 instance=100 site_domain=brand-a.com）
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

	// 上一个探针（probe:rate-limit）会打满限流桶，需等限流窗口重置
	// 否则归属校验的请求会被 429 拦截而非到达归属校验逻辑
	log.Println("[setup] waiting for rate-limit window reset...")
	sleepToNextMinute()

	// 登录 tenant-a 创建 API key
	jar, _ := cookiejar.New(nil)
	client := &http.Client{Timeout: 10 * time.Second, Jar: jar}
	if ok, _ := doLogin(client, "owner-a@hutian.dev", "tenant-a", "ws-a"); !ok {
		log.Fatalf("[fatal] login failed")
	}
	log.Println("[setup] login ok (tenant-a)")

	nonce := extractNonceCookie(jar)
	_, body := doWrite(client, "POST", "/portal/api/v1/api-keys",
		map[string]string{"name": "probe-ownership"}, true, true, nonce)
	apiKey := parseKey(body)
	if apiKey == "" {
		log.Fatalf("[fatal] create api key failed: %s", body)
	}
	log.Printf("[setup] api key created: %s...", apiKey[:20])

	// sitemap/submit 的 body 模板（indexnow_key 用测试值）
	submitBody := func(host string) map[string]interface{} {
		return map[string]interface{}{
			"host":         host,
			"urls":         []string{"https://" + host + "/"},
			"indexnow_key": "test-key-probe-000000000000000000000000",
		}
	}

	// ── ① A 的 key 提交 A 的 host（brand-a.com）→ 放行 ──
	code1, body1 := doPostBearerObj(apiKey, "/open/v1/sitemap/submit", submitBody("brand-a.com"))
	pass1 := code1 != 403
	asserts = append(asserts, assertion{
		name:   "① A 的 key 提交 A 的 host（brand-a.com）→ 放行(not-403)",
		pass:   pass1,
		detail: fmt.Sprintf("code=%d body=%s", code1, truncate(body1, 120)),
	})

	// ── ② A 的 key 提交 B 的 host（brand-b.com）→ 403 ──
	code2, body2 := doPostBearerObj(apiKey, "/open/v1/sitemap/submit", submitBody("brand-b.com"))
	pass2 := code2 == 403
	asserts = append(asserts, assertion{
		name:   "② A 的 key 提交 B 的 host（brand-b.com）→ 403",
		pass:   pass2,
		detail: fmt.Sprintf("code=%d body=%s", code2, truncate(body2, 120)),
	})

	// ── ③ A 的 key 提交 A 的子域名（www.brand-a.com）→ 放行 ──
	code3, body3 := doPostBearerObj(apiKey, "/open/v1/sitemap/submit", submitBody("www.brand-a.com"))
	pass3 := code3 != 403
	asserts = append(asserts, assertion{
		name:   "③ A 的 key 提交 A 的子域名（www.brand-a.com）→ 放行(not-403)",
		pass:   pass3,
		detail: fmt.Sprintf("code=%d body=%s", code3, truncate(body3, 120)),
	})

	// ── ④ A 的 key 提交不相关的 host（evil.com）→ 403 ──
	code4, body4 := doPostBearerObj(apiKey, "/open/v1/sitemap/submit", submitBody("evil.com"))
	pass4 := code4 == 403
	asserts = append(asserts, assertion{
		name:   "④ A 的 key 提交不相关的 host（evil.com）→ 403",
		pass:   pass4,
		detail: fmt.Sprintf("code=%d body=%s", code4, truncate(body4, 120)),
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

// doPostBearerObj 发 POST 请求（Bearer 鉴权，任意 body 类型）
func doPostBearerObj(token, path string, body interface{}) (int, string) {
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
	fmt.Printf("\nprobe:ownership: %d/%d passed\n", passed, passed+failed)
	if failed > 0 {
		os.Exit(1)
	}
}
