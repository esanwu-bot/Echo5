// Package handlers — 租户自服务后台接口族（链①：tenant-api 直查 hutian 元数据，不签 ADR 内部 token）
//
// 所有端点强制过 TenantJWTContext 四合一鉴权（T7.2），从 ctx 取 tenant/workspace/seat/user，
// 绝不信任请求体里的 tenant_id/workspace_id。
package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"hutian-tenant-api/auth"
	"hutian-tenant-api/middleware"
	"hutian-tenant-api/models"
)

// LoginRequest 租户登录请求
type LoginRequest struct {
	Email         string `json:"email" binding:"required,email"`
	Password      string `json:"password" binding:"required"`
	TenantSlug    string `json:"tenant_slug" binding:"required"`
	WorkspaceSlug string `json:"workspace_slug" binding:"required"`
}

// LoginResponse 租户登录响应（不返回 refresh_token，T7.5 v1 先做 access token）
type LoginResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"` // seconds
	UserID      int64  `json:"user_id"`
	SeatID      int64  `json:"seat_id"`
	TenantID    int64  `json:"tenant_id"`
	WorkspaceID int64  `json:"workspace_id"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
}

// MeResponse 当前用户信息（敏感字段不出响应）
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

// TenantLogin 租户登录（T7.5）
// 逻辑：验证邮箱+密码 → 查 tenant → 查 workspace → 查 seat → 签发 JWT
func TenantLogin(db *gorm.DB, signer *auth.Signer) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "reason": err.Error()})
			return
		}

		// 1) 用户存在且 active
		var user models.User
		if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
			// 不泄漏"邮箱不存在" vs "密码错"，统一 401（NFR-TS02）
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

		// 2) tenant 存在
		var tenant models.Tenant
		if err := db.Where("slug = ?", req.TenantSlug).First(&tenant).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid tenant"})
			return
		}

		// 3) workspace 存在且归属 tenant
		var workspace models.Workspace
		if err := db.Where("slug = ? AND tenant_id = ?", req.WorkspaceSlug, tenant.ID).
			First(&workspace).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid workspace"})
			return
		}

		// 4) seat 存在且 active（role 由 token 携带，后续鉴权从 ctx/seat 取）
		var seat models.Seat
		if err := db.Where("tenant_id = ? AND user_id = ? AND status = ?",
			tenant.ID, user.ID, models.SeatStatusActive).
			First(&seat).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "seat inactive or not found"})
			return
		}

		// 5) subscription 非 suspended/readonly/canceled（登录也卡，避免脏数据）
		var sub models.Subscription
		if err := db.Where("tenant_id = ?", tenant.ID).First(&sub).Error; err == nil {
			switch sub.Status {
			case models.SubStatusSuspended, models.SubStatusReadonly, models.SubStatusCanceled:
				c.JSON(http.StatusForbidden, gin.H{"error": "tenant subscription suspended/readonly/canceled"})
				return
			}
		}

		// 6) 签发 JWT
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

// TenantMe 当前登录用户信息（T7.3 /portal/api/v1/me）
func TenantMe(c *gin.Context) {
	userID := c.GetInt64(middleware.CtxUserID)
	seatID := c.GetInt64(middleware.CtxSeatID)
	tenantID := c.GetInt64(middleware.CtxTenantID)
	workspaceID := c.GetInt64(middleware.CtxWorkspaceID)

	dbRaw, _ := c.Get(middleware.CtxDB)
	db := dbRaw.(*gorm.DB)

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
