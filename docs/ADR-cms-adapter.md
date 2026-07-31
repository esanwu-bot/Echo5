# ADR · CMS 适配器抽象（多建站底座：siteBase + WordPress）

| 项 | 值 |
|---|---|
| 状态 | **Draft（草稿，待评审）** |
| 关联 | 建站腿 B1/B2/B3 · 多租户 `cms_instances` · `ADR-cross-lang-tenant-context` · γ 渲染器 · PRD §4.1 品牌硬约束 |
| 背景 | 建站底座从硬编码 siteBase 抽象成 CMS 适配器接口，WordPress 作为第二个可插拔实现，按 workspace 路由 |

## 背景

现状：建站用自研 tp6 **siteBase**，两个接触面——
- **写入面**：MCP 工具（`cms_create_page`/`cms_configure_product`）→ siteBase admin API（`sitebase_client.py` 从 env 读 url）
- **读取面**：γ 渲染器 `reader.ts` → siteBase public API（`getArticle`/`getProduct` 取数渲染）

需求：接入 **WordPress** 作为第二个建站底座（客户已有 WP 站需壶天做 SEO，或客户想用 WP 建站）。

本质：**把"建站底座"从具体实现抽象成 CMS 适配器接口，siteBase 和 WordPress 成为接口的两个可插拔实现，按 workspace 选择用哪个。** 这是 `ADR-cross-lang` 里 MCP 实例池"按 `sitebase_base_url` 分实例（同种底座不同实例）"的自然延伸——升级到"按 `cms_instance`（type + config）分实例（不同种底座）"。抽象做对了，接第三个底座（Ghost/Strapi/客户自建 Node CMS）就是再加一个适配器，主干不动。

## 已拍决策（焊死，不再讨论）

| # | 决策 | 选定 | 含义 |
|---|---|---|---|
| 1 | 渲染层 | **a · 壶天 γ 渲染器统一渲染，WP 只当内容存储** | 保持 SEO 物理保证（head+JSON-LD 在初始 HTML）、品牌单源（brand 从 workspace 派生）、JSON-LD 注入（schema-mapping 不变）；WP 不出渲染层，只出数据 |
| 2 | MCP 组织 | **a · `hutian_seo_mcp` 加 `wp_client`，工具 schema 不变** | LLM 完全无感底座差异；WordPress 适配逻辑在 MCP server 内部分发，不起独立 MCP server |
| 3 | WP 的 product | **a · WooCommerce product** | 壶天 Product 模型映射到 WooCommerce product（WooCommerce REST API）；**前提：客户 WP 站已装 WooCommerce**，没装则提示装（不降级 ACF，见开放问题）|

## 方案选择（已拍决策下的子方案）

| 子方案 | 选项 | 采纳 | 理由 |
|---|---|---|---|
| 适配器接口 | 统一 `CmsAdapter` 接口 / 每底座独立接口 | **统一接口** | 底座无关，MCP 工具/渲染器只认接口，加底座零改主干 |
| 字段映射 | 适配器内部直接映射 / 中间 canonical 模型 | **canonical 模型** | 壶天 `Article`/`Product` 是 canonical，适配器负责 canonical ↔ 底座字段双向映射；渲染器/SEO 工具只认 canonical，不碰底座字段 |
| WP 读取面 | 壶天渲染器从 WP REST API 取数 / WP 自渲染 | **壶天取数渲染**（决策 1）| 保持 γ 渲染器的 SEO/品牌控制 |

## 核心设计（七层）

### 第 1 层 · CmsAdapter 接口（底座无关）

```python
class CmsAdapter:
    # 写入面（MCP 工具调）
    def create_page(self, input: PageInput) -> {id, url}
    def configure_product(self, input: ProductInput) -> {id, url}
    def write_structured_data(self, id, jsonld) -> None
    def submit_sitemap(self, urls) -> SubmitResult
    # 读取面（γ 渲染器调）
    def get_page(self, id) -> Article      # 返回 canonical Article
    def get_product(self, id) -> Product   # 返回 canonical Product
    def list_pages(self) / list_products(self)