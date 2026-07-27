// Package handlers — admin 后台 API handlers（平台视角，跨租户）
//
// 接缝（middleware/admin_context.go 已守）：
//   - 所有 handler 都已过 AdminContext 中间件（X-Admin-Token 验过）
//   - 用 RawRepo 跨租户查，不走 tenant scope
//   - 关键写操作（状态机/CRUD）落 audit_logs（NFR-T03）
//
// 响应约定：
//   - 成功：200/201 + {data: ...} 或 {data: [...], total, page, page_size}
//   - 失败：4xx/5xx + {error, reason}
//   - 状态机非法转移：400 + {error: "invalid transition", reason: "from X to Y not allowed"}
package handlers

import (
	"database/sql"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"hutian-tenant-api/middleware"
	"hutian-tenant-api/models"
)

// ────────────────────────────────────────────────
// 通用辅助
// ────────────────────────────────────────────────

// DB 从 gin.Context 取 *gorm.DB（main.go 在路由组注入）
func DB(c *gin.Context) *gorm.DB {
	return c.MustGet("db").(*gorm.DB)
}

// parsePagination 从 query 解析分页参数，默认 page=1, page_size=20
func parsePagination(c *gin.Context) (page, pageSize int) {
	page = 1
	pageSize = 20
	if v := c.Query("page"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			page = n
		}
	}
	if v := c.Query("page_size"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 100 {
			pageSize = n
		}
	}
	return
}

// offset 由 page/page_size 算 offset
func offset(page, pageSize int) int {
	return (page - 1) * pageSize
}

// writeAudit 落审计日志（NFR-T03，三元 + actor_kind）
// actorKind: "human"（admin 操作）/ "agent"（系统自动）
func writeAudit(c *gin.Context, db *gorm.DB, tenantID, workspaceID, seatID *int64,
	action, targetKind string, targetID *int64, meta string) {
	actor := middleware.MustAdminActor(c)
	log := models.AuditLog{
		ActorKind:  models.ActorKindHuman,
		Action:     action,
		TargetKind: targetKind,
		MetaJSON:   meta,
	}
	if tenantID != nil {
		log.TenantID = sqlNullInt64(*tenantID)
	}
	if workspaceID != nil {
		log.WorkspaceID = sqlNullInt64(*workspaceID)
	}
	if seatID != nil {
		log.SeatID = sqlNullInt64(*seatID)
	}
	if targetID != nil {
		log.TargetID = sqlNullInt64(*targetID)
	}
	// actor 写进 meta（admin 操作人）
	if actor != "" {
		if meta != "" {
			meta = strings.TrimSuffix(meta, "}")
			meta = meta + `,"actor":"` + actor + `"}`
		} else {
			meta = `{"actor":"` + actor + `"}`
		}
		log.MetaJSON = meta
	}
	db.Create(&log)
}

// sqlNullInt64 int64 → sql.NullInt64（valid=true）
func sqlNullInt64(v int64) sql.NullInt64 {
	return sql.NullInt64{Int64: v, Valid: true}
}

// ────────────────────────────────────────────────
// 1. 租户 CRUD + 状态机（FR-S04）
// ────────────────────────────────────────────────

// TenantListItem 列表项（含聚合字段：workspace 数、seat 数）
type TenantListItem struct {
	models.Tenant
	WorkspaceCount int64 `json:"workspace_count" gorm:"-"`
	SeatCount      int64 `json:"seat_count" gorm:"-"`
}

