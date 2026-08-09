// Package middleware — 限流中间件（T9.4 ADR-open-api 5.6）
//
// per-tenant per-minute 固定窗口限流，补 review 报告"无限流"空白。
//
// 算法：固定窗口（fixed window）
//   key = tenantID（从 ApiKeyContext 拿）
//   每个 tenant 维护 {count, windowStart}
//   windowStart = truncate(now, 1min)
//   请求来了：
//     ① 如果当前分钟 != windowStart → 重置 count=1, windowStart=当前分钟
//     ② 如果 count > rpm → 429（带 Retry-After 秒数）
//     ③ 否则 count++
//
// 为什么固定窗口而非滑动窗口：
//   MVP 单实例，固定窗口最简（内存 map+mutex），窗口边界突刺可接受。
//   滑动窗口需记录时间戳列表，复杂度高；多实例换 Redis 时再上滑动窗口（标 TODO）。
//
// 与配额的关系（分层防护）：
//   限流 = 防瞬时刷（per-minute，429）
//   配额 = 防月度超额（per-month，429）
//   限流在 QuotaEnforce 之前，挡掉刷量请求不消耗配额计数
//
// 挂载顺序：ApiKeyContext → RateLimit → QuotaEnforce → handler
//   RateLimit 必须在 ApiKeyContext 之后（依赖 MustTenantID）
package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// bucket 单个租户的计数桶
type bucket struct {
	count       int
	windowStart time.Time // 窗口起始（当前分钟的第 0 秒）
}

// RateLimiter 限流器（进程内单例，所有请求共享）
type RateLimiter struct {
	mu      sync.Mutex
	buckets map[int64]*bucket // key = tenantID
	rpm     int               // 每分钟最大请求数
}

// NewRateLimiter 创建限流器
func NewRateLimiter(rpm int) *RateLimiter {
	rl := &RateLimiter{
		buckets: make(map[int64]*bucket),
		rpm:     rpm,
	}
	// 后台清理：每 5 分钟扫一次，删掉 10 分钟未用的桶（防内存泄漏）
	// 单实例 + 租户数有限时，map 增长可控；多实例换 Redis 后此清理可删
	go rl.cleanup()
	return rl
}

// RateLimit 返回 gin 中间件
// 必须挂在 ApiKeyContext 之后（依赖 MustTenantID）
func (rl *RateLimiter) RateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		tenantID := MustTenantID(c)
		now := time.Now()
		windowStart := now.Truncate(time.Minute) // 当前分钟的第 0 秒

		rl.mu.Lock()
		b, ok := rl.buckets[tenantID]
		if !ok || !b.windowStart.Equal(windowStart) {
			// 新租户 or 新窗口 → 重置
			b = &bucket{count: 1, windowStart: windowStart}
			rl.buckets[tenantID] = b
			rl.mu.Unlock()
			c.Next()
			return
		}

		// 同窗口内，count 已包含当前请求（先递增后判断，与配额一致防并发）
		b.count++
		if b.count > rl.rpm {
			// 超限：计算 Retry-After（到下个窗口的秒数）
			rl.mu.Unlock()
			retryAfter := int(time.Until(windowStart.Add(time.Minute)).Seconds())
			if retryAfter <= 0 {
				retryAfter = 1
			}
			c.Header("Retry-After", strconv.Itoa(retryAfter))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":       "rate limit exceeded",
				"limit":       rl.rpm,
				"window":      "minute",
				"retry_after": retryAfter,
			})
			return
		}
		rl.mu.Unlock()

		c.Next()
	}
}

// cleanup 后台清理过期桶（每 5 分钟扫一次，删掉 10 分钟未用的）
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		cutoff := time.Now().Add(-10 * time.Minute)
		rl.mu.Lock()
		for tid, b := range rl.buckets {
			if b.windowStart.Before(cutoff) {
				delete(rl.buckets, tid)
			}
		}
		rl.mu.Unlock()
	}
}
