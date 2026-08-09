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
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"hutian-tenant-api/auth"
	"hutian-tenant-api/middleware"
	"hutian-tenant-api/models"
	"hutian-tenant-api/token"
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
// maxAttempts/lockoutMinutes：P1-1 登录失败锁定（0 次失败不锁定仅清零，实际由配置保证 ≥1）
func TenantLogin(db *gorm.DB, signer *auth.Signer, devOnly bool, maxAttempts, lockoutMinutes int) gin.HandlerFunc {
	lockoutDuration := time.Duration(lockoutMinutes) * time.Minute
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

		// P1-1：账户锁定时先拒绝（423 Locked），不泄露密码正确性
		if user.LockedUntil != nil && time.Now().Before(*user.LockedUntil) {
			writePortalError(c, devOnly, http.StatusLocked, "account locked",
				fmt.Sprintf("too many failed login attempts; try again after %s", user.LockedUntil.Format(time.RFC3339)))
			return
		}

		if user.Status != models.UserStatusActive {
			writePortalError(c, devOnly, http.StatusUnauthorized, "user disabled or inactive", "")
			return
		}

		if !auth.CheckPassword(req.Password, user.PasswordHash) {
			// P1-1：原子递增失败计数，达阈值则设锁定时间
			until := time.Now().Add(lockoutDuration)
			db.Model(&user).UpdateColumns(map[string]interface{}{
				"failed_login_count": gorm.Expr("failed_login_count + 1"),
				"locked_until":       gorm.Expr("CASE WHEN failed_login_count + 1 >= ? THEN ? ELSE locked_until END", maxAttempts, until),
			})
			writePortalError(c, devOnly, http.StatusUnauthorized, "invalid credentials", "")
			return
		}

		// P1-1：成功登录清零失败计数与锁定
		if user.FailedLoginCount > 0 || user.LockedUntil != nil {
			db.Model(&user).Updates(map[string]interface{}{
				"failed_login_count": 0,
				"locked_until":       nil,
			})
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

		tok, err := func() (string, error) {
			if signer == nil {
				return "", fmt.Errorf("JWT signer not configured")
			}
			return signer.Issue(user.ID, seat.ID, tenant.ID, workspace.ID)
		}()
		if err != nil {
			writePortalError(c, devOnly, http.StatusServiceUnavailable, "issue token failed", err.Error())
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

	// T9.3 修复席位 TOCTOU（review P2-9）：
	// 旧逻辑 Count→Create 无锁，并发邀请会超额。
	// 修复：事务 + FOR UPDATE 锁 subscription 行，Count+Create 都在事务内，
	// 并发请求串行化在 subscription 行锁上，不可能并发超额。
	tx := db.Begin()
	if tx.Error != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "begin tx failed", "")
		return
	}
	txOK := false
	defer func() {
		if !txOK {
			tx.Rollback()
		}
	}()

	var sub models.Subscription
	// FOR UPDATE 锁 subscription 行，防 Count→Create 间隙并发
	if err := tx.Set("gorm:query_option", "FOR UPDATE").
		Where("tenant_id = ?", tenantID).First(&sub).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "subscription not found", "")
		return
	}
	var activeCount int64
	if err := tx.Model(&models.Seat{}).Where("tenant_id = ? AND status = ?", tenantID, models.SeatStatusActive).Count(&activeCount).Error; err != nil {
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
	if err := tx.Create(&user).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusConflict, "email already exists", "")
		return
	}

	seat := models.Seat{
		TenantID: tenantID,
		UserID:   user.ID,
		Role:     models.SeatRole(req.Role),
		Status:   models.SeatStatusActive,
	}
	if err := tx.Create(&seat).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "create seat failed", "")
		return
	}

	if err := tx.Commit().Error; err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "commit failed", "")
		return
	}
	txOK = true

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
// 并发安全：用 GORM Clauses.OnConflict 做 upsert，避免"查存在→Create"竞态撞联合唯一索引
func TenantUpsertSession(c *gin.Context) {
	_, db, userID, _, tenantID, workspaceID := portalCtx(c)
	devOnly, _ := c.Get("cfg.dev")
	cfgDev, _ := devOnly.(bool)

	var req UpsertSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writePortalError(c, cfgDev, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	title := req.Title
	if title == "" {
		title = "新会话"
	}

	sess := models.UserSession{
		TenantID:    tenantID,
		UserID:      userID,
		WorkspaceID: workspaceID,
		SessionID:   req.SessionID,
		Title:       title,
		ToolCount:   req.ToolCount,
	}

	// ON CONFLICT (tenant_id, user_id, session_id) DO UPDATE SET tool_count=?, title=?, updated_at=?
	// 联合唯一索引 idx_usession_tenant_user_sid 作为冲突判定列
	result := db.Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "tenant_id"},
			{Name: "user_id"},
			{Name: "session_id"},
		},
		DoUpdates: clause.AssignmentColumns([]string{"tool_count", "title", "updated_at"}),
	}).Create(&sess)

	if result.Error != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "upsert session failed", result.Error.Error())
		return
	}

	// 重新查返回最新数据（不管新建还是更新，都返回最新行）
	var ret models.UserSession
	db.Where("tenant_id = ? AND user_id = ? AND session_id = ?",
		tenantID, userID, req.SessionID).First(&ret)
	writePortalOK(c, cfgDev, ret)
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