// ListTenants GET /admin/api/v1/tenants?status=&search=&page=&page_size=
func ListTenants(c *gin.Context) {
	db := DB(c)
	page, pageSize := parsePagination(c)

	q := db.Model(&models.Tenant{})

	// 状态过滤
	if status := c.Query("status"); status != "" {
		q = q.Where("status = ?", status)
	}
	// 搜索（name / slug / id）
	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		q = q.Where("display_name LIKE ? OR slug LIKE ? OR CAST(id AS CHAR) LIKE ?", like, like, like)
	}

	var total int64
	q.Count(&total)

	var items []TenantListItem
	if err := q.Order("created_at DESC").
		Offset(offset(page, pageSize)).Limit(pageSize).
		Find(&items).Error; err != nil {
		c.JSON(500, gin.H{"error": "list tenants failed", "reason": err.Error()})
		return
	}

	// 批量聚合 workspace 数 + seat 数
	if len(items) > 0 {
		ids := make([]int64, len(items))
		for i, t := range items {
			ids[i] = t.ID
		}
		type cnt struct {
			TenantID int64
			N        int64
		}
		var wsCnts, seatCnts []cnt
		db.Table("workspaces").Select("tenant_id, COUNT(*) as n").Where("tenant_id IN ?", ids).Group("tenant_id").Scan(&wsCnts)
		db.Table("seats").Select("tenant_id, COUNT(*) as n").Where("tenant_id IN ? AND status='active'", ids).Group("tenant_id").Scan(&seatCnts)
		wsMap, seatMap := map[int64]int64{}, map[int64]int64{}
		for _, x := range wsCnts {
			wsMap[x.TenantID] = x.N
		}
		for _, x := range seatCnts {
			seatMap[x.TenantID] = x.N
		}
		for i := range items {
			items[i].WorkspaceCount = wsMap[items[i].ID]
			items[i].SeatCount = seatMap[items[i].ID]
		}
	}

	c.JSON(200, gin.H{
		"data":      items,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// GetTenant GET /admin/api/v1/tenants/:id
func GetTenant(c *gin.Context) {
	db := DB(c)
	id := c.Param("id")
	var t models.Tenant
	if err := db.First(&t, id).Error; err != nil {
		c.JSON(404, gin.H{"error": "tenant not found"})
		return
	}
	// 附带 workspaces + subscription
	var ws []models.Workspace
	db.Where("tenant_id = ?", t.ID).Find(&ws)
	var sub models.Subscription
	subErr := db.Where("tenant_id = ?", t.ID).First(&sub).Error
	var seats []models.Seat
	db.Where("tenant_id = ?", t.ID).Find(&seats)

	resp := gin.H{"tenant": t, "workspaces": ws, "seats": seats}
	if subErr == nil {
		resp["subscription"] = sub
	}
	c.JSON(200, resp)
}

// CreateTenantReq 新建租户请求体
type CreateTenantReq struct {
	Slug        string `json:"slug" binding:"required"`
	DisplayName string `json:"display_name" binding:"required"`
	Status      string `json:"status"` // trial(默认) / active
	// 首个 workspace（可选）
	BrandName string `json:"brand_name"`
	Industry  string `json:"industry"`
	// 订阅初始值
	Plan       string `json:"plan"`        // free/pro/enterprise，默认 free
	SeatsLimit int    `json:"seats_limit"` // 默认 1
}

// CreateTenant POST /admin/api/v1/tenants
// 开号 = 建 tenant + 首个 workspace + subscription（事务）
func CreateTenant(c *gin.Context) {
	db := DB(c)
	var req CreateTenantReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "invalid body", "reason": err.Error()})
		return
	}
	// 默认值
	status := models.TenantStatusTrial
	if req.Status == "active" {
		status = models.TenantStatusActive
	}
	plan := models.PlanFree
	if req.Plan == "pro" || req.Plan == "enterprise" {
		plan = models.Plan(req.Plan)
	}
	if req.SeatsLimit <= 0 {
		req.SeatsLimit = 1
	}

	// 事务：tenant + workspace + subscription
	txErr := db.Transaction(func(tx *gorm.DB) error {
		t := models.Tenant{
			Slug:        req.Slug,
			DisplayName: req.DisplayName,
			Status:      status,
		}
		if err := tx.Create(&t).Error; err != nil {
			return err
		}
		// 首个 workspace（如果给了 brand_name）
		if req.BrandName != "" {
			// 找一个可用的 sitebase_instance（M6 预置：取第一个 healthy 的）
			var inst models.SitebaseInstance
			if err := tx.Where("health = ?", models.InstanceHealthHealthy).First(&inst).Error; err != nil {
				return err
			}
			ws := models.Workspace{
				TenantID:           t.ID,
				Slug:               "default",
				BrandName:          req.BrandName,
				Industry:           req.Industry,
				SitebaseInstanceID: inst.ID,
				Status:             models.WorkspaceStatusActive,
			}
			if err := tx.Create(&ws).Error; err != nil {
				return err
			}
		}
		// subscription
		sub := models.Subscription{
			TenantID:   t.ID,
			Plan:       plan,
			Status:     models.SubStatusTrial,
			SeatsLimit: req.SeatsLimit,
		}
		if status == models.TenantStatusActive {
			sub.Status = models.SubStatusActive
			now := time.Now()
			sub.CurrentPeriodStart = &now
			end := now.AddDate(0, 1, 0)
			sub.CurrentPeriodEnd = &end
		}
		if err := tx.Create(&sub).Error; err != nil {
			return err
		}
		// 回填 t 到外层
		c.Set("created_tenant_id", t.ID)
		return nil
	})
	if txErr != nil {
		c.JSON(500, gin.H{"error": "create tenant failed", "reason": txErr.Error()})
		return
	}

	tid, _ := c.Get("created_tenant_id")
	tenantID := tid.(int64)
	// 审计
	writeAudit(c, db, &tenantID, nil, nil, "tenant.created", "tenant", &tenantID,
		`{"slug":"`+req.Slug+`","status":"`+string(status)+`"}`)

	// 重新查回完整对象
	var t models.Tenant
	db.First(&t, tenantID)
	c.JSON(201, gin.H{"data": t})
}

// UpdateTenantReq 改基本信息（slug/display_name）
type UpdateTenantReq struct {
	Slug        *string `json:"slug"`
	DisplayName *string `json:"display_name"`
}

