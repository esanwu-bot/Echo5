// Package models — 多租户元数据 GORM 模型
//
// 对应 docs/多租户-数据库设计.md 的 9 张表。
// 约定（数据库设计 §表设计）：
//   - 所有业务表含 id(bigint pk) / tenant_id(除 tenants/plan_quotas 外, not null, indexed)
//   - created_at / updated_at / deleted_at(软删, nullable)
//   - GORM 软删用 gorm.DeletedAt，查询自动过滤 deleted_at IS NULL
//
// 隔离策略（ADR-1）：
//   - 壶天元数据：共享库 + tenant_id 列隔离（本文件这些表）
//   - siteBase 业务数据：每 workspace 一套 siteBase 实例隔离（表在 hutian_sitebase 库，本服务不动）
package models

import (
	"database/sql"
	"time"

	"gorm.io/gorm"
)

// BaseModel 业务表公共字段（不含 tenant_id，由各表显式声明）
// gorm.Model 用 uint ID，这里用 int64 与文档 bigint 对齐
type BaseModel struct {
	ID        int64          `gorm:"primaryKey;autoIncrement" json:"id"`
	CreatedAt time.Time      `gorm:"index" json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// ────────────────────────────────────────────────
// 0. users — 平台用户=租户登录主体（M7 T7.1 补，落地 9 表悬空 fk）
//    seats.user_id 指向本表；登录/个人资料/2FA 依赖此表
// ────────────────────────────────────────────────

type UserStatus string

const (
	UserStatusActive         UserStatus = "active"
	UserStatusDisabled       UserStatus = "disabled"
	UserStatusPendingInvite  UserStatus = "pending_invite"
)

// User 平台用户（租户成员登录主体）
// password_hash 用 bcrypt/argon2；totp_secret_encrypted envelope 加密（NFR-T02 同红线）
type User struct {
	BaseModel
	Email                string `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	PasswordHash         string `gorm:"type:varchar(255);not null" json:"-"` // JSON 标 -，永不序列化到响应
	DisplayName          string `gorm:"type:varchar(128)" json:"display_name"`
	Status               UserStatus `gorm:"type:varchar(32);index;not null;default:active" json:"status"`
	TOTPSecretEncrypted  []byte `gorm:"type:varbinary(512)" json:"-"` // 加密的 TOTP secret，永不序列化
	TOTPEnabled          bool   `gorm:"not null;default:false" json:"totp_enabled"`
	LastLoginAt          *time.Time `gorm:"index" json:"last_login_at,omitempty"`
	FailedLoginCount     int    `gorm:"not null;default:0" json:"-"`
	LockedUntil          *time.Time `gorm:"index" json:"-"`
}

func (User) TableName() string { return "users" }

// ────────────────────────────────────────────────
// 1. tenants — 租户=计费/登录主体
// ────────────────────────────────────────────────

// TenantStatus 租户状态机（FR-S04）：trial→active→grace→readonly→suspended
type TenantStatus string

const (
	TenantStatusTrial    TenantStatus = "trial"
	TenantStatusActive   TenantStatus = "active"
	TenantStatusGrace    TenantStatus = "grace"
	TenantStatusReadonly TenantStatus = "readonly"
	TenantStatusSuspended TenantStatus = "suspended"
)

type Tenant struct {
	BaseModel
	Slug          string `gorm:"type:varchar(64);uniqueIndex;not null" json:"slug"`
	DisplayName   string `gorm:"type:varchar(128);not null" json:"display_name"`
	Status        TenantStatus `gorm:"type:varchar(32);index;not null;default:trial" json:"status"`
	OwnerSeatID   int64  `gorm:"index" json:"owner_seat_id"`
}

func (Tenant) TableName() string { return "tenants" }

// ────────────────────────────────────────────────
// 2. workspaces — 品牌/站主体（tenant 1:N）← FR-T03 品牌派生落点
// ────────────────────────────────────────────────

type WorkspaceStatus string

const (
	WorkspaceStatusActive  WorkspaceStatus = "active"
	WorkspaceStatusArchived WorkspaceStatus = "archived"
)

