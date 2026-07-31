// Package handlers — 租户自服务后台接口族（链①：tenant-api 直查 hutian 元数据，不签 ADR 内部 token）
//
// 所有端点强制过 TenantJWTContext 四合一鉴权（T7.2），从 ctx 取 tenant/workspace/seat/user，
// 绝不信任请求体里的 tenant_id/workspace_id。
//
// M5：鉴权传输从 Authorization header → httpOnly Cookie HUTIAN_TENANT_TOKEN
//   SameSite=Strict 防 CSRF；非简单写请求强制 X-Hutian-Tenant 自定义头兜底；
//   登出显式清 cookie。
package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"hutian-tenant-api/auth"
	"hutian-tenant-api/middleware"
	"hutian-tenant-api/models"
)

const (
	// TenantTokenCookie httpOnly cookie 名（M5 替换 localStorage）
	TenantTokenCookie = "HUTIAN_TENANT_TOKEN"
	// CSRFHeaderName 非简单写请求必须带此头（值任意），SameSite=Strict 的二次兜底
	CSRFHeaderName = "X-Hutian-Tenant"
	// CSRFNonceHeaderName 写请求的 one-time nonce 头（M5 NFR-TS08：防重放 CSRF）
	CSRFNonceHeaderName = "X-Hutian-Nonce"
	// CSRFNonceCookie 与 nonce 头配对的 cookie（SameSite=Strict、httpOnly=false、随响应刷新）
	CSRFNonceCookie = "HUTIAN_TENANT_NONCE"
)

// randomHex 生成 n 字节十六进制串
func randomHex(n int) string {
	buf := make([]byte, n)
	if _, err := rand.Read(buf); err != nil {
		return ""
	}
	return hex.EncodeToString(buf)
}

// setTenantCookie 写入 httpOnly+SameSite=Strict cookie；M5 统一走此函数
// secure=dev 环境按 cfg.Dev 放行（local 走 http）
func setTenantCookie(c *gin.Context, tok string, maxAge int, secure bool, path string) {
	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie(
		TenantTokenCookie,
		tok,
		maxAge,
		path,
		"",
		secure,
		true, // httpOnly=TRUE：JS 读不到，XSS 偷不走
	)
}

// rotateNonce 每次成功响应刷新 one-time nonce（防重放 CSRF）
// nonce 分两份：一份 cookie（SameSite Strict，JS 可读给 fetch 设头），
// 一份塞进响应头 X-Hutian-Nonce 便于 EventSource 流等不带 cookie 的场景复用
func rotateNonce(c *gin.Context, secure bool) string {
	nonce := randomHex(16)
	if nonce == "" {
		return ""
	}
	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie(CSRFNonceCookie, nonce, 86400, "/", "", secure, false)
	c.Header(CSRFNonceHeaderName, nonce)
	return nonce
}

// writePortalOK 统一 200 出口：附带 nonce 刷新（登录、登出外的所有写请求也用）
func writePortalOK(c *gin.Context, cfgDev bool, data interface{}) {
	rotateNonce(c, !cfgDev)
	c.JSON(http.StatusOK, gin.H{"data": data})
}

// writePortalError 统一错误出口：同样刷新 nonce 防重放
func writePortalError(c *gin.Context, cfgDev bool, status int, errMsg, reason string) {
	rotateNonce(c, !cfgDev)
	payload := gin.H{"error": errMsg}
	if reason != "" {
		payload["reason"] = reason
	}
	c.AbortWithStatusJSON(status, payload)
}

// WritePortalFatal middleware/外部 handler 可调用的统一致命错误出口
func WritePortalFatal(c *gin.Context, cfgDev bool, status int, errMsg, reason string) {
	writePortalError(c, cfgDev, status, errMsg, reason)
}

// RotateNonce 外部包可调用的 nonce 刷新器
func RotateNonce(c *gin.Context, secure bool) string {
	return rotateNonce(c, secure)
}

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

