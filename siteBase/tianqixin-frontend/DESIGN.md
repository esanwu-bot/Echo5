# 天启芯科技 (TianQiXin) 产品模块 UI 设计规范

> 依据：从 `tqx-product-module/pages` 下的静态 HTML 原型（BOM 管理、型号对比、详情抽屉、参数选型、产品系列、系列列表）提取。
> 适用范围：`tianqixin-frontend` 产品搜索 / 选型 / 对比 / BOM 相关页面。

---

## 1. 设计原则

- **B2B 工业电商风格**：信息密度高，表格为主，强调数据可读性。
- **品牌识别**：以品牌红 `#e60012` 作为唯一主色，深蓝/绿色仅用于状态语义，避免喧宾夺主。
- **中性色系统**：大面积使用中性灰构建层级，红仅用于主按钮、选中态、链接、价格、关键强调。
- **信息色去蓝化**：用深灰/黑色系替代传统的蓝色 info，保持整体视觉统一。
- **字体**：中文环境优先使用 `Noto Sans SC`，型号/价格使用等宽字体 `JetBrains Mono`。
- **明暗模式**：提供完整的 `light` 与 `dark` CSS 变量两套色值。

---

## 2. 色彩系统

### 2.1 品牌色（Brand Red）

| Token | Hex | 用途 |
|-------|------|------|
| `--tqx-red-50`  | `#fef2f2` | 选中行背景、轻提示背景 |
| `--tqx-red-100` | `#fde3e3` | 选中态边框、hover 背景 |
| `--tqx-red-200` | `#fdc6c6` | 分割线（弱强调） |
| `--tqx-red-300` | `#f99e9e` | 输入框聚焦边框、hover 边框 |
| `--tqx-red-400` | `#f46b6b` | 暗色模式主色 |
| `--tqx-red-500` | `#e60012` | **主品牌色**（默认主按钮、链接、价格、标签、勾选） |
| `--tqx-red-600` | `#c7000f` | 主按钮 hover |
| `--tqx-red-700` | `#a6000d` | 按下/深色背景 |
| `--tqx-red-800` | `#87000b` | 暗色模式容器背景 |
| `--tqx-red-900` | `#6d0009` | 暗色模式文字容器 |

### 2.2 中性色（Neutral Gray）

| Token | Hex | 用途 |
|-------|------|------|
| `--tqx-neutral-50`  | `#fafafa` | 页面背景 |
| `--tqx-neutral-100` | `#f5f5f5` | 表头、卡片头部、分页栏、hover 背景 |
| `--tqx-neutral-200` | `#e0e0e0` | 边框、分割线 |
| `--tqx-neutral-300` | `#b3b3b3` | 禁用态图标、滑块 |
| `--tqx-neutral-400` | `#999999` | 辅助文字、占位符 |
| `--tqx-neutral-500` | `#666666` | 正文次要文字 |
| `--tqx-neutral-600` | `#555555` | 正文默认 |
| `--tqx-neutral-700` | `#444444` | 标签、深色正文 |
| `--tqx-neutral-800` | `#333333` | 标题、主要文字 |
| `--tqx-neutral-900` | `#1a1a1a` | 深色标题、Footer 背景 |

### 2.3 语义色

| 类型 | 主色 | 浅背景 | 深文字 | 用途 |
|------|------|--------|--------|------|
| Success | `--tqx-success-600` `#007328` | `--tqx-success-50` `#e6f4ea` | `--tqx-success-800` | 库存充足、现货标签、价格最优 |
| Warning | `--tqx-warning-600` `#cc6e00` / `--tqx-warning-400` `#ff8c00` | `--tqx-warning-50` `#fff5e6` | `--tqx-warning-800` | 库存预警、低库存行 |
| Error | `--tqx-error-500` `#cc0000` | `--tqx-error-50` `#fce6e6` | `--tqx-error-800` | 缺货、删除、危险操作 |
| Info | `--tqx-info-500` `#444444` | `--tqx-info-50` `#f0f0f0` | `--tqx-info-700` | 替代建议、普通提示 |

### 2.4 关键色别名（CSS Variables）

