# siteBase trace 报告 · 壶天建站腿设计依据

- trace 时间：2026-07-26
- 根目录：`E:\workspace\hutianSEOGEOAGent\siteBase`
- trace 人：Trae
- 范围：只为建站腿服务；会员/租户/权限/登录鉴权体系一句话带过、不深挖（红线 3）

---

## 0. 项目元信息

### 0.1 三仓拓扑核对（与已知表是否一致，差异说明）

| 目录 | 推断角色 | 实读结果 | 差异 |
|---|---|---|---|
| `backend/ElectronicPart` | TP6 后端 | ✅ TP6 后端，应用名 `ElectronicPart`，TP6 应用根=`backend/ElectronicPart` | 一致 |
| `tianqixin-admin` | Next.js 后台管理前端 | ✅ Next.js 14.2.35 + React 18 + Tailwind + shadcn/ui + antd；**pages+app 双路由共存**（`pages/api/*` 是旧 API Route 残留，`app/*` 是新路由主体） | 一致 |
| `tianqixin-frontend` | C 端前台（推断 Next.js） | ⚠️ **实际是 Vite + React 19 SPA**，不是 Next.js | **差异**：`package.json` 同时声明了 `next 16.0.10` 和 `react-router-dom 7.9.6`，但实际入口是 `vite.config.ts` + `index.html` + `server.js`（Express 起的 SPA 静态服务器），`build= vite build`、`dev= vite`、`start= node server.js`。`app/` 目录下的 `page.tsx` 是 Next.js 风格的页面组件，但被 Vite + React Router 7 消费。栈混合，**生产构建走 Vite** |

### 0.2 backend 栈

- **ThinkPHP 6.1**（`composer.json`: `topthink/framework ^6.1.0`）
- PHP `>=7.2.5`
- ORM：`topthink/think-orm ^2.0`（活动记录 + 关联模型）
- API 风格：**RESTful**，控制器分 5 层（`admin/api/agent/outer/oauth`），路由前缀：
  - `/api/v1/*` → 前台 C 端 API（`route/api.php`，多数 public，少量需 `AuthMiddleware`）
  - `/api/admin/*` → 后台管理 API（`route/admin.php`，全部 `AdminAuthMiddleware` 保护）
  - `/api/admin/agent/*` → 数据分析 Agent 子集
  - `/api/dictionary/*`、`/api/oauth/*` → 字典与 OAuth
- TP6 应用根=`backend/ElectronicPart` ✅（route/app/config/public/database 全在此层下，**不在** `backend/` 下）

### 0.3 tianqixin-admin 栈

- Next.js 14.2.35 + React 18.3.1
- `app/` + `pages/` 双路由共存（pages 是过渡期残留，新页面在 `app/`）
- **`models/electronicProduct.js` 性质 = 前端 JS 类（`class ElectronicProduct`）+ mock 数据封装**
  - **不是 ORM 直连库**，不连 MySQL
  - 配合 `pages/api/electronic-products/*.js` 这些 Next.js API Route 做 mock/中转
  - admin 真正调后端走 `lib/api/*.ts` 封装的 HTTP 客户端（client.ts + 22 个领域模块），全部走 `fetch(${API_BASE}/api/admin/*)` + Bearer JWT
  - **结论：建站工具应调 `backend /api/admin/*`，不调 admin 接口**（admin 只是 UI 壳 + BFF 中转层）

### 0.4 tianqixin-frontend 栈

- Vite 6 + React 19.2 + react-router-dom 7.9 + Tailwind 4 + shadcn/ui + antd + i18next + react-helmet-async + react-markdown
- 渲染模式：**纯 CSR (SPA)**——`server.js` 是 Express 静态服务器，无 SSR/SSG/ISR
- 角色：C 端前台 = 渲染器 ✅

### 0.5 三仓通信方式

- **admin → backend**：HTTP API（`fetch /api/admin/*` + Bearer JWT）
- **frontend → backend**：HTTP API（`fetch /api/v1/*` + Bearer JWT 或 `X-Session-Id` 游客会话）
- **共享 session**：❌ 无（各自 JWT）
- **直连库**：❌ 无（前后端都只通过 backend HTTP API 访问数据）
- **nginx 反代规则**：`thinkphp6-nginx.conf` **简陋**——仅 TP6 伪静态 rewrite (`^(.*)$ /index.php?s=$1`) + CORS OPTIONS 预检处理 + fastcgi_pass 127.0.0.1:9000。**无 admin/frontend 域名反代规则**，三仓独立部署（端口 8000/3000/3001）
- `start_all.bat`：四步起停（MySQL → Backend API:8000 → Queue Listener → Admin:3001 → Frontend:3000）

### 0.6 API 文档

- **Swagger/OpenAPI/apidoc：❌ 无**
- 唯一接近文档的：`tianqixin-admin/DESIGN.md`（8KB，是 UI/UX 设计规范：色彩、布局、组件、图标、登录页设计——**不是 API 文档**），另有 `tianqixin-frontend/DESIGN.md`（同源）
- API 字段规范唯一来源：**读路由文件 + 控制器代码 + 模型 $type/$i18nFields**

### 0.7 migration / .sql

- ✅ 有，混用两种：
  - **TP6 标准 PHP migration**：`database/migrations/*.php`（约 30+ 个，含 `20241201000002_create_products_table.php` 等）
  - **手工 SQL**：`database/sql/*.sql`（约 30+ 个，含 `seo_tables.sql`、`semiconductor_db_0707.sql`、`sk_products.sql`、`sk_product_models.sql`、`business_tables.sql` 等）
  - 另有 `database/seeds/`、`database/php/`（手工 seed 脚本）