// Workspace 品牌/站主体
// brand_name + industry + fallback_copy_json = 渲染器 reader.ts MOCK_SETTINGS 兜底真值来源（FR-T03）
type Workspace struct {
	BaseModel
	TenantID           int64           `gorm:"uniqueIndex:idx_workspace_tenant_slug;index;not null" json:"tenant_id"`
	Slug               string          `gorm:"type:varchar(64);uniqueIndex:idx_workspace_tenant_slug;not null" json:"slug"`
	BrandName          string          `gorm:"type:varchar(128);not null" json:"brand_name"`
	Industry           string          `gorm:"type:varchar(64)" json:"industry"`
	SitebaseInstanceID int64           `gorm:"index;not null" json:"sitebase_instance_id"`
	FallbackCopyJSON   string          `gorm:"type:json" json:"fallback_copy_json"`
	Status             WorkspaceStatus `gorm:"type:varchar(32);index;not null;default:active" json:"status"`
}

func (Workspace) TableName() string { return "workspaces" }

// ────────────────────────────────────────────────
// 3. sitebase_instances — siteBase 实例池
// ────────────────────────────────────────────────

type ProvisionKind string
type InstanceHealth string

const (
	ProvisionKindPreset   ProvisionKind = "preset"
	ProvisionKindContainer ProvisionKind = "container"

	InstanceHealthHealthy  InstanceHealth = "healthy"
	InstanceHealthDegraded InstanceHealth = "degraded"
	InstanceHealthDown     InstanceHealth = "down"
)

// SitebaseInstance siteBase 实例（M6 起步 1:1 workspace, capacity=1）
type SitebaseInstance struct {
	BaseModel
	BaseURL       string         `gorm:"type:varchar(255);not null" json:"base_url"`
	ProvisionKind ProvisionKind  `gorm:"type:varchar(32);not null;default:preset" json:"provision_kind"`
	Capacity      int            `gorm:"not null;default:1" json:"capacity"` // M6=1，预留共享模式
	Health        InstanceHealth `gorm:"type:varchar(32);index;not null;default:healthy" json:"health"`
}

func (SitebaseInstance) TableName() string { return "sitebase_instances" }

// ────────────────────────────────────────────────
// 4. tenant_credentials — 每 workspace 的 siteBase 凭证（加密）← NFR-T02
// ────────────────────────────────────────────────

type AuthKind string
type CredentialStatus string

const (
	AuthKindJWTPassword       AuthKind = "jwt_password"
	AuthKindClientCredentials AuthKind = "client_credentials"

	CredentialStatusActive   CredentialStatus = "active"
	CredentialStatusRotating CredentialStatus = "rotating"
	CredentialStatusRevoked  CredentialStatus = "revoked"
)

// TenantCredential siteBase 访问凭证（envelope 加密）
// 明文 secret 禁止进日志/异常栈/前端响应（NFR-T02，T6.5 单测守）
type TenantCredential struct {
	BaseModel
	WorkspaceID         int64            `gorm:"uniqueIndex;not null" json:"workspace_id"`
	AuthKind            AuthKind         `gorm:"type:varchar(32);not null" json:"auth_kind"`
	EncryptedSecret     []byte           `gorm:"type:varbinary(1024);not null" json:"-"` // JSON 标 - 不序列化到响应
	KeyVersion          int              `gorm:"not null;default:1" json:"key_version"`
	Username            string           `gorm:"type:varchar(128)" json:"username"`
	TokenCacheEncrypted []byte           `gorm:"type:varbinary(2048)" json:"-"`
	ExpiresAt           *time.Time       `gorm:"index" json:"expires_at,omitempty"`
	LastRotatedAt       *time.Time       `json:"last_rotated_at,omitempty"`
	Status              CredentialStatus `gorm:"type:varchar(32);index;not null;default:active" json:"status"`
}

func (TenantCredential) TableName() string { return "tenant_credentials" }

// ────────────────────────────────────────────────
// 5. subscriptions — 租户 1:1，与桌面授权共用结构
// ────────────────────────────────────────────────

type Plan string
type SubscriptionStatus string