```css
:root {
  --primary: var(--tqx-red-500);
  --primary-foreground: #ffffff;
  --background: var(--tqx-neutral-50);
  --foreground: var(--tqx-neutral-800);
  --muted: var(--tqx-neutral-400);
  --muted-foreground: var(--tqx-neutral-500);
  --border: var(--tqx-neutral-200);
  --ring: var(--tqx-red-500);
  --link: var(--tqx-red-500);
  --bg: var(--tqx-neutral-50);
  --fg: var(--tqx-neutral-800);
  --rule: var(--tqx-neutral-200);
  --surface: #ffffff;
  --surface-dim: var(--tqx-neutral-100);
  --surface-container-low: var(--tqx-neutral-50);
  --surface-container: #f5f5f5;
  --surface-container-high: var(--tqx-neutral-100);
  --surface-container-highest: var(--tqx-neutral-200);
  --error: var(--tqx-error-500);
  --error-container: var(--tqx-error-50);
  --on-error: #ffffff;
  --on-error-container: var(--tqx-error-800);

  --color-primary: var(--primary);
  --color-primary-hover: var(--tqx-red-600);
  --color-on-primary: var(--primary-foreground);
  --color-primary-container: var(--tqx-red-50);
  --color-on-primary-container: var(--tqx-red-900);
  --color-success: var(--tqx-success-600);
  --color-warning: var(--tqx-warning-600);
  --color-link: var(--link);
}
```

### 2.5 暗色模式（Dark Mode）

```css
.dark {
  --bg: #121212;
  --fg: #e0e0e0;
  --background: var(--bg);
  --foreground: var(--fg);
  --muted: #757575;
  --muted-foreground: #9e9e9e;
  --border: #424242;
  --rule: #424242;
  --ring: var(--tqx-red-400);
  --link: var(--tqx-red-400);
  --surface: #1e1e1e;
  --surface-dim: #1a1a1a;
  --surface-container: #252525;
  --surface-container-low: #1e1e1e;
  --surface-container-high: #2c2c2c;
  --surface-container-highest: #363636;
  --color-primary: var(--tqx-red-400);
  --color-primary-hover: var(--tqx-red-300);
  --color-primary-container: var(--tqx-red-900);
  --color-on-primary-container: var(--tqx-red-100);
  --color-success: #66bb6a;
  --color-warning: #ffa726;
  --color-link: var(--link);
  --shadow-1: 0 1px 3px rgba(0,0,0,.30);
  --shadow-2: 0 2px 8px rgba(0,0,0,.35);
  --shadow-3: 0 6px 20px rgba(0,0,0,.40);
  --shadow-4: 0 12px 40px rgba(0,0,0,.45);
  --shadow-5: 0 20px 56px rgba(0,0,0,.50);
}
```

---

## 3. 字体与排版

### 3.1 字体族

| Token | 字体 | 用途 |
|-------|------|------|
| `--font-display` | `'Noto Sans SC', 'Roboto', sans-serif` | 大标题、价格 |
| `--font-heading` | `'Noto Sans SC', 'Roboto', sans-serif` | 各级标题 |
| `--font-body` | `'Noto Sans SC', 'Roboto', sans-serif` | 正文、按钮、标签 |
| `--font-mono` | `'JetBrains Mono', monospace` | 型号、库存、价格、参数 |

### 3.2 字号规范

| Token | 值 | 用途 |
|-------|-----|------|
| `--font-size-display` | `40px` | 超大数字/首页标语 |
| `--font-size-h1` | `32px` | 页面主标题 |
| `--font-size-h2` | `24px` | 产品系列页标题 |
| `--font-size-h3` | `20px` | 卡片标题 |
| `--font-size-h4` | `18px` | 小节标题 |
| `--font-size-lead` | `16px` | 引导文字、CTA |
| `--font-size-body` | `14px` | **默认正文** |
| `--font-size-caption` | `12px` | 表格内容、标签、辅助文字 |
| `--font-size-eyebrow` | `11px` | 小标签、状态徽标 |
| `--font-size-mono` | `13px` | 等宽数据 |

### 3.3 字重与行高

| 层级 | 字重 | 行高 |
|------|------|------|
| Display | 700 | 1.2 |
| H1 | 700 | 1.25 |
| H2 | 600 | 1.3 |
| H3 | 600 | 1.35 |
| H4 | 600 | 1.4 |
| Body | 400 | 1.6 |
| Lead | 500 | 1.6 |
| Caption | 400 | 1.5 |
| Eyebrow | 600 | 1.4，letter-spacing 0.06em，uppercase |
| Mono | 400 | 1.6 |

