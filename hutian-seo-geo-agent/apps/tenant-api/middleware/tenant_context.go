// Package middleware — 多租户上下文中间件
//
// T6.2 落地（FR-T01/T05, NFR-T01）：
//   - 每个请求必须带明确的 tenant+workspace，无上下文不得访问任何业务数据
//   - 中间件从请求头解析 tenant_id+workspace_id，注入 gin.Context
//   - 无上下文请求业务接口 = 401/403，无"全局默认租户"旁路
//   - 篡改 workspace_id 到他租户 = 403（参数 workspace 须归属 ctx.tenant）
//
// 球门（开发计划铁律）：先立守门人，再写业务 CRUD。
// 任何业务查询都必须经过 TenantScope 强制 where tenant_id，无 ctx 走不到 DB。
package middleware

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// 上下文键
const (
	CtxTenantID     = "ctx.tenant_id"
	CtxWorkspaceID  = "ctx.workspace_id"
	CtxSeatID       = "ctx.seat_id"
	CtxDB           = "ctx.db"
	// 标记是否已通过上下文中间件（业务路由强制要求此标记存在）
	CtxAuthenticated = "ctx.tenant_authenticated"
)

// TenantContext 租户上下文中间件
// 从 X-Tenant-ID / X-Workspace-ID / X-Seat-ID 头解析，注入 context
// 缺 tenant_id 或 workspace_id → 401（无上下文）
// workspace_id 必须归属 tenant_id（查 DB 校验）→ 不归属 403
func TenantContext(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 健康检查/探针路由可豁免（在路由层用 NoRoute/Group 隔离）
		path := c.Request.URL.Path
		if path == "/healthz" || strings.HasPrefix(path, "/probe/") {
			c.Next()
			return
		}

		tenantIDStr := c.GetHeader("X-Tenant-ID")
		workspaceIDStr := c.GetHeader("X-Workspace-ID")
		seatIDStr := c.GetHeader("X-Seat-ID")

		if tenantIDStr == "" {
			abortNoContext(c, "missing X-Tenant-ID header")
			return
		}
		if workspaceIDStr == "" {
			abortNoContext(c, "missing X-Workspace-ID header")
			return
		}

		tenantID, err := strconv.ParseInt(tenantIDStr, 10, 64)
		if err != nil || tenantID <= 0 {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
				"error": "invalid X-Tenant-ID (must be positive int)",
			})
			return
		}
		workspaceID, err := strconv.ParseInt(workspaceIDStr, 10, 64)
		if err != nil || workspaceID <= 0 {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
				"error": "invalid X-Workspace-ID (must be positive int)",
			})
			return
		}

		// FR-T05: 校验 workspace 归属 tenant（防篡改越权）
		// 用 raw count 避免软删/状态干扰，只看归属关系
		var count int64
		if err := db.Table("workspaces").
			Where("id = ? AND tenant_id = ?", workspaceID, tenantID).
			Count(&count).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error": "verify workspace ownership failed",
			})
			return
		}
		if count == 0 {
			// workspace 不存在或不归属该 tenant → 403（FR-T05）
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "workspace does not belong to tenant",
			})
			return
		}

		c.Set(CtxTenantID, tenantID)
		c.Set(CtxWorkspaceID, workspaceID)
		c.Set(CtxDB, db)
		c.Set(CtxAuthenticated, true)

		if seatIDStr != "" {
			if seatID, err := strconv.ParseInt(seatIDStr, 10, 64); err == nil && seatID > 0 {
				c.Set(CtxSeatID, seatID)
			}
		}
		c.Next()
	}
}

func abortNoContext(c *gin.Context, reason string) {
	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
		"error":  "tenant context required",
		"reason": reason,
	})
}

// RequireTenantContext 业务路由用：强制要求已通过 TenantContext 中间件
// 用在路由组上，双保险——即使中间件漏挂，业务路由也拒
func RequireTenantContext() gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, ok := c.Get(CtxAuthenticated); !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "no tenant context — route requires TenantContext middleware",
			})
			return
		}
		c.Next()
	}
}

// MustTenantID 从 context 取 tenant_id，取不到 panic（编程错误，非运行时错误）
// 业务 handler 用此函数拿 tenant_id，确保不会无 ctx 查询
func MustTenantID(c *gin.Context) int64 {
	v, exists := c.Get(CtxTenantID)
	if !exists {
		panic("MustTenantID called without TenantContext middleware")
	}
	return v.(int64)
}

// MustWorkspaceID 从 context 取 workspace_id
func MustWorkspaceID(c *gin.Context) int64 {
	v, exists := c.Get(CtxWorkspaceID)
	if !exists {
		panic("MustWorkspaceID called without TenantContext middleware")
	}
	return v.(int64)
}

// MaybeSeatID 从 context 取 seat_id（可选，无则返 0）
func MaybeSeatID(c *gin.Context) int64 {
	if v, exists := c.Get(CtxSeatID); exists {
		if seatID, ok := v.(int64); ok {
			return seatID
		}
	}
	return 0
}