// UpdateTenant PATCH /admin/api/v1/tenants/:id
func UpdateTenant(c *gin.Context) {
	db := DB(c)
	id := c.Param("id")
	var t models.Tenant
	if err := db.First(&t, id).Error; err != nil {
		c.JSON(404, gin.H{"error": "tenant not found"})
		return
	}
	var req UpdateTenantReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "invalid body", "reason": err.Error()})
		return
	}
	updates := map[string]interface{}{}
	if req.Slug != nil && *req.Slug != "" {
		updates["slug"] = *req.Slug
	}
	if req.DisplayName != nil && *req.DisplayName != "" {
		updates["display_name"] = *req.DisplayName
	}
	if len(updates) == 0 {
		c.JSON(400, gin.H{"error": "no fields to update"})
		return
	}
	if err := db.Model(&t).Updates(updates).Error; err != nil {
		c.JSON(500, gin.H{"error": "update tenant failed", "reason": err.Error()})
		return
	}
	db.First(&t, t.ID)
	tid := t.ID
	writeAudit(c, db, &tid, nil, nil, "tenant.updated", "tenant", &tid, "")
	c.JSON(200, gin.H{"data": t})
}

// TransitionTenantStatusReq 状态机转移请求体
type TransitionTenantStatusReq struct {
	Status string `json:"status" binding:"required"`
	Reason string `json:"reason"` // 操作原因（写审计）
}

// validTenantTransitions 租户状态机合法转移白名单（FR-S04）
// trial→active/grace/suspended；active→grace/readonly/suspended；grace→active/readonly/suspended；
// readonly→active/suspended；suspended→active（仅人工解封）
var validTenantTransitions = map[string]map[string]bool{
	"trial":    {"active": true, "grace": true, "suspended": true},
	"active":   {"grace": true, "readonly": true, "suspended": true},
	"grace":    {"active": true, "readonly": true, "suspended": true},
	"readonly": {"active": true, "suspended": true},
	"suspended": {"active": true}, // 仅人工解封（NFR-T05）
}

// TransitionTenantStatus POST /admin/api/v1/tenants/:id/status
// 状态机转移：校验 from→to 合法，更新 + 写审计
func TransitionTenantStatus(c *gin.Context) {
	db := DB(c)
	id := c.Param("id")
	var t models.Tenant
	if err := db.First(&t, id).Error; err != nil {
		c.JSON(404, gin.H{"error": "tenant not found"})
		return
	}
	var req TransitionTenantStatusReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "invalid body", "reason": err.Error()})
		return
	}
	from := string(t.Status)
	to := req.Status
	if from == to {
		c.JSON(400, gin.H{"error": "invalid transition", "reason": "from == to (" + from + ")"})
		return
	}
	allowed, ok := validTenantTransitions[from]
	if !ok || !allowed[to] {
		c.JSON(400, gin.H{"error": "invalid transition", "reason": "from " + from + " to " + to + " not allowed"})
		return
	}
	if err := db.Model(&t).Update("status", to).Error; err != nil {
		c.JSON(500, gin.H{"error": "transition failed", "reason": err.Error()})
		return
	}
	db.First(&t, t.ID)
	tid := t.ID
	writeAudit(c, db, &tid, nil, nil, "tenant.status", "tenant", &tid,
		`{"from":"`+from+`","to":"`+to+`","reason":"`+req.Reason+`"}`)
	c.JSON(200, gin.H{"data": t})
}

// ────────────────────────────────────────────────
// 2. 订阅 CRUD + 状态机
// ────────────────────────────────────────────────

// ListSubscriptions GET /admin/api/v1/subscriptions?tenant_id=&status=&page=&page_size=
func ListSubscriptions(c *gin.Context) {
	db := DB(c)
	page, pageSize := parsePagination(c)
	q := db.Model(&models.Subscription{})
	if tid := c.Query("tenant_id"); tid != "" {
		q = q.Where("tenant_id = ?", tid)
	}
	if status := c.Query("status"); status != "" {
		q = q.Where("status = ?", status)
	}
	var total int64
	q.Count(&total)
	var items []models.Subscription
	q.Order("created_at DESC").Offset(offset(page, pageSize)).Limit(pageSize).Find(&items)
	c.JSON(200, gin.H{"data": items, "total": total, "page": page, "page_size": pageSize})
}

// GetSubscription GET /admin/api/v1/subscriptions/:id
func GetSubscription(c *gin.Context) {
	db := DB(c)
	var s models.Subscription
	if err := db.First(&s, c.Param("id")).Error; err != nil {
		c.JSON(404, gin.H{"error": "subscription not found"})
		return
	}
	c.JSON(200, gin.H{"data": s})
}

