package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"hutian-seo-geo-agent/apps/tenant-api/models"
)

// ProjectEventsHandler 项目事件处理器（T15.3 排名趋势存储）
type ProjectEventsHandler struct {
	db *gorm.DB
}

// NewProjectEventsHandler 创建项目事件处理器
func NewProjectEventsHandler(db *gorm.DB) *ProjectEventsHandler {
	return &ProjectEventsHandler{db: db}
}

// StoreProjectEventRequest 存储项目事件请求
type StoreProjectEventRequest struct {
	TenantID    int64  `json:"tenant_id" binding:"required"`
	WorkspaceID int64  `json:"workspace_id" binding:"required"`
	Kind        string `json:"kind" binding:"required"`
	Payload     string `json:"payload" binding:"required"`
	SourceTool  string `json:"source_tool"`
	EventTime   string `json:"event_time"` // ISO 8601
}

// StoreProjectEvent 存储项目事件（POST /internal/project-events）
func (h *ProjectEventsHandler) StoreProjectEvent(c *gin.Context) {
	var req StoreProjectEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 验证 kind
	validKinds := map[string]bool{
		"serp_rank_snapshot": true,
		"crawl_audit":        true,
		"content_gap":        true,
	}
	if !validKinds[req.Kind] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid kind"})
		return
	}

	// 解析 event_time
	eventTime := time.Now()
	if req.EventTime != "" {
		parsed, err := time.Parse(time.RFC3339, req.EventTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid event_time format"})
			return
		}
		eventTime = parsed
	}

	// 创建事件
	event := models.ProjectEvent{
		TenantID:    req.TenantID,
		WorkspaceID: req.WorkspaceID,
		Kind:        models.ProjectEventKind(req.Kind),
		EventTime:   eventTime,
		Payload:     req.Payload,
		SourceTool:  req.SourceTool,
	}

	if err := h.db.Create(&event).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"event_id": event.ID,
		"message":  "Project event stored successfully",
	})
}

// QueryProjectEvents 查询项目事件（GET /internal/project-events）
func (h *ProjectEventsHandler) QueryProjectEvents(c *gin.Context) {
	// 解析查询参数
	tenantIDStr := c.Query("tenant_id")
	workspaceIDStr := c.Query("workspace_id")
	kind := c.Query("kind")
	startTimeStr := c.Query("start_time")
	endTimeStr := c.Query("end_time")
	limitStr := c.Query("limit")

	if tenantIDStr == "" || workspaceIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id and workspace_id are required"})
		return
	}

	tenantID, err := strconv.ParseInt(tenantIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tenant_id"})
		return
	}

	workspaceID, err := strconv.ParseInt(workspaceIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid workspace_id"})
		return
	}

	limit := 100
	if limitStr != "" {
		parsed, err := strconv.Atoi(limitStr)
		if err != nil || parsed <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid limit"})
			return
		}
		limit = parsed
	}

	// 构造查询
	query := h.db.Where("tenant_id = ? AND workspace_id = ?", tenantID, workspaceID)

	if kind != "" {
		query = query.Where("kind = ?", kind)
	}

	if startTimeStr != "" {
		startTime, err := time.Parse(time.RFC3339, startTimeStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_time format"})
			return
		}
		query = query.Where("event_time >= ?", startTime)
	}

	if endTimeStr != "" {
		endTime, err := time.Parse(time.RFC3339, endTimeStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_time format"})
			return
		}
		query = query.Where("event_time <= ?", endTime)
	}

	// 查询事件
	var events []models.ProjectEvent
	if err := query.Order("event_time DESC").Limit(limit).Find(&events).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 转换为响应格式
	type EventResponse struct {
		ID         int64  `json:"id"`
		TenantID   int64  `json:"tenant_id"`
		WorkspaceID int64 `json:"workspace_id"`
		Kind       string `json:"kind"`
		EventTime  string `json:"event_time"`
		Payload    string `json:"payload"`
		SourceTool string `json:"source_tool"`
		CreatedAt  string `json:"created_at"`
	}

	eventsResp := make([]EventResponse, len(events))
	for i, e := range events {
		eventsResp[i] = EventResponse{
			ID:          e.ID,
			TenantID:    e.TenantID,
			WorkspaceID: e.WorkspaceID,
			Kind:        string(e.Kind),
			EventTime:   e.EventTime.Format(time.RFC3339),
			Payload:     e.Payload,
			SourceTool:  e.SourceTool,
			CreatedAt:   e.CreatedAt.Format(time.RFC3339),
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"events": eventsResp,
	})
}

// GetEventTrend 获取特定指标的趋势数据（GET /internal/project-events/trend）
func (h *ProjectEventsHandler) GetEventTrend(c *gin.Context) {
	// 这个端点可以后续实现，当前通过 MCP 工具 get_event_trend 在 Python 侧实现
	// 如果需要高性能，可以在 Go 侧实现 JSONPath 提取
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Use MCP tool get_event_trend instead",
	})
}

// RegisterRoutes 注册项目事件路由
func (h *ProjectEventsHandler) RegisterRoutes(r *gin.RouterGroup) {
	internal := r.Group("/internal")
	{
		internal.POST("/project-events", h.StoreProjectEvent)
		internal.GET("/project-events", h.QueryProjectEvents)
		internal.GET("/project-events/trend", h.GetEventTrend)
	}
}
