// Package main — 壶天多租户后端 API（tenant-api）
//
// 对应 docs/多租户-开发计划补充.md 的 M6 任务：
//   - T6.1 migration（命令: tenant-api -migrate）
//   - T6.2 租户上下文中间件 + ORM 基类（后续加）
//   - T6.3 串数据探针（后续加）
//
// 端口默认 4318（与 agent-bridge 4317 区分）
// DSN 默认 root:root@tcp(localhost:3306)/hutian
package main

import (
	"flag"
	"log"

	"github.com/gin-gonic/gin"

	"hutian-tenant-api/auth"
	"hutian-tenant-api/config"
	"hutian-tenant-api/db"
	"hutian-tenant-api/handlers"
	"hutian-tenant-api/middleware"
	"hutian-tenant-api/models"
	"hutian-tenant-api/repo"
	"hutian-tenant-api/token"
)

func main() {
	migrateFlag := flag.Bool("migrate", false, "run T6.1 AutoMigrate then exit")
	flag.Parse()

	cfg := config.Load()

	gormDB, err := db.Connect(cfg)
	if err != nil {
		log.Fatalf("[fatal] %v", err)
	}

	if *migrateFlag {
		if err := db.Migrate(gormDB); err != nil {
			log.Fatalf("[fatal] migrate: %v", err)
		}
		log.Println("[ok] migration done, 10 tables ready in hutian db")
		return
	}

	// 租户自服务 JWT 签发/验签器（T7.2）
	jwtSigner, err := auth.NewSigner(cfg.JWTKey)
	if err != nil {
		log.Printf("[warn] tenant JWT signer not configured: %v — /portal/api/v1/* will return 401", err)
		jwtSigner = nil
	}
	jwtVerifier, err := auth.NewVerifier(cfg.JWTKey)
	if err != nil {
		log.Printf("[warn] tenant JWT verifier not configured: %v — /portal/api/v1/* will return 401", err)
		jwtVerifier = nil
	}

	if cfg.Dev {
		gin.SetMode(gin.DebugMode)
	} else {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()

	// T7.6 dev CORS：允许 apps/web（localhost:3000）/apps/admin 直连 tenant-api
	// 生产环境应关闭或限定具体域名，不可 * 通配带凭证请求。
	if cfg.Dev {
		r.Use(func(c *gin.Context) {
			origin := c.GetHeader("Origin")
			if origin != "" {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
				c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			}
			c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Token, X-Tenant-ID, X-Workspace-ID")
			if c.Request.Method == "OPTIONS" {
				c.AbortWithStatus(204)
				return
			}
			c.Next()
		})
	}

	// 健康检查（T6.1 出口：服务起来 + DB 连通，无需 tenant ctx）
	r.GET("/healthz", func(c *gin.Context) {
		var dbName string
		if err := gormDB.Raw("SELECT DATABASE()").Scan(&dbName).Error; err != nil {
			c.JSON(500, gin.H{"ok": false, "error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"ok": true, "db": dbName})
	})

	// T6.2: 业务路由组，强制 TenantContext 中间件
	// 无 X-Tenant-ID/X-Workspace-ID → 401；workspace 不归属 tenant → 403
	api := r.Group("/api/v1")
	api.Use(middleware.TenantContext(gormDB))
	api.Use(middleware.RequireTenantContext())
	{
		// 示例：列出当前 tenant 的 workspaces（验证 tenant scope 注入）
		api.GET("/workspaces", func(c *gin.Context) {
			tenantID := middleware.MustTenantID(c)
			r := repo.NewTenantRepo(gormDB, tenantID)
			var ws []struct {
				ID        int64  `json:"id"`
				Slug      string `json:"slug"`
				BrandName string `json:"brand_name"`
				Industry  string `json:"industry"`
				Status    string `json:"status"`
			}
			if err := r.DB().Table("workspaces").
				Select("id, slug, brand_name, industry, status").
				Find(&ws).Error; err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}
			c.JSON(200, gin.H{"data": ws, "tenant_id": tenantID})
		})

		// T6.2 扩展（ADR-cross-lang）：跨语言内部 token 签发
		// Go 验完租户，签发 HMAC token，下游 bridge/MCP 验签后用 payload 里的 sitebase_base_url 路由
		// 球门：防"Go 层绿、bridge 调 siteBase 照样串"的假隔离
		api.POST("/internal/token", func(c *gin.Context) {
			tenantID := middleware.MustTenantID(c)
			workspaceID := middleware.MustWorkspaceID(c)
			seatID := middleware.MaybeSeatID(c)

			// 查 workspace 拿 sitebase_instance_id（中间件已校验归属，这里直接查）
			var ws models.Workspace
			if err := gormDB.First(&ws, workspaceID).Error; err != nil {
				c.JSON(500, gin.H{"error": "workspace lookup failed"})
				return
			}
			// 查 sitebase_instance 拿 base_url
			var inst models.SitebaseInstance
			if err := gormDB.First(&inst, ws.SitebaseInstanceID).Error; err != nil {
				c.JSON(500, gin.H{"error": "sitebase instance lookup failed"})
				return
			}

			signer, err := token.NewSigner()
			if err != nil {
				c.JSON(500, gin.H{"error": "token signer not configured: " + err.Error()})
				return
			}
			tok, err := signer.Issue(token.Payload{
				TenantID:           tenantID,
				WorkspaceID:        workspaceID,
				SitebaseInstanceID: inst.ID,
				SitebaseBaseURL:    inst.BaseURL,
				SeatID:             seatID,
			})
			if err != nil {
				c.JSON(500, gin.H{"error": "issue token: " + err.Error()})
				return
			}
			c.JSON(200, gin.H{
				"token":           tok,
				"tenant_id":       tenantID,
				"workspace_id":    workspaceID,
				"sitebase_url":    inst.BaseURL,
				"expires_in":      300,
			})
		})
	}

	// T6.2+ 路由组（待加）：
	//   /api/v1/tenants/*   — 租户 CRUD（RawRepo，无 tenant_id）
	//   /api/v1/seats/*     — 席位 CRUD
	//   /api/v1/subscriptions/* — 订阅 CRUD
	//   /api/v1/usage/*     — 用量计量

	// ────────────────────────────────────────────────
	// admin 路由组（平台超管视角，跨租户）
	// 接缝（P0-1）：独立鉴权中间件 AdminContext（X-Admin-Token），与 TenantContext 双轨
	//   - 业务路由 /api/v1/* 强制 tenant_id；admin 路由 /admin/api/v1/* 跨租户
	//   - admin 不带 tenant_id，租户 token 进不了 admin 路由
	//   - P0-2：admin 不直连 hutian 库，走本服务 handler（用 RawRepo）
	// 所有 handler 在 handlers/admin.go，写操作落 audit_logs（NFR-T03）
	// ────────────────────────────────────────────────
	if cfg.AdminToken == "" {
		log.Printf("[admin] WARN: TENANT_ADMIN_TOKEN not configured — /admin/api/v1/* will reject all requests with 401")
	} else {
		log.Printf("[admin] OK: TENANT_ADMIN_TOKEN configured (len=%d)", len(cfg.AdminToken))
	}
	admin := r.Group("/admin/api/v1")
	admin.Use(func(c *gin.Context) { c.Set("db", gormDB); c.Next() }) // 注入 db 到 context
	admin.Use(middleware.AdminContext(cfg.AdminToken))
	admin.Use(middleware.RequireAdmin())
	{
		// 总览
		admin.GET("/overview", handlers.GetOverview)

		// 租户 CRUD + 状态机
		admin.GET("/tenants", handlers.ListTenants)
		admin.GET("/tenants/:id", handlers.GetTenant)
		admin.POST("/tenants", handlers.CreateTenant)
		admin.PATCH("/tenants/:id", handlers.UpdateTenant)
		admin.POST("/tenants/:id/status", handlers.TransitionTenantStatus)

		// 订阅 CRUD + 状态机
		admin.GET("/subscriptions", handlers.ListSubscriptions)
		admin.GET("/subscriptions/:id", handlers.GetSubscription)
		admin.PATCH("/subscriptions/:id", handlers.UpdateSubscription)
		admin.POST("/subscriptions/:id/status", handlers.TransitionSubscriptionStatus)

		// 配额查询
		admin.GET("/quotas", handlers.ListQuotas)
		admin.GET("/quotas/plans", handlers.ListPlanQuotas)

		// 工作空间 CRUD
		admin.GET("/workspaces", handlers.ListWorkspaces)
		admin.GET("/workspaces/:id", handlers.GetWorkspace)
		admin.POST("/workspaces", handlers.CreateWorkspace)
		admin.PATCH("/workspaces/:id", handlers.UpdateWorkspace)

		// 席位管理（FR-S02）
		admin.GET("/seats", handlers.ListSeats)
		admin.POST("/seats", handlers.CreateSeat)
		admin.PATCH("/seats/:id", handlers.UpdateSeat)

		// 凭证（只读元信息 + 轮换/吊销，绝不出明文 NFR-T02）
		admin.GET("/credentials", handlers.ListCredentials)
		admin.POST("/credentials/:id/rotate", handlers.RotateCredential)
		admin.POST("/credentials/:id/revoke", handlers.RevokeCredential)

		// 审计日志查询
		admin.GET("/audit-logs", handlers.ListAuditLogs)
	}

	// ────────────────────────────────────────────────
	// portal 路由组（租户自服务后台，链①：tenant-api 直查 hutian）
	// 接缝（T7.2）：强制 TenantJWTContext 四合一单中间件；与 ops admin 中间件物理分开
	// 链①不签 ADR 内部 token，只读/写自己元数据
	// 链②（触发工具）仍走 /api/v1/internal/token 签 HMAC token
	// ────────────────────────────────────────────────
	// T7.5 登录端点（公开，不过 JWT 中间件）
	r.POST("/portal/api/v1/auth/login", handlers.TenantLogin(gormDB, jwtSigner, cfg.Dev))
	r.POST("/portal/api/v1/auth/logout", handlers.TenantLogout(cfg.Dev))

	portal := r.Group("/portal/api/v1")
	portal.Use(func(c *gin.Context) { c.Set("db", gormDB); c.Set("cfg.dev", cfg.Dev); c.Next() })
	portal.Use(middleware.TenantJWTContext(gormDB, jwtVerifier, cfg.Dev))
	{
		// 1. 我的工作台（个人资料）
		portal.GET("/me", handlers.TenantMe)

		// 2. 站点设置
		portal.GET("/workspace", handlers.TenantGetWorkspace)
		portal.PATCH("/workspace", handlers.TenantUpdateWorkspace)

		// 3. 成员管理（seats）
		portal.GET("/seats", handlers.TenantListSeats)
		portal.POST("/seats/invite", handlers.TenantInviteSeat)
		portal.PATCH("/seats/:id", handlers.TenantUpdateSeat)

		// 4. 订阅与计费
		portal.GET("/subscription", handlers.TenantGetSubscription)

		// 5. 额度与用量
		portal.GET("/usage", handlers.TenantListUsage)

		// 6. 凭证管理（只读元信息 + 轮换/吊销）
		portal.GET("/credentials", handlers.TenantListCredentials)
		portal.POST("/credentials/:id/rotate", handlers.TenantRotateCredential)
		portal.POST("/credentials/:id/revoke", handlers.TenantRevokeCredential)

		// 7. 操作日志
	portal.GET("/audit-logs", handlers.TenantListAuditLogs)

	// 8. 会话历史（跨设备持久化：workbench 登录后会话列表落 DB）
	portal.GET("/sessions", handlers.TenantListSessions)
	portal.POST("/sessions", handlers.TenantUpsertSession)
	portal.PATCH("/sessions", handlers.TenantUpsertSession) // 同 upsert 语义，PATCH 用于更新 tool_count
	portal.DELETE("/sessions/:sessionId", handlers.TenantDeleteSession)
	}

	log.Printf("[tenant-api] listening on :%s (dev=%v, db=hutian, admin=%v, jwt=%v)", cfg.Port, cfg.Dev, cfg.AdminToken != "", cfg.JWTKey != "")
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("[fatal] server: %v", err)
	}
}
