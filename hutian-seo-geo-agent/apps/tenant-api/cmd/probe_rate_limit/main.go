// Package main — T9.4 限流中间件探针
//
// 验证 ADR-open-api 5.6（per-tenant per-minute 固定窗口限流）：
//  ① 限额内放行：首个 whoami 返回 200（限流不误拦正常请求）
//  ② 超限 429：并发打 80 个 whoami（超过默认 RPM=60）→ 出现 429
//  ③ Retry-After 头：429 响应带 Retry-After 头（限流响应规范，客户端重试依据）
//
// 用 whoami 端点测试（轻量、不走工具执行层、不走配额）：
//   - 避免工具调用延迟（diagnose 抓外部 URL 慢，70 并发会卡住）
//   - 避免配额干扰（whoami 不走 QuotaEnforce，只走 RateLimit）
//
// 不依赖具体 RPM 值：80 > 默认 60，一定触发限流。
// 前面探针可能已消耗部分配额，探针先打 1 个 whoami 确认可达；
// 如果 429（前面打满了），sleep 到下个分钟窗口重试。
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

	// 登录创建 API key
	jar, _ := cookiejar.New(nil)
	client := &http.Client{Timeout: 10 * time.Second, Jar: jar}
	if ok, _ := doLogin(client, "owner-a@hutian.dev", "tenant-a", "ws-a"); !ok {
		log.Fatalf("[fatal] login failed")
	}
	log.Println("[setup] login ok")

	nonce := extractNonceCookie(jar)
	_, body := doWrite(client, "POST", "/portal/api/v1/api-keys",
		map[string]string{"name": "probe-rate-limit"}, true, true, nonce)
	apiKey := parseKey(body)
	if apiKey == "" {
		log.Fatalf("[fatal] create api key failed: %s", body)
	}
	log.Printf("[setup] api key created: %s...", apiKey[:20])

	// ── ① 限额内放行：首个 whoami = 200 ──
	// 如果前面探针把限流打满了，sleep 到下个窗口重试
	code, _ := doGetBearer(apiKey, "/open/v1/whoami")
	if code == 429 {
		log.Println("[①] first whoami = 429 (前面探针打满限流)，sleep 到下个窗口...")
		sleepToNextMinute()
		code, _ = doGetBearer(apiKey, "/open/v1/whoami")
	}
	pass1 := code == 200
	asserts = append(asserts, assertion{
		name:   "① 限额内放行：首个 whoami = 200",
		pass:   pass1,
		detail: fmt.Sprintf("code=%d (want 200)", code),
	})

	// ── ② 超限 429：并发打 80 个 whoami → 出现 429 ──
	// 80 > 默认 RPM=60，一定触发限流（即使前面消耗了一些，80 足够覆盖）
	log.Println("[②] firing 80 concurrent whoami requests...")

	var wg sync.WaitGroup
	var count200 int64
	var count429 int64
	var countOther int64
	var retryAfterSeen int64
	var firstRetryAfter string
	var raMu sync.Mutex

	for i := 0; i < 80; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			c, ra := doGetBearer(apiKey, "/open/v1/whoami")
			switch c {
			case 200:
				atomic.AddInt64(&count200, 1)
			case 429:
				atomic.AddInt64(&count429, 1)
				if ra != "" {
					atomic.AddInt64(&retryAfterSeen, 1)
					raMu.Lock()
					if firstRetryAfter == "" {
						firstRetryAfter = ra
					}
					raMu.Unlock()
				}
			default:
				atomic.AddInt64(&countOther, 1)
			}
		}()
	}
	wg.Wait()

	pass2 := count429 > 0
	asserts = append(asserts, assertion{
		name:   "② 超限 429：80 并发 → 出现 429",
		pass:   pass2,
		detail: fmt.Sprintf("200=%d 429=%d other=%d (want 429>0)", count200, count429, countOther),
	})

	// ── ③ Retry-After 头：429 响应带 Retry-After ──
	pass3 := retryAfterSeen > 0
	asserts = append(asserts, assertion{
		name:   "③ Retry-After 头：429 响应带 Retry-After",
		pass:   pass3,
		detail: fmt.Sprintf("429_with_retry_after=%d/%d first_value=%q (want >0)", retryAfterSeen, count429, firstRetryAfter),
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

// doGetBearer 发 GET 请求，返回 (statusCode, retryAfterHeader, err)
// 内部关闭 body，调用方无需处理 response
func doGetBearer(token, path string) (int, string) {
	req, _ := http.NewRequest("GET", apiBase+path, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return -1, ""
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body) // 排空 body 以便连接复用
	return resp.StatusCode, resp.Header.Get("Retry-After")
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

// sleepToNextMinute sleep 到下一个分钟窗口（让限流桶重置）
func sleepToNextMinute() {
	now := time.Now()
	next := now.Truncate(time.Minute).Add(time.Minute)
	dur := time.Until(next)
	if dur <= 0 {
		dur = time.Second
	}
	time.Sleep(dur + 100*time.Millisecond) // 多等 100ms 确保窗口已翻
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
	fmt.Printf("\nprobe:rate-limit: %d/%d passed\n", passed, passed+failed)
	if failed > 0 {
		os.Exit(1)
	}
}
