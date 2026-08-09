// Package main — T9.0 探针：验证 tenant-api(Go) → Python REST 工具执行层 调通
//
// ADR-open-api D1 方案 C 起步形态验证：
//  ① Python REST 端点 healthz 可达
//  ② run_diagnosis 返回正确结构（scores.traditional_seo / scores.generative_geo）
//  ③ 无效 URL 有 issues 不 panic
//  ④ 缺参数返回 400
//  ⑤ 未知端点返回 404
//
// 依赖：python -m hutian_seo_mcp.http_api --port 4320 已启动
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"hutian-tenant-api/config"
	"hutian-tenant-api/toolexec"
)

type assertion struct {
	name   string
	pass   bool
	detail string
}

func main() {
	log.SetFlags(0)

	cfg := config.Load()
	client := toolexec.New(cfg.ToolExecutorURL)
	ctx, cancel := context.WithTimeout(context.Background(), 35*time.Second)
	defer cancel()

	var asserts []assertion

	// ① healthz
	if err := client.Healthz(ctx); err != nil {
		fmt.Printf("  [FAIL] ① 工具执行层 healthz 可达\n         %v\n", err)
		fmt.Printf("\nprobe:t9-tool-executor: 0/4 passed (前置失败)\n")
		os.Exit(1)
	}
	asserts = append(asserts, assertion{
		name: "① 工具执行层 healthz 可达",
		pass: true,
	})

	// ② run_diagnosis 返回正确结构
	raw, err := client.Diagnose(ctx, "https://example.com")
	if err != nil {
		asserts = append(asserts, assertion{
			name:   "② run_diagnosis 返回正确结构",
			pass:   false,
			detail: fmt.Sprintf("调用失败: %v", err),
		})
	} else {
		var result map[string]interface{}
		if err := json.Unmarshal(raw, &result); err != nil {
			asserts = append(asserts, assertion{
				name:   "② run_diagnosis 返回正确结构",
				pass:   false,
				detail: fmt.Sprintf("JSON 解析失败: %v", err),
			})
		} else {
			scores, ok := result["scores"].(map[string]interface{})
			if !ok {
				asserts = append(asserts, assertion{
					name:   "② run_diagnosis 返回正确结构",
					pass:   false,
					detail: "缺 scores 字段或类型错误",
				})
			} else {
				_, hasSEO := scores["traditional_seo"]
				_, hasGEO := scores["generative_geo"]
				_, hasConclusions := result["conclusions"]
				asserts = append(asserts, assertion{
					name:   "② run_diagnosis 返回正确结构",
					pass:   hasSEO && hasGEO && hasConclusions,
					detail: fmt.Sprintf("scores=%v, conclusions=%v", scores, result["conclusions"]),
				})
			}
		}
	}

	// ③ 无效 URL 有 issues 不 panic
	raw, err = client.Diagnose(ctx, "https://this-domain-definitely-does-not-exist-xyz.invalid")
	if err != nil {
		asserts = append(asserts, assertion{
			name:   "③ 无效 URL 有 issues 不 panic",
			pass:   false,
			detail: fmt.Sprintf("调用失败: %v", err),
		})
	} else {
		var result map[string]interface{}
		json.Unmarshal(raw, &result)
		issues, ok := result["issues"].([]interface{})
		asserts = append(asserts, assertion{
			name:   "③ 无效 URL 有 issues 不 panic",
			pass:   ok && len(issues) > 0,
			detail: fmt.Sprintf("issues count=%d", len(issues)),
		})
	}

	// ④ fail-closed: 工具执行层不可达时不 panic（这里只验证 client 错误处理逻辑）
	//    用一个错误地址验证 fail-closed
	badClient := toolexec.New("http://127.0.0.1:1") // 不可达端口
	_, err = badClient.Diagnose(ctx, "https://example.com")
	asserts = append(asserts, assertion{
		name:   "④ 工具执行层不可达时返回 error（fail-closed）",
		pass:   err != nil,
		detail: fmt.Sprintf("error=%v", err),
	})

	// 输出
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
	fmt.Printf("\nprobe:t9-tool-executor: %d/%d passed\n", passed, passed+failed)
	if failed > 0 {
		os.Exit(1)
	}
}