### 3.4 价格样式

```css
.tqx-price {
  font-family: var(--font-display);
  font-size: 1.5rem;       /* 24px */
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  color: var(--tqx-red-500); /* 价格默认红 */
}
```

---

## 4. 间距与尺寸

### 4.1 间距 Token

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-7: 48px;
```

### 4.2 尺寸 Token

```css
--size-icon-sm: 16px;
--size-icon-md: 20px;
--size-icon-lg: 24px;
--size-button-height-sm: 32px;
--size-button-height-md: 36px;
--size-button-height-lg: 44px;
--size-input-height: 36px;
```

### 4.3 布局容器

- 主内容最大宽度：
  - 普通页面：`max-w-7xl` ≈ `1280px`
  - 宽屏产品页：`max-w-[1440px]`
- 水平内边距：`px-4` / `px-5`（16px/20px）
- 顶部栏高度：`h-8`（32px）
- 导航栏高度：`h-14`（56px）
- 左侧分类/筛选侧边栏宽度：`w-[220px]`
- 详情抽屉宽度：`480px`（最大 `100vw`）

---

## 5. 边框圆角与阴影

### 5.1 圆角

```css
--radius-sm: 2px;   /* 小标签、输入框、表格行选中 */
--radius-md: 4px;   /* 按钮、输入框、卡片 */
--radius-lg: 6px;   /* 大卡片、汇总栏、筛选面板 */
--radius-xl: 8px;   /* 弹窗、大容器 */
--radius-full: 9999px; /* 圆形头像、icon 按钮 */
```

### 5.2 阴影

```css
--shadow-1: 0 1px 2px rgba(0,0,0,.04);   /* 卡片 — 细微 */
--shadow-2: 0 2px 6px rgba(0,0,0,.05);   /* 卡片 hover */
--shadow-3: 0 6px 16px rgba(0,0,0,.05);  /* 浮层 / 下拉 */
--shadow-4: 0 12px 32px rgba(0,0,0,.05);  /* 模态框 */
--shadow-5: 0 20px 48px rgba(0,0,0,.05);  /* 覆盖层 / 抽屉 */
```

---

## 6. 通用组件

### 6.1 按钮

#### 主按钮（Primary）

- 背景：`var(--tqx-red-500)`
- 文字：白色
- 高度：`36px`（md）/ `44px`（lg）/ `32px`（sm）
- 内边距：`px-5 py-2` 或 `px-6 py-2`
- 圆角：`radius-md`（4px）/ `radius-lg`（6px）
- Hover：`var(--tqx-red-600)`
- 图标：左侧 `size-icon-sm`（16px），与文字间距 `4px`

#### 次按钮 / 幽灵按钮（Secondary / Outline）

- 背景：白色 / transparent
- 边框：`1px solid var(--tqx-neutral-300)`
- 文字：`var(--tqx-neutral-600)`
- Hover：边框 `var(--tqx-neutral-400)`，或背景 `var(--tqx-red-50)`（红色描边变体）

#### 红色描边按钮（Red Outline）

- 用于“下载数据手册”、“核心参数”等强调操作：
- 边框：`1px solid var(--tqx-red-500)`
- 文字：`var(--tqx-red-500)`
- 背景：透明；hover 时 `var(--tqx-red-50)`

#### 危险/删除按钮

- 文字：`var(--tqx-neutral-400)`，hover `opacity-70`
- 或直接用红色：`var(--tqx-error-500)`

### 6.2 输入框

- 高度：`36px`
- 边框：`1px solid var(--tqx-neutral-300)`
- 背景：`var(--surface)` / `#ffffff`
- 圆角：`radius-md`（4px）/ `radius-lg`（6px）
- 文字：`var(--tqx-neutral-800)`，字号 `14px`
- Placeholder：`var(--tqx-neutral-400)`
- 聚焦：边框 `var(--tqx-red-300)`，外发光 `0 0 0 2px rgba(230,0,18,0.1)`
- 搜索框左侧图标：`var(--tqx-neutral-400)`，搜索激活时图标变 `var(--tqx-red-400)`

