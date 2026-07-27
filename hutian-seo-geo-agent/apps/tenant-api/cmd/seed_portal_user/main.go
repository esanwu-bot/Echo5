// 开发工具：给 seed 租户 A/B 各创建一个 portal 登录用户，用于 T7.2/T7.3 真接口验证
// 用法（在 apps/tenant-api 目录）：
//   go run ./cmd/seed_portal_user
// 幂等：email 唯一，重复跑会报 duplicate entry，不影响
package main

import (
	"fmt"
	"log"

	"hutian-tenant-api/auth"
	"hutian-tenant-api/config"
	"hutian-tenant-api/db"
	"hutian-tenant-api/models"
)

func main() {
	cfg := config.Load()
	gormDB, err := db.Connect(cfg)
	if err != nil {
		log.Fatalf("connect db: %v", err)
	}

	// 默认密码 dev-password-change-in-prod
	hash, err := auth.HashPassword("dev-password-change-in-prod")
	if err != nil {
		log.Fatalf("hash password: %v", err)
	}

	seeds := []struct {
		email       string
		displayName string
		tenantSlug  string
		role        models.SeatRole
	}{
		{"owner-a@hutian.dev", "Owner A", "tenant-a", models.SeatRoleOwner},
		{"admin-b@hutian.dev", "Admin B", "tenant-b", models.SeatRoleAdmin},
	}

	for _, s := range seeds {
		// 查 tenant
		var tenant models.Tenant
		if err := gormDB.Where("slug = ?", s.tenantSlug).First(&tenant).Error; err != nil {
			log.Printf("skip %s: tenant %s not found", s.email, s.tenantSlug)
			continue
		}
		// 查一个 active workspace
		var workspace models.Workspace
		if err := gormDB.Where("tenant_id = ? AND status = ?", tenant.ID, models.WorkspaceStatusActive).
			First(&workspace).Error; err != nil {
			log.Printf("skip %s: no active workspace for tenant %s", s.email, s.tenantSlug)
			continue
		}

		user := models.User{
			Email:       s.email,
			PasswordHash: hash,
			DisplayName: s.displayName,
			Status:      models.UserStatusActive,
		}
		if err := gormDB.Create(&user).Error; err != nil {
			log.Printf("create user %s: %v (may already exist)", s.email, err)
			// 重新查以获取 id
			if err2 := gormDB.Where("email = ?", s.email).First(&user).Error; err2 != nil {
				log.Printf("lookup user %s: %v", s.email, err2)
				continue
			}
		}

		seat := models.Seat{
			TenantID: tenant.ID,
			UserID:   user.ID,
			Role:     s.role,
			Status:   models.SeatStatusActive,
		}
		if err := gormDB.Create(&seat).Error; err != nil {
			log.Printf("create seat for %s: %v (may already exist)", s.email, err)
			// 查 seat
			if err2 := gormDB.Where("tenant_id = ? AND user_id = ?", tenant.ID, user.ID).First(&seat).Error; err2 != nil {
				log.Printf("lookup seat for %s: %v", s.email, err2)
				continue
			}
		}

		fmt.Printf("OK  user=%s (id=%d)  tenant=%s (id=%d)  workspace=%s (id=%d)  seat=%d  role=%s\n",
			user.Email, user.ID, tenant.Slug, tenant.ID, workspace.Slug, workspace.ID, seat.ID, seat.Role)
	}
}