- 表结构从这三处读，**未连生产库**

### 0.8 nginx conf / .env 提取的关键配置

- nginx：仅 TP6 rewrite + CORS（`Access-Control-Allow-Origin *`、允许 `Authorization, Token, X-CSRF-TOKEN` 等 header）
- backend `.env`（注：用户提示词中提到的 `.env.example` 实际不存在，**只有 `.env`**）：
  - `APP_URL=http://localhost:8000`
  - MySQL：`semiconductor_db` @ 127.0.0.1:3306（root/root）
  - Redis：127.0.0.1:6379
  - JWT：`JWT_KEY=tqx@2024#Sk$Jwt!SecretKey&Rand9x7z`，`JWT_EXPIRE=2592000`（30 天），`JWT_ISSUER=semiconductor-api`，`JWT_AUDIENCE=semiconductor-client`
  - **CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001**（admin 3001，frontend 3000）
  - **Agent LLM 已配置**：`KIMI_API_KEY` + `CODEBUDDY_API_KEY` + `LLM_PROVIDER=kimi` + `LLM_MODEL=kimi-k2.5`（壶天 Agent 可复用同一组 LLM 凭证）
  - 火山引擎翻译 + Google Translate（多语言 i18n）
  - SMS=mock（短信未真实集成），微信/支付宝支付字段空（未集成）

---

## 1. 后台 API 覆盖度（命门 · 按建站能力清单逐条查）

**全部后台路由在 `/api/admin/*` 下，统一 `AdminAuthMiddleware` 保护**（JWT Bearer Token，HS256，验证 iss/aud + 查 `SkAdmin` 表 status=1 + 查 `SkRole` status=1，注入 `admin_id/admin_info/admin_model/admin_permissions`）。

证据列均带 `文件:行号`。