### 6.3 表格

- 表头背景：`var(--tqx-neutral-100)`
- 表头文字：`var(--tqx-neutral-700)`，字号 `12px`，字重 `600`，`whitespace-nowrap`
- 表头下划线：`border-bottom: 2px solid var(--tqx-neutral-200)`（普通表）或 `1px solid var(--tqx-neutral-100)`（卡片内表）
- 行下边框：`1px solid var(--tqx-neutral-100)` / `var(--tqx-neutral-200)`
- 斑马行：奇数行 `var(--tqx-neutral-50)`，偶数行白色
- 行 Hover：`var(--tqx-red-50)`
- 选中行：
  - 背景 `var(--tqx-red-50)`
  - 左边框 `3px solid var(--tqx-red-500)`
  - 型号文字变 `var(--tqx-red-500)`，字重 `600`
- 单元格内边距：`px-3 py-2.5`（12px/10px）或 `p-3`（12px）
- 表格数据列：型号、价格、库存使用 `font-mono`
- 库存数字：默认 `var(--tqx-success-600)`，缺货 `var(--tqx-error-500)`，预警 `var(--tqx-warning-600)`

### 6.4 卡片

#### 系列卡片（Series Card）

- 背景：`#ffffff`
- 边框：`1px solid var(--tqx-neutral-200)`
- 圆角：`radius-lg`（6px）
- 内边距：`20px`
- Hover：`box-shadow: var(--shadow-2)`
- 内部规格表：斑马行 `var(--tqx-neutral-50)` / 白色，边框 `var(--tqx-neutral-100)`
- 在售型号数：红色 `var(--tqx-red-500)` 加粗

#### 表格卡片（Table Card）

- 背景：`#ffffff`
- 边框：`1px solid var(--tqx-neutral-200)`
- 圆角：`radius-lg`（6px）
- 阴影：`var(--shadow-1)`
- 分页栏位于卡片底部，背景 `var(--tqx-neutral-100)`，上边框 `var(--tqx-neutral-100)`

### 6.5 筛选与标签

#### 筛选胶囊（Filter Pill）

- 默认：
  - 背景：`#ffffff`
  - 边框：`1px solid var(--tqx-neutral-200)`
  - 文字：`var(--tqx-neutral-700)`，字号 `13px`
  - 圆角：`radius-lg`（6px）
  - 内边距：`4px 14px`
- Hover：边框 `var(--tqx-red-300)`，文字 `var(--tqx-red-500)`
- 激活：
  - 背景：`var(--tqx-red-500)`
  - 边框：`var(--tqx-red-500)`
  - 文字：白色，字重 `500`

#### 侧边栏筛选组

- 标题：`12px`，字重 `500`，颜色 `var(--tqx-neutral-700)`，内边距 `px-3 pt-3 pb-2`
- 组下边框：`1px solid var(--tqx-neutral-100)`
- 选项：`12px`，颜色 `var(--tqx-neutral-600)`
- 自定义复选框：
  - 尺寸：普通 `16px`，筛选 `14px`
  - 边框：`2px solid var(--tqx-neutral-300)`（普通）/ `1.5px`（筛选）
  - 圆角：`radius-sm`（2px）
  - 选中：背景+边框 `var(--tqx-red-500)`，白色勾号
- 重置按钮：红色描边，hover 背景 `var(--tqx-red-50)`

#### 排序标签（Sort Tab）

- 默认：`13px`，`var(--tqx-neutral-600)`
- Hover：`var(--tqx-red-500)`
- 激活：`var(--tqx-red-500)`，字重 `600`，下划线，`text-underline-offset: 3px`

### 6.6 分页

#### 分页按钮

- 尺寸：`min-width: 32px; height: 32px`
- 默认：
  - 边框：`1px solid var(--tqx-neutral-200)`
  - 背景：`#ffffff`
  - 文字：`var(--tqx-neutral-700)`，字号 `13px`
- Hover：边框 `var(--tqx-red-300)`，文字 `var(--tqx-red-500)`，背景 `var(--tqx-red-50)`
- 激活：
  - 背景：`var(--tqx-red-500)`
  - 边框：`var(--tqx-red-500)`
  - 文字：白色，字重 `600`