// UpdateSubscriptionReq 改订阅（plan/seats_limit/period/grace_days）
type UpdateSubscriptionReq struct {
	Plan                *string `json:"plan"`
	SeatsLimit          *int    `json:"seats_limit"`
	GraceDays           *int    `json:"grace_days"`
	CurrentPeriodStart  *string `json:"current_period_start"` // RFC3339
	CurrentPeriodEnd    *string `json:"current_period_end"`
	TrialEndsAt         *string `json:"trial_ends_at"`
}

// UpdateSubscription PATCH /admin/api/v1/subscriptions/:id
func UpdateSubscription(c *gin.Context) {
	db := DB(c)
	var s models.Subscription
	if err := db.First(&s, c.Param("id")).Error; err != nil {
		c.JSON(404, gin.H{"error": "subscription not found"})
		return
	}
	var req UpdateSubscriptionReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "invalid body", "reason": err.Error()})
		return
	}
	updates := map[string]interface{}{}
	if req.Plan != nil && (*req.Plan == "free" || *req.Plan == "pro" || *req.Plan == "enterprise") {
		updates["plan"] = *req.Plan
	}
	if req.SeatsLimit != nil && *req.SeatsLimit > 0 {
		updates["seats_limit"] = *req.SeatsLimit
	}
	if req.GraceDays != nil && *req.GraceDays >= 0 {
		updates["grace_days"] = *req.GraceDays
	}
	parseTime := func(s string) *time.Time {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			return &t
		}
		return nil
	}
	if req.CurrentPeriodStart != nil {
		if t := parseTime(*req.CurrentPeriodStart); t != nil {
			updates["current_period_start"] = *t
		}
	}
	if req.CurrentPeriodEnd != nil {
		if t := parseTime(*req.CurrentPeriodEnd); t != nil {
			updates["current_period_end"] = *t
		}
	}
	if req.TrialEndsAt != nil {
		if t := parseTime(*req.TrialEndsAt); t != nil {
			updates["trial_ends_at"] = *t
		}
	}
	if len(updates) == 0 {
		c.JSON(400, gin.H{"error": "no fields to update"})
		return
	}
	if err := db.Model(&s).Updates(updates).Error; err != nil {
		c.JSON(500, gin.H{"error": "update subscription failed", "reason": err.Error()})
		return
	}
	db.First(&s, s.ID)
	tid := s.TenantID
	sid := s.ID
	writeAudit(c, db, &tid, nil, nil, "subscription.updated", "subscription", &sid, "")
	c.JSON(200, gin.H{"data": s})
}

// TransitionSubStatusReq 订阅状态机转移
type TransitionSubStatusReq struct {
	Status string `json:"status" binding:"required"`
	Reason string `json:"reason"`
}

// validSubTransitions 订阅状态机（FR-S04：active→grace→readonly→suspended）
var validSubTransitions = map[string]map[string]bool{
	"trial":    {"active": true, "grace": true, "suspended": true, "canceled": true},
	"active":   {"grace": true, "readonly": true, "suspended": true, "canceled": true},
	"grace":    {"active": true, "readonly": true, "suspended": true, "canceled": true},
	"readonly": {"active": true, "suspended": true, "canceled": true},
	"suspended": {"active": true, "canceled": true},
	"canceled":  {}, // 终态，不可转
}

// TransitionSubscriptionStatus POST /admin/api/v1/subscriptions/:id/status
func TransitionSubscriptionStatus(c *gin.Context) {
	db := DB(c)
	var s models.Subscription
	if err := db.First(&s, c.Param("id")).Error; err != nil {
		c.JSON(404, gin.H{"error": "subscription not found"})
		return
	}
	var req TransitionSubStatusReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "invalid body", "reason": err.Error()})
		return
	}
	from := string(s.Status)
	to := req.Status
	if from == to {
		c.JSON(400, gin.H{"error": "invalid transition", "reason": "from == to"})
		return
	}
	allowed, ok := validSubTransitions[from]
	if !ok || !allowed[to] {
		c.JSON(400, gin.H{"error": "invalid transition", "reason": "from " + from + " to " + to + " not allowed"})
		return
	}
	if err := db.Model(&s).Update("status", to).Error; err != nil {
		c.JSON(500, gin.H{"error": "transition failed", "reason": err.Error()})
		return
	}
	db.First(&s, s.ID)
	tid := s.TenantID
	sid := s.ID
	writeAudit(c, db, &tid, nil, nil, "subscription.status", "subscription", &sid,
		`{"from":"`+from+`","to":"`+to+`","reason":"`+req.Reason+`"}`)
	c.JSON(200, gin.H{"data": s})
}

// ────────────────────────────────────────────────
// 3. 配额查询（usage_meters + plan_quotas 联读）
// ────────────────────────────────────────────────