// ────────────────────────────────────────────────
// 9. 跨语言内部 token 签发（链②：BFF → tenant-api 验签 → bridge 验签）
//
// ADR-cross-lang-tenant-context：
//   - workbench BFF 收用户请求（带 httpOnly cookie JWT）
//   - BFF 调本端点 GET /portal/api/v1/internal/token（走 TenantJWTContext 四合一验签）
//   - 本端点查 workspace/sitebase_instance → 签发 HMAC 短期 token（5min）
//   - BFF 把 token 放 X-Tenant-Token 头给 bridge，bridge 验签后信任 payload
//
// 用 GET 不用 POST：签发是幂等操作（基于当前 JWT claims，不改 DB 状态），
// 且 GET 豁免 CSRF 头校验，BFF 只需转发 cookie JWT 即可，无需转发 nonce。
// ────────────────────────────────────────────────

// TenantIssueInternalToken 签发 HMAC 内部 token（portal 链②入口）
func TenantIssueInternalToken(c *gin.Context) {
	_, db, _, seatID, tenantID, workspaceID := portalCtx(c)
	devOnly, _ := c.Get("cfg.dev")
	cfgDev, _ := devOnly.(bool)

	var ws models.Workspace
	if err := db.First(&ws, workspaceID).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusNotFound, "workspace not found", "")
		return
	}
	var inst models.SitebaseInstance
	if err := db.First(&inst, ws.SitebaseInstanceID).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "sitebase instance lookup failed", "")
		return
	}

	signer, err := token.NewSigner()
	if err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "token signer not configured", err.Error())
		return
	}
	tok, err := signer.Issue(token.Payload{
		TenantID:           tenantID,
		WorkspaceID:        workspaceID,
		SitebaseInstanceID: inst.ID,
		SitebaseBaseURL:    inst.BaseURL,
		SeatID:             seatID,
	})
	if err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "issue token failed", err.Error())
		return
	}
	writePortalOK(c, cfgDev, gin.H{
		"token":        tok,
		"tenant_id":    tenantID,
		"workspace_id": workspaceID,
		"sitebase_url": inst.BaseURL,
		"expires_in":   300,
	})
}

// ────────────────────────────────────────────────
// 开放 API key 管理（T9.1 ADR-open-api D5）
// 端点挂 portal 路由组（TenantJWTContext 已鉴权 + CSRF 已强制），
// tenant_id/workspace_id 从 portalCtx 取，绝不信任请求体。
// 明文 key 仅创建时返回一次；DB 只存 SHA256 hash（NFR-T02 同红线）。
// ────────────────────────────────────────────────

