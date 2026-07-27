// Package middleware — 租户自服务 JWT 鉴权中间件（T7.2 补完 T6.8 + M5）
//
// 四合一单中间件（JWT 有效 + user active + seat active + subscription 未过期 + workspace 归属 tenant）
// 用于租户自服务接口族 /portal/api/v1/*（链①：tenant-api 直查 hutian，不签 ADR 内部 token）
//
// M5 传输层：Authorization header → httpOnly Cookie HUTIAN_TENANT_TOKEN（XSS 拿不到）
//   - GET/HEAD/OPTIONS：简单请求，Cookie 自动带，SameSite=Strict 已抗 CSRF
//   - POST/PATCH/PUT/DELETE：非简单写请求强制 X-Hutian-Tenant 自定义头存在（任意非空值）
//     + X-Hutian-Nonce 一次性随机串与 HUTIAN_TENANT_NONCE cookie 严格相等（NFR-TS08 防重放 CSRF）
//
// 与 ops 超管中间件 AdminContext 物理分开；与链② TenantContext（X-Tenant-ID header，用于 /api/v1/* 内部 token 签发）也分开。
package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"hutian-tenant-api/auth"
	"hutian-tenant-api/models"
)

// 租户自服务上下文键（复用 tenant_context.go 中已有的 CtxDB/CtxTenantID 等键，避免 redeclare）
const (
	CtxUserID    = "ctx.user_id"
	CtxTenantJWT = "ctx.tenant_jwt"
)

// Cookie / CSRF 头常量（与 portal.go 保持一致，写死避免交叉 import cycle）
const (
	TenantTokenCookie   = "HUTIAN_TENANT_TOKEN"
	CSRFHeaderName      = "X-Hutian-Tenant"
	CSRFNonceHeaderName = "X-Hutian-Nonce"
	CSRFNonceCookie     = "HUTIAN_TENANT_NONCE"
)

// randNonce 一次性随机串
func randNonce() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// rotateNonceMiddleware 写 cookie + header
func rotateNonce(c *gin.Context, secure bool) string {
	n := randNonce()
	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie(CSRFNonceCookie, n, 86400, "/", "", secure, false)
	c.Header(CSRFNonceHeaderName, n)
	return n
}

// writePortalFatal 统一致命错误（middleware 自用，不含 rotateNonce 以避免错误后刷 nonce 过多）
func writePortalFatal(c *gin.Context, status int, errMsg, reason string) {
	payload := gin.H{"error": errMsg}
	if reason != "" {
		payload["reason"] = reason
	}
	c.AbortWithStatusJSON(status, payload)
}

// isWriteMethod 需要 CSRF 的非简单写方法
func isWriteMethod(m string) bool {
	switch strings.ToUpper(m) {
	case http.MethodPost, http.MethodPatch, http.MethodPut, http.MethodDelete:
		return true
	}
	return false
}

// TenantJWTContext 四合一租户自服务鉴权中间件
// 兼容：Cookie 优先；缺失再回退 Authorization: Bearer <jwt>（探针/集成）
// M5 NFR-TS02：workspace 越权 404（不泄存在性 + 不触发 401 重登 UX 误伤）
func TenantJWTContext(db *gorm.DB, verifier *auth.Verifier, devOnly bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if verifier == nil {
			writePortalFatal(c, http.StatusUnauthorized,
				"tenant JWT verifier not configured", "")
			return
		}

		if isWriteMethod(c.Request.Method) {
			marker := c.GetHeader(CSRFHeaderName)
			nonceHead := c.GetHeader(CSRFNonceHeaderName)
			nonceCk, _ := c.Cookie(CSRFNonceCookie)
			if marker == "" || nonceHead == "" || nonceCk == "" || nonceHead != nonceCk {
				writePortalFatal(c, http.StatusForbidden,
					"csrf header required", "X-Hutian-Tenant present + X-Hutian-Nonce == HUTIAN_TENANT_NONCE cookie")
				return
			}
		}

		tok, _ := c.Cookie(TenantTokenCookie)
		if tok == "" {
			h := c.GetHeader("Authorization")
			if h == "" {
				writePortalFatal(c, http.StatusUnauthorized,
					"tenant authentication failed", "missing Authorization header and cookie")
				return
			}
			parts := strings.SplitN(h, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				writePortalFatal(c, http.StatusUnauthorized,
					"tenant authentication failed", "invalid Authorization header format")
				return
			}
			tok = parts[1]
		}

		claims, err := verifier.Verify(tok)
		if err != nil {
			writePortalFatal(c, http.StatusUnauthorized,
				"tenant authentication failed", "invalid or expired token")
			return
		}

		var user models.User
		if err := db.First(&user, claims.UserID).Error; err != nil {
			writePortalFatal(c, http.StatusUnauthorized,
				"tenant authentication failed", "user not found")
			return
		}
		if user.Status != models.UserStatusActive {
			writePortalFatal(c, http.StatusUnauthorized,
				"tenant authentication failed", "user disabled or inactive")
			return
		}
		if user.LockedUntil != nil && time.Now().Before(*user.LockedUntil) {
			writePortalFatal(c, http.StatusUnauthorized,
				"tenant authentication failed", "user locked")
			return
		}

		var seat models.Seat
		if err := db.Where("tenant_id = ? AND user_id = ? AND status = ?",
			claims.TenantID, claims.UserID, models.SeatStatusActive).
			First(&seat).Error; err != nil {
			writePortalFatal(c, http.StatusUnauthorized,
				"tenant authentication failed", "seat inactive or not found")
			return
		}
		if seat.ID != claims.SeatID {
			writePortalFatal(c, http.StatusUnauthorized,
				"tenant authentication failed", "seat mismatch")
			return
		}

		var sub models.Subscription
		if err := db.Where("tenant_id = ?", claims.TenantID).First(&sub).Error; err == nil {
			switch sub.Status {
			case models.SubStatusSuspended, models.SubStatusReadonly, models.SubStatusCanceled:
				writePortalFatal(c, http.StatusUnauthorized,
					"tenant authentication failed", "tenant subscription suspended/readonly/canceled")
				return
			}
		}

		var count int64
		if err := db.Table("workspaces").
			Where("id = ? AND tenant_id = ?", claims.WorkspaceID, claims.TenantID).
			Count(&count).Error; err != nil {
			writePortalFatal(c, http.StatusInternalServerError,
				"verify workspace ownership failed", "")
			return
		}
		if count == 0 {
			writePortalFatal(c, http.StatusNotFound,
				"workspace not found", "")
			return
		}

		c.Set(CtxUserID, claims.UserID)
		c.Set(CtxSeatID, claims.SeatID)
		c.Set(CtxTenantID, claims.TenantID)
		c.Set(CtxWorkspaceID, claims.WorkspaceID)
		c.Set(CtxDB, db)
		c.Set(CtxAuthenticated, true)
		c.Set(CtxTenantJWT, true)
		c.Set("cfg.dev", devOnly)

		rotateNonce(c, !devOnly)
		c.Next()
	}
}