// TenantLogin devOnly 参数：dev 模式下 secure=false 允许 http 本地 Cookie 写入
// 保留 Authorization JSON 返回（兼容期），M5 统一用 httpOnly cookie
func TenantLogin(db *gorm.DB, signer *auth.Signer, devOnly bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			writePortalError(c, devOnly, http.StatusBadRequest, "invalid request body", err.Error())
			return
		}

		var user models.User
		if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
			writePortalError(c, devOnly, http.StatusUnauthorized, "invalid credentials", "")
			return
		}
		if user.Status != models.UserStatusActive {
			writePortalError(c, devOnly, http.StatusUnauthorized, "user disabled or inactive", "")
			return
		}
		if !auth.CheckPassword(req.Password, user.PasswordHash) {
			writePortalError(c, devOnly, http.StatusUnauthorized, "invalid credentials", "")
			return
		}

		var tenant models.Tenant
		if err := db.Where("slug = ?", req.TenantSlug).First(&tenant).Error; err != nil {
			writePortalError(c, devOnly, http.StatusUnauthorized, "invalid tenant", "")
			return
		}

		var workspace models.Workspace
		if err := db.Where("slug = ? AND tenant_id = ?", req.WorkspaceSlug, tenant.ID).
			First(&workspace).Error; err != nil {
			writePortalError(c, devOnly, http.StatusNotFound, "invalid workspace", "")
			return
		}

		var seat models.Seat
		if err := db.Where("tenant_id = ? AND user_id = ? AND status = ?",
			tenant.ID, user.ID, models.SeatStatusActive).
			First(&seat).Error; err != nil {
			writePortalError(c, devOnly, http.StatusUnauthorized, "seat inactive or not found", "")
			return
		}

		var sub models.Subscription
		if err := db.Where("tenant_id = ?", tenant.ID).First(&sub).Error; err == nil {
			switch sub.Status {
			case models.SubStatusSuspended, models.SubStatusReadonly, models.SubStatusCanceled:
				writePortalError(c, devOnly, http.StatusForbidden, "tenant subscription suspended/readonly/canceled", "")
				return
			}
		}

		tok, err := signer.Issue(user.ID, seat.ID, tenant.ID, workspace.ID)
		if err != nil {
			writePortalError(c, devOnly, http.StatusInternalServerError, "issue token failed", "")
			return
		}

		// M5：写 httpOnly cookie；dev 环境允许非 https
		setTenantCookie(c, tok, int(auth.TokenLifetime.Seconds()), !devOnly, "/")
		resp := LoginResponse{
			AccessToken: "", // 置空：XSS 不再能从 JSON 响应里读到明文 token
			TokenType:   "Cookie",
			ExpiresIn:   int(auth.TokenLifetime.Seconds()),
			UserID:      user.ID,
			SeatID:      seat.ID,
			TenantID:    tenant.ID,
			WorkspaceID: workspace.ID,
			Email:       user.Email,
			DisplayName: user.DisplayName,
		}
		writePortalOK(c, devOnly, resp)
	}
}

// TenantLogout 登出：清 HUTIAN_TENANT_TOKEN cookie + 刷新 nonce
func TenantLogout(devOnly bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		setTenantCookie(c, "", -1, !devOnly, "/")
		writePortalOK(c, devOnly, gin.H{"ok": true})
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
	devOnly, _ := c.Get("cfg.dev")
	cfgDev, _ := devOnly.(bool)
	role, err := loadSeatRole(db, seatID)
	if err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "load seat failed", "")
		return false
	}
	if role != models.SeatRoleOwner && role != models.SeatRoleAdmin {
		writePortalError(c, cfgDev, http.StatusForbidden, "permission denied: owner or admin required", "")
		return false
	}
	return true
}

// ────────────────────────────────────────────────
// 1. 我的工作台（个人资料）
// ────────────────────────────────────────────────

func TenantMe(c *gin.Context) {
	_, db, userID, seatID, tenantID, workspaceID := portalCtx(c)
	devOnly, _ := c.Get("cfg.dev")
	cfgDev, _ := devOnly.(bool)

	var user models.User
	if err := db.Select("id, email, display_name, status").First(&user, userID).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "load user failed", "")
		return
	}
	var seat models.Seat
	if err := db.Select("role").First(&seat, seatID).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "load seat failed", "")
		return
	}

	writePortalOK(c, cfgDev, MeResponse{
		ID:          user.ID,
		Email:       user.Email,
		DisplayName: user.DisplayName,
		Status:      string(user.Status),
		TenantID:    tenantID,
		WorkspaceID: workspaceID,
		SeatID:      seatID,
		Role:        string(seat.Role),
	})
}

// ────────────────────────────────────────────────
// 2. 站点设置
// ────────────────────────────────────────────────

func TenantGetWorkspace(c *gin.Context) {
	_, db, _, _, _, workspaceID := portalCtx(c)
	devOnly, _ := c.Get("cfg.dev")
	cfgDev, _ := devOnly.(bool)

	var ws models.Workspace
	if err := db.First(&ws, workspaceID).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusNotFound, "workspace not found", "")
		return
	}

	writePortalOK(c, cfgDev, WorkspaceResponse{
		ID:                 ws.ID,
		Slug:               ws.Slug,
		BrandName:          ws.BrandName,
		Industry:           ws.Industry,
		SitebaseInstanceID: ws.SitebaseInstanceID,
		FallbackCopyJSON:   ws.FallbackCopyJSON,
		Status:             string(ws.Status),
		CreatedAt:          ws.CreatedAt.Format(time.RFC3339),
		UpdatedAt:          ws.UpdatedAt.Format(time.RFC3339),
	})
}