// QuotaUsageRow 配额用量行（tenant + meter_kind + 当前周期用量 + plan 上限）
type QuotaUsageRow struct {
	TenantID      int64  `json:"tenant_id"`
	TenantName    string `json:"tenant_name"`
	MeterKind     string `json:"meter_kind"`
	WindowStart   time.Time `json:"window_start"`
	Count         int64  `json:"count"`
	Plan          string `json:"plan"`
	LimitPerWindow int64 `json:"limit_per_window"`
	WindowKind    string `json:"window_kind"`
	OveragePolicy string `json:"overage_policy"`
}

// ListQuotas GET /admin/api/v1/quotas?tenant_id=&page=&page_size=
// 列出所有租户的本月配额用量（联 plan_quotas）
func ListQuotas(c *gin.Context) {
	db := DB(c)
	page, pageSize := parsePagination(c)

	// 当月窗口起点
	now := time.Now()
	windowStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	q := db.Table("usage_meters AS u").
		Select(`u.tenant_id, t.display_name AS tenant_name, u.meter_kind, u.window_start, u.count,
			s.plan, pq.limit_per_window, pq.window_kind, pq.overage_policy`).
		Joins("LEFT JOIN tenants t ON t.id = u.tenant_id").
		Joins("LEFT JOIN subscriptions s ON s.tenant_id = u.tenant_id").
		Joins("LEFT JOIN plan_quotas pq ON pq.plan = s.plan AND pq.meter_kind = u.meter_kind AND pq.window_kind = 'month'").
		Where("u.window_start = ?", windowStart)

	if tid := c.Query("tenant_id"); tid != "" {
		q = q.Where("u.tenant_id = ?", tid)
	}

	var total int64
	q.Count(&total)
	var rows []QuotaUsageRow
	q.Order("u.tenant_id, u.meter_kind").
		Offset(offset(page, pageSize)).Limit(pageSize).Scan(&rows)

	c.JSON(200, gin.H{"data": rows, "total": total, "page": page, "page_size": pageSize, "window_start": windowStart})
}

// ListPlanQuotas GET /admin/api/v1/quotas/plans
// 列出所有套餐配额定义（平台级）
func ListPlanQuotas(c *gin.Context) {
	db := DB(c)
	var rows []models.PlanQuota
	db.Order("plan, meter_kind, window_kind").Find(&rows)
	c.JSON(200, gin.H{"data": rows})
}

// ────────────────────────────────────────────────
// 4. 工作空间 CRUD
// ────────────────────────────────────────────────

// ListWorkspaces GET /admin/api/v1/workspaces?tenant_id=&status=&page=&page_size=
func ListWorkspaces(c *gin.Context) {
	db := DB(c)
	page, pageSize := parsePagination(c)
	q := db.Model(&models.Workspace{})
	if tid := c.Query("tenant_id"); tid != "" {
		q = q.Where("tenant_id = ?", tid)
	}
	if status := c.Query("status"); status != "" {
		q = q.Where("status = ?", status)
	}
	var total int64
	q.Count(&total)
	var items []models.Workspace
	q.Order("created_at DESC").Offset(offset(page, pageSize)).Limit(pageSize).Find(&items)
	c.JSON(200, gin.H{"data": items, "total": total, "page": page, "page_size": pageSize})
}

// GetWorkspace GET /admin/api/v1/workspaces/:id
func GetWorkspace(c *gin.Context) {
	db := DB(c)
	var ws models.Workspace
	if err := db.First(&ws, c.Param("id")).Error; err != nil {
		c.JSON(404, gin.H{"error": "workspace not found"})
		return
	}
	// 附带 sitebase_instance
	var inst models.SitebaseInstance
	db.First(&inst, ws.SitebaseInstanceID)
	c.JSON(200, gin.H{"data": ws, "sitebase_instance": inst})
}

// CreateWorkspaceReq 新建 workspace
type CreateWorkspaceReq struct {
	TenantID           int64  `json:"tenant_id" binding:"required"`
	Slug               string `json:"slug" binding:"required"`
	BrandName          string `json:"brand_name" binding:"required"`
	Industry           string `json:"industry"`
	SitebaseInstanceID int64  `json:"sitebase_instance_id" binding:"required"`
	FallbackCopyJSON   string `json:"fallback_copy_json"` // JSON 串
}

// CreateWorkspace POST /admin/api/v1/workspaces
func CreateWorkspace(c *gin.Context) {
	db := DB(c)
	var req CreateWorkspaceReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "invalid body", "reason": err.Error()})
		return
	}
	// 校验 tenant 存在
	var cnt int64
	db.Model(&models.Tenant{}).Where("id = ?", req.TenantID).Count(&cnt)
	if cnt == 0 {
		c.JSON(400, gin.H{"error": "tenant_id not found"})
		return
	}
	ws := models.Workspace{
		TenantID:           req.TenantID,
		Slug:               req.Slug,
		BrandName:          req.BrandName,
		Industry:           req.Industry,
		SitebaseInstanceID: req.SitebaseInstanceID,
		FallbackCopyJSON:   req.FallbackCopyJSON,
		Status:             models.WorkspaceStatusActive,
	}
	if err := db.Create(&ws).Error; err != nil {
		c.JSON(500, gin.H{"error": "create workspace failed", "reason": err.Error()})
		return
	}
	tid := ws.TenantID
	wid := ws.ID
	writeAudit(c, db, &tid, &wid, nil, "workspace.created", "workspace", &wid,
		`{"slug":"`+req.Slug+`","brand":"`+req.BrandName+`"}`)
	c.JSON(201, gin.H{"data": ws})
}