const (
	PlanFree       Plan = "free"
	PlanPro        Plan = "pro"
	PlanEnterprise Plan = "enterprise"

	SubStatusActive   SubscriptionStatus = "active"
	SubStatusTrial    SubscriptionStatus = "trial"
	SubStatusGrace    SubscriptionStatus = "grace"
	SubStatusReadonly SubscriptionStatus = "readonly"
	SubStatusSuspended SubscriptionStatus = "suspended"
	SubStatusCanceled SubscriptionStatus = "canceled"
)

// Subscription 租户订阅（状态机 FR-S04：active→grace→readonly→suspended）
type Subscription struct {
	BaseModel
	TenantID            int64              `gorm:"uniqueIndex;not null" json:"tenant_id"`
	Plan                Plan               `gorm:"type:varchar(32);index;not null;default:free" json:"plan"`
	Status              SubscriptionStatus `gorm:"type:varchar(32);index;not null;default:trial" json:"status"`
	SeatsLimit          int                `gorm:"not null;default:1" json:"seats_limit"`
	CurrentPeriodStart  *time.Time         `gorm:"index" json:"current_period_start,omitempty"`
	CurrentPeriodEnd    *time.Time         `gorm:"index" json:"current_period_end,omitempty"`
	TrialEndsAt         *time.Time         `gorm:"index" json:"trial_ends_at,omitempty"`
	GraceDays           int                `gorm:"not null;default:7" json:"grace_days"`
	CancelAt            *time.Time         `json:"cancel_at,omitempty"`
}

func (Subscription) TableName() string { return "subscriptions" }

// ────────────────────────────────────────────────
// 6. seats — 租户成员+角色
// ────────────────────────────────────────────────

type SeatRole string
type SeatStatus string

const (
	SeatRoleOwner  SeatRole = "owner"
	SeatRoleAdmin  SeatRole = "admin"
	SeatRoleMember SeatRole = "member"

	SeatStatusActive   SeatStatus = "active"
	SeatStatusDisabled SeatStatus = "disabled"
)

// Seat 租户成员（联合唯一 tenant_id+user_id；active 席位数 ≤ subscriptions.seats_limit）
type Seat struct {
	BaseModel
	TenantID int64      `gorm:"uniqueIndex:idx_seat_tenant_user;index;not null" json:"tenant_id"`
	UserID   int64      `gorm:"uniqueIndex:idx_seat_tenant_user;index;not null" json:"user_id"`
	Role     SeatRole   `gorm:"type:varchar(32);not null;default:member" json:"role"`
	Status   SeatStatus `gorm:"type:varchar(32);index;not null;default:active" json:"status"`
}

func (Seat) TableName() string { return "seats" }

// ────────────────────────────────────────────────
// 7. usage_meters — 用量计量 ← FR-S03
// ────────────────────────────────────────────────

type MeterKind string

const (
	MeterLLMCalls         MeterKind = "llm_calls"
	MeterPagesBuilt       MeterKind = "pages_built"
	MeterSEOAudits        MeterKind = "seo_audits"
	MeterCitationsTracked MeterKind = "citations_tracked"
)

// UsageMeter 用量计量（联合唯一 tenant_id+meter_kind+window_start）
type UsageMeter struct {
	BaseModel
	TenantID   int64     `gorm:"uniqueIndex:idx_usage_tenant_kind_window;index;not null" json:"tenant_id"`
	MeterKind  MeterKind `gorm:"type:varchar(32);uniqueIndex:idx_usage_tenant_kind_window;not null" json:"meter_kind"`
	WindowStart time.Time `gorm:"uniqueIndex:idx_usage_tenant_kind_window;index;not null" json:"window_start"`
	Count      int64     `gorm:"not null;default:0" json:"count"`
}

func (UsageMeter) TableName() string { return "usage_meters" }

// ────────────────────────────────────────────────
// 8. plan_quotas — 套餐配额表（平台级，无 tenant_id）
// ────────────────────────────────────────────────

type WindowKind string
type OveragePolicy string

const (
	WindowKindMonth WindowKind = "month"
	WindowKindTotal WindowKind = "total"

	OverageReject  OveragePolicy = "reject"
	OverageDegrade OveragePolicy = "degrade"
	OverageAllow   OveragePolicy = "allow"
)