- 禁用：`opacity: 0.4`，`cursor: not-allowed`
- 分页信息：`12px`，`var(--tqx-neutral-500)`

### 6.7 复选框

- 尺寸：
  - 表格复选框：`16px × 16px`，边框 `2px`
  - 筛选复选框：`14px × 14px`，边框 `1.5px`
- 边框颜色：`var(--tqx-neutral-300)`
- 圆角：`radius-sm`（2px）
- 选中：背景+边框 `var(--tqx-red-500)`，白色勾号
- 取消浏览器默认样式：`appearance: none; -webkit-appearance: none`

### 6.8 标签/徽标（Badge）

- 现货标签：
  - 背景 `var(--tqx-success-50)`
  - 文字 `var(--tqx-success-600)`，字号 `10px`，字重 `600`
  - 圆角 `radius-md`（4px）
  - 可带 `check` 图标
- 最优价格标签：同现货标签样式（绿色）
- 替代类型标签：
  - 功能替代：红边框 `var(--tqx-red-300)` + 红字 `var(--tqx-red-500)`
  - 直接替代：灰边框 `var(--tqx-neutral-500)` + 灰字 `var(--tqx-neutral-700)`
- 品牌徽章：
  - 红边框 `var(--tqx-red-500)`
  - 红字 `var(--tqx-red-500)`
  - 圆角 `radius-sm`（2px）
  - 可带 `award` 图标

### 6.9 警告/提示框（Alert）

- 警告框：
  - 背景 `var(--tqx-warning-50)`
  - 边框 `1px solid var(--tqx-warning-200)`
  - 圆角 `radius-lg`（6px）
  - 图标 `alert-triangle`，颜色 `var(--tqx-warning-600)`
  - 文字 `var(--tqx-warning-800)`，字号 `14px`
- 信息框：
  - 背景 `var(--tqx-info-50)`
  - 边框 `1px solid var(--tqx-info-200)`
  - 图标 `info`，颜色 `var(--tqx-info-500)`
  - 文字 `var(--tqx-info-700)`

### 6.10 详情抽屉（Drawer）

- 遮罩：
  - 背景 `rgba(0,0,0,0.35)`
  - z-index: 50
- 抽屉面板：
  - 位置：右侧固定
  - 宽度：`480px`，最大 `100vw`
  - 背景：`#ffffff`
  - 阴影：`var(--shadow-5)`
  - z-index: 60
  - 布局：flex column
- 头部：
  - 下边框 `1px solid var(--tqx-neutral-200)`
  - 标题 `18px` 加粗，`var(--tqx-neutral-900)`
  - 关闭按钮：圆形 `32px`，背景 `var(--tqx-neutral-100)`，图标颜色 `var(--tqx-neutral-500)`，hover 背景 `var(--tqx-neutral-200)`
- 内容区：
  - 可滚动，`padding: 20px`
  - 分组标题：左侧红色菱形（`8px` 旋转 45°），文字 `14px` 字重 `600`
  - 核心参数网格：`grid-cols-2`，参数卡片背景 `var(--tqx-neutral-100)`，圆角 `radius-md`，内边距 `12px`
  - 价格阶梯：同核心参数网格，价格 `18px` 加粗等宽
  - 库存信息：行背景 `var(--tqx-neutral-100)`，圆角 `radius-md`
  - 替代型号：白底，边框 `var(--tqx-neutral-200)`，圆角 `radius-md`
  - 文档下载：红色/灰色描边小按钮
- 底部操作栏：
  - 上边框 `var(--tqx-neutral-200)`
  - 背景白色
  - 左侧次按钮（加入 BOM、加入对比），右侧主按钮（立即购买）

---

## 7. 页面结构与布局

### 7.1 顶部栏（Top Bar）

- 背景：`var(--tqx-red-500)`
- 高度：`32px`
- 文字：白色，字号 `12px`
- 左侧：客服热线 `40066-88888`
- 右侧：购物车、登录/注册、语言切换
- 图标尺寸：`13px-14px`
- 分隔符：白色 `opacity-60` 或 `rgba(255,255,255,.4)`

### 7.2 导航栏（Nav Bar）

