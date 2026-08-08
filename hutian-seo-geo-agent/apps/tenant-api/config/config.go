// Package config — 多租户后端配置
//
// 球门（多租户-数据库设计 ADR-1）：
//   - hutian 库 = 壶天元数据库（tenants/workspaces/seats/...），本服务管理
//   - hutian_sitebase 库 = 独立站业务库（siteBase），本服务不动，靠实例隔离
//   - 两库物理隔离，DSN 不串
package config

import (
	"os"
	"strings"
)

// Config 多租户后端配置
type Config struct {
	// HTTP 监听端口（默认 4318，与 agent-bridge 4317 区分）
	Port string
	// hutian 元数据库 DSN（GORM 格式）
	// 形如 root:root@tcp(localhost:3306)/hutian?charset=utf8mb4&parseTime=True&loc=Local
	MetaDBDSN string
	// 是否开发模式（开发模式放宽 CORS、打印 SQL）
	Dev bool
	// 平台 admin super-admin token（长期 token，admin 后台用）
	// 与租户内部 token（HMAC 短期）物理隔离——admin 跨租户查，权限远大于租户
	// env TENANT_ADMIN_TOKEN 配置，空则 admin 路由全 401（NFR-T01 红线：不得裸奔）
	AdminToken string
	// 租户 JWT 签名密钥（tenant self-service 登录态）
	// 与 AdminToken、TENANT_INTERNAL_TOKEN_KEY 三者物理隔离
	// env TENANT_JWT_KEY 配置，空则租户自服务路由全 401（NFR-TS05）
	JWTKey string
	// 内部 API 服务密钥（保护 /api/v1/* 路由组）
	// 仅授权内部服务（如 agent-bridge）可携带此密钥调用
	// env TENANT_INTERNAL_API_SECRET 配置，空则 /api/v1/* 全拒绝（fail-closed）
	InternalAPISecret string
}

// Load 从环境变量加载配置，带默认值
func Load() Config {
	c := Config{
		Port:              envOrDefault("TENANT_API_PORT", "4318"),
		MetaDBDSN:         envOrDefault("TENANT_META_DSN", "root:root@tcp(localhost:3306)/hutian?charset=utf8mb4&parseTime=True&loc=Local"),
		Dev:               os.Getenv("TENANT_API_DEV") == "true",
		AdminToken:        strings.TrimSpace(os.Getenv("TENANT_ADMIN_TOKEN")),
		JWTKey:            strings.TrimSpace(os.Getenv("TENANT_JWT_KEY")),
		InternalAPISecret: strings.TrimSpace(os.Getenv("TENANT_INTERNAL_API_SECRET")),
	}
	return c
}

func envOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
