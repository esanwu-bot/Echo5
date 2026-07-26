'use client';

import React, { useState, useEffect } from 'react';
import { Avatar, Dropdown, Switch } from 'antd';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FileText,
  Settings,
  Bell,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Database,
  Upload,
  Tags,
  ChevronDown,
  Search,
  Building2,
} from 'lucide-react';
import '../app/globals.css';

/* ── 菜单图标映射 ── */
const iconMap = {
  '/': <LayoutDashboard size={18} />,
  products: <Package size={18} />,
  orders: <ShoppingCart size={18} />,
  members: <Users size={18} />,
  content: <FileText size={18} />,
  applications: <FileText size={18} />,
  'business-applications': <ShoppingCart size={18} />,
  '/dictionary': <Database size={18} />,
  '/banner': <Upload size={18} />,
  company: <Building2 size={18} />,
  languages: <Database size={18} />,
  system: <Settings size={18} />,
};

/* ── 侧栏菜单项 ── */
const menuConfig = [
  { key: '/', icon: '/', label: '仪表盘', href: '/' },
  {
    key: 'products',
    icon: 'products',
    label: '商品管理',
    children: [
      { key: '/products', label: '商品列表', href: '/products' },
      { key: '/models', label: '型号管理', href: '/models' },
      { key: '/inventory', label: '库存管理', href: '/inventory' },
      { key: '/suppliers', label: '供应商管理', href: '/suppliers' },
      { key: '/product-suppliers', label: '产品供应商关联', href: '/product-suppliers' },
      { key: '/products/categories', label: '商品分类', href: '/products/categories' },
      { key: '/products/brands', label: '品牌管理', href: '/products/brands' },
      { key: '/attributes', label: '分类属性', href: '/attributes' },
      { key: '/products/price-breaks', label: '价格区间', href: '/products/price-breaks' },
    ],
  },
  { key: 'orders', icon: 'orders', label: '订单管理', href: '/orders' },
  {
    key: 'members', icon: 'members', label: '会员管理',
    children: [{ key: '/members', label: '会员列表', href: '/members' }],
  },
  {
    key: 'content', icon: 'content', label: '内容管理',
    children: [
      { key: '/content/articles', label: '文章管理', href: '/content/articles' },
      { key: '/content/documents', label: '文档管理', href: '/content/documents' },
      { key: '/content/faqs', label: 'FAQ管理', href: '/content/faqs' },
      { key: '/content/messages', label: '客户留言', href: '/content/messages' },
      { key: '/content/news', label: '新闻管理', href: '/content/news' },
    ],
  },
  {
    key: 'applications', icon: 'applications', label: '应用领域',
    children: [
      { key: '/applications/categories', label: '分类管理', href: '/applications/categories' },
      { key: '/applications', label: '应用列表', href: '/applications' },
    ],
  },
  {
    key: 'business-applications', icon: 'business-applications', label: '业务申请',
    children: [
      { key: '/business-applications/quotes', label: '报价请求', href: '/business-applications/quotes' },
      { key: '/business-applications/samples', label: '样品申请', href: '/business-applications/samples' },
    ],
  },
  { key: '/dictionary', icon: '/dictionary', label: '数据字典', href: '/dictionary' },
  { key: '/banner', icon: '/banner', label: '轮播图管理', href: '/banner' },
  {
    key: 'company', icon: 'company', label: '公司信息',
    children: [
      { key: '/company/info', label: '公司介绍', href: '/company/info' },
      { key: '/company/qualifications', label: '资质管理', href: '/company/qualifications' },
      { key: '/company/recruitment', label: '招聘管理', href: '/company/recruitment' },
    ],
  },
  {
    key: 'languages', icon: 'languages', label: '多语言管理',
    children: [
      { key: '/lang-types', label: '语言类型', href: '/lang-types' },
      { key: '/lang-codes', label: '翻译词条', href: '/lang-codes' },
      { key: '/lang-countries', label: '浏览器映射', href: '/lang-countries' },
      { key: '/languages/config', label: '翻译配置', href: '/languages/config' },
    ],
  },
  {
    key: 'system', icon: 'system', label: '系统管理',
    children: [
      { key: '/settings', label: '系统设置', href: '/settings' },
      { key: '/system/seo', label: 'SEO设置', href: '/system/seo' },
      { key: '/system/config', label: '站点配置', href: '/system/config' },
    ],
  },
];