| 建站需要的能力 | 现有 endpoint | 方法 | 入参/出参摘要 | 鉴权 | 覆盖度 | 通用/专用 | 证据 |
|---|---|---|---|---|---|---|---|
| **创建页面/文章 (create_page)** | `/api/admin/articles` | POST | 入：title, summary, content, category_id, status, publish_time；出：article 对象 + 同步 sk_translation 词条 | AdminAuth JWT | **有** | 通用（文章是通用 CMS 概念） | `route/admin.php:99-105`、`app/controller/admin/ArticleController.php:76-112` |
| **编辑页面正文/字段 (set_content)** | `/api/admin/articles/:id` | PUT | 入：同上字段子集；出：更新后对象 | AdminAuth JWT | **有** | 通用 | `route/admin.php:103`、`ArticleController.php:117-152` |
| **读取页面/列表 (get/list_page)** | `/api/admin/articles`、`/api/admin/articles/:id` | GET | 入：page, pageSize, keyword, category_id, status；出：分页列表 | AdminAuth JWT | **有** | 通用 | `route/admin.php:99-101`、`ArticleController.php:21-71` |
| 同上（新闻） | `/api/admin/news`、`/api/admin/news/:id` | GET/POST/PUT/DELETE | 字段同 articles（title, summary, content, status, publish_time） | AdminAuth JWT | **有** | 通用 | `route/admin.php:108-113`、`app/controller/admin/NewsController.php:1-100` |
| **设置 SEO meta（title/desc/OG/canonical）— 站点级** | `/api/admin/settings/group/seo`、`POST /api/admin/settings/update-group/seo` | GET/POST | 入：meta_title, meta_description, meta_keywords, og_image, google_analytics, baidu_analytics, baidu_verification；存 `sk_config` 表 `seo` 分组 | AdminAuth JWT | **部分**（仅站点级，无页面级） | 通用 | `route/admin.php:351-356`、`app/controller/admin/SettingController.php:97-145、220-229、306-313` |
| **设置 SEO meta — 页面级** | ❌ **无 endpoint** | — | `seo_pages` 表存在（含 url_path/page_type/title/meta_description/h1/schema_json/seo_score 等），但 **`admin.php` 路由中无任何 seo-pages 的 CRUD** | — | **无** | — | 表：`database/sql/seo_tables.sql:9-42`；路由缺失：`route/admin.php` 全文无 `seo-pages` |
| **写 JSON-LD / 结构化数据 (write_schema)** | ❌ **无 HTTP endpoint** | — | `SeoTools::generateSchema()` 存在（可生成 Product/Article 等 Schema），但属 **Agent 内部工具**（`app/agent/tools/SeoTools.php`），只能通过 `POST /api/admin/agent/chat` 间接调用，**非 RESTful endpoint**；前端 `components/JsonLd.tsx` 在客户端构建 Product Schema | — | **无**（HTTP 层） | 通用 | `app/agent/tools/SeoTools.php:1-100`；`tianqixin-frontend/components/JsonLd.tsx` |
| **创建/编辑商品 (configure_product)** | `/api/admin/products`、`/api/admin/products/:id` | POST/PUT | 入：name, product_code, brand_id, category_fk_id, description, status, is_on_sale, images(JSON), specs(JSON), mpn_prefix, spec_summary(JSON), price, stock, sort, rohs_compliant, features；事务 + 同步关联（attributes/suppliers/priceBreaks） | AdminAuth JWT | **有** | **专用**（电子零件：mpn_prefix/spec_summary/rohs_compliant/brand_id 关联 SkBrand/Series/Model 三层） | `route/admin.php:60-69`、`app/controller/admin/ProductController.php:151-192`、`app/model/SkProduct.php:13-65` |
| **商品分类/属性** | `/api/admin/categories`、`/api/admin/category-attributes`、`/api/admin/attributes` | GET/POST/PUT/DELETE | 完整 CRUD + batch + tree + available；分类属性支持批量添加 | AdminAuth JWT | **有** | **专用**（电子零件分类属性：包装类型、通道数、带宽、电压等） | `route/admin.php:24-48`、`app/controller/admin/CategoryController.php`、`CategoryAttributeController.php`、`AttributeController.php` |
| **品牌管理** | `/api/admin/brands` | GET/POST/PUT/DELETE | 完整 CRUD + batch | AdminAuth JWT | **有** | 专用 | `route/admin.php:51-56` |
| **商品规格/价格分层/库存** | `/api/admin/specifications`、`/api/admin/price-breaks`、`/api/admin/inventory` | GET/POST/PUT/DELETE | 完整 CRUD + batch + statistics | AdminAuth JWT | **有** | 专用 | `route/admin.php:71-96` |
| **上传/管理媒体 (upload_media)** | `/api/admin/upload/image`、`/api/admin/upload/images`、`/api/admin/upload/file` | POST | 入：multipart/form-data file/files；出：{url, filename, path}；委托 `UploadService::uploadImage()` 做 MIME + 扩展名双重校验 | AdminAuth JWT | **有** | 通用 | `route/admin.php:15-17`、`app/controller/admin/UploadController.php:1-80` |
| **发布/上线/下线 (publish)** | `/api/admin/products/batch-status`、`/api/admin/banners/:id/status`、`/api/admin/applications/:id/status` 等 | POST/PUT | 入：ids[] + status；改 `is_on_sale`/`status` 字段 | AdminAuth JWT | **部分**（无独立 publish 端点；通过 status 字段切换；**无草稿表、无定时发布**） | 通用 | `route/admin.php:64` |
| **预览 (preview URL/机制)** | ❌ **无** | — | 无独立预览端点；前台 `/articles/:id`、`/products/:id` 直接访问，依赖业务 `status=1` 才可见 | — | **无** | — | — |
| **设置 301 重定向 (set_redirect)** | ❌ **无** | — | 全代码库无 redirect/301 相关表或路由 | — | **无** | — | — |
| **站点/域名配置（多站点）** | ❌ **无** | — | 单站点系统；`sk_config` 表只存一套 site_name/site_logo/site_description | — | **无** | — | 见第 5 节 |
| **应用领域/应用分类** | `/api/admin/applications`、`/api/admin/application-categories` | GET/POST/PUT/DELETE | 完整 CRUD + status + batch | AdminAuth JWT | **有** | 专用（电子零件按应用领域归类） | `route/admin.php:173-205` |
| **Banner 管理** | `/api/admin/banners` | GET/POST/PUT/DELETE | 完整 CRUD + status + batch | AdminAuth JWT | **有** | 通用 | `route/admin.php:129-135` |
| **文档/FAQ/留言** | `/api/admin/documents`、`/api/admin/faqs`、`/api/admin/messages` | GET/POST/PUT/DELETE | 完整 CRUD + batch | AdminAuth JWT | **有** | 通用 | `route/admin.php:138-159` |
| **证书/招聘/营销活动** | `/api/admin/certificates`、`/api/admin/job`、`/api/admin/marketing` | GET/POST/PUT/DELETE | 完整 CRUD + batch | AdminAuth JWT | **有** | 通用/专用混合 | `route/admin.php:116-127、207-215、392-398` |
| **Series/Model/替代型号**（电子零件三层） | `/api/admin/series`、`/api/admin/models`、`/api/admin/product-alternates`、`/api/admin/model-param-vals` | GET/POST/PUT/DELETE | 完整 CRUD | AdminAuth JWT | **有** | **强专用** | `route/admin.php:321-366` |
| **系统设置（含 SEO）** | `/api/admin/settings`、`/api/admin/settings/group/:group` | GET/PUT | 分组：basic/contact/seo/third_party/company/order/inventory/upload | AdminAuth JWT | **有**（站点级） | 通用 | `route/admin.php:351-356`、`SettingController.php:97-145` |

**结论**：建站 CRUD（页面/文章/商品/分类/媒体）**完整可用**；**SEO/Schema/预览/草稿/301/多站点**是硬缺口。

---

## 2. 数据模型（建站要写数据，得知道往哪写）

字段来源：`app/model/*.php` 的 `$table` + `$type` + `$i18nFields`，以及 `database/sql/*.sql`。

### 2.1 页面/文章表 `sk_article`（[app/model/SkArticle.php](file:///e:/workspace/hutianSEOGEOAGent/siteBase/backend/ElectronicPart/app/model/SkArticle.php)）

| 字段 | 类型 | 含义 | 通用/专用 |
|---|---|---|---|
| id | int | PK | 通用 |
| title | string | 标题（i18n） | 通用 |
| summary | string | 摘要（i18n） | 通用 |
| content | text | 正文（i18n） | 通用 |
| category_id | int | 关联 `sk_article_category` | 通用 |
| status | int | 0/1 禁用/启用 | 通用 |
| publish_time | datetime | 发布时间 | 通用 |
| views | int | 浏览量 | 通用 |
| create_time/update_time | datetime | 时间戳 | 通用 |

