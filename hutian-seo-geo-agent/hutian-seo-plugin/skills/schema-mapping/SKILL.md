---
name: schema-mapping
description: 将产品与组织数据映射到 schema.org 结构化数据(JSON-LD)。当用户要求添加结构化数据、JSON-LD、富媒体结果,或将字段映射到 Product、Organization、FAQPage、TechArticle、BreadcrumbList 等 schema.org 类型时使用。
version: 1.0.0
---

# Schema.org 映射

将真实业务数据映射为以 JSON-LD 表达的 schema.org 类型。用 `check_schema`
校验结果;Product 块用内置 `edit_file` 编写。

## 常见类型

### Product
必填/推荐:`name`、`brand`(Brand)、`sku`、`gtin`、`description`、
`image`、`sameAs`、`offers`(含 `price`、`priceCurrency`、`availability` 的 Offer)。
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "半导体二极管",
  "brand": { "@type": "Brand", "name": "壶天" },
  "sku": "TC-DIODE-001",
  "gtin": "6970000000017",
  "sameAs": ["https://www.wikidata.org/wiki/Q128888"],
  "offers": { "@type": "Offer", "price": "12.80", "priceCurrency": "CNY",
    "availability": "https://schema.org/InStock" }
}
```

### Organization
`name`、`url`、`logo`、`sameAs`(社交 + Wikidata)、`contactPoint`。使用稳定的
`@id`,以便其他块引用。

### FAQPage
`mainEntity` 为 `Question` 数组,每个含 `acceptedAnswer`(`Answer` → `text`)。
非常适合抢占生成式引擎的引用位。

### TechArticle
`headline`、`author`、`datePublished`、`about`(链接到 Product/实体)。用于
支撑产品的指南与选型文章。

### BreadcrumbList
`itemListElement` 为 `ListItem` 数组(`position`、`name`、`item`),反映
站点导航路径。

## 步骤
1. 识别页面上的主导实体(产品、组织、文章)。
2. 采集源字段(名称、sku、价格、品牌、URL)。
3. 将每个字段映射到正确的 schema.org 属性;优先使用带类型的嵌套对象
   (如 `brand` 用 `Brand`,而非裸字符串)。
4. 添加 `@id` 与 `sameAs` 为 GEO 锚定实体。
5. 用内置 `edit_file` 编写 JSON-LD 块(Product),或手写。
6. 用 `check_schema(url)` 校验,修复每一个被报告的问题。

## 陷阱
- 枚举值如 `availability` 使用绝对 IRI(`https://schema.org/InStock`)。
- 每个块一个 `@context`;若需多个实体,用 `@graph` 包裹。
- 生产环境标记中绝不能留占位 `gtin`/`sameAs`。

## 验证
`check_schema` 返回 `ok: true`,且 `types` 列表符合预期、无任何问题。
