// Package auth — 租户自服务 JWT 签发与验签（T7.2 补完 T6.8）
//
// 四合一租户鉴权中间件用此包：
//   1. JWT 签名/验签
//   2. 用户存在且 active
//   3. seat 存在且 active
//   4. subscription 未过期（非 suspended/readonly）
//   5. workspace 归属 tenant（保留在 middleware 做，避免 auth 包依赖 gin）
//
// 令牌 payload 含 user_id / seat_id / tenant_id / workspace_id，下游只信任本服务签发的 token。
package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// TokenLifetime 租户 JWT 有效期（24 小时；后续可拆 access/refresh）
const TokenLifetime = 24 * time.Hour

// Claims 租户 JWT claims
type Claims struct {
	UserID      int64 `json:"uid"`
	SeatID      int64 `json:"sid"`
	TenantID    int64 `json:"tid"`
	WorkspaceID int64 `json:"wid"`
	jwt.RegisteredClaims
}

// Signer JWT 签发器
type Signer struct {
	key []byte
}

// NewSigner 从密钥串构造签发器
func NewSigner(key string) (*Signer, error) {
	if key == "" {
		return nil, errors.New("tenant JWT key is empty")
	}
	return &Signer{key: []byte(key)}, nil
}

// Issue 签发租户 JWT
func (s *Signer) Issue(userID, seatID, tenantID, workspaceID int64) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:      userID,
		SeatID:      seatID,
		TenantID:    tenantID,
		WorkspaceID: workspaceID,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(TokenLifetime)),
			Issuer:    "hutian-tenant-api",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.key)
}

// Verifier JWT 验签器
type Verifier struct {
	key []byte
}

// NewVerifier 从密钥串构造验签器
func NewVerifier(key string) (*Verifier, error) {
	if key == "" {
		return nil, errors.New("tenant JWT key is empty")
	}
	return &Verifier{key: []byte(key)}, nil
}

// Verify 验签并解析 claims
func (v *Verifier) Verify(tok string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tok, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return v.key, nil
	})
	if err != nil {
		return nil, fmt.Errorf("parse token: %w", err)
	}
	if !token.Valid {
		return nil, errors.New("token invalid")
	}
	claims, ok := token.Claims.(*Claims)
	if !ok {
		return nil, errors.New("invalid claims type")
	}
	return claims, nil
}
