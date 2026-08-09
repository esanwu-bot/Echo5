// Package main — T9.7 fail-closed 探针（handler 层 503）
//
// 补 ADR-open-api 验收表第 6 条"工具执行层挂→503，不 fail-open"的 handler 层断言。
// 现有 probe:t9-tool-executor ④ 只验 toolexec.Client 对不可达地址返回 error（client 层），
// 未验 handler 收到 error 后正确转成 503（而非 200 空响应/500 panic/fail-open 放行）。
//
// 时机约束：本探针必须在 tool-executor 启动前跑（verify.ps1 编排里 [12] 之前）。
// 此时 tenant-api 已活、tool-executor 未起，调 /open/v1/diagnose 必然走 fail-closed 分支。
//
// 断言：
//
//	① POST /open/v1/diagnose → 503（工具执行层不可达，不 fail-open 放行）
//	② POST /open/v1/schema/check → 503
//	③ 错误体含 "tool execution failed"（handler 统一错误口径，非裸 err.Error）
//
// 依赖：tenant-api 已启动（4318 活）；tool-executor 未启动（4320 不活）
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

	// 确认 tool-executor 确实未起（否则探针前提不成立，结果不可信）
	if toolExecutorUp() {
		log.Fatalf("[fatal] tool-executor 已在 :4320 监听，本探针必须在 tool-executor 启动前跑（见 verify.ps1 编排顺序）")
	}
	log.Println("[setup] tool-executor 未启动（符合 fail-closed 探针前提）")

	// 登录建 key
	jar, _ := cookiejar.New(nil)
	client := &http.Client{Timeout: 10 * time.Second, Jar: jar}
	if ok, _ := doLogin(client, "owner-a@hutian.dev", "tenant-a", "ws-a"); !ok {
		log.Fatalf("[fatal] login failed")
	}
	log.Println("[setup] login ok")
	nonce := extractNonceCookie(jar)
	_, body := doWrite(client, "POST", "/portal/api/v1/api-keys",
		map[string]string{"name": "probe-fail-closed"}, true, true, nonce)
	apiKey := parseKey(body)
	if apiKey == "" {
		log.Fatalf("[fatal] create api key failed: %s", body)
	}
	log.Printf("[setup] api key created: %s...", apiKey[:20])

	// ── ① diagnose → 503 ──
	// toolexec.Client 超时 35s，探针 client timeout 设 45s 给足余量
	code1, resp1 := doPostBearer(apiKey, "/open/v1/diagnose",
		map[string]string{"url": "https://example.com"})
	pass1 := code1 == http.StatusServiceUnavailable
	asserts = append(asserts, assertion{
		name:   "① POST /open/v1/diagnose → 503（工具执行层不可达，fail-closed 不放行）",
		pass:   pass1,
		detail: fmt.Sprintf("status=%d body=%s", code1, truncate(resp1, 160)),
	})

	// ── ② schema/check → 503 ──
	code2, resp2 := doPostBearer(apiKey, "/open/v1/schema/check",
		map[string]string{"url": "https://example.com", "expected_type": "Product"})
	pass2 := code2 == http.StatusServiceUnavailable
	asserts = append(asserts, assertion{
		name:   "② POST /open/v1/schema/check → 503",
		pass:   pass2,
		detail: fmt.Sprintf("status=%d body=%s", code2, truncate(resp2, 160)),
	})

	// ── ③ 错误体含统一口径 "tool execution failed" ──
	// handler 返回 {"error":"tool execution failed","reason":...}，
	// 断言 error 字段是统一口径（非裸 panic / 非空 200）
	errBodyOK := strings.Contains(resp1, "tool execution failed") && strings.Contains(resp2, "tool execution failed")
	asserts = append(asserts, assertion{
		name: "③ 错误体含 \"tool execution failed\"（统一错误口径，非裸 panic/空响应）",
		pass: errBodyOK,
		detail: fmt.Sprintf("diagnose_has=%v schema_has=%v",
			strings.Contains(resp1, "tool execution failed"),
			strings.Contains(resp2, "tool execution failed")),
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

// toolExecutorUp 检查 :4320 是否在监听（探针前提：必须未起）
func toolExecutorUp() bool {
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get("http://127.0.0.1:4320/healthz")
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
	// toolexec 超时 35s，这里给 45s 余量
	client := &http.Client{Timeout: 45 * time.Second}
	resp, err := client.Do(req)
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
	fmt.Printf("\nprobe:fail-closed: %d/%d passed\n", passed, passed+failed)
	if failed > 0 {
		os.Exit(1)
	}
}