**SEO 字段：❌ 无**（无 seo_title、meta_description、canonical 等）

### 2.2 商品表 `sk_product`（[app/model/SkProduct.php](file:///e:/workspace/hutianSEOGEOAGent/siteBase/backend/ElectronicPart/app/model/SkProduct.php)）

| 字段 | 类型 | 含义 | 通用/专用 |
|---|---|---|---|
| id | int | PK | 通用 |
| name | string | 商品名（i18n） | 通用 |
| product_code | string | 商品编码 | 通用 |
| brand_id | int | 关联 `sk_brands` | **专用** |
| category_fk_id | int | 关联 `sk_category` | 通用 |
| description | text | 描述（i18n） | 通用 |
| features | text | 特性（i18n） | **专用** |
| status | int | 状态 | 通用 |
| is_on_sale | int | 上架 0/1 | 通用 |
| images | JSON | 图片数组 | 通用 |
| specs | JSON | 规格表 | **专用** |
| spec_summary | JSON | 规格摘要 | **专用** |
| mpn_prefix | string | MPN 前缀 | **强专用** |
| price | float | 基础单价 USD | 通用 |
| stock | int | 基础库存 | 通用 |
| rohs_compliant | int | RoHS 合规 | **专用** |
| views/sort | int | 浏览/排序 | 通用 |

**SEO 字段：❌ 无**；**多语言：通过 `sk_translation` 表 + `I18nService` 实现 field 级 i18n**（name/description/features）

### 2.3 分类表 `sk_category` + `sk_subcategory` + `sk_article_category`

- `sk_category`：电子产品分类树（parent_id 自关联）
- `sk_subcategory`：子分类
- `sk_article_category`：文章分类（独立表）
- `sk_category_attribute` + `sk_category_attribute_value`：分类-属性关联（**强专用**：电子零件规格属性）

### 2.4 媒体表

- **❌ 无独立 media 表**
- 图片以 JSON 数组形式存在业务表的 `images` 字段中（如 `sk_product.images`）
- 物理文件存放：`backend/ElectronicPart/public/uploads/`，通过 `UploadService::uploadImage()` 写入
- admin 上传走 `/api/admin/upload/*`，返回 `{url, filename, path}`，url 形如 `/uploads/1773897727919-xxx.jpg`
- 前端拼完整 URL：`${BACKEND_URL}${path}`（见 `tianqixin-frontend/lib/api-client.ts:1-60`）

### 2.5 SEO/Schema 相关字段或表

**双轨制**：

1. **站点级 SEO**（`sk_config` 表 `seo` 分组）：
   - meta_title, meta_description, meta_keywords
   - og_image
   - google_analytics, baidu_analytics, baidu_verification
   - 通过 `/api/admin/settings/group/seo` 读写
   - **整个站点只有一份**