// UpdateWorkspaceReq 改 workspace（brand_name/industry/fallback_copy/status）
type UpdateWorkspaceReq struct {
	BrandName        *string `json:"brand_name"`
	Industry         *string `json:"industry"`
	FallbackCopyJSON *string `json:"fallback_copy_json"`
	Status           *string `json:"status"`
}

// UpdateWorkspace PATCH /admin/api/v1/workspaces/:id
func UpdateWorkspace(c *gin.Context) {
	db := DB(c)
	var ws models.Workspace
	if err := db.First(&ws, c.Param("id")).Error; err != nil {
		c.JSON(404, gin.H{"error": "workspace not found"})
		return
	}
	var req UpdateWorkspaceReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "invalid body", "reason": err.Error()})
		return
	}
	updates := map[string]interface{}{}
	if req.BrandName != nil && *req.BrandName != "" {
		updates["brand_name"] = *req.BrandName
	}
	if req.Industry != nil {
		updates["industry"] = *req.Industry
	}
	if req.FallbackCopyJSON != nil {
		updates["fallback_copy_json"] = *req.FallbackCopyJSON
	}
	if req.Status != nil && (*req.Status == "active" || *req.Status == "archived") {
		updates["status"] = *req.Status
	}
	if len(updates) == 0 {
		c.JSON(400, gin.H{"error": "no fields to update"})
		return
	}
	if err := db.Model(&ws).Updates(updates).Error; err != nil {
		c.JSON(500, gin.H{"error": "update workspace failed", "reason": err.Error()})
		return
	}
	db.First(&ws, ws.ID)
	tid := ws.TenantID
	wid := ws.ID
	writeAudit(c, db, &tid, &wid, nil, "workspace.updated", "workspace", &wid, "")
	c.JSON(200, gin.H{"data": ws})
}

// ────────────────────────────────────────────────
// 5. 审计日志查询（NFR-T03）
// ────────────────────────────────────────────────

// ListAuditLogs GET /admin/api/v1/audit-logs?tenant_id=&workspace_id=&actor_kind=&action=&page=&page_size=
func ListAuditLogs(c *gin.Context) {
	db := DB(c)
	page, pageSize := parsePagination(c)
	q := db.Model(&models.AuditLog{})
	if tid := c.Query("tenant_id"); tid != "" {
		q = q.Where("tenant_id = ?", tid)
	}
	if wid := c.Query("workspace_id"); wid != "" {
		q = q.Where("workspace_id = ?", wid)
	}
	if ak := c.Query("actor_kind"); ak != "" {
		q = q.Where("actor_kind = ?", ak)
	}
	if action := c.Query("action"); action != "" {
		q = q.Where("action LIKE ?", action+"%")
	}
	var total int64
	q.Count(&total)
	var items []models.AuditLog
	q.Order("created_at DESC").Offset(offset(page, pageSize)).Limit(pageSize).Find(&items)
	c.JSON(200, gin.H{"data": items, "total": total, "page": page, "page_size": pageSize})
}

// ────────────────────────────────────────────────
// 6. 总览聚合（KPI + 状态分布）
// ────────────────────────────────────────────────

// OverviewResp 总览响应
type OverviewResp struct {
	// KPI 5 指标
	ActiveTenants    int64 `json:"active_tenants"`    // 活跃租户（status=active）
	TrialTenants     int64 `json:"trial_tenants"`     // 试用中（status=trial）
	GraceTenants     int64 `json:"grace_tenants"`     // 将到期/grace
	SuspendedTenants int64 `json:"suspended_tenants"` // 已封停
	TotalTenants     int64 `json:"total_tenants"`     // 租户总数
	// 状态分布（按 status 分组）
	StatusDistribution []StatusCount `json:"status_distribution"`
	// 本月诊断调用（usage_meters meter_kind=llm_calls + seo_audits 等，求和）
	MonthlyToolCalls int64 `json:"monthly_tool_calls"`
}

// StatusCount 状态分布项
type StatusCount struct {
	Status string `json:"status"`
	Count  int64  `json:"count"`
}

