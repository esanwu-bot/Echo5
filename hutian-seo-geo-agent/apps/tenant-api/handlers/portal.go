// Package handlers — 租户自服务后台接口族（链①：tenant-api 直查 hutian 元数据，不签 ADR 内部 token）
//
// 所有端点强制过 TenantJWTContext 四合一鉴权（T7.2），从 ctx 取 tenant/workspace/seat/user，
// 绝不信任请求体里的 tenant_id/workspace_id。
package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"hutian-tenant-api/auth"
	"hutian-tenant-api/middleware"
	"hutian-tenant-api/models"
)

// ────────────────────────────────────────────────
// 请求/响应结构
// ────────────────────────────────────────────────

type LoginRequest struct {
	Email         string `json:"email" binding:"required,email"`
	Password      string `json:"password" binding:"required"`
	TenantSlug    string `json:"tenant_slug" binding:"required"`
	WorkspaceSlug string `json:"workspace_slug" binding:"required"`
}

type LoginResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
	UserID      int64  `json:"user_id"`
	SeatID      int64  `json:"seat_id"`
	TenantID    int64  `json:"tenant_id"`
	WorkspaceID int64  `json:"workspace_id"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
}

type MeResponse struct {
	ID          int64  `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
	Status      string `json:"status"`
	TenantID    int64  `json:"tenant_id"`
	WorkspaceID int64  `json:"workspace_id"`
	SeatID      int64  `json:"seat_id"`
	Role        string `json:"role"`
}

type WorkspaceResponse struct {
	ID               int64  `json:"id"`
	Slug             string `json:"slug"`
	BrandName        string `json:"brand_name"`
	Industry         string `json:"industry"`
	SitebaseInstanceID int64 `json:"sitebase_instance_id"`
	FallbackCopyJSON string `json:"fallback_copy_json"`
	Status           string `json:"status"`
	CreatedAt        string `json:"created_at"`
	UpdatedAt        string `json:"updated_at"`
}

type UpdateWorkspaceRequest struct {
	BrandName        string `json:"brand_name" binding:"required,max=128"`
	Industry         string `json:"industry" binding:"max=64"`
	FallbackCopyJSON string `json:"fallback_copy_json" binding:"max=4096"`
}

