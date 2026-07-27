// Package main — T7.4 租户自服务后台正向隔离探针
//
// 目标：验证 /portal/api/v1/* 接口族满足以下安全契约：
//   ① 无 token / 错误 token → 401
//   ② A 租户 token 只能看到 A 的数据（tenant/workspace 边界）
//   ③ B 租户 token 只能看到 B 的数据
//   ④ 凭证接口只返回元信息，绝不暴露 encrypted_secret 等敏感字段
//   ⑤ admin 的 X-Admin-Token 无法进入 portal 路由（物理双轨）
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

	// ── 登录两租户 ──
	tokA, errA := login("owner-a@hutian.dev", "tenant-a", "ws-a")
	tokB, errB := login("admin-b@hutian.dev", "tenant-b", "ws-b")
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

	// 登录失败直接退出，后续断言依赖 token
	if errA != nil || errB != nil {
		printSummary(asserts)
		os.Exit(1)
	}

	// ── 鉴权基础 ──
	code, body := doPortalRequest("GET", "/portal/api/v1/me", "", nil)
	asserts = append(asserts, assert{
		name:   "③ 无 token 访问 /me = 401",
		pass:   code == 401,
		detail: fmt.Sprintf("status=%d body=%s", code, truncate(body, 120)),
	})

	code, body = doPortalRequest("GET", "/portal/api/v1/me", "bad-token", nil)
	asserts = append(asserts, assert{
		name:   "④ 错误 token 访问 /me = 401",
		pass:   code == 401,
		detail: fmt.Sprintf("status=%d body=%s", code, truncate(body, 120)),
	})

	// ── A 租户正向访问 ──
	code, body = doPortalRequest("GET", "/portal/api/v1/me", tokA, nil)
	asserts = append(asserts, assert{
		name:   "⑤ A token GET /me = 200 且 tenant_id=1",
		pass:   code == 200 && jsonPathInt(body, "data.tenant_id") == 1,
		detail: fmt.Sprintf("status=%d tenant_id=%v", code, jsonPathInt(body, "data.tenant_id")),
	})

	code, body = doPortalRequest("GET", "/portal/api/v1/workspace", tokA, nil)
	asserts = append(asserts, assert{
		name:   "⑥ A token GET /workspace = 200 且 id=10",
		pass:   code == 200 && jsonPathInt(body, "data.id") == 10,
		detail: fmt.Sprintf("status=%d workspace_id=%v", code, jsonPathInt(body, "data.id")),
	})

	code, body = doPortalRequest("GET", "/portal/api/v1/seats", tokA, nil)
	asserts = append(asserts, assert{
		name:   "⑦ A token GET /seats 只看到 A 的成员",
		pass:   code == 200 && !strings.Contains(body, `"tenant_id":2`),
		detail: fmt.Sprintf("status=%d", code),
	})

	code, body = doPortalRequest("GET", "/portal/api/v1/subscription", tokA, nil)
	asserts = append(asserts, assert{
		name:   "⑧ A token GET /subscription = 200",
		pass:   code == 200,
		detail: fmt.Sprintf("status=%d", code),
	})

	// ── B 租户正向访问 ──
	code, body = doPortalRequest("GET", "/portal/api/v1/me", tokB, nil)
	asserts = append(asserts, assert{
		name:   "⑨ B token GET /me = 200 且 tenant_id=2",
		pass:   code == 200 && jsonPathInt(body, "data.tenant_id") == 2,
		detail: fmt.Sprintf("status=%d tenant_id=%v", code, jsonPathInt(body, "data.tenant_id")),
	})

	code, body = doPortalRequest("GET", "/portal/api/v1/workspace", tokB, nil)
	asserts = append(asserts, assert{
		name:   "⑩ B token GET /workspace = 200 且 id=20",
		pass:   code == 200 && jsonPathInt(body, "data.id") == 20,
		detail: fmt.Sprintf("status=%d workspace_id=%v", code, jsonPathInt(body, "data.id")),
	})

	// ── 写权限：A owner 可 PATCH workspace ──
	code, body = doPortalRequest("PATCH", "/portal/api/v1/workspace", tokA,
		map[string]string{"brand_name": "A Brand Updated", "industry": "trike", "fallback_copy_json": "{}"})
	asserts = append(asserts, assert{
		name:   "⑪ A owner PATCH /workspace = 200",
		pass:   code == 200,
		detail: fmt.Sprintf("status=%d", code),
	})

	// ── 凭证不泄露明文 ──
	code, body = doPortalRequest("GET", "/portal/api/v1/credentials", tokA, nil)
	asserts = append(asserts, assert{
		name:   "⑫ 凭证接口不暴露 encrypted_secret",
		pass:   code == 200 && !strings.Contains(body, "encrypted_secret"),
		detail: fmt.Sprintf("status=%d contains_secret=%v", code, strings.Contains(body, "encrypted_secret")),
	})

	// ── admin token 不能进 portal（双轨隔离）──
	code, body = doRequestWithHeader("GET", "/portal/api/v1/me", "X-Admin-Token", "dev-admin-token-change-in-prod")
	asserts = append(asserts, assert{
		name:   "⑬ admin X-Admin-Token 访问 portal /me = 401",
		pass:   code == 401,
		detail: fmt.Sprintf("status=%d body=%s", code, truncate(body, 120)),
	})

	// ── A token 访问 B 的具体资源 = 404（按本 tenant 查不到）──
	// 先拿 B 的 seat id（B 自己列出来）
	_, bSeatsBody := doPortalRequest("GET", "/portal/api/v1/seats", tokB, nil)
	bSeatID := firstSeatID(bSeatsBody)
	if bSeatID > 0 {
		code, body = doPortalRequest("PATCH", fmt.Sprintf("/portal/api/v1/seats/%d", bSeatID), tokA,
			map[string]string{"role": "member"})
		asserts = append(asserts, assert{
			name:   "⑭ A token 修改 B 的 seat = 404",
			pass:   code == 404,
			detail: fmt.Sprintf("status=%d body=%s", code, truncate(body, 120)),
		})
	}

	printSummary(asserts)
}

func login(email, tenantSlug, workspaceSlug string) (string, error) {
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
	if err := json.Unmarshal(body, &r); err != nil {
		return "", err
	}
	return r.Data.AccessToken, nil
}

func doPortalRequest(method, path, token string, body map[string]string) (int, string) {
	var bodyReader io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		bodyReader = bytes.NewReader(b)
	}
	req, _ := http.NewRequest(method, apiBase+path, bodyReader)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return -1, err.Error()
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, string(b)
}

func doRequestWithHeader(method, path, headerKey, headerValue string) (int, string) {
	req, _ := http.NewRequest(method, apiBase+path, nil)
	req.Header.Set(headerKey, headerValue)
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return -1, err.Error()
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, string(b)
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