func TenantUpdateWorkspace(c *gin.Context) {
	_, db, seatID, _, _, workspaceID := portalCtx(c)
	devOnly, _ := c.Get("cfg.dev")
	cfgDev, _ := devOnly.(bool)
	if !requireAdminOrOwner(c, db, seatID) {
		return
	}

	var req UpdateWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writePortalError(c, cfgDev, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	var ws models.Workspace
	if err := db.First(&ws, workspaceID).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusNotFound, "workspace not found", "")
		return
	}

	ws.BrandName = req.BrandName
	ws.Industry = req.Industry
	ws.FallbackCopyJSON = req.FallbackCopyJSON
	if err := db.Save(&ws).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "update workspace failed", "")
		return
	}

	writePortalOK(c, cfgDev, WorkspaceResponse{
		ID:                 ws.ID,
		Slug:               ws.Slug,
		BrandName:          ws.BrandName,
		Industry:           ws.Industry,
		SitebaseInstanceID: ws.SitebaseInstanceID,
		FallbackCopyJSON:   ws.FallbackCopyJSON,
		Status:             string(ws.Status),
		CreatedAt:          ws.CreatedAt.Format(time.RFC3339),
		UpdatedAt:          ws.UpdatedAt.Format(time.RFC3339),
	})
}

// ────────────────────────────────────────────────
// 3. 成员管理（seats）
// ────────────────────────────────────────────────

func TenantListSeats(c *gin.Context) {
	_, db, _, _, tenantID, _ := portalCtx(c)
	devOnly, _ := c.Get("cfg.dev")
	cfgDev, _ := devOnly.(bool)

	var seats []models.Seat
	if err := db.Where("tenant_id = ?", tenantID).Find(&seats).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "list seats failed", "")
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

	writePortalOK(c, cfgDev, resp)
}

func TenantInviteSeat(c *gin.Context) {
	_, db, seatID, _, tenantID, _ := portalCtx(c)
	devOnly, _ := c.Get("cfg.dev")
	cfgDev, _ := devOnly.(bool)
	if !requireAdminOrOwner(c, db, seatID) {
		return
	}

	var req InviteSeatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writePortalError(c, cfgDev, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	var sub models.Subscription
	if err := db.Where("tenant_id = ?", tenantID).First(&sub).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "subscription not found", "")
		return
	}
	var activeCount int64
	if err := db.Model(&models.Seat{}).Where("tenant_id = ? AND status = ?", tenantID, models.SeatStatusActive).Count(&activeCount).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "count seats failed", "")
		return
	}
	if int(activeCount) >= sub.SeatsLimit {
		writePortalError(c, cfgDev, http.StatusForbidden, "seat limit exceeded", "")
		c.Writer.Header().Del("Reason")
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error": "seat limit exceeded",
			"limit": sub.SeatsLimit,
		})
		rotateNonce(c, !cfgDev)
		return
	}

	randomHash, _ := auth.HashPassword(strconv.FormatInt(time.Now().UnixNano(), 10))
	user := models.User{
		Email:        req.Email,
		PasswordHash: randomHash,
		Status:       models.UserStatusPendingInvite,
	}
	if err := db.Create(&user).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusConflict, "email already exists", "")
		return
	}

	seat := models.Seat{
		TenantID: tenantID,
		UserID:   user.ID,
		Role:     models.SeatRole(req.Role),
		Status:   models.SeatStatusActive,
	}
	if err := db.Create(&seat).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "create seat failed", "")
		return
	}

	writePortalOK(c, cfgDev, SeatResponse{
		ID:          seat.ID,
		UserID:      user.ID,
		Email:       user.Email,
		DisplayName: user.DisplayName,
		Role:        string(seat.Role),
		Status:      string(seat.Status),
		CreatedAt:   seat.CreatedAt.Format(time.RFC3339),
	})
}

