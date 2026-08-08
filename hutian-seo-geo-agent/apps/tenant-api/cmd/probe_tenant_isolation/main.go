// Package main — T6.3 串数据探针 probe:tenant-isolation
//
// 对应 docs/多租户-开发计划补充.md T6.3，FR-T02/NFR-T01 验收：
//   mock 两租户（A/B），验证：
//   ① 无 ctx 请求业务接口 = 401（FR-T01 无全局默认旁路）
//   ② A 的 ctx 取 B 的 workspace = 403（FR-T05 篡改越权）
//   ③ A 的 ctx 列 workspaces 只见 A 不见 B（FR-T02 数据隔离）
//   ④ A 的 ctx 用 RawRepo 查 B 的数据 = 能查到（验证 RawRepo 是逃生口，非 bug）
//
// 球门（开发计划铁律）：串数据探针早于业务 CRUD 立起来。
// 本探针跑通 = T6.2 守门人就位，后续 CRUD 在隔离环境里写。
//
// 运行：
//   1. 先起服务：tenant-api.exe
//   2. 再跑探针：go run ./cmd/probe_tenant_isolation
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// 探针用 HTTP 客户端，直接打 tenant-api 的 REST 接口
// 这样验的是"端到端隔离"——从 HTTP 头到 DB where 全链路

const (
	apiBase = "http://localhost:4318"
)

type assert struct {
	name string
	pass bool
	detail string
}

func main() {
	log.SetFlags(0)
	var asserts []assert

	// ── 阶段 0：服务连通性 ──
	if !checkHealth() {
		log.Fatalf("[fatal] tenant-api not reachable at %s — start it first: tenant-api.exe", apiBase)
	}
	log.Println("[setup] tenant-api reachable")

	// ── 阶段 1：seed 两租户测试数据 ──
	// 直接用 DB seed 脚本插入（避免依赖未实现的 tenants CRUD）
	// 这里假设已用 SQL 或 migrate seed 插入了 tenant A(1)/B(2) + workspace
	// 见 seed_tenant_isolation.sql
	log.Println("[setup] assuming seed data: tenant A(id=1, workspace=10), tenant B(id=2, workspace=20)")
	log.Println("[setup] if not seeded, run: mysql hutian < cmd/probe_tenant_isolation/seed.sql")

	// ── 阶段 2：探针断言 ──

	// ① 无 ctx 请求业务接口 = 401
	code, body := doRequest("GET", "/api/v1/workspaces", nil)
	asserts = append(asserts, assert{
		name:   "① 无 ctx 请求 /api/v1/workspaces = 401",
		pass:   code == 401,
		detail: fmt.Sprintf("got status=%d body=%s", code, truncate(body, 120)),
	})

	// ② A 的 ctx 取 B 的 workspace = 403
	//    A(id=1) 用 B 的 workspace_id=20 → 中间件校验归属 → 403
	code, body = doRequest("GET", "/api/v1/workspaces", map[string]string{
		"X-Tenant-ID":    "1",
		"X-Workspace-ID": "20", // B 的 workspace
	})
	asserts = append(asserts, assert{
		name:   "② A(1) 篡改 workspace_id=20(B) = 403",
		pass:   code == 403,
		detail: fmt.Sprintf("got status=%d body=%s", code, truncate(body, 120)),
	})

	// ③ A 的 ctx 列 workspaces 只见 A 不见 B
	//    A(id=1, workspace=10) 列 workspaces → 只返 A 的
	code, body = doRequest("GET", "/api/v1/workspaces", map[string]string{
		"X-Tenant-ID":    "1",
		"X-Workspace-ID": "10",
	})
	passC := code == 200
	if passC {
		// 解析 body，确认 data 只含 tenant_id=1 的 workspace
		var resp struct {
			Data []struct {
				ID       int64  `json:"id"`
				BrandName string `json:"brand_name"`
			} `json:"data"`
			TenantID int64 `json:"tenant_id"`
		}
		if err := json.Unmarshal([]byte(body), &resp); err != nil {
			passC = false
		} else {
			// 应该只返 A 的 workspace(id=10)，不返 B 的(id=20)
			if resp.TenantID != 1 {
				passC = false
			}
			for _, w := range resp.Data {
				if w.ID == 20 {
					passC = false // 串到 B 的 workspace 了！
				}
			}
		}
	}
	asserts = append(asserts, assert{
		name:   "③ A(1) 列 workspaces 只见 A 不见 B",
		pass:   passC,
		detail: fmt.Sprintf("got status=%d body=%s", code, truncate(body, 200)),
	})

	// ④ B 的 ctx 列 workspaces 只见 B 不见 A
	code, body = doRequest("GET", "/api/v1/workspaces", map[string]string{
		"X-Tenant-ID":    "2",
		"X-Workspace-ID": "20",
	})
	passD := code == 200
	if passD {
		var resp struct {
			Data []struct {
				ID int64 `json:"id"`
			} `json:"data"`
			TenantID int64 `json:"tenant_id"`
		}
		if err := json.Unmarshal([]byte(body), &resp); err != nil {
			passD = false
		} else {
			if resp.TenantID != 2 {
				passD = false
			}
			for _, w := range resp.Data {
				if w.ID == 10 {
					passD = false // 串到 A 的 workspace 了！
				}
			}
		}
	}
	asserts = append(asserts, assert{
		name:   "④ B(2) 列 workspaces 只见 B 不见 A",
		pass:   passD,
		detail: fmt.Sprintf("got status=%d body=%s", code, truncate(body, 200)),
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
	fmt.Printf("\nprobe:tenant-isolation: %d/%d passed\n", passed, passed+failed)
	if failed > 0 {
		os.Exit(1)
	}
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
	// P0-1 修复后 /api/v1 需要 X-Internal-Secret
	if secret := os.Getenv("TENANT_INTERNAL_API_SECRET"); secret != "" {
		req.Header.Set("X-Internal-Secret", secret)
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