- 背景：`#ffffff`
- 下边框：`1px solid var(--tqx-neutral-200)`
- 高度：`56px-64px`（依页面略有差异）
- Logo：
  - 左侧圆形/方形品牌图标，背景 `var(--tqx-red-500)`，白色文字
  - 右侧“天启芯科技”`16px` 加粗，副标题 `11px-12px` 灰色
- 导航项：
  - 字号 `14px`
  - 默认 `var(--tqx-neutral-700)`
  - 激活 `var(--tqx-red-500)`，可带下划线
  - 间距 `gap-6`
- 搜索框：
  - 高度 `36px`
  - 背景 `var(--tqx-neutral-50)` 或白色
  - 边框 `var(--tqx-neutral-200)`
  - 聚焦时边框 `var(--tqx-red-300)` + 红色外发光

### 7.3 页面标题栏（Page Header）

- 背景：`var(--surface)`
- 下边框：`1px solid var(--tqx-neutral-200)`
- 内边距：`py-4 px-4/5`
- 左侧标题：图标 + 标题，`20px` 加粗
- 右侧：操作按钮或项目信息

### 7.4 左侧边栏（Category / Filter Sidebar）

- 宽度：`220px`
- 背景：`#ffffff`
- 边框：右侧 `1px solid var(--tqx-neutral-200)` 或四周边框
- 标题：
  - 背景 `var(--tqx-neutral-100)` 或白底
  - 下边框 `var(--tqx-neutral-200)`
  - 字号 `14px`，字重 `600-700`
- 分类项：
  - 父级：`14px` 字重 `600`，颜色 `var(--tqx-neutral-800)`
  - 子级：`13px` 颜色 `var(--tqx-neutral-700)`
  - 孙级：`13px` 颜色 `var(--tqx-neutral-600)`
  - 激活态：背景 `var(--tqx-red-50)`，左边框 `3px solid var(--tqx-red-500)`，文字 `var(--tqx-red-500)`
  - 箭头：`chevron-right` / `chevron-down`，颜色 `var(--tqx-neutral-400)`
- 滚动条：宽度 `4px`，滑块 `var(--tqx-neutral-300)`，圆角 `4px`

### 7.5 面包屑（Breadcrumb）

- 字号：`12px`
- 分隔符：`/`，颜色 `var(--tqx-neutral-400)`
- 链接：`var(--tqx-neutral-500)`，hover 下划线
- 当前页：`var(--tqx-neutral-800)`，字重 `500`

### 7.6 底部浮动栏（Bottom Floating Bar）

- 位置：`fixed bottom-0`
- 背景：`var(--tqx-neutral-100)` 或 `#ffffff`
- 上边框：`1px solid var(--tqx-neutral-200)`
- 高度：`48px`
- z-index：40-50
- 左侧：已选数量（红色高亮）
- 右侧：查看清单 + 一键询价/加入 BOM
- 页面底部需预留 `48px` 占位

### 7.7 Footer

- 背景：`var(--tqx-neutral-900)`
- 文字：`var(--tqx-neutral-400)`，字号 `12px`
- Logo 区：白色标题 + 红色圆形图标
- 链接：灰色，hover 变白
- 底部版权：上边框 `var(--tqx-neutral-700)`，居中

---

## 8. 图标规范

- 图标库：Lucide Icons
- 使用方式：`<i data-lucide="icon-name"></i>` 或 SVG 图标组件
- 尺寸规范：
  - 顶部栏/小标签：`13px`
  - 按钮内：`14px-16px`
  - 表格内操作：`13px`
  - 标题/大操作：`16px-20px`
  - 导航/搜索框：`15px-16px`
- 图标与文字间距：`4px-6px`
- 图标颜色：跟随当前文字颜色或 `currentColor`
- 自定义图标实现：使用 CSS mask + `background-color: currentColor`

### 常用图标映射