/* ── 判断当前路径属于哪个父菜单组 ── */
function getOpenGroup(pathname) {
  const groupMap = {
    products: (p) =>
      p === '/products' || p.startsWith('/products/') ||
      p === '/models' || p.startsWith('/models/') ||
      p === '/inventory' || p.startsWith('/inventory/') ||
      p === '/suppliers' || p.startsWith('/suppliers/') ||
      p === '/product-suppliers' || p.startsWith('/product-suppliers/') ||
      p === '/attributes' || p.startsWith('/attributes/'),
    members: (p) => p === '/members' || p.startsWith('/members/'),
    content: (p) => p === '/content' || p.startsWith('/content/'),
    company: (p) => p === '/company' || p.startsWith('/company/'),
    'business-applications': (p) => p === '/business-applications' || p.startsWith('/business-applications/'),
    applications: (p) => p === '/applications' || p.startsWith('/applications/'),
    languages: (p) => p.startsWith('/lang-') || p.startsWith('/languages/'),
    system: (p) => p === '/system' || p.startsWith('/system/') || p === '/settings',
  };
  for (const [group, fn] of Object.entries(groupMap)) {
    if (fn(pathname)) return group;
  }
  return null;
}

/* ── 主布局内容 ── */
export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState([]);
  const [searchText, setSearchText] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  // 初始化展开组
  useEffect(() => {
    const group = getOpenGroup(pathname || '');
    if (group) setOpenKeys([group]);
  }, [pathname]);

  const toggleGroup = (key) => {
    setOpenKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const isActive = (href) => {
    if (!href) return false;
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  // 根据搜索过滤菜单
  const filteredMenu = searchText.trim()
    ? menuConfig.filter((item) => {
        if (item.label.toLowerCase().includes(searchText.toLowerCase())) return true;
        return item.children?.some((c) => c.label.toLowerCase().includes(searchText.toLowerCase()));
      })
    : menuConfig;

  return (
    <div className="tqx-root" style={{ display: 'flex', minHeight: '100vh', background: '#f4f6fb' }}>
      {/* ── 侧边栏 ── */}
      <aside className="tqx-sidebar" style={{ width: collapsed ? 72 : 240 }}>
        {/* Logo 区域 */}
        <div className="tqx-sidebar-logo">
          <div className="tqx-logo-icon">
            <Building2 size={18} />
          </div>
          {!collapsed && (
            <div className="tqx-logo-text">
              <span className="tqx-logo-name">天启芯</span>
              <span className="tqx-logo-sub">管理控制台</span>
            </div>
          )}
        </div>

        {/* 搜索框 */}
        {!collapsed && (
          <div className="tqx-sidebar-search">
            <div className="tqx-search-wrap">
              <Search size={14} className="tqx-search-icon" />
              <input
                type="text"
                className="tqx-search-input"
                placeholder="搜索菜单..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* 导航菜单 */}
        <nav className="tqx-nav-menu">
          {filteredMenu.map((item) => {
            const isOpen = openKeys.includes(item.key);
            const hasActiveChild = item.children?.some((c) => isActive(c.href));

            return (
              <div key={item.key} className="tqx-nav-group">
                {item.children ? (
                  <>
                    <div
                      className={`tqx-nav-header ${hasActiveChild ? 'active' : ''}`}
                      onClick={() => toggleGroup(item.key)}
                    >
                      <span className="tqx-nav-icon">{iconMap[item.icon]}</span>
                      {!collapsed && (
                        <>
                          <span className="tqx-nav-label">{item.label}</span>
                          <span className={`tqx-nav-arrow ${isOpen ? 'open' : ''}`}>
                            <ChevronDown size={14} />
                          </span>
                        </>
                      )}
                    </div>
                    {!collapsed && (
                      <div className={`tqx-nav-submenu ${isOpen ? 'show' : ''}`}>
                        {item.children.map((child) => (
                          <Link
                            key={child.key}
                            href={child.href}
                            className={`tqx-nav-subitem ${isActive(child.href) ? 'active' : ''}`}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={`tqx-nav-header ${isActive(item.href) ? 'active' : ''}`}
                  >
                    <span className="tqx-nav-icon">{iconMap[item.icon]}</span>
                    {!collapsed && <span className="tqx-nav-label">{item.label}</span>}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {/* 底部折叠按钮 */}
        <div className="tqx-sidebar-footer">
          <button className="tqx-collapse-btn" onClick={() => setCollapsed(!collapsed)} title={collapsed ? '展开菜单' : '收起菜单'}>
            {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
            {!collapsed && <span>收起菜单</span>}
          </button>
        </div>
      </aside>

      {/* ── 右侧主体 ── */}
      <div className="tqx-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* 顶部 Header */}
        <header className="tqx-header">
          <div className="tqx-header-left">
            <h1 className="tqx-header-title">天启芯控制台</h1>
          </div>
          <div className="tqx-header-right" />
        </header>

        {/* Content 内容区 */}
        <main className="tqx-content">{children}</main>
      </div>
    </div>
  );
}
