// Package auth — 密码哈希工具
//
// 用户密码用 bcrypt 哈希（golang.org/x/crypto/bcrypt），哈希值永不出现在 API 响应。
package auth

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

// HashPassword bcrypt 哈希密码
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	return string(bytes), nil
}

// CheckPassword 校验密码
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
