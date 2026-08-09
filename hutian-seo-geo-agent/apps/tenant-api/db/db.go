// Package db — GORM 连接 + AutoMigrate
//
// T6.1 落地：连 hutian 元数据库，AutoMigrate 9 张表 + 索引/约束
// 球门（数据库设计 ADR-1）：
//   - 只连 hutian 元数据库，绝不连 hutian_sitebase（业务库靠实例隔离，本服务不动）
//   - AutoMigrate 建表 + 索引；GORM 软删自动加 deleted_at 索引
//   - 不用外键约束（文档：跨租户 fk 不可能成立，靠应用层 + tenant_id 索引挡）
package db

import (
	"fmt"
	"log"
	"strings"
	"time"

	"hutian-tenant-api/config"
	"hutian-tenant-api/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Connect 连 hutian 元数据库（GORM）
func Connect(cfg config.Config) (*gorm.DB, error) {
	gormLogLevel := logger.Silent
	if cfg.Dev {
		gormLogLevel = logger.Info // 开发模式打印 SQL
	}
	db, err := gorm.Open(mysql.Open(cfg.MetaDBDSN), &gorm.Config{
		Logger:      logger.Default.LogMode(gormLogLevel),
		PrepareStmt: true,
	})
	if err != nil {
		return nil, fmt.Errorf("connect hutian meta db: %w", err)
	}
	// 连接池配置
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get sql.DB: %w", err)
	}
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// 验证连接 + 确认连的是 hutian 不是 hutian_sitebase
	var dbName string
	if err := db.Raw("SELECT DATABASE()").Scan(&dbName).Error; err != nil {
		return nil, fmt.Errorf("verify database name: %w", err)
	}
	if dbName != "hutian" {
		return nil, fmt.Errorf("FATAL: connected to database %q, expected \"hutian\" — tenant-api must NOT touch hutian_sitebase", dbName)
	}
	log.Printf("[db] connected to hutian meta db (confirmed database=%q)", dbName)
	return db, nil
}

// Migrate T6.1：AutoMigrate 全部模型表
// GORM AutoMigrate 会建表 + 加列 + 加索引，不会删列/删表（安全）
//
// 表选项强制 InnoDB + utf8mb4（P1 修复）：
//   - GORM mysql 驱动不指定 table_options 会继承 MySQL 服务器默认，
//     XAMPP 等环境常默认 MyISAM（不支持事务/行锁），多租户元数据并发写必出问题
//   - charset 用 utf8mb4 支持 emoji/完整 Unicode（utf8 是 3 字节截断版）
//
// P1-13/14 约定：
//   - 生产 schema 演进用显式 migration SQL（见 migrations/*.sql），AutoMigrate 仅本地 dev 起表
//   - 表名校验从 models.AllTableNames() 动态派生，不再硬编码表名列表或表数
func Migrate(db *gorm.DB) error {
	if err := db.Set("gorm:table_options", "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci").
		AutoMigrate(models.AllModels()...); err != nil {
		return fmt.Errorf("auto migrate: %w", err)
	}
	// 验证所有表都建好——表名列表从 AllTableNames() 动态派生（P1-13/14）
	expectedTables := models.AllTableNames()
	expectedCount := len(expectedTables)

	// 动态构造 IN (?, ?, ...) 占位符
	placeholders := make([]string, len(expectedTables))
	args := make([]interface{}, len(expectedTables)+1)
	args[0] = "hutian"
	for i, name := range expectedTables {
		placeholders[i] = "?"
		args[i+1] = name
	}
	query := fmt.Sprintf(`
		SELECT COUNT(*) FROM information_schema.tables
		WHERE table_schema = ? AND table_name IN (%s)
	`, strings.Join(placeholders, ","))

	var tableCount int64
	if err := db.Raw(query, args...).Scan(&tableCount).Error; err != nil {
		return fmt.Errorf("verify tables: %w", err)
	}
	if int(tableCount) != expectedCount {
		return fmt.Errorf("FATAL: expected %d tables, got %d — migration incomplete", expectedCount, tableCount)
	}
	log.Printf("[db] migrated %d tables to hutian (verified count=%d)", expectedCount, tableCount)
	return nil
}