// TenantCreateApiKey 创建开放 API key
// POST /portal/api/v1/api-keys  body: {name?, scopes?}
// scopes 默认 "diagnose,schema,sitemap"
func TenantCreateApiKey(c *gin.Context) {
	_, db, _, _, tenantID, workspaceID := portalCtx(c)
	devOnly, _ := c.Get("cfg.dev")
	cfgDev, _ := devOnly.(bool)

	var req struct {
		Name   string `json:"name"`
		Scopes string `json:"scopes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil && err.Error() != "EOF" {
		writePortalError(c, cfgDev, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}
	if req.Scopes == "" {
		req.Scopes = "diagnose,schema,sitemap"
	}

	plaintext, prefix, hash, err := middleware.GenerateApiKey()
	if err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "generate key failed", err.Error())
		return
	}

	key := models.ApiKey{
		TenantID:    tenantID,
		WorkspaceID: workspaceID,
		Name:        req.Name,
		KeyPrefix:   prefix,
		KeyHash:     hash,
		Scopes:      req.Scopes,
		Status:      models.ApiKeyStatusActive,
	}
	if err := db.Create(&key).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "create key failed", err.Error())
		return
	}

	// 明文 key 仅此一次返回；后续 list 只返 prefix
	writePortalOK(c, cfgDev, gin.H{
		"id":           key.ID,
		"key":          plaintext, // 明文，仅创建时返回
		"key_prefix":   prefix,
		"name":         key.Name,
		"scopes":       key.Scopes,
		"status":       key.Status,
		"tenant_id":    tenantID,
		"workspace_id": workspaceID,
		"created_at":   key.CreatedAt,
	})
}

// TenantListApiKeys 列出当前 workspace 的 API keys（不含明文/hash）
// GET /portal/api/v1/api-keys
func TenantListApiKeys(c *gin.Context) {
	_, db, _, _, tenantID, workspaceID := portalCtx(c)
	devOnly, _ := c.Get("cfg.dev")
	cfgDev, _ := devOnly.(bool)

	var keys []models.ApiKey
	if err := db.Where("tenant_id = ? AND workspace_id = ?", tenantID, workspaceID).
		Order("created_at DESC").
		Find(&keys).Error; err != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "list keys failed", err.Error())
		return
	}
	// 不暴露 key_hash（JSON 标 - 已挡），这里显式构造不含 hash 的视图
	out := make([]gin.H, 0, len(keys))
	for _, k := range keys {
		out = append(out, gin.H{
			"id":          k.ID,
			"key_prefix":  k.KeyPrefix,
			"name":        k.Name,
			"scopes":      k.Scopes,
			"status":      k.Status,
			"last_used_at": k.LastUsedAt,
			"created_at":  k.CreatedAt,
		})
	}
	writePortalOK(c, cfgDev, gin.H{"data": out, "tenant_id": tenantID, "workspace_id": workspaceID})
}

// TenantRevokeApiKey 吊销 API key
// POST /portal/api/v1/api-keys/:id/revoke
// 校验 key 属当前 workspace（防越权吊销他租户 key）
func TenantRevokeApiKey(c *gin.Context) {
	_, db, _, _, tenantID, workspaceID := portalCtx(c)
	devOnly, _ := c.Get("cfg.dev")
	cfgDev, _ := devOnly.(bool)

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writePortalError(c, cfgDev, http.StatusBadRequest, "invalid key id", "")
		return
	}

	// 越权防护：WHERE tenant_id + workspace_id（不属本 workspace 的 key 返回 404，不泄存在性）
	res := db.Model(&models.ApiKey{}).
		Where("id = ? AND tenant_id = ? AND workspace_id = ?", id, tenantID, workspaceID).
		UpdateColumn("status", models.ApiKeyStatusRevoked)
	if res.Error != nil {
		writePortalError(c, cfgDev, http.StatusInternalServerError, "revoke key failed", res.Error.Error())
		return
	}
	if res.RowsAffected == 0 {
		writePortalError(c, cfgDev, http.StatusNotFound, "key not found", "")
		return
	}
	writePortalOK(c, cfgDev, gin.H{"id": id, "status": models.ApiKeyStatusRevoked})
}