type SeatResponse struct {
	ID          int64  `json:"id"`
	UserID      int64  `json:"user_id"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
	Role        string `json:"role"`
	Status      string `json:"status"`
	CreatedAt   string `json:"created_at"`
}

type InviteSeatRequest struct {
	Email string `json:"email" binding:"required,email"`
	Role  string `json:"role" binding:"required,oneof=admin member"`
}

type UpdateSeatRequest struct {
	Role   string `json:"role" binding:"omitempty,oneof=owner admin member"`
	Status string `json:"status" binding:"omitempty,oneof=active disabled"`
}

type SubscriptionResponse struct {
	ID                 int64   `json:"id"`
	Plan               string  `json:"plan"`
	Status             string  `json:"status"`
	SeatsLimit         int     `json:"seats_limit"`
	CurrentPeriodStart *string `json:"current_period_start"`
	CurrentPeriodEnd   *string `json:"current_period_end"`
	TrialEndsAt        *string `json:"trial_ends_at"`
	GraceDays          int     `json:"grace_days"`
}

type UsageResponse struct {
	MeterKind      string `json:"meter_kind"`
	WindowStart    string `json:"window_start"`
	Count          int64  `json:"count"`
	Limit          int64  `json:"limit"`
	WindowKind     string `json:"window_kind"`
	OveragePolicy  string `json:"overage_policy"`
}

type CredentialResponse struct {
	ID            int64   `json:"id"`
	WorkspaceID   int64   `json:"workspace_id"`
	AuthKind      string  `json:"auth_kind"`
	KeyVersion    int     `json:"key_version"`
	Username      string  `json:"username"`
	ExpiresAt     *string `json:"expires_at"`
	LastRotatedAt *string `json:"last_rotated_at"`
	Status        string  `json:"status"`
	CreatedAt     string  `json:"created_at"`
}

type AuditLogResponse struct {
	ID          int64  `json:"id"`
	CreatedAt   string `json:"created_at"`
	ActorKind   string `json:"actor_kind"`
	Action      string `json:"action"`
	TargetKind  string `json:"target_kind"`
	TargetID    int64  `json:"target_id"`
	SeatID      int64  `json:"seat_id"`
	MetaJSON    string `json:"meta_json"`
}

// ────────────────────────────────────────────────
// 登录（公开端点）
// ────────────────────────────────────────────────

func TenantLogin(db *gorm.DB, signer *auth.Signer) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "reason": err.Error()})
			return
		}

		var user models.User
		if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
			return
		}
		if user.Status != models.UserStatusActive {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "user disabled or inactive"})
			return
		}
		if !auth.CheckPassword(req.Password, user.PasswordHash) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
			return
		}

		var tenant models.Tenant
		if err := db.Where("slug = ?", req.TenantSlug).First(&tenant).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid tenant"})
			return
		}

		var workspace models.Workspace
		if err := db.Where("slug = ? AND tenant_id = ?", req.WorkspaceSlug, tenant.ID).
			First(&workspace).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid workspace"})
			return
		}

		var seat models.Seat
		if err := db.Where("tenant_id = ? AND user_id = ? AND status = ?",
			tenant.ID, user.ID, models.SeatStatusActive).
			First(&seat).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "seat inactive or not found"})
			return
		}

		var sub models.Subscription
		if err := db.Where("tenant_id = ?", tenant.ID).First(&sub).Error; err == nil {
			switch sub.Status {
			case models.SubStatusSuspended, models.SubStatusReadonly, models.SubStatusCanceled:
				c.JSON(http.StatusForbidden, gin.H{"error": "tenant subscription suspended/readonly/canceled"})
				return
			}
		}

		tok, err := signer.Issue(user.ID, seat.ID, tenant.ID, workspace.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "issue token failed"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"data": LoginResponse{
			AccessToken: tok,
			TokenType:   "Bearer",
			ExpiresIn:   int(auth.TokenLifetime.Seconds()),
			UserID:      user.ID,
			SeatID:      seat.ID,
			TenantID:    tenant.ID,
			WorkspaceID: workspace.ID,
			Email:       user.Email,
			DisplayName: user.DisplayName,
		}})
	}
}

// ────────────────────────────────────────────────
// 上下文工具
// ────────────────────────────────────────────────

func portalCtx(c *gin.Context) (*gin.Context, *gorm.DB, int64, int64, int64, int64) {
	dbRaw, _ := c.Get(middleware.CtxDB)
	db := dbRaw.(*gorm.DB)
	return c, db,
		c.GetInt64(middleware.CtxUserID),
		c.GetInt64(middleware.CtxSeatID),
		c.GetInt64(middleware.CtxTenantID),
		c.GetInt64(middleware.CtxWorkspaceID)
}

func loadSeatRole(db *gorm.DB, seatID int64) (models.SeatRole, error) {
	var seat models.Seat
	if err := db.Select("role").First(&seat, seatID).Error; err != nil {
		return "", err
	}
	return seat.Role, nil
}

func requireAdminOrOwner(c *gin.Context, db *gorm.DB, seatID int64) bool {
	role, err := loadSeatRole(db, seatID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "load seat failed"})
		return false
	}
	if role != models.SeatRoleOwner && role != models.SeatRoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "permission denied: owner or admin required"})
		return false
	}
	return true
}

// ────────────────────────────────────────────────
// 1. 我的工作台（个人资料）
// ────────────────────────────────────────────────

func TenantMe(c *gin.Context) {
	_, db, userID, seatID, tenantID, workspaceID := portalCtx(c)

	var user models.User
	if err := db.Select("id, email, display_name, status").First(&user, userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "load user failed"})
		return
	}
	var seat models.Seat
	if err := db.Select("role").First(&seat, seatID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "load seat failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": MeResponse{
		ID:          user.ID,
		Email:       user.Email,
		DisplayName: user.DisplayName,
		Status:      string(user.Status),
		TenantID:    tenantID,
		WorkspaceID: workspaceID,
		SeatID:      seatID,
		Role:        string(seat.Role),
	}})
}

// ────────────────────────────────────────────────
// 2. 站点设置
// ────────────────────────────────────────────────

func TenantGetWorkspace(c *gin.Context) {
	_, db, _, _, _, workspaceID := portalCtx(c)

	var ws models.Workspace
	if err := db.First(&ws, workspaceID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "workspace not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": WorkspaceResponse{
		ID:                 ws.ID,
		Slug:               ws.Slug,
		BrandName:          ws.BrandName,
		Industry:           ws.Industry,
		SitebaseInstanceID: ws.SitebaseInstanceID,
		FallbackCopyJSON:   ws.FallbackCopyJSON,
		Status:             string(ws.Status),
		CreatedAt:          ws.CreatedAt.Format(time.RFC3339),
		UpdatedAt:          ws.UpdatedAt.Format(time.RFC3339),
	}})
}

func TenantUpdateWorkspace(c *gin.Context) {
	_, db, seatID, _, _, workspaceID := portalCtx(c)
	if !requireAdminOrOwner(c, db, seatID) {
		return
	}

	var req UpdateWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "reason": err.Error()})
		return
	}

	var ws models.Workspace
	if err := db.First(&ws, workspaceID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "workspace not found"})
		return
	}

	ws.BrandName = req.BrandName
	ws.Industry = req.Industry
	ws.FallbackCopyJSON = req.FallbackCopyJSON
	if err := db.Save(&ws).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "update workspace failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": WorkspaceResponse{
		ID:                 ws.ID,
		Slug:               ws.Slug,
		BrandName:          ws.BrandName,
		Industry:           ws.Industry,
		SitebaseInstanceID: ws.SitebaseInstanceID,
		FallbackCopyJSON:   ws.FallbackCopyJSON,
		Status:             string(ws.Status),
		CreatedAt:          ws.CreatedAt.Format(time.RFC3339),
		UpdatedAt:          ws.UpdatedAt.Format(time.RFC3339),
	}})
}

// ────────────────────────────────────────────────
// 3. 成员管理（seats）
// ────────────────────────────────────────────────

func TenantListSeats(c *gin.Context) {
	_, db, _, _, tenantID, _ := portalCtx(c)

	var seats []models.Seat
	if err := db.Where("tenant_id = ?", tenantID).Find(&seats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "list seats failed"})
		return
	}

	var userIDs []int64
	for _, s := range seats {
		userIDs = append(userIDs, s.UserID)
	}
	var users []models.User
	userMap := make(map[int64]models.User)
	if len(userIDs) > 0 {
		db.Select("id, email, display_name").Where("id IN ?", userIDs).Find(&users)
		for _, u := range users {
			userMap[u.ID] = u
		}
	}

	resp := make([]SeatResponse, 0, len(seats))
	for _, s := range seats {
		u := userMap[s.UserID]
		resp = append(resp, SeatResponse{
			ID:          s.ID,
			UserID:      s.UserID,
			Email:       u.Email,
			DisplayName: u.DisplayName,
			Role:        string(s.Role),
			Status:      string(s.Status),
			CreatedAt:   s.CreatedAt.Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": resp})
}

func TenantInviteSeat(c *gin.Context) {
	_, db, seatID, _, tenantID, _ := portalCtx(c)
	if !requireAdminOrOwner(c, db, seatID) {
		return
	}

	var req InviteSeatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "reason": err.Error()})
		return
	}

	// 查 subscription 席位上限
	var sub models.Subscription
	if err := db.Where("tenant_id = ?", tenantID).First(&sub).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "subscription not found"})
		return
	}
	var activeCount int64
	if err := db.Model(&models.Seat{}).Where("tenant_id = ? AND status = ?", tenantID, models.SeatStatusActive).Count(&activeCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "count seats failed"})
		return
	}
	if int(activeCount) >= sub.SeatsLimit {
		c.JSON(http.StatusForbidden, gin.H{"error": "seat limit exceeded", "limit": sub.SeatsLimit})
		return
	}

	// 创建用户（pending_invite）
	randomHash, _ := auth.HashPassword(strconv.FormatInt(time.Now().UnixNano(), 10))
	user := models.User{
		Email:        req.Email,
		PasswordHash: randomHash, // 占位，邀请邮件设置真实密码（T7.5 v2）
		Status:       models.UserStatusPendingInvite,
	}
	if err := db.Create(&user).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "email already exists"})
		return
	}

	seat := models.Seat{
		TenantID: tenantID,
		UserID:   user.ID,
		Role:     models.SeatRole(req.Role),
		Status:   models.SeatStatusActive,
	}
	if err := db.Create(&seat).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "create seat failed"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": SeatResponse{
		ID:          seat.ID,
		UserID:      user.ID,
		Email:       user.Email,
		DisplayName: user.DisplayName,
		Role:        string(seat.Role),
		Status:      string(seat.Status),
		CreatedAt:   seat.CreatedAt.Format(time.RFC3339),
	}})
}

func TenantUpdateSeat(c *gin.Context) {
	_, db, seatID, _, tenantID, _ := portalCtx(c)
	if !requireAdminOrOwner(c, db, seatID) {
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid seat id"})
		return
	}

	var req UpdateSeatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "reason": err.Error()})
		return
	}

	var target models.Seat
	if err := db.Where("id = ? AND tenant_id = ?", id, tenantID).First(&target).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "seat not found"})
		return
	}
	// 不能改自己（避免 owner 把自己改没）
	if target.ID == seatID {
		c.JSON(http.StatusForbidden, gin.H{"error": "cannot modify your own seat"})
		return
	}

	if req.Role != "" {
		target.Role = models.SeatRole(req.Role)
	}
	if req.Status != "" {
		target.Status = models.SeatStatus(req.Status)
	}
	if err := db.Save(&target).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "update seat failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": SeatResponse{
		ID:     target.ID,
		UserID: target.UserID,
		Role:   string(target.Role),
		Status: string(target.Status),
	}})
}

// ────────────────────────────────────────────────
// 4. 订阅与计费（只读）
// ────────────────────────────────────────────────

func TenantGetSubscription(c *gin.Context) {
	_, db, _, _, tenantID, _ := portalCtx(c)

	var sub models.Subscription
	if err := db.Where("tenant_id = ?", tenantID).First(&sub).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "subscription not found"})
		return
	}

	fmtDate := func(t *time.Time) *string {
		if t == nil {
			return nil
		}
		s := t.Format(time.RFC3339)
		return &s
	}

	c.JSON(http.StatusOK, gin.H{"data": SubscriptionResponse{
		ID:                 sub.ID,
		Plan:               string(sub.Plan),
		Status:             string(sub.Status),
		SeatsLimit:         sub.SeatsLimit,
		CurrentPeriodStart: fmtDate(sub.CurrentPeriodStart),
		CurrentPeriodEnd:   fmtDate(sub.CurrentPeriodEnd),
		TrialEndsAt:        fmtDate(sub.TrialEndsAt),
		GraceDays:          sub.GraceDays,
	}})
}

// ────────────────────────────────────────────────
// 5. 额度与用量（只读）
// ────────────────────────────────────────────────

func TenantListUsage(c *gin.Context) {
	_, db, _, _, tenantID, _ := portalCtx(c)

	// 取当月 1 号 00:00
	now := time.Now()
	windowStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	var meters []models.UsageMeter
	if err := db.Where("tenant_id = ? AND window_start = ?", tenantID, windowStart).Find(&meters).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "list usage failed"})
		return
	}

	// 取套餐配额（month 窗口）
	var sub models.Subscription
	db.Where("tenant_id = ?", tenantID).First(&sub)
	var quotas []models.PlanQuota
	quotaMap := make(map[string]models.PlanQuota)
	if sub.Plan != "" {
		db.Where("plan = ? AND window_kind = ?", sub.Plan, models.WindowKindMonth).Find(&quotas)
		for _, q := range quotas {
			quotaMap[string(q.MeterKind)] = q
		}
	}

	resp := make([]UsageResponse, 0, len(meters))
	for _, m := range meters {
		q := quotaMap[string(m.MeterKind)]
		resp = append(resp, UsageResponse{
			MeterKind:     string(m.MeterKind),
			WindowStart:   m.WindowStart.Format(time.RFC3339),
			Count:         m.Count,
			Limit:         q.LimitPerWindow,
			WindowKind:    string(q.WindowKind),
			OveragePolicy: string(q.OveragePolicy),
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": resp, "window_start": windowStart.Format(time.RFC3339)})
}

// ────────────────────────────────────────────────
// 6. 凭证管理（只读元信息 + 轮换/吊销，owner/admin）
// ────────────────────────────────────────────────

func TenantListCredentials(c *gin.Context) {
	_, db, _, _, _, workspaceID := portalCtx(c)

	var creds []models.TenantCredential
	if err := db.Where("workspace_id = ?", workspaceID).Find(&creds).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "list credentials failed"})
		return
	}

	fmtTime := func(t *time.Time) *string {
		if t == nil {
			return nil
		}
		s := t.Format(time.RFC3339)
		return &s
	}

	resp := make([]CredentialResponse, 0, len(creds))
	for _, cr := range creds {
		resp = append(resp, CredentialResponse{
			ID:            cr.ID,
			WorkspaceID:   cr.WorkspaceID,
			AuthKind:      string(cr.AuthKind),
			KeyVersion:    cr.KeyVersion,
			Username:      cr.Username,
			ExpiresAt:     fmtTime(cr.ExpiresAt),
			LastRotatedAt: fmtTime(cr.LastRotatedAt),
			Status:        string(cr.Status),
			CreatedAt:     cr.CreatedAt.Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": resp})
}

func TenantRotateCredential(c *gin.Context) {
	_, db, seatID, _, _, workspaceID := portalCtx(c)
	if !requireAdminOrOwner(c, db, seatID) {
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid credential id"})
		return
	}

	var cr models.TenantCredential
	if err := db.Where("id = ? AND workspace_id = ?", id, workspaceID).First(&cr).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "credential not found"})
		return
	}

	now := time.Now()
	cr.Status = models.CredentialStatusRotating
	cr.LastRotatedAt = &now
	cr.KeyVersion++
	if err := db.Save(&cr).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "rotate credential failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{"id": cr.ID, "status": cr.Status, "key_version": cr.KeyVersion}})
}

func TenantRevokeCredential(c *gin.Context) {
	_, db, seatID, _, _, workspaceID := portalCtx(c)
	if !requireAdminOrOwner(c, db, seatID) {
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid credential id"})
		return
	}

	var cr models.TenantCredential
	if err := db.Where("id = ? AND workspace_id = ?", id, workspaceID).First(&cr).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "credential not found"})
		return
	}

	cr.Status = models.CredentialStatusRevoked
	if err := db.Save(&cr).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "revoke credential failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{"id": cr.ID, "status": cr.Status}})
}

// ────────────────────────────────────────────────
// 7. 操作日志（audit_logs，tenant scope，只读）
// ────────────────────────────────────────────────

func TenantListAuditLogs(c *gin.Context) {
	_, db, _, _, tenantID, workspaceID := portalCtx(c)

	var logs []models.AuditLog
	query := db.Where("tenant_id = ?", tenantID)
	// workspace 维度可选过滤
	if c.Query("workspace_only") == "true" {
		query = query.Where("workspace_id = ?", workspaceID)
	}
	if err := query.Order("created_at DESC").Limit(100).Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "list audit logs failed"})
		return
	}

	resp := make([]AuditLogResponse, 0, len(logs))
	for _, l := range logs {
		var sid, targetID int64
		if l.SeatID.Valid {
			sid = l.SeatID.Int64
		}
		if l.TargetID.Valid {
			targetID = l.TargetID.Int64
		}
		resp = append(resp, AuditLogResponse{
			ID:         l.ID,
			CreatedAt:  l.CreatedAt.Format(time.RFC3339),
			ActorKind:  string(l.ActorKind),
			Action:     l.Action,
			TargetKind: l.TargetKind,
			TargetID:   targetID,
			SeatID:     sid,
			MetaJSON:   l.MetaJSON,
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": resp, "tenant_id": tenantID, "workspace_id": workspaceID})
}
