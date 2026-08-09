// Package middleware — 开放 API 密钥鉴权中间件（T9.1 ADR-open-api D5）
//
// 挂 /open/v1/* 路由组，与 portal JWT cookie（/portal/api/v1/*）、
// 内部服务密钥（/api/v1/*）、超管 token（/admin/api/v1/*）四轨物理隔离。
//
// 鉴权流程（fail-closed）：
//  1. 从 Authorization: Bearer hsk_xxx 取明文 key
//  2. 校验 hsk_ 前缀格式
//  3. 算 SHA256(key) hex → 查 api_keys.key_hash（唯一索引）
//  4. crypto/subtle.ConstantTimeCompare(hash(input), stored_hash) 防时序
//  5. 验 status=active
//  6. 注入 tenant_id / workspace_id / scopes / api_key_id
//  7. 更新 last_used_at
//
// 缺/错/吊销 → 401；密钥服务不可用 → 401（fail-closed，绝不放行）
package middleware

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"hutian-tenant-api/models"
)

// 开放 API 上下文键
const (
	CtxApiKeyID     = "ctx.api_key_id"
	CtxApiKeyScopes = "ctx.api_key_scopes"
)

// KeyPlaintextPrefix 开放 API key 明文前缀（dev=test，后续 live/test 分环境）
const KeyPlaintextPrefix = "hsk_test_"

// ApiKeyContext 开放 API 鉴权中间件
func ApiKeyContext(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := strings.TrimSpace(c.GetHeader("Authorization"))
		if auth == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":  "api key required",
				"reason": "missing Authorization header",
			})
			return
		}
		parts := strings.SplitN(auth, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":  "api key required",
				"reason": "invalid Authorization header format, expected 'Bearer hsk_xxx'",
			})
			return
		}
		plaintext := strings.TrimSpace(parts[1])
		if !strings.HasPrefix(plaintext, KeyPlaintextPrefix) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":  "api key required",
				"reason": "key must start with " + KeyPlaintextPrefix,
			})
			return
		}
		if len(plaintext) < len(KeyPlaintextPrefix)+8 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":  "api key required",
				"reason": "key too short",
			})
			return
		}

		// SHA256(明文) hex — 确定性，用 key_hash 唯一索引查询
		sum := sha256.Sum256([]byte(plaintext))
		hashHex := hex.EncodeToString(sum[:])

		var key models.ApiKey
		if err := db.Where("key_hash = ?", hashHex).First(&key).Error; err != nil {
			// 查不到 = key 无效；fail-closed 不区分"不存在"与"吊销"，统一 401 防枚举
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":  "api key invalid",
				"reason": "key not recognized",
			})
			return
		}

		// 恒定时间比较防时序（即使唯一索引已匹配，多一道防护防 DB 层大小写/编码差异）
		if subtle.ConstantTimeCompare([]byte(hashHex), []byte(key.KeyHash)) != 1 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":  "api key invalid",
				"reason": "key hash mismatch",
			})
			return
		}

		if key.Status != models.ApiKeyStatusActive {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":  "api key revoked",
				"reason": "key status is " + string(key.Status),
			})
			return
		}

		// 注入上下文（复用 tenant_context.go 的 CtxTenantID/CtxWorkspaceID/CtxDB/CtxAuthenticated）
		c.Set(CtxApiKeyID, key.ID)
		c.Set(CtxApiKeyScopes, key.Scopes)
		c.Set(CtxTenantID, key.TenantID)
		c.Set(CtxWorkspaceID, key.WorkspaceID)
		c.Set(CtxDB, db)
		c.Set(CtxAuthenticated, true)

		// 更新 last_used_at（同步但轻量，单行 UPDATE）
		now := time.Now()
		db.Model(&models.ApiKey{}).Where("id = ?", key.ID).
			UpdateColumn("last_used_at", now)

		c.Next()
	}
}

// MustApiKeyID 从 context 取 api key id（handler 用）
func MustApiKeyID(c *gin.Context) int64 {
	if v, ok := c.Get(CtxApiKeyID); ok {
		if id, ok := v.(int64); ok {
			return id
		}
	}
	return 0
}

// MustApiKeyScopes 从 context 取 scopes（handler 用）
func MustApiKeyScopes(c *gin.Context) string {
	if v, ok := c.Get(CtxApiKeyScopes); ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

// HasScope 判断当前 key 是否拥有某 scope
func HasScope(c *gin.Context, scope string) bool {
	scopes := MustApiKeyScopes(c)
	for _, s := range strings.Split(scopes, ",") {
		if strings.TrimSpace(s) == scope {
			return true
		}
	}
	return false
}

// HashApiKey 算明文 key 的 SHA256 hex（存储与查询用）
func HashApiKey(plaintext string) string {
	sum := sha256.Sum256([]byte(plaintext))
	return hex.EncodeToString(sum[:])
}

// GenerateApiKey 生成新 key：返回 (明文, prefix, hash)
//   - plaintext = KeyPlaintextPrefix + 32字节随机hex（仅此一次返回给客户）
//   - prefix    = KeyPlaintextPrefix + 前8字符（存 DB，列表展示辨认用）
//   - hash      = SHA256(plaintext) hex（存 DB key_hash，查询+防时序）
func GenerateApiKey() (plaintext, prefix, hash string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", "", "", err
	}
	randHex := hex.EncodeToString(b)
	plaintext = KeyPlaintextPrefix + randHex
	prefix = KeyPlaintextPrefix + randHex[:8]
	hash = HashApiKey(plaintext)
	return plaintext, prefix, hash, nil
}