| 场景 | 图标名 |
|------|--------|
| 购物车 | `shopping-cart` |
| 搜索 | `search` |
| 语言 | `globe` |
| 关闭 | `x` |
| 添加 | `plus` |
| 上传 | `upload` |
| 保存 | `save` / `bookmark` |
| 导出 | `file-spreadsheet` / `download` |
| 删除 | `x` / `trash-2` |
| 详情 | `eye` |
| 返回 | `arrow-left` |
| 查看全部 | `arrow-right` |
| 对比 | `columns-2` |
| 文件夹/分类 | `folder` |
| 标签 | `tag` |
| 警告 | `alert-triangle` |
| 信息 | `info` |
| 仓库 | `warehouse` |
| 对勾 | `check` |
| 文件 | `file-text` / `file-down` |
| 证书 | `shield-check` / `clipboard-list` |
| CPU/ECAD | `cpu` / `box` |
| 应用笔记 | `book-open` |
|  award | `award` |
| 电话 | `phone` |
| 网格 | `layout-grid` |
| 向下 | `chevron-down` |
| 向右 | `chevron-right` |
| 向左 | `chevron-left` |

---

## 9. 特定页面模式

### 9.1 产品系列列表页（Series List）

- 两列卡片网格（`lg:grid-cols-2`），间距 `16px`
- 顶部筛选栏：品牌、封装、阻值范围、精度等级
- 排序栏：热度、型号数量、最新上架
- 每个系列卡片包含：品牌 LOGO 区、系列名称、4 行核心规格、在售型号数、数据手册按钮、查看型号链接

### 9.2 产品系列详情页（Product Series）

- 左侧产品图片占位区（`200px × 160px`），背景 `var(--tqx-neutral-100)`，带图标和型号
- 右侧标题区：H1 标题、品牌徽章、在售型号数、参数摘要
- 分隔线：`1px solid var(--tqx-neutral-200)`
- 产品描述：最大宽度 `800px`，行高 `1.7`
- 操作按钮：红色描边的数据手册、ECAD 模型、应用笔记
- 文档链接：红色链接 + 灰色 PDF 大小
- 底部全宽 CTA：红色主按钮“查看全部 N 个型号”

### 9.3 参数选型页（Parametric List）

- 左侧参数筛选侧边栏（封装、阻值、精度、功率、温度系数、库存、价格区间）
- 右侧表格卡片 + 分页
- 行内复选框选择型号
- 型号为可点击链接，详情为红色链接
- 库存充足绿色，缺货红色
- 底部固定 BOM 浮动栏

### 9.4 型号对比页（Comparison）

- 对比表格：左侧参数列，右侧产品列
- 参数列背景 `var(--tqx-neutral-100)`，文字 `var(--tqx-neutral-600)`
- 产品列背景白色
- 差异项高亮：背景 `var(--tqx-red-50)`，文字 `var(--tqx-red-500)`，字重 `600`，等宽字体
- 底部操作栏：返回列表、一键加入 BOM

### 9.5 BOM 管理页（BOM Management）

- 工具栏：添加型号、上传 BOM、保存清单、导出 Excel（次按钮样式）
- 表格列：序号、MPN、品牌、描述、用量、单价、小计、库存、操作
- 库存预警行：整行背景 `var(--tqx-warning-50)`，库存文字 `var(--tqx-warning-600)`，带警告图标
- 汇总栏：背景 `var(--tqx-neutral-100)`，边框 `var(--tqx-neutral-200)`，圆角 `radius-lg`
- 底部操作区：直接下单（主按钮）、提交询盘（次按钮）、仅保存（次按钮）
- 询盘表单：两列网格输入框 + 备注文本域

### 9.6 型号详情抽屉（Detail Drawer）

- 背景页打开抽屉时：`filter: blur(1px); opacity: 0.65; pointer-events: none`
- 抽屉分组：核心参数、价格阶梯、库存信息、替代型号推荐、文档下载
- 参数卡片：`grid-cols-2`，背景 `var(--tqx-neutral-100)`
- 价格卡片：带“最优”绿色标签
- 库存行：仓库图标 + 库存数量 + 单位 + 现货标签
- 替代型号：白底卡片，带替代类型标签
- 底部固定操作：加入 BOM、加入对比、立即购买

---

## 10. 响应式约定

- 容器：移动优先，使用 `max-w-7xl` / `max-w-[1440px]` 限制最大宽度
- 侧边栏：`hidden lg:block`，宽度 `220px`
- 表格：外层 `overflow-x-auto`，设置 `min-width`
- 筛选栏：`flex-wrap`
- 卡片网格：`grid-cols-1 lg:grid-cols-2`
- 标题栏：小屏允许 `flex-wrap`
- 底部浮动栏：始终固定，内容允许换行

---

## 11. 交互状态速查

