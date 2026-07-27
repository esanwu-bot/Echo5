// Package middleware — 租户自服务 JWT 鉴权中间件（T7.2 补完 T6.8）
//
// 四合一单中间件（JWT 有效 + user active + seat active + subscription 未过期 + workspace 归属 tenant）
// 用于租户自服务接口族 /portal/api/v1/*（链①：tenant-api 直查 hutian，不签 ADR 内部 token）
//
// 与 ops 超管中间件 AdminContext 物理分开；与链② TenantContext（X-Tenant-ID header，用于 /api/v1/* 内部 token 签发）也分开。
package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"hutian-tenant-api/auth"
	"hutian-tenant-api/models"
)

// 租户自服务上下文键（复用现有键，避免业务 handler 改两次）
const (
	CtxUserID       = "ctx.user_id"
	CtxTenantJWT    = "ctx.tenant_jwt" // 标记已通过 JWT 鉴权
)

// TenantJWTContext 四合一租户自服务鉴权中间件
//   Authorization: Bearer <tenant-jwt>
// 校验：JWT 签名 → user active → seat active → subscription 非 suspended/readonly → workspace 归属 tenant
func TenantJWTContext(db *gorm.DB, verifier *auth.Verifier) gin.HandlerFunc {
	return func(c *gin.Context) {
		if verifier == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "tenant JWT verifier not configured",
			})
			return
		}

		h := c.GetHeader("Authorization")
		if h == "" {
			abortAuth(c, "missing Authorization header")
			return
		}
		parts := strings.SplitN(h, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			abortAuth(c, "invalid Authorization header format")
			return
		}
		tok := parts[1]

		claims, err := verifier.Verify(tok)
		if err != nil {
			abortAuth(c, "invalid or expired token")
			return
		}

		// 1) user 存在且 active
		var user models.User
		if err := db.First(&user, claims.UserID).Error; err != nil {
			abortAuth(c, "user not found")
			return
		}
		if user.Status != models.UserStatusActive {
			abortAuth(c, "user disabled or inactive")
			return
		}
		if user.LockedUntil != nil && time.Now().Before(*user.LockedUntil) {
			abortAuth(c, "user locked")
			return
		}

		// 2) seat 存在且 active，且属于该 tenant+user
		var seat models.Seat
		if err := db.Where("tenant_id = ? AND user_id = ? AND status = ?",
			claims.TenantID, claims.UserID, models.SeatStatusActive).
			First(&seat).Error; err != nil {
			abortAuth(c, "seat inactive or not found")
			return
		}
		// payload 里的 seat_id 必须匹配 DB 里的 seat.id（防 token 被 seat 间复用）
		if seat.ID != claims.SeatID {
			abortAuth(c, "seat mismatch")
			return
		}

		// 3) subscription 未过期（非 suspended/readonly/canceled）
		var sub models.Subscription
		if err := db.Where("tenant_id = ?", claims.TenantID).First(&sub).Error; err != nil {
			// 无订阅记录：允许（免费租户可能没预写 subscription）
		} else {
			switch sub.Status {
			case models.SubStatusSuspended, models.SubStatusReadonly, models.SubStatusCanceled:
				abortAuth(c, "tenant subscription suspended/readonly/canceled")
				return
			}
		}

		// 4) workspace 归属 tenant（防篡改 workspace_id）
		var count int64
		if err := db.Table("workspaces").
			Where("id = ? AND tenant_id = ?", claims.WorkspaceID, claims.TenantID).
			Count(&count).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error": "verify workspace ownership failed",
			})
			return
		}
		if count == 0 {
			// 越权不泄漏存在性：统一 401（NFR-TS02）
			abortAuth(c, "workspace not found")
			return
		}

		// 注入上下文
		c.Set(CtxUserID, claims.UserID)
		c.Set(CtxSeatID, claims.SeatID)
		c.Set(CtxTenantID, claims.TenantID)
		c.Set(CtxWorkspaceID, claims.WorkspaceID)
		c.Set(CtxDB, db)
		c.Set(CtxAuthenticated, true)
		c.Set(CtxTenantJWT, true)

		c.Next()
	}
}

func abortAuth(c *gin.Context, reason string) {
	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
		"error":  "tenant authentication failed",
		"reason": reason,
	})
}