// GetOverview GET /admin/api/v1/overview
func GetOverview(c *gin.Context) {
	db := DB(c)
	var resp OverviewResp

	db.Model(&models.Tenant{}).Where("status = ?", "active").Count(&resp.ActiveTenants)
	db.Model(&models.Tenant{}).Where("status = ?", "trial").Count(&resp.TrialTenants)
	db.Model(&models.Tenant{}).Where("status IN ?", []string{"grace", "readonly"}).Count(&resp.GraceTenants)
	db.Model(&models.Tenant{}).Where("status = ?", "suspended").Count(&resp.SuspendedTenants)
	db.Model(&models.Tenant{}).Count(&resp.TotalTenants)

	// 状态分布
	db.Model(&models.Tenant{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(&resp.StatusDistribution)

	// 本月工具调用（所有 meter_kind 求和）
	now := time.Now()
	windowStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	db.Model(&models.UsageMeter{}).
		Where("window_start = ?", windowStart).
		Select("COALESCE(SUM(count),0)").
		Scan(&resp.MonthlyToolCalls)

	c.JSON(200, gin.H{"data": resp})
}

// ────────────────────────────────────────────────
// 7. 席位管理（FR-S02）
// ────────────────────────────────────────────────

// ListSeats GET /admin/api/v1/seats?tenant_id=&status=&page=&page_size=
func ListSeats(c *gin.Context) {
	db := DB(c)
	page, pageSize := parsePagination(c)
	q := db.Model(&models.Seat{})
	if tid := c.Query("tenant_id"); tid != "" {
		q = q.Where("tenant_id = ?", tid)
	}
	if status := c.Query("status"); status != "" {
		q = q.Where("status = ?", status)
	}
	var total int64
	q.Count(&total)
	var items []models.Seat
	q.Order("created_at DESC").Offset(offset(page, pageSize)).Limit(pageSize).Find(&items)
	c.JSON(200, gin.H{"data": items, "total": total, "page": page, "page_size": pageSize})
}

// CreateSeatReq 加成员
type CreateSeatReq struct {
	TenantID int64  `json:"tenant_id" binding:"required"`
	UserID   int64  `json:"user_id" binding:"required"`
	Role     string `json:"role"` // owner/admin/member，默认 member
}

// CreateSeat POST /admin/api/v1/seats
// 校验 active 席位数 ≤ subscriptions.seats_limit（FR-S02）
func CreateSeat(c *gin.Context) {
	db := DB(c)
	var req CreateSeatReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "invalid body", "reason": err.Error()})
		return
	}
	role := models.SeatRoleMember
	if req.Role == "owner" || req.Role == "admin" {
		role = models.SeatRole(req.Role)
	}
	// 校验 tenant 存在
	var t models.Tenant
	if err := db.First(&t, req.TenantID).Error; err != nil {
		c.JSON(400, gin.H{"error": "tenant not found"})
		return
	}
	// 校验 active 席位不超限
	var sub models.Subscription
	if err := db.Where("tenant_id = ?", req.TenantID).First(&sub).Error; err != nil {
		c.JSON(400, gin.H{"error": "subscription not found for tenant"})
		return
	}
	var activeSeats int64
	db.Model(&models.Seat{}).Where("tenant_id = ? AND status = ?", req.TenantID, models.SeatStatusActive).Count(&activeSeats)
	if int(activeSeats) >= sub.SeatsLimit {
		c.JSON(409, gin.H{"error": "seats_limit exceeded", "reason": "active seats will exceed plan limit, ask tenant to upgrade"})
		return
	}
	seat := models.Seat{
		TenantID: req.TenantID,
		UserID:   req.UserID,
		Role:     role,
		Status:   models.SeatStatusActive,
	}
	if err := db.Create(&seat).Error; err != nil {
		c.JSON(500, gin.H{"error": "create seat failed", "reason": err.Error()})
		return
	}
	tid := seat.TenantID
	sid := seat.ID
	writeAudit(c, db, &tid, nil, &sid, "seat.created", "seat", &sid,
		`{"user_id":`+strconv.FormatInt(req.UserID, 10)+`,"role":"`+string(role)+`"}`)
	c.JSON(201, gin.H{"data": seat})
}

// UpdateSeatReq 改角色/状态
type UpdateSeatReq struct {
	Role   *string `json:"role"`
	Status *string `json:"status"`
}

// UpdateSeat PATCH /admin/api/v1/seats/:id
func UpdateSeat(c *gin.Context) {
	db := DB(c)
	var seat models.Seat
	if err := db.First(&seat, c.Param("id")).Error; err != nil {
		c.JSON(404, gin.H{"error": "seat not found"})
		return
	}
	var req UpdateSeatReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "invalid body", "reason": err.Error()})
		return
	}
	updates := map[string]interface{}{}
	if req.Role != nil && (*req.Role == "owner" || *req.Role == "admin" || *req.Role == "member") {
		updates["role"] = *req.Role
	}
	if req.Status != nil && (*req.Status == "active" || *req.Status == "disabled") {
		updates["status"] = *req.Status
	}
	if len(updates) == 0 {
		c.JSON(400, gin.H{"error": "no fields to update"})
		return
	}
	if err := db.Model(&seat).Updates(updates).Error; err != nil {
		c.JSON(500, gin.H{"error": "update seat failed", "reason": err.Error()})
		return
	}
	db.First(&seat, seat.ID)
	tid := seat.TenantID
	sid := seat.ID
	writeAudit(c, db, &tid, nil, &sid, "seat.updated", "seat", &sid, "")
	c.JSON(200, gin.H{"data": seat})
}