| 元素 | 默认 | Hover | 激活/选中 | 禁用 |
|------|------|-------|-----------|------|
| 主按钮 | 红底白字 | 红加深 | - | - |
| 次按钮 | 白底灰边框 | 边框加深 | - | opacity 0.4 |
| 红色描边按钮 | 红边框红字 | 浅红背景 | - | - |
| 表格行 | 白/斑马灰 | 浅红背景 | 浅红背景+左红边 | - |
| 筛选胶囊 | 白底灰边框 | 红边框红字 | 红底白字 | - |
| 分页按钮 | 白底灰边框 | 浅红背景红字 | 红底白字 | opacity 0.4 |
| 导航链接 | 深灰 | 红/opacity | 红+下划线 | - |
| 分类项 | 深灰 | 浅灰背景 | 浅红背景+左红边 | - |
| 输入框 | 灰边框 | 红边框+外发光 | 红边框+外发光 | - |
| 复选框 | 灰边框 | - | 红底白勾 | - |

---

## 12. Tailwind / CSS 自定义类参考

```css
/* 排版 */
.tqx-display { font-size: 2.5rem; font-weight: 700; line-height: 1.2; letter-spacing: -0.01em; }
.tqx-h1 { font-size: 2rem; font-weight: 700; line-height: 1.25; }
.tqx-h2 { font-size: 1.5rem; font-weight: 600; line-height: 1.3; }
.tqx-h3 { font-size: 1.25rem; font-weight: 600; line-height: 1.35; }
.tqx-h4 { font-size: 1.125rem; font-weight: 600; line-height: 1.4; }
.tqx-body { font-size: 0.875rem; font-weight: 400; line-height: 1.6; }
.tqx-lead { font-size: 1rem; font-weight: 500; line-height: 1.6; }
.tqx-caption { font-size: 0.75rem; font-weight: 400; line-height: 1.5; }
.tqx-eyebrow { font-size: 0.6875rem; font-weight: 600; line-height: 1.4; letter-spacing: 0.06em; text-transform: uppercase; }
.tqx-mono { font-family: var(--font-mono); font-size: 0.8125rem; font-weight: 400; line-height: 1.6; }
.tqx-price { font-size: 1.5rem; font-weight: 700; line-height: 1.2; font-variant-numeric: tabular-nums; color: var(--tqx-red-500); }

/* 表格行 */
.tqx-table-row:hover { background-color: var(--tqx-red-50) !important; }
.tqx-table-row.selected-row { background-color: var(--tqx-red-50) !important; border-left: 3px solid var(--tqx-red-500) !important; }

/* 滚动条隐藏 */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
```

---

## 13. 设计 Token 汇总表

| 类别 | 关键 Token | 说明 |
|------|-----------|------|
| 主色 | `--tqx-red-500` | `#e60012`，品牌红 |
| 页面背景 | `--bg` | `#fafafa` light / `#121212` dark |
| 表面背景 | `--surface` | `#ffffff` light / `#1e1e1e` dark |
| 主文字 | `--fg` | `#333333` light / `#e0e0e0` dark |
| 次要文字 | `--muted-foreground` | `#666666` light / `#9e9e9e` dark |
| 边框 | `--rule` | `#e0e0e0` light / `#424242` dark |
| 成功 | `--tqx-success-600` | `#007328` |
| 警告 | `--tqx-warning-600` | `#cc6e00` |
| 错误 | `--tqx-error-500` | `#cc0000` |
| 信息 | `--tqx-info-500` | `#444444` |
| 字号正文 | `--font-size-body` | `14px` |
| 字号小字 | `--font-size-caption` | `12px` |
| 按钮高 | `--size-button-height-md` | `36px` |
| 输入框高 | `--size-input-height` | `36px` |
| 圆角小 | `--radius-sm` | `2px` |
| 圆角中 | `--radius-md` | `4px` |
| 圆角大 | `--radius-lg` | `6px` |
| 阴影卡片 | `--shadow-1` | `0 1px 2px rgba(0,0,0,.04)` |
| 阴影抽屉 | `--shadow-5` | `0 20px 48px rgba(0,0,0,.05)` |

---

> 注：本规范基于现有 HTML 原型提取，后续迭代时请以该文件为基准，保持 Token 命名和视觉语义一致。
