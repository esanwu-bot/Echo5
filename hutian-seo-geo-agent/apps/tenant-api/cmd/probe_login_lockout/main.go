// Package main — P1-1 登录失败锁定探针
//
// 目标：
//  ① 连续 N 次密码错误后返回 423 Locked
//  ② 锁定期间即使密码正确也返回 423
//  ③ 成功登录后失败计数清零
//
// 依赖：tenant-api 已启动（http://localhost:4318），且 hutian 库已 seed
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"gorm.io/gorm"

	"hutian-tenant-api/config"
	"hutian-tenant-api/db"
	"hutian-tenant-api/models"
)

const apiBase = "http://localhost:4318"

type assert struct {
	name   string
	pass   bool
	detail string
}

func main() {
	log.SetFlags(0)

	if !checkHealth() {
		log.Fatalf("[fatal] tenant-api not reachable at %s", apiBase)
	}
	log.Println("[setup] tenant-api reachable")

	cfg := config.Load()
	gormDB, err := db.Connect(cfg)
	if err != nil {
		log.Fatalf("[fatal] connect db: %v", err)
	}

	const testEmail = "owner-a@hutian.dev"
	const testTenant = "tenant-a"
	const testWorkspace = "ws-a"
	const wrongPassword = "definitely-wrong-password"

	// 以当前服务配置的阈值为基准，探针不假设固定数字
	maxAttempts := cfg.LoginMaxAttempts
	if maxAttempts <= 0 {
		maxAttempts = 5
	}

	var asserts []assert

	// 探针前清理：把测试用户恢复为干净状态
	resetUser(gormDB, testEmail)

	// ① 成功登录清零：先失败一次，再成功登录，后续再连续失败应重新计数
	code, _ := doLoginRaw(testEmail, testTenant, testWorkspace, wrongPassword)
	asserts = append(asserts, assert{
		name:   "① 单次失败返回 401",
		pass:   code == http.StatusUnauthorized,
		detail: fmt.Sprintf("status=%d", code),
	})

	code, _ = doLoginRaw(testEmail, testTenant, testWorkspace, "dev-password-change-in-prod")
	asserts = append(asserts, assert{
		name:   "② 成功登录返回 200（为清零计数）",
		pass:   code == http.StatusOK,
		detail: fmt.Sprintf("status=%d", code),
	})

	// ② 连续失败 N-1 次仍返回 401
	all401 := true
	for i := 0; i < maxAttempts-1; i++ {
		c, _ := doLoginRaw(testEmail, testTenant, testWorkspace, wrongPassword)
		if c != http.StatusUnauthorized {
			all401 = false
		}
	}
	asserts = append(asserts, assert{
		name:   fmt.Sprintf("③ 连续 %d 次失败仍返回 401", maxAttempts-1),
		pass:   all401,
		detail: fmt.Sprintf("maxAttempts=%d", maxAttempts),
	})

	// ③ 第 N 次失败返回 423 Locked
	code, body := doLoginRaw(testEmail, testTenant, testWorkspace, wrongPassword)
	asserts = append(asserts, assert{
		name:   fmt.Sprintf("④ 第 %d 次失败返回 423 Locked", maxAttempts),
		pass:   code == http.StatusLocked,
		detail: fmt.Sprintf("status=%d body=%s", code, string(body)),
	})

	// ④ 锁定期间密码正确也 423
	code, body = doLoginRaw(testEmail, testTenant, testWorkspace, "dev-password-change-in-prod")
	asserts = append(asserts, assert{
		name:   "⑤ 锁定期间正确密码也返回 423",
		pass:   code == http.StatusLocked,
		detail: fmt.Sprintf("status=%d body=%s", code, string(body)),
	})

	// 探针后清理：解锁用户，避免影响其它探针
	resetUser(gormDB, testEmail)

	// ⑤ 清理后成功登录，验证计数已归零
	code, _ = doLoginRaw(testEmail, testTenant, testWorkspace, "dev-password-change-in-prod")
	asserts = append(asserts, assert{
		name:   "⑥ 清理锁定后成功登录返回 200",
		pass:   code == http.StatusOK,
		detail: fmt.Sprintf("status=%d", code),
	})

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
	fmt.Printf("\nprobe:login-lockout: %d/%d passed\n", passed, passed+failed)
	if failed > 0 {
		os.Exit(1)
	}
}

func checkHealth() bool {
	resp, err := http.Get(apiBase + "/healthz")
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

func doLoginRaw(email, tenantSlug, workspaceSlug, password string) (int, []byte) {
	payload := map[string]string{
		"email":          email,
		"password":       password,
		"tenant_slug":    tenantSlug,
		"workspace_slug": workspaceSlug,
	}
	b, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", apiBase+"/portal/api/v1/auth/login", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 6 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return 0, []byte(err.Error())
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, body
}

func resetUser(gormDB *gorm.DB, email string) {
	var user models.User
	if err := gormDB.Where("email = ?", email).First(&user).Error; err != nil {
		log.Printf("[warn] resetUser: user %s not found: %v", email, err)
		return
	}
	if err := gormDB.Model(&user).Updates(map[string]interface{}{
		"failed_login_count": 0,
		"locked_until":       nil,
	}).Error; err != nil {
		log.Printf("[warn] resetUser: failed to reset %s: %v", email, err)
	}
}