// ────────────────────────────────────────────────
// 8. 凭证视图（只读元信息 + 轮换/吊销，绝不出明文 NFR-T02）
// ────────────────────────────────────────────────

// CredentialView 凭证视图（绝不含 encrypted_secret / token_cache_encrypted）
type CredentialView struct {
	ID            int64      `json:"id"`
	WorkspaceID   int64      `json:"workspace_id"`
	AuthKind      string     `json:"auth_kind"`
	KeyVersion    int        `json:"key_version"`
	Username      string     `json:"username"`
	ExpiresAt     *time.Time `json:"expires_at,omitempty"`
	LastRotatedAt *time.Time `json:"last_rotated_at,omitempty"`
	Status        string     `json:"status"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// ListCredentials GET /admin/api/v1/credentials?workspace_id=&status=
// 只读元信息——绝不返 encrypted_secret（model 已 json:"-"，这里显式选字段双保险）
func ListCredentials(c *gin.Context) {
	db := DB(c)
	page, pageSize := parsePagination(c)
	q := db.Model(&models.TenantCredential{})
	if wid := c.Query("workspace_id"); wid != "" {
		q = q.Where("workspace_id = ?", wid)
	}
	if status := c.Query("status"); status != "" {
		q = q.Where("status = ?", status)
	}
	var total int64
	q.Count(&total)
	var rows []CredentialView
	q.Select("id, workspace_id, auth_kind, key_version, username, expires_at, last_rotated_at, status, created_at, updated_at").
		Order("created_at DESC").
		Offset(offset(page, pageSize)).Limit(pageSize).
		Scan(&rows)
	c.JSON(200, gin.H{"data": rows, "total": total, "page": page, "page_size": pageSize})
}

// RotateCredential POST /admin/api/v1/credentials/:id/rotate
// 触发轮换——M6 占位：标记 status=rotating，实际加密轮换留 T6.5
// 真实轮换逻辑（重加密 secret + 递增 key_version）在 T6.5 实现
func RotateCredential(c *gin.Context) {
	db := DB(c)
	var cred models.TenantCredential
	if err := db.First(&cred, c.Param("id")).Error; err != nil {
		c.JSON(404, gin.H{"error": "credential not found"})
		return
	}
	if cred.Status == models.CredentialStatusRevoked {
		c.JSON(409, gin.H{"error": "cannot rotate revoked credential"})
		return
	}
	// M6 占位：标记 rotating + 写审计。真实轮换在 T6.5
	now := time.Now()
	if err := db.Model(&cred).Updates(map[string]interface{}{
		"status":          models.CredentialStatusRotating,
		"last_rotated_at": now,
	}).Error; err != nil {
		c.JSON(500, gin.H{"error": "rotate failed", "reason": err.Error()})
		return
	}
	wid := cred.WorkspaceID
	id := cred.ID
	writeAudit(c, db, nil, &wid, nil, "credential.rotate", "credential", &id,
		`{"key_version":`+strconv.Itoa(cred.KeyVersion)+`}`)
	// 返回视图，不出明文
	db.First(&cred, cred.ID)
	c.JSON(200, gin.H{"data": CredentialView{
		ID: cred.ID, WorkspaceID: cred.WorkspaceID, AuthKind: string(cred.AuthKind),
		KeyVersion: cred.KeyVersion, Username: cred.Username,
		ExpiresAt: cred.ExpiresAt, LastRotatedAt: cred.LastRotatedAt,
		Status: string(cred.Status), CreatedAt: cred.CreatedAt, UpdatedAt: cred.UpdatedAt,
	}})
}

// RevokeCredential POST /admin/api/v1/credentials/:id/revoke
func RevokeCredential(c *gin.Context) {
	db := DB(c)
	var cred models.TenantCredential
	if err := db.First(&cred, c.Param("id")).Error; err != nil {
		c.JSON(404, gin.H{"error": "credential not found"})
		return
	}
	if cred.Status == models.CredentialStatusRevoked {
		c.JSON(409, gin.H{"error": "already revoked"})
		return
	}
	if err := db.Model(&cred).Update("status", models.CredentialStatusRevoked).Error; err != nil {
		c.JSON(500, gin.H{"error": "revoke failed", "reason": err.Error()})
		return
	}
	wid := cred.WorkspaceID
	id := cred.ID
	writeAudit(c, db, nil, &wid, nil, "credential.revoke", "credential", &id, "")
	c.JSON(200, gin.H{"data": gin.H{"id": cred.ID, "status": "revoked"}})
}