func TenantUpdateSeat(c *gin.Context) {
	_, db, seatID, _, tenantID, _ := portalCtx(c)
	devOnly, _ := c.Get("cfg.dev")
	cfgDev, _ := devOnly.(bool)
	if !requireAdminOrOwner(c, db, seatID) {
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writePortalError(c, cfgDev, http.StatusBadRequest, "invalid seat id", "")
		return
	}

	var req UpdateSeatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writePortalError(c, cfgDev, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	var target models.Seat
	if err := db.Where("id = ? AND tenant_id = ?", id, tenantID).First(&target).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusNotFound, "seat not found", "")
		return
	}
	if target.ID == seatID {
		writePortalError(c, cfgDev, http.StatusForbidden, "cannot modify your own seat", "")
		return
	}

	if req.Role != "" {
		target.Role = models.SeatRole(req.Role)
	}
	if req.Status != "" {
		target.Status = models.SeatStatus(req.Status)
	}
	if err := db.Save(&target).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "update seat failed", "")
		return
	}

	writePortalOK(c, cfgDev, SeatResponse{
		ID:     target.ID,
		UserID: target.UserID,
		Role:   string(target.Role),
		Status: string(target.Status),
	})
}

// ────────────────────────────────────────────────
// 4. 订阅与计费（只读）
// ────────────────────────────────────────────────

func TenantGetSubscription(c *gin.Context) {
	_, db, _, _, tenantID, _ := portalCtx(c)
	devOnly, _ := c.Get("cfg.dev")
	cfgDev, _ := devOnly.(bool)

	var sub models.Subscription
	if err := db.Where("tenant_id = ?", tenantID).First(&sub).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusNotFound, "subscription not found", "")
		return
	}

	fmtDate := func(t *time.Time) *string {
		if t == nil {
			return nil
		}
		s := t.Format(time.RFC3339)
		return &s
	}

	writePortalOK(c, cfgDev, SubscriptionResponse{
		ID:                 sub.ID,
		Plan:               string(sub.Plan),
		Status:             string(sub.Status),
		SeatsLimit:         sub.SeatsLimit,
		CurrentPeriodStart: fmtDate(sub.CurrentPeriodStart),
		CurrentPeriodEnd:   fmtDate(sub.CurrentPeriodEnd),
		TrialEndsAt:        fmtDate(sub.TrialEndsAt),
		GraceDays:          sub.GraceDays,
	})
}

func TenantListUsage(c *gin.Context) {
	_, db, _, _, tenantID, _ := portalCtx(c)
	devOnly, _ := c.Get("cfg.dev")
	cfgDev, _ := devOnly.(bool)

	now := time.Now()
	windowStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	var meters []models.UsageMeter
	if err := db.Where("tenant_id = ? AND window_start = ?", tenantID, windowStart).Find(&meters).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "list usage failed", "")
		return
	}

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

	rotateNonce(c, !cfgDev)
	c.JSON(http.StatusOK, gin.H{"data": resp, "window_start": windowStart.Format(time.RFC3339)})
}

func TenantListCredentials(c *gin.Context) {
	_, db, _, _, _, workspaceID := portalCtx(c)
	devOnly, _ := c.Get("cfg.dev")
	cfgDev, _ := devOnly.(bool)

	var creds []models.TenantCredential
	if err := db.Where("workspace_id = ?", workspaceID).Find(&creds).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "list credentials failed", "")
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

	writePortalOK(c, cfgDev, resp)
}

func TenantRotateCredential(c *gin.Context) {
	_, db, seatID, _, _, workspaceID := portalCtx(c)
	devOnly, _ := c.Get("cfg.dev")
	cfgDev, _ := devOnly.(bool)
	if !requireAdminOrOwner(c, db, seatID) {
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writePortalError(c, cfgDev, http.StatusBadRequest, "invalid credential id", "")
		return
	}

	var cr models.TenantCredential
	if err := db.Where("id = ? AND workspace_id = ?", id, workspaceID).First(&cr).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusNotFound, "credential not found", "")
		return
	}

	now := time.Now()
	cr.Status = models.CredentialStatusRotating
	cr.LastRotatedAt = &now
	cr.KeyVersion++
	if err := db.Save(&cr).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "rotate credential failed", "")
		return
	}

	writePortalOK(c, cfgDev, gin.H{"id": cr.ID, "status": cr.Status, "key_version": cr.KeyVersion})
}

func TenantRevokeCredential(c *gin.Context) {
	_, db, seatID, _, _, workspaceID := portalCtx(c)
	devOnly, _ := c.Get("cfg.dev")
	cfgDev, _ := devOnly.(bool)
	if !requireAdminOrOwner(c, db, seatID) {
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writePortalError(c, cfgDev, http.StatusBadRequest, "invalid credential id", "")
		return
	}

	var cr models.TenantCredential
	if err := db.Where("id = ? AND workspace_id = ?", id, workspaceID).First(&cr).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusNotFound, "credential not found", "")
		return
	}

	cr.Status = models.CredentialStatusRevoked
	if err := db.Save(&cr).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "revoke credential failed", "")
		return
	}

	writePortalOK(c, cfgDev, gin.H{"id": cr.ID, "status": cr.Status})
}

