// Package repo — ORM 基类，强制 tenant_id 注入
//
// T6.2 落地（FR-T02, NFR-T01）：
//   - 所有业务 repo 继承 TenantRepo，查询自动走 where tenant_id
//   - GORM Scopes 机制：tenantScope(tenantID) 返回 func(*gorm.DB) *gorm.DB
//   - 业务 repo 的 Find/First/Where 等方法都先 .Scopes(tenantScope) 再链式
//   - 漏 where tenant_id = 串元数据（RT1 风险），靠本基类 + 串数据探针守
//
// 球门：业务代码无法绕过 tenant_id 注入——
//   不调 NewTenantRepo 就拿不到 db 句柄，调了就强制 scope。
//   唯一例外是 tenants/plan_quotas 本身（无 tenant_id 或自身即租户），单独走 RawRepo。
package repo

import (
	"gorm.io/gorm"
)

// TenantRepo 租户隔离的 repo 基类
// 所有带 tenant_id 的业务表用此基类
type TenantRepo struct {
	db       *gorm.DB
	tenantID int64
}

// NewTenantRepo 构造租户隔离 repo（tenantID 从 middleware.MustTenantID 来）
func NewTenantRepo(db *gorm.DB, tenantID int64) *TenantRepo {
	return &TenantRepo{db: db, tenantID: tenantID}
}

// DB 返回已注入 tenant scope 的 db 链（业务代码用此句柄查询）
// 用法：repo.DB().Find(&workspaces)  自动 where tenant_id=?
func (r *TenantRepo) DB() *gorm.DB {
	return r.db.Scopes(tenantScope(r.tenantID))
}

// RawDB 返回不带 tenant scope 的原始 db（仅限 tenants 表查询/跨租户平台操作，慎用）
// 业务代码一般不用，留给平台级 admin 操作
func (r *TenantRepo) RawDB() *gorm.DB {
	return r.db
}

// TenantID 返回当前 context 的 tenant_id
func (r *TenantRepo) TenantID() int64 {
	return r.tenantID
}

// tenantScope GORM Scope：强制 where tenant_id=?
// 所有 TenantRepo.DB() 返回的链都带此 scope
func tenantScope(tenantID int64) func(*gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		return db.Where("tenant_id = ?", tenantID)
	}
}

// RawRepo 无租户隔离的 repo（tenants/plan_quotas/audit_logs 等无 tenant_id 或跨租户表用）
// 慎用——只有确认表无 tenant_id 或确需跨租户操作时才用
type RawRepo struct {
	db *gorm.DB
}

func NewRawRepo(db *gorm.DB) *RawRepo { return &RawRepo{db: db} }
func (r *RawRepo) DB() *gorm.DB       { return r.db }
