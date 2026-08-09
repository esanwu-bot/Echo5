// Package main — P1-13/14 Schema 基线对齐探针
//
// 目标：确保 models.AllModels() ↔ migrations/*.sql 对齐
//  ① 每个 AllModels() 的 TableName() 在 migrations/*.sql 中有对应 CREATE TABLE
//  ② SQL migration 文件不包含 AllModels() 之外的活跃表（防止加表只改 SQL 忘加模型）
//  ③ len(AllModels()) == len(AllTableNames())（无模型漏实现 TableName）
//
// 此探针不需要数据库连接，纯静态分析，适合 CI。
package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"hutian-tenant-api/models"
)

type assertion struct {
	name   string
	pass   bool
	detail string
}

func main() {
	log.SetFlags(0)

	// migrations 目录：从多个候选路径中找到第一个存在的
	migrationsDir := findMigrationsDir()

	// 获取模型表名列表
	modelNames := models.AllTableNames()
	modelSet := make(map[string]bool, len(modelNames))
	for _, n := range modelNames {
		modelSet[n] = true
	}

	// 读取 SQL migration 文件中所有 CREATE TABLE 表名
	sqlTables, err := readCreateTables(migrationsDir)
	if err != nil {
		log.Fatalf("[fatal] read migrations: %v", err)
	}
	sqlSet := make(map[string]bool, len(sqlTables))
	for _, n := range sqlTables {
		sqlSet[n] = true
	}

	var asserts []assertion

	// ① 每个模型表在 SQL migration 中有 CREATE TABLE
	var missingInSQL []string
	for _, name := range modelNames {
		if !sqlSet[name] {
			missingInSQL = append(missingInSQL, name)
		}
	}
	asserts = append(asserts, assertion{
		name:   "① 每个模型表在 migrations/*.sql 有 CREATE TABLE",
		pass:   len(missingInSQL) == 0,
		detail: fmt.Sprintf("缺失: %v", missingInSQL),
	})

	// ② SQL migration 不包含模型之外的活跃表
	var extraInSQL []string
	for _, name := range sqlTables {
		if !modelSet[name] {
			extraInSQL = append(extraInSQL, name)
		}
	}
	asserts = append(asserts, assertion{
		name:   "② migrations/*.sql 无模型之外的幽灵表",
		pass:   len(extraInSQL) == 0,
		detail: fmt.Sprintf("多余: %v", extraInSQL),
	})

	// ③ 模型数 == 表名数（无重复、无漏实现 TableName）
	asserts = append(asserts, assertion{
		name:   fmt.Sprintf("③ len(AllModels()) == len(AllTableNames()) == %d", len(modelNames)),
		pass:   len(modelNames) == len(models.AllModels()),
		detail: fmt.Sprintf("AllModels=%d, AllTableNames=%d", len(models.AllModels()), len(modelNames)),
	})

	// ④ migrations 目录存在且至少有一个 .sql 文件
	files, _ := filepath.Glob(filepath.Join(migrationsDir, "*.sql"))
	asserts = append(asserts, assertion{
		name:   "④ migrations/ 目录存在且含 .sql 文件",
		pass:   len(files) > 0,
		detail: fmt.Sprintf("找到 %d 个 .sql 文件", len(files)),
	})

	// 输出
	passed, failed := 0, 0
	for _, a := range asserts {
		if a.pass {
			passed++
			fmt.Printf("  [PASS] %s\n", a.name)
		} else {
			failed++
			fmt.Printf("  [FAIL] %s\n         %s\n", a.name, a.detail)
		}
	}

	// 附：对齐明细
	fmt.Printf("\n  模型表 (%d): %s\n", len(modelNames), strings.Join(sortedCopy(modelNames), ", "))
	fmt.Printf("  SQL表  (%d): %s\n", len(sqlTables), strings.Join(sortedCopy(sqlTables), ", "))

	fmt.Printf("\nprobe:schema-baseline: %d/%d passed\n", passed, passed+failed)
	if failed > 0 {
		os.Exit(1)
	}
}

// readCreateTables 扫描 migrations 目录下所有 .sql 文件，
// 提取 CREATE TABLE [IF NOT EXISTS] `table_name` 中的表名。
var createTableRe = regexp.MustCompile(`(?i)CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?` + "`" + `(\w+)` + "`")

func readCreateTables(dir string) ([]string, error) {
	files, err := filepath.Glob(filepath.Join(dir, "*.sql"))
	if err != nil {
		return nil, fmt.Errorf("glob migrations: %w", err)
	}
	seen := make(map[string]bool)
	for _, f := range files {
		data, err := os.ReadFile(f)
		if err != nil {
			return nil, fmt.Errorf("read %s: %w", f, err)
		}
		matches := createTableRe.FindAllSubmatch(data, -1)
		for _, m := range matches {
			name := string(m[1])
			seen[name] = true
		}
	}
	result := make([]string, 0, len(seen))
	for name := range seen {
		result = append(result, name)
	}
	return result, nil
}

func sortedCopy(s []string) []string {
	c := make([]string, len(s))
	copy(c, s)
	sort.Strings(c)
	return c
}

// findMigrationsDir 按候选路径查找 migrations 目录。
// go run ./cmd/probe_schema_baseline 时 CWD=apps/tenant-api/，路径为 "migrations"
// go run ./cmd/probe_schema_baseline 时编译产物在 cmd/ 下，路径为 "../../migrations"
// 直接在 cmd/ 目录下运行时路径为 "../migrations"
func findMigrationsDir() string {
	candidates := []string{
		"migrations",
		filepath.Join("..", "..", "migrations"),
		filepath.Join("..", "migrations"),
	}
	for _, c := range candidates {
		if info, err := os.Stat(c); err == nil && info.IsDir() {
			return c
		}
	}
	// 全部不存在时返回默认值，让后续逻辑报错
	return "migrations"
}
