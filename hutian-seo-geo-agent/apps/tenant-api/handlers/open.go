// Package handlers — 开放 API 端点（T9 ADR-open-api）
//
// 挂 /open/v1/* 路由组，前置 ApiKeyContext 中间件（Bearer hsk_xxx 鉴权）。
// 与 portal JWT cookie、内部服务密钥、超管 token 四轨物理隔离。
//
// T9.1：whoami（验证 ApiKeyContext 注入）
// T9.2：diagnose / schema/check / sitemap/submit（调工具执行层 Python REST）
package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"hutian-tenant-api/middleware"
	"hutian-tenant-api/toolexec"
)

// CtxToolExecutor context 键（main.go 注入 toolexec.Client）
const CtxToolExecutor = "ctx.tool_executor"

// getToolExecutor 从 context 取 toolexec.Client
func getToolExecutor(c *gin.Context) *toolexec.Client {
	if v, ok := c.Get(CtxToolExecutor); ok {
		if cl, ok := v.(*toolexec.Client); ok {
			return cl
		}
	}
	return nil
}

// OpenWhoami 返回当前 API key 的身份信息
// 用途：T9.1 验证 ApiKeyContext 中间件正确注入 tenant/workspace/scopes
func OpenWhoami(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"api_key_id":   middleware.MustApiKeyID(c),
		"tenant_id":    middleware.MustTenantID(c),
		"workspace_id": middleware.MustWorkspaceID(c),
		"scopes":       middleware.MustApiKeyScopes(c),
	})
}

// OpenDiagnose POST /open/v1/diagnose  body: {url}
// 调工具执行层 run_diagnosis，返回 SEO/GEO 诊断报告
func OpenDiagnose(c *gin.Context) {
	client := getToolExecutor(c)
	if client == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "tool executor not configured"})
		return
	}
	var req struct {
		URL string `json:"url" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "reason": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 35*time.Second)
	defer cancel()
	result, err := client.Diagnose(ctx, req.URL)
	if err != nil {
		// fail-closed：工具执行层不可用 → 503，不返回部分结果
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "tool execution failed", "reason": err.Error()})
		return
	}
	c.Data(http.StatusOK, "application/json", result)
}

// OpenSchemaCheck POST /open/v1/schema/check  body: {url, expected_type?}
// 调工具执行层 check_schema，返回 JSON-LD 结构化数据校验报告
func OpenSchemaCheck(c *gin.Context) {
	client := getToolExecutor(c)
	if client == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "tool executor not configured"})
		return
	}
	var req struct {
		URL          string `json:"url" binding:"required"`
		ExpectedType string `json:"expected_type"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "reason": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 35*time.Second)
	defer cancel()
	result, err := client.SchemaCheck(ctx, req.URL, req.ExpectedType)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "tool execution failed", "reason": err.Error()})
		return
	}
	c.Data(http.StatusOK, "application/json", result)
}

// OpenSitemapSubmit POST /open/v1/sitemap/submit  body: {host, urls, indexnow_key}
// 调工具执行层 submit_sitemap，通过 IndexNow 提交到 Google/Bing
// D4 归属校验（T9.5）：host 必须属该 API key 绑定的 workspace——本步先不做，T9.5 补
func OpenSitemapSubmit(c *gin.Context) {
	client := getToolExecutor(c)
	if client == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "tool executor not configured"})
		return
	}
	var req struct {
		Host         string   `json:"host" binding:"required"`
		URLs         []string `json:"urls" binding:"required"`
		IndexNowKey  string   `json:"indexnow_key" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "reason": err.Error()})
		return
	}
	if len(req.URLs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "urls must not be empty"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 35*time.Second)
	defer cancel()
	result, err := client.SitemapSubmit(ctx, req.Host, req.URLs, req.IndexNowKey)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "tool execution failed", "reason": err.Error()})
		return
	}
	c.Data(http.StatusOK, "application/json", result)
}

// 保留 json/strings 引用（未来配额/审计可能用到）
var _ = json.RawMessage{}
var _ = strings.TrimSpace