// PlanQuota 套餐配额（平台级，无 tenant_id，limit_per_window=-1=无限）
type PlanQuota struct {
	BaseModel
	Plan            Plan           `gorm:"type:varchar(32);uniqueIndex:idx_quota_plan_kind_window;not null" json:"plan"`
	MeterKind       MeterKind      `gorm:"type:varchar(32);uniqueIndex:idx_quota_plan_kind_window;not null" json:"meter_kind"`
	LimitPerWindow  int64          `gorm:"not null;default:-1" json:"limit_per_window"` // -1=无限
	WindowKind      WindowKind     `gorm:"type:varchar(32);uniqueIndex:idx_quota_plan_kind_window;not null;default:month" json:"window_kind"`
	OveragePolicy   OveragePolicy  `gorm:"type:varchar(32);not null;default:reject" json:"overage_policy"`
}

func (PlanQuota) TableName() string { return "plan_quotas" }

// ────────────────────────────────────────────────
// 9. audit_logs — 审计，带三元 ← NFR-T03
// ────────────────────────────────────────────────

type ActorKind string

const (
	ActorKindHuman ActorKind = "human"
	ActorKindAgent ActorKind = "agent"
)

// AuditLog 审计日志（带 tenant+workspace+seat 三元，区分 human/agent）
// created_at 是分区键候选，未来量大时按月分区
type AuditLog struct {
	BaseModel
	TenantID   sql.NullInt64 `gorm:"index" json:"tenant_id,omitempty"`
	WorkspaceID sql.NullInt64 `gorm:"index" json:"workspace_id,omitempty"`
	SeatID     sql.NullInt64 `gorm:"index" json:"seat_id,omitempty"`
	ActorKind  ActorKind     `gorm:"type:varchar(32);index;not null" json:"actor_kind"`
	Action     string        `gorm:"type:varchar(128);index;not null" json:"action"`
	TargetKind string        `gorm:"type:varchar(64);index" json:"target_kind"`
	TargetID   sql.NullInt64 `gorm:"index" json:"target_id,omitempty"`
	MetaJSON   string        `gorm:"type:json" json:"meta_json"`
}

func (AuditLog) TableName() string { return "audit_logs" }

// AllModels 返回所有需 AutoMigrate 的模型（T6.1 migration 用）
// 顺序：无外键依赖的先建（users/tenants/sitebase_instances/plan_quotas），有依赖的后建
func AllModels() []interface{} {
	return []interface{}{
		&User{},
		&Tenant{},
		&SitebaseInstance{},
		&PlanQuota{},
		&Workspace{},
		&TenantCredential{},
		&Subscription{},
		&Seat{},
		&UsageMeter{},
		&AuditLog{},
		&UserSession{},
	}
}

// ────────────────────────────────────────────────
// 10. user_sessions — 用户会话历史（跨设备持久化）
//    workbench 登录后，会话列表从 localStorage 迁到这张表，实现跨设备同步
//    session_id 是 agent-bridge 返回的 id（字符串），不是自增
//    联合唯一 tenant_id+user_id+session_id（同租户同用户不重复）
// ────────────────────────────────────────────────

// UserSession 用户会话历史索引（不含消息正文，正文在 agent-bridge 内存，后续持久化另排）
type UserSession struct {
	BaseModel
	TenantID     int64  `gorm:"uniqueIndex:idx_usession_tenant_user_sid;index;not null" json:"tenant_id"`
	UserID       int64  `gorm:"uniqueIndex:idx_usession_tenant_user_sid;index;not null" json:"user_id"`
	WorkspaceID  int64  `gorm:"index;not null" json:"workspace_id"`
	SessionID    string `gorm:"type:varchar(128);uniqueIndex:idx_usession_tenant_user_sid;not null" json:"session_id"` // agent-bridge 的 sessionId
	Title        string `gorm:"type:varchar(256);not null;default:新会话" json:"title"`
	ToolCount    int    `gorm:"not null;default:0" json:"tool_count"`
}

func (UserSession) TableName() string { return "user_sessions" }