func TenantListAuditLogs(c *gin.Context) {
	_, db, _, _, tenantID, workspaceID := portalCtx(c)
	devOnly, _ := c.Get("cfg.dev")
	cfgDev, _ := devOnly.(bool)

	var logs []models.AuditLog
	query := db.Where("tenant_id = ?", tenantID)
	if c.Query("workspace_only") == "true" {
		query = query.Where("workspace_id = ?", workspaceID)
	}
	if err := query.Order("created_at DESC").Limit(100).Find(&logs).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "list audit logs failed", "")
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

	rotateNonce(c, !cfgDev)
	c.JSON(http.StatusOK, gin.H{"data": resp, "tenant_id": tenantID, "workspace_id": workspaceID})
}

// ────────────────────────────────────────────────
// 8. 会话历史（跨设备持久化）
//    workbench 登录后，会话列表从 localStorage 迁到 user_sessions 表
//    session_id 是 agent-bridge 返回的 id；title/tool_count 由前端注册/更新
//    联合唯一 tenant_id+user_id+session_id：同租户同用户不重复
// ────────────────────────────────────────────────

type UpsertSessionRequest struct {
	SessionID string `json:"session_id" binding:"required"`
	Title     string `json:"title"`
	ToolCount int    `json:"tool_count"`
}

// TenantListSessions 列出当前用户的会话历史（按 updated_at 倒序，最多 50 条）
func TenantListSessions(c *gin.Context) {
	_, db, userID, _, tenantID, _ := portalCtx(c)
	devOnly, _ := c.Get("cfg.dev")
	cfgDev, _ := devOnly.(bool)

	var sessions []models.UserSession
	if err := db.Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Order("updated_at DESC").
		Limit(50).
		Find(&sessions).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "list sessions failed", "")
		return
	}
	writePortalOK(c, cfgDev, sessions)
}

// TenantUpsertSession 注册/更新会话（首次发消息时注册，后续刷新 title/tool_count/updated_at）
func TenantUpsertSession(c *gin.Context) {
	_, db, userID, _, tenantID, workspaceID := portalCtx(c)
	devOnly, _ := c.Get("cfg.dev")
	cfgDev, _ := devOnly.(bool)

	var req UpsertSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writePortalError(c, cfgDev, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	// 查是否已存在（同 tenant+user+session_id）
	var existing models.UserSession
	err := db.Where("tenant_id = ? AND user_id = ? AND session_id = ?",
		tenantID, userID, req.SessionID).First(&existing).Error

	if err == gorm.ErrRecordNotFound {
		// 新建
		sess := models.UserSession{
			TenantID:    tenantID,
			UserID:      userID,
			WorkspaceID: workspaceID,
			SessionID:   req.SessionID,
			Title:       req.Title,
			ToolCount:   req.ToolCount,
		}
		if sess.Title == "" {
			sess.Title = "新会话"
		}
		if err := db.Create(&sess).Error; err != nil {
			writePortalError(c, cfgDev, http.StatusInternalServerError, "create session failed", "")
			return
		}
		writePortalOK(c, cfgDev, sess)
		return
	}
	if err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "query session failed", "")
		return
	}

	// 已存在 → 更新 title/tool_count/updated_at
	updates := map[string]interface{}{
		"tool_count": req.ToolCount,
		"updated_at": time.Now(),
	}
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if err := db.Model(&existing).Updates(updates).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "update session failed", "")
		return
	}
	// 重新查返回最新数据
	db.First(&existing, existing.ID)
	writePortalOK(c, cfgDev, existing)
}

// TenantDeleteSession 删除单条会话历史（软删）
func TenantDeleteSession(c *gin.Context) {
	_, db, userID, _, tenantID, _ := portalCtx(c)
	devOnly, _ := c.Get("cfg.dev")
	cfgDev, _ := devOnly.(bool)

	sessionID := c.Param("sessionId")
	if sessionID == "" {
		writePortalError(c, cfgDev, http.StatusBadRequest, "session_id required", "")
		return
	}

	result := db.Where("tenant_id = ? AND user_id = ? AND session_id = ?",
		tenantID, userID, sessionID).Delete(&models.UserSession{})
	if result.Error != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "delete session failed", "")
		return
	}
	if result.RowsAffected == 0 {
		writePortalError(c, cfgDev, http.StatusNotFound, "session not found", "")
		return
	}
	writePortalOK(c, cfgDev, gin.H{"deleted": sessionID})
}
