// Package toolexec — 工具执行层 HTTP 客户端（T9.0 ADR-open-api D1 方案 C）
//
// tenant-api 通过普通 HTTP 调 Python 侧 REST 端点，不走 MCP 协议。
// 工具执行层无租户状态——本客户端只传"要诊断的 url"等纯参数，不传租户上下文。
// 租户上下文留在 tenant-api 做鉴权配额。
package toolexec

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client 工具执行层 HTTP 客户端
type Client struct {
	baseURL string
	http    *http.Client
}

// New 创建工具执行层客户端
func New(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		http: &http.Client{
			Timeout: 30 * time.Second, // 工具抓外部 URL 可能慢
		},
	}
}

// Diagnose 调 run_diagnosis 工具，返回原始 JSON 结果
func (c *Client) Diagnose(ctx context.Context, url string) (json.RawMessage, error) {
	payload := map[string]string{"url": url}
	return c.callTool(ctx, "/diagnose", payload)
}

// SchemaCheck 调 check_schema 工具，返回原始 JSON 结果
func (c *Client) SchemaCheck(ctx context.Context, url, expectedType string) (json.RawMessage, error) {
	payload := map[string]string{
		"url":           url,
		"expected_type": expectedType,
	}
	return c.callTool(ctx, "/schema/check", payload)
}

// SitemapSubmit 调 submit_sitemap 工具，返回原始 JSON 结果
func (c *Client) SitemapSubmit(ctx context.Context, host string, urls []string, indexnowKey string) (json.RawMessage, error) {
	payload := map[string]interface{}{
		"host":          host,
		"urls":          urls,
		"indexnow_key":  indexnowKey,
	}
	return c.callTool(ctx, "/sitemap/submit", payload)
}

// callTool 调用工具执行层的通用方法
func (c *Client) callTool(ctx context.Context, route string, params interface{}) (json.RawMessage, error) {
	body, err := json.Marshal(params)
	if err != nil {
		return nil, fmt.Errorf("marshal params: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+route, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call tool executor: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("tool executor returned %d: %s", resp.StatusCode, string(raw))
	}

	return json.RawMessage(raw), nil
}

// Healthz 检查工具执行层健康状态
func (c *Client) Healthz(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, "GET", c.baseURL+"/healthz", nil)
	if err != nil {
		return fmt.Errorf("new request: %w", err)
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("healthz: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("healthz returned %d", resp.StatusCode)
	}
	return nil
}
