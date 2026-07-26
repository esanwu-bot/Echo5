# 天启芯管理后台 - UI/UX 设计规范

> 基于 AgentAdmin 统一设计系统适配，专业 B 端管理后台风格

---

## 1. 设计定位

- **风格**：专业、简洁、高效的 B 端管理后台
- **配色**：深色侧边栏 + 浅色内容区，品牌蓝作为强调色
- **布局**：左侧固定侧边栏（240px 可折叠）+ 右侧自适应内容区
- **图标**：lucide-react（与 shadcn/ui 保持一致）

---

## 2. 色彩系统

### 品牌色
| 名称 | 值 | 用途 |
|------|-----|------|
| `--primary` | `217 91% 60%` (#2563eb) | 主按钮、链接、选中态、图标高亮 |
| `--primary-foreground` | `0 0% 98%` | 主色上的文字 |
| `--primary-light` | `217 91% 95%` | 浅色背景、hover 状态 |
| `--primary-dark` | `217 91% 48%` | 按钮按下态 |

### 侧边栏（深色）
| 名称 | 值 | 用途 |
|------|-----|------|
| `--sidebar-background` | `227 35% 13%` (#1a1d2e) | 侧边栏背景 |
| `--sidebar-foreground` | `220 16% 78%` (#a3aabf) | 侧边栏文字 |
| `--sidebar-primary` | `217 91% 60%` | 选中态背景 |
| `--sidebar-accent-alpha` | `rgba(37,99,235,0.15)` | 选中项背景 |
| `--sidebar-hover` | `rgba(255,255,255,0.06)` | hover 背景 |
| `--sidebar-border` | `rgba(255,255,255,0.06)` | 分割线 |
| `--sidebar-text-muted` | `#5a6177` | 次要文字、placeholder |

### 内容区（浅色）
| 名称 | 值 | 用途 |
|------|-----|------|
| `--content-bg` | `#f4f6fb` | 页面背景 |
| `--content-border` | `#e5e9f0` | 卡片边框、分割线 |
| `--card-bg` | `#ffffff` | 卡片背景 |
| `--text-primary` | `#1a1d2e` | 主标题、重要文字 |
| `--text-secondary` | `#5a6177` | 次要文字 |
| `--text-muted` | `#9aa3be` | 辅助文字、时间戳 |

### 状态色
| 状态 | 背景 | 文字 | 边框 |
|------|------|------|------|
| 成功 | `bg-emerald-50` | `text-emerald-700` | `border-emerald-200` |
| 警告 | `bg-amber-50` | `text-amber-700` | `border-amber-200` |
| 错误 | `bg-red-50` | `text-red-700` | `border-red-200` |
| 信息 | `bg-blue-50` | `text-blue-700` | `border-blue-200` |

---

## 3. 布局结构

### 整体布局
```
┌─────────────────────────────────────────┐
│  Sidebar (240px/72px)  │  Header (56px) │
│                        ├────────────────┤
│  - Logo                │                │
│  - Search              │   Content      │
│  - Nav Menu            │   (flex: 1)    │
│  - Collapse Button     │                │
└────────────────────────┴────────────────┘
```

### 侧边栏层级
1. **Logo 区**（56px 高）：图标 + 品牌名 + 副标题
2. **搜索区**：过滤菜单用
3. **导航菜单**：可展开收起，支持多级
4. **底部折叠按钮**

### 内容区层级
1. **Header**（56px 高）：页面标题 + 通知 + 用户下拉
2. **Main**：卡片、表格、表单等内容

---

## 4. 组件规范

### 统计卡片（Stats Card）
```
┌─────────────────────────────┐
│ [icon-bg]              +12% │  ← 图标背景色块 + 趋势箭头
│                             │
│ 指标名称                    │  ← 11px 大写灰色标签
│ 2,847                       │  ← 26px 加粗数字
│ 较昨日                      │  ← 辅助说明
└─────────────────────────────┘
```
- 圆角：`rounded-xl` (12px)
- 边框：`border border-[#e5e9f0]`
- 阴影：`shadow-sm`，hover 时 `shadow-md`
- 动效：hover 上浮 `-translate-y-0.5`

### 表格（Data Table）
- 表头：`bg-[#f4f6fb]` 浅灰背景，文字 11px 大写
- 行：hover `bg-[#f8f9fc]`
- 状态徽章：圆角 pill `rounded-full`，彩色背景
- 可操作行：蓝色文字 + Eye 图标

### 表单输入框
- 高度：44px（登录页）、36-40px（普通表单）
- 圆角：`rounded-lg` (8px)
- 边框：`border-[#e5e9f0]`，focus 时 `border-blue-600`
- Focus 阴影：`0 0 0 3px rgba(37,99,235,0.08)`

### 按钮
- **主按钮**：蓝色渐变背景 + 白色文字 + 阴影
- **次按钮**：白色背景 + 灰色边框
- **危险按钮**：红色背景
- 圆角：`rounded-lg` (8px) 或 `rounded-full`
- 高度：36-44px

---

## 5. 图标使用

统一使用 **lucide-react**：

| 场景 | 图标 |
|------|------|
| 仪表盘 | `LayoutDashboard` |
| 商品 | `Package` |
| 订单 | `ShoppingCart` |
| 会员 | `Users` |
| 内容 | `FileText` |
| 设置 | `Settings` |
| 搜索 | `Search` |
| 通知 | `Bell` |
| 退出 | `LogOut` |
| 展开/收起 | `ChevronDown` / `ChevronRight` |
| 趋势上升 | `ArrowUpRight` |
| 查看 | `Eye` |
| 确认 | `PackageCheck` |
| 拒绝 | `Ban` |

---

## 6. 动画与过渡

| 场景 | 时长 | 缓动 |
|------|------|------|
| 通用过渡 | 0.18s | `ease` |
| 侧边栏折叠 | 0.2s | `ease` |
| 子菜单展开 | 0.18s | `ease` |
| 卡片 hover 上浮 | 0.2s | `ease` |

### 关键帧动画
```css
/* 子菜单展开 */
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## 7. 登录页设计

### 左右分栏布局
- **左侧品牌区**（flex: 1）：
  - 背景：`linear-gradient(145deg, #1a1d2e, #243462, #1e3a6e)`
  - Logo：72px 圆角卡片，蓝色渐变
  - 标题：28px 白色加粗
  - 描述：15px 灰色文字
  - 特性卡片：3 个横向排列，半透明背景

- **右侧表单区**（480px 固定）：
  - 背景：白色
  - 卡片：最大宽度 360px，居中
  - 标题：22px 加粗深色
  - 输入框：带图标前缀
  - 按钮：蓝色渐变，全宽，44px 高

---

## 8. 扩展新页面

新建页面时遵循：

1. **布局包裹**：内容放在 `dashboard.tsx` 同级路由，自动继承 `AppLayout`
2. **卡片容器**：使用 shadcn `Card` 组件，加 `border border-[#e5e9f0] rounded-xl`
3. **标题样式**：左侧蓝色竖条 + 16px 加粗文字
4. **表格**：表头灰底，行 hover 效果，状态用 pill 徽章
5. **表单**：标签左对齐或顶部对齐，输入框统一圆角

---

## 9. 依赖清单

```json
{
  "框架": "Next.js 14 + React 18",
  "样式": "Tailwind CSS",
  "UI 组件": "shadcn/ui (Card, Button, Badge, Input)",
  "图标": "lucide-react",
  "表单": "antd (Form, Modal, Table, Descriptions)",
  "字体": "系统字体栈 (PingFang SC, Microsoft YaHei)"
}
```

---

## 10. 文件结构

```
app/
├── globals.css          # 全局样式 + CSS 变量
├── layout.tsx           # 根布局
├── page.tsx             # Dashboard 入口
├── login/
│   └── page.tsx         # 登录页（左右分栏）
components/
├── AppLayout.tsx        # 主布局（侧边栏 + Header）
├── stats-cards.tsx      # 统计卡片
├── order-table.tsx      # 业务申请表格
└── ui/                  # shadcn 组件
```

---

> 本文档与 AgentAdmin DESIGN.md 保持一致，确保两个项目视觉风格统一。