2. **页面级 SEO 审计表**（`seo_pages`，[database/sql/seo_tables.sql](file:///e:/workspace/hutianSEOGEOAGent/siteBase/backend/ElectronicPart/database/sql/seo_tables.sql)）：
   - url_path (UNIQUE), page_type (home/product/category/article/news/application/about/contact)
   - business_id（关联业务实体 id）
   - title, meta_description, meta_keywords, h1
   - h2_count, h3_count, image_total, image_alt_count, internal_links, external_links
   - has_canonical, has_og_tags, has_schema
   - **schema_json** (JSON) ← JSON-LD 结构化数据存在这里
   - seo_score, load_time_ms, mobile_score
   - status, last_audit_at, created_at, updated_at
   - **关联表**：`seo_audit_logs`（问题日志）、`seo_keywords`（关键词库）、`seo_competitors`（竞品）、`seo_sitemaps`（生成记录）、`seo_monitor_tasks`（监控任务）
   - **❌ 但 admin 路由中无任何 seo_pages 的 CRUD endpoint**——表存在但无 HTTP 接口

3. **旧表 `sk_seo`**（[app/model/SkSeo.php](file:///e:/workspace/hutianSEOGEOAGent/siteBase/backend/ElectronicPart/app/model/SkSeo.php)）：仅 page_id 字段，疑似废弃

### 2.6 多语言字段

- 机制：`sk_translation` 表 + `app/service/I18nService.php` + `app/traits/MultiLanguageTrait.php`
- i18n 字段（`app/model/*.php` 中 `$i18nFields`）：
  - SkArticle: title, summary, content
  - SkProduct: name, description, features
  - SkNews, SkApplication, SkCategory 等都有
- 翻译来源：火山引擎 + Google Translate（自动翻译队列，`think-queue` 异步执行）
- 前台请求头 `Accept-Language` + `cb-lang` 触发 `LanguageMiddleware` 切换

---

## 3. 发布与预览流程

### 3.1 草稿/发布态/定时发布

- **草稿表：❌ 无**
- 发布态：业务表 `status` 字段（0=禁用/1=启用）或 `is_on_sale`（商品上架 0/1）
- **定时发布：❌ 无**（`publish_time` 字段只是显示用，无 cron 校验）
- 批量切换：`POST /api/admin/products/batch-status`、`PUT /api/admin/banners/:id/status` 等

### 3.2 内容改动如何生效

- **直接生效**：`save()`/`update()` 写库后立即可见
- 缓存：`SettingController` 写后 `Cache::delete('system_settings')` + `Cache::delete('settings_'.$group)`；其它 controller 无主动清缓存（依赖前端刷新）
- CDN：**无 CDN 刷新机制**

### 3.3 预览机制

- **❌ 无独立预览 URL**
- 前台 `/articles/:id`、`/products/:id`、`/news/:id` 直接访问
- 业务实体 `status=0` 时前台是否可见：**未明确**（前台 API `ProductController@index` 等多数未过滤 status，需进一步看 controller 实现）

---

## 4. 前台 tianqixin-frontend 取数与渲染

### 4.1 数据源

- **调 backend HTTP API**（`fetch http://localhost:8000/api/v1/*`）
- API 客户端：`tianqixin-frontend/lib/api-client.ts`，封装 30+ 领域 API（authApi/productApi/categoryApi/cartApi/orderApi/newsApi/articleApi/mallApi/parametricSearchApi/modelApi/seriesApi/alternateApi/bomApi/comparisonApi/...）
- 鉴权：`Authorization: Bearer ${token}`（登录用户）或 `X-Session-Id: sess_xxx`（游客）
- **不直连库**

### 4.2 路由结构（页面 URL 怎么映射到内容/商品）

- React Router 7（`react-router-dom`）
- 路由：`/` (Home)、`/products`、`/products/:id`、`/mall`、`/mall/product/:id`、`/news`、`/news/:id`、`/applications`、`/applications/:id`、`/about`、`/support`、`/login`、`/register`、`/member/*`（个人中心）
- URL 与内容映射：通过 API 取 `:id` 对应实体

### 4.3 渲染模式

- **纯 CSR (SPA)**——Vite 构建，Express 静态 server
- **无 SSR / SSG / ISR**
- `index.html` 入口 + React Router 客户端路由

### 4.4 SEO head 怎么生成（关键 · 决定"SEO 焊进渲染器"焊在哪）

- **客户端注入**：`components/Seo.tsx` 使用 `react-helmet-async` 的 `<Helmet>` 在客户端注入 `<title>`、`<meta description/keywords>`、`<meta og:*>`、`<meta twitter:*>`、`<link rel=canonical>`
- **JSON-LD 客户端构建**：`components/JsonLd.tsx` 在前端构建 Product Schema（`buildProductSchema`）并 `<script type="application/ld+json">` 注入
- **风险**：纯 CSR 模式下，搜索引擎抓取初始 HTML 时拿不到完整 head（除非等 JS 执行）——这是建站腿要重点解决的 SEO 焊点
- **建议焊点**：把 SEO head + JSON-LD **从客户端注入迁到后端预渲染**（要么用 SSR 框架如 Next.js/Nuxt 重做前台，要么 backend 在 sitemap.xml 之外提供"预渲染 HTML 片段"端点供 frontend 注入）

---

## 5. 多租户 / 多站点现状（只查"有没有"，不深挖会员/权限）

- **是否支持多站点/多租户：❌ 无**
- 搜索 `tenant|site_id|multi_site|workspace` 仅在 `BaseController.php` 和 `I18nService.php` 命中，且都是 debug 注释文本（`file_put_contents('debug_i18n.txt', ...)`），**无真实多租户逻辑**
- 数据隔离方式：**完全没有**——单数据库 `semiconductor_db`，所有表无 `tenant_id`/`site_id` 字段
- `sk_config` 表只存一套站点配置（site_name, site_logo 等），全局共享
- **这条直接关系壶天 workspace=品牌 的落点**：当前 siteBase 是**单品牌单站点**系统，壶天 workspace 不能直接复用 siteBase 的隔离层，**需壶天侧自建 workspace → siteBase 实例的映射**（一个 workspace 对应一个 siteBase 部署，或后续推动 siteBase 加 tenant_id 字段）
- 会员/租户/权限模块：**存在**（`SkAdmin` + `SkRole` + `SkUser` + `AdminAuthMiddleware`/`AuthMiddleware` + `SkAdminLog`），**留待后续阶段，不展开**

---

## 6. 鉴权与凭证（建站工具调 backend 时凭证怎么拿）

### 6.1 backend API 鉴权机制

- **JWT Bearer Token**（`firebase/php-jwt 6.0`，HS256）
- 三套独立中间件：
  - `AdminAuthMiddleware`（`/api/admin/*`）：验证 iss/aud + 查 `SkAdmin` 表 status=1 + 查 `SkRole` status=1，注入 `admin_id/admin_info/admin_model/admin_permissions`（[app/middleware/AdminAuthMiddleware.php](file:///e:/workspace/hutianSEOGEOAGent/siteBase/backend/ElectronicPart/app/middleware/AdminAuthMiddleware.php)）
  - `AuthMiddleware`（`/api/v1/*` 部分需登录的接口）：验证 JWT + token 黑名单检查，注入 `userId/username`（[app/middleware/AuthMiddleware.php](file:///e:/workspace/hutianSEOGEOAGent/siteBase/backend/ElectronicPart/app/middleware/AuthMiddleware.php)）
  - `AgentAuthMiddleware`（`/api/admin/agent/*`）：Agent 专用
- 全局中间件：`Cors` + `RequestLog` + `LanguageMiddleware` + `InputSanitize` + `LoadLangPack`（[app/middleware.php](file:///e:/workspace/hutianSEOGEOAGent/siteBase/backend/ElectronicPart/app/middleware.php)）

### 6.2 token 类型与有效期、刷新机制

- token 类型：JWT HS256
- 有效期：**2592000 秒 = 30 天**（`JWT_EXPIRE`）
- iss/aud：`semiconductor-api` / `semiconductor-client`
- **刷新机制：❌ 无 refresh token endpoint**——过期需重新走 `POST /api/admin/login`（username + password）

### 6.3 有无面向第三方的 API key 体系

- **❌ 无**——只有 admin 登录态和前台用户登录态两套 JWT
- 无 OAuth2 client_credentials、无 API key、无签名鉴权
- `app/middleware/OAuth2Middleware.php` + `app/service/outer/OAuth2Service.php` 存在，但 `route/oauth.php` 路由组主要用于外部代理订单同步（`outer/AuthController` + `outer/OrderController` + `outer/InventoryController`），**不是给壶天建站工具用的开放 API**

### 6.4 凭证获取建议

- **当前唯一可行方案**：壶天 Agent 持有一个 admin 账号（如 `hutian_agent`），用 username+password 调 `POST /api/admin/login` 拿 JWT，30 天刷新一次
- **风险**：
  1. admin 凭证共享，无法区分"壶天 Agent 操作" vs "人工 admin 操作"（审计困难，`SkAdminLog` 会混在一起）
  2. 30 天过期需自动化刷新，否则建站腿会断流
  3. admin 权限过大（CRUD 全部表），无最小权限约束
- **建议（后续阶段补）**：
  - 短期：新建专用 `hutian_agent` admin 账号 + 限定 role（仅商品/文章/分类/上传 write，会员/订单/财务 read-only）
  - 中期：backend 新增 `POST /api/oauth/token` (client_credentials) + 给壶天 Agent 颁发 client_id/client_secret，签发短期 JWT（如 1 小时）
  - 长期：建站工具集调用层加 rate limit + IP 白名单

---

## 7. 缺口清单（建站腿要调、但后台没有的能力 · 逐条列）

| # | 缺口 | 影响的建站工具 | 补齐方式 | 工作量 |
|---|---|---|---|---|
| 1 | **页面级 SEO meta 写入 API**（`seo_pages` 表存在但无 admin endpoint） | `set_seo_meta` 工具 | backend 侧补：`/api/admin/seo-pages` CRUD（GET/POST/PUT/DELETE）+ 关联 `business_id` 到 `sk_product`/`sk_article` 等 | 中（1-2 天：1 controller + 1 model + 8 路由） |
| 2 | **JSON-LD / 结构化数据写入 API**（`SeoTools::generateSchema` 是 Agent 内部工具，非 RESTful） | `write_schema` 工具 | 二选一：(a) backend 侧补 `/api/admin/seo-pages/:id/schema` PUT 入参 `{schema_json}`；(b) 壶天侧自己生成 schema_json，通过缺口 1 的 `seo_pages` CRUD 写入 | 中（方案 a 半天；方案 b 壶天侧自己实现 schema 生成器） |
| 3 | **301 重定向 API** | `set_redirect` 工具（接更名） | backend 侧补：新建 `sk_redirect` 表（from_path, to_url, status_code, created_at）+ `/api/admin/redirects` CRUD + nginx conf 加 `try_files` 兜底 | 中（1 天：表 + controller + 路由 + nginx 改造） |
| 4 | **预览机制**（无独立预览 URL，依赖 status=1 直接生效） | `preview` 工具 | 二选一：(a) backend 侧补 `/api/admin/preview/:type/:id` 返回预渲染 HTML（含 SEO head + JSON-LD）；(b) frontend 侧加 `/preview/:type/:id?token=xxx` 路由，绕过 status 过滤 | 中（方案 a 需 SSR 能力，1-2 天；方案 b 半天） |
| 5 | **草稿/定时发布** | `publish` 工具（精细控制） | backend 侧补：`sk_article`/`sk_product` 加 `is_draft` 字段 + `scheduled_at` 字段 + cron 任务校验 `scheduled_at <= now() AND is_draft=0` 时切换 status | 中（1-2 天） |
| 6 | **多站点/多租户**（单站点系统，无 tenant_id） | `workspace=品牌` 落点 | 二选一：(a) 壶天侧建 workspace→siteBase 实例的 1:1 映射（一个客户一套 siteBase 部署）；(b) siteBase 加 `tenant_id` 字段 + 所有表 migration（工作量大） | 大（方案 a 不动 siteBase，1-2 天；方案 b 改 80+ 表 + 所有 controller，1-2 周） |
| 7 | **第三方 API key 体系**（仅 admin JWT，共享凭证风险） | 所有建站工具的凭证层 | backend 侧补：`POST /api/oauth/token` (client_credentials) + `oauth_clients` 表 + `OAuth2Middleware` 升级 + 给壶天 Agent 颁发 client_id/secret | 大（3-5 天：OAuth2 server 实现 + 表 + 中间件 + 客户端管理 UI） |
| 8 | **前台 SSR / 预渲染**（CSR 模式 SEO 注入不彻底） | 整个建站腿的 SEO 效果 | 二选一：(a) 用 Next.js 重做 frontend（工作量极大，否决）；(b) backend 侧补"预渲染 HTML 片段"端点 `/api/v1/prerender/:pageType/:id` 返回完整 HTML head + body，供搜索引擎抓取 + 前台 hydrate | 大（方案 b 1 周：需要 backend 实现模板渲染） |
| 9 | **token 自动刷新机制**（30 天硬过期，无 refresh） | 所有建站工具的稳定性 | 短期：壶天侧加 token 缓存 + 401 自动重登；中期：backend 补 `/api/admin/auth/refresh` endpoint | 小（壶天侧半天；backend 1 天） |
| 10 | **通用静态页（about/contact/support）内容管理 API** | `create_page`/`set_content`（通用页面，非文章） | 二选一：(a) backend 侧补 `sk_page` 表 + `/api/admin/pages` CRUD；(b) 复用 `sk_article` + 加 `page_type=static` 字段区分 | 中（方案 a 1 天；方案 b 半天） |
| 11 | **电子零件专用字段抽象层**（sk_product 含 mpn_prefix/spec_summary/rohs_compliant 等专用字段） | `configure_product` 工具的通用化 | 壶天侧补：建站工具入参用通用 schema（name/price/images/description），专用字段标"先忽略"；后续若客户是电子零件行业再展开 | 小（壶天侧半天设计 schema） |
| 12 | **API 文档缺失**（无 Swagger/OpenAPI） | 壺天建站工具集的开发效率 | backend 侧补：用 `zircote/swagger-php` 注解生成 OpenAPI 3.0 spec + `/api/admin/openapi.json` 端点 | 中（2-3 天扫一遍 controller 加注解） |

---

## 8. 你的判断（仅供参考，最终由上游 Qwen 定）

### 8.1 后台 API 整体强弱

- **中**——建站 CRUD（页面/文章/商品/分类/媒体）完整可用，RESTful 风格清晰，鉴权统一；
- 但缺 6 项关键能力：页面级 SEO 写入、JSON-LD 写入、301 重定向、预览、草稿/定时、多站点；2 项基础设施缺口：第三方 API key 体系、token 刷新；1 项 SEO 致命伤：前台 CSR 注入 head 不彻底

### 8.2 电子零件定制程度

- **高**——`sk_product` 含 mpn_prefix/spec_summary/rohs_compliant/features 等强专用字段；
- 商品有三层结构：`sk_product`（SPU）→ `sk_product_series`（系列）→ `sk_product_model`（型号）+ `sk_product_alternate`（替代型号）+ `sk_model_param_val`（型号参数值）+ `sk_product_attribute`（属性）；
- 分类属性（`sk_category_attribute`）强耦合电子零件规格（包装类型/通道数/带宽/电压等）；
- **但文章/新闻/Banner/文档/FAQ 等通用 CMS 能力是通用的**，可以直接复用；
- **SEO 表（seo_pages/seo_keywords/seo_audit_logs 等）也是通用的**，与电子零件解耦；
- 建议：建站腿第一版只调"通用 CMS 能力 + 站点级 SEO"，商品相关工具入参用通用 schema，专用字段标"先忽略"，等客户确实是电子零件行业再展开

### 8.3 据此倾向的部署形态

**形态 1（轻 Agent 调客户 CMS）**——理由：

1. 后台 CRUD 已完整覆盖建站 80% 能力（页面/文章/商品/分类/媒体），缺的 20%（SEO/Schema/预览/草稿）可以通过"壶天侧补 + backend 侧小补"快速补齐，不必重做整个 CMS
2. siteBase 是单站点单品牌系统，与壶天 workspace=品牌 模型天然契合"一个 workspace 对应一套 siteBase 部署"——形态 2（一体化托管）需 siteBase 加多租户改造，工作量大且破坏现有架构
3. siteBase 是 PHP 栈，与壶天的 Node/Python 栈隔 HTTP 边界——形态 3（私有打包）需把 PHP 一起打包，部署复杂度高
4. 风险点：缺口 7（API key 体系）和缺口 8（前台 SSR）若不补，建站腿的 SEO 效果和凭证安全都不到位——建议作为 v1.5 必做项

**部署拓扑建议**：

```
壶天 Agent (Node/Python)
   ↓ HTTPS Bearer JWT
siteBase backend (PHP/TP6, :8000)
   ↓ HTTP
siteBase frontend (Vite/React, :3000) ← 渲染器
   ↓ HTTP
siteBase admin (Next.js, :3001) ← 不暴露给壶天，仅人工运维用
```

每个 workspace（品牌）一套 siteBase 部署，壶天 Agent 通过 workspace→siteBase URL 映射表路由请求。

---

## 附录 A · 关键文件清单（壶天侧实现建站工具集时高频回查）

| 文件 | 用途 |
|---|---|
| [route/admin.php](file:///e:/workspace/hutianSEOGEOAGent/siteBase/backend/ElectronicPart/route/admin.php) | 后台全部路由定义 |
| [route/api.php](file:///e:/workspace/hutianSEOGEOAGent/siteBase/backend/ElectronicPart/route/api.php) | 前台 C 端路由定义 |
| [app/middleware/AdminAuthMiddleware.php](file:///e:/workspace/hutianSEOGEOAGent/siteBase/backend/ElectronicPart/app/middleware/AdminAuthMiddleware.php) | admin JWT 鉴权 |
| [app/middleware/AuthMiddleware.php](file:///e:/workspace/hutianSEOGEOAGent/siteBase/backend/ElectronicPart/app/middleware/AuthMiddleware.php) | 前台用户鉴权 |
| [app/controller/admin/ProductController.php](file:///e:/workspace/hutianSEOGEOAGent/siteBase/backend/ElectronicPart/app/controller/admin/ProductController.php) | 商品 CRUD |
| [app/controller/admin/ArticleController.php](file:///e:/workspace/hutianSEOGEOAGent/siteBase/backend/ElectronicPart/app/controller/admin/ArticleController.php) | 文章 CRUD |
| [app/controller/admin/SettingController.php](file:///e:/workspace/hutianSEOGEOAGent/siteBase/backend/ElectronicPart/app/controller/admin/SettingController.php) | 系统设置（含站点级 SEO） |
| [app/controller/admin/UploadController.php](file:///e:/workspace/hutianSEOGEOAGent/siteBase/backend/ElectronicPart/app/controller/admin/UploadController.php) | 媒体上传 |
| [app/controller/api/SitemapController.php](file:///e:/workspace/hutianSEOGEOAGent/siteBase/backend/ElectronicPart/app/controller/api/SitemapController.php) | 动态 sitemap.xml |
| [app/agent/tools/SeoTools.php](file:///e:/workspace/hutianSEOGEOAGent/siteBase/backend/ElectronicPart/app/agent/tools/SeoTools.php) | SEO 工具集（Agent 内部） |
| [app/model/SkProduct.php](file:///e:/workspace/hutianSEOGEOAGent/siteBase/backend/ElectronicPart/app/model/SkProduct.php) | 商品模型（字段定义） |
| [app/model/SkArticle.php](file:///e:/workspace/hutianSEOGEOAGent/siteBase/backend/ElectronicPart/app/model/SkArticle.php) | 文章模型 |
| [app/model/agent/SeoPage.php](file:///e:/workspace/hutianSEOGEOAGent/siteBase/backend/ElectronicPart/app/model/agent/SeoPage.php) | SEO 页面审计模型 |
| [database/sql/seo_tables.sql](file:///e:/workspace/hutianSEOGEOAGent/siteBase/backend/ElectronicPart/database/sql/seo_tables.sql) | SEO 表结构（6 张表） |
| [database/sql/sk_products.sql](file:///e:/workspace/hutianSEOGEOAGent/siteBase/backend/ElectronicPart/database/sql/sk_products.sql) | 商品表结构 |
| [.env](file:///e:/workspace/hutianSEOGEOAGent/siteBase/backend/ElectronicPart/.env) | 后端配置（DB/JWT/CORS/LLM） |
| [tianqixin-frontend/lib/api-client.ts](file:///e:/workspace/hutianSEOGEOAGent/siteBase/tianqixin-frontend/lib/api-client.ts) | 前台 API 客户端（参考鉴权 + 字段格式） |
| [tianqixin-frontend/components/Seo.tsx](file:///e:/workspace/hutianSEOGEOAGent/siteBase/tianqixin-frontend/components/Seo.tsx) | 前台 SEO head 注入（CSR） |
| [tianqixin-frontend/components/JsonLd.tsx](file:///e:/workspace/hutianSEOGEOAGent/siteBase/tianqixin-frontend/components/JsonLd.tsx) | 前台 JSON-LD 构建 |
| [tianqixin-admin/DESIGN.md](file:///e:/workspace/hutianSEOGEOAGent/siteBase/tianqixin-admin/DESIGN.md) | 后台 UI/UX 设计规范 |
| [start_all.bat](file:///e:/workspace/hutianSEOGEOAGent/siteBase/start_all.bat) | 三仓起停脚本 |
| [thinkphp6-nginx.conf](file:///e:/workspace/hutianSEOGEOAGent/siteBase/thinkphp6-nginx.conf) | nginx 配置（TP6 rewrite + CORS） |

## 附录 B · trace 红线遵守情况

| 红线 | 遵守情况 |
|---|---|
| 1. 只读，绝不写 | ✅ 未改任何文件，未连生产库，未跑 migration |
| 2. 不拷代码进壶天 | ✅ 所有结论通过文件链接引用，未复制源码到壶天 monorepo |
| 3. 聚焦建站，会员/租户/权限不深挖 | ✅ 第 5 节、第 6 节对会员/权限模块仅一句"存在，留待后续阶段" |
| 4. 找不到必须明说 | ✅ 第 7 节缺口清单逐条标"无/缺失"，每条带证据位置（文件:行号 或 路由缺失位置） |
| 5. 摸不着头脑就停下回报 | ✅ 第 0 节标了"差异"（frontend 实际是 Vite 不是 Next.js）、第 4 节标了"风险"（CSR SEO 注入不彻底），未瞎猜 |

## 附录 C · 本次 trace 未读但建站腿实现时可能需要再查的文件

- `app/controller/admin/CategoryController.php`（分类 CRUD 入参细节）
- `app/controller/admin/BannerController.php`（Banner 入参细节）
- `app/controller/admin/ApplicationController.php`（应用领域 CRUD）
- `app/controller/admin/DiagnosticController.php`（疑似 SEO 诊断接口，需确认是否补了 seo_pages 的 endpoint）
- `app/controller/outer/*`（外部 OAuth2 同步接口，可能给壶天借鉴）
- `app/service/AuthService.php`（JWT 签发细节，token 黑名单实现）
- `app/service/UploadService.php`（上传路径策略，缩略图生成）
- `app/service/I18nService.php`（多语言同步机制，建站工具写文章时如何触发翻译队列）
- `database/migrations/*.php`（TP6 标准 migration，部分新表只在这里定义）
- `tianqixin-admin/app/system/seo/page.tsx`（admin SEO 页面 UI，可能调用了未在路由文件中显式声明的 endpoint）

---

> 报告结束。等上游 Qwen 据此画建站工具集第一版。
