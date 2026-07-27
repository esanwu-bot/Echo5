// Package token — 跨语言租户上下文内部 token（HMAC 签名）
//
// T6.2 扩展落地（ADR-cross-lang-tenant-context）：
//   - Go tenant-api 验完租户，签发短期内部 token，payload 含 tenant/workspace/sitebase 路由
//   - 下游（bridge/MCP）用共享密钥验签，验签后信任 payload
//   - 单一信任源：隔离逻辑只在 Go，下游不连 hutian 库
//
// 球门：防"Go 层探针全绿、bridge/MCP 调 siteBase 照样串数据"的假隔离。
// token 里的 sitebase_base_url 决定路由到哪个 siteBase 实例，下游无法篡改。
package token

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"
)

// TokenLifetime token 有效期（5 分钟，泄露窗口小）
const TokenLifetime = 5 * time.Minute

// Payload token 载荷（明文，非敏感）+ 路由信息
type Payload struct {
	TenantID           int64  `json:"tenant_id"`
	WorkspaceID        int64  `json:"workspace_id"`
	SitebaseInstanceID int64  `json:"sitebase_instance_id"`
	SitebaseBaseURL    string `json:"sitebase_base_url"` // 下游 MCP 用此路由 siteBase 实例
	SeatID             int64  `json:"seat_id,omitempty"`
	Exp                int64  `json:"exp"`
	Iat                int64  `json:"iat"`
}

// Signer 签发器（tenant-api 用）
type Signer struct {
	key []byte
}

// NewSigner 从 env TENANT_INTERNAL_TOKEN_KEY 构造签发器
func NewSigner() (*Signer, error) {
	k := os.Getenv("TENANT_INTERNAL_TOKEN_KEY")
	if k == "" {
		return nil, errors.New("TENANT_INTERNAL_TOKEN_KEY env not set")
	}
	return &Signer{key: []byte(k)}, nil
}

// Issue 签发 token
func (s *Signer) Issue(p Payload) (string, error) {
	now := time.Now()
	p.Iat = now.Unix()
	p.Exp = now.Add(TokenLifetime).Unix()

	payloadJSON, err := json.Marshal(p)
	if err != nil {
		return "", fmt.Errorf("marshal payload: %w", err)
	}
	payloadB64 := base64.RawURLEncoding.EncodeToString(payloadJSON)
	sig := s.sign(payloadB64)
	return payloadB64 + "." + sig, nil
}

func (s *Signer) sign(payloadB64 string) string {
	mac := hmac.New(sha256.New, s.key)
	mac.Write([]byte(payloadB64))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

// Verifier 验签器（下游 bridge/MCP 用，各语言对应实现）
type Verifier struct {
	key []byte
}

// NewVerifier 从 env 构造验签器
func NewVerifier() (*Verifier, error) {
	k := os.Getenv("TENANT_INTERNAL_TOKEN_KEY")
	if k == "" {
		return nil, errors.New("TENANT_INTERNAL_TOKEN_KEY env not set")
	}
	return &Verifier{key: []byte(k)}, nil
}

// Verify 验签 + 解析 payload
// 篡改 payload → 签名失效 → 返回 err
// 过期 → 返回 err
func (v *Verifier) Verify(tok string) (*Payload, error) {
	parts := strings.Split(tok, ".")
	if len(parts) != 2 {
		return nil, errors.New("invalid token format (expected payload.signature)")
	}
	payloadB64, sig := parts[0], parts[1]

	// 验签（恒定时间比较防时序攻击）
	expectedSig := v.sign(payloadB64)
	if !hmac.Equal([]byte(sig), []byte(expectedSig)) {
		return nil, errors.New("signature verification failed")
	}

	payloadJSON, err := base64.RawURLEncoding.DecodeString(payloadB64)
	if err != nil {
		return nil, fmt.Errorf("decode payload: %w", err)
	}
	var p Payload
	if err := json.Unmarshal(payloadJSON, &p); err != nil {
		return nil, fmt.Errorf("unmarshal payload: %w", err)
	}

	// 过期检查
	if time.Now().Unix() > p.Exp {
		return nil, errors.New("token expired")
	}
	return &p, nil
}

func (v *Verifier) sign(payloadB64 string) string {
	mac := hmac.New(sha256.New, v.key)
	mac.Write([]byte(payloadB64))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
