import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Layout, Menu, Avatar, Typography, Button, Modal, Input, theme as antdTheme } from "antd";
import {
  DashboardOutlined,
  TeamOutlined,
  CreditCardOutlined,
  ControlOutlined,
  AppstoreOutlined,
  AuditOutlined,
  LockOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { getAdminToken, setAdminToken, clearAdminToken } from "./api/client";
import TenantsPage from "./pages/Tenants";
import AuditPage from "./pages/Audit";
import OverviewPage from "./pages/Overview";
import SubscriptionsPage from "./pages/Subscriptions";
import QuotasPage from "./pages/Quotas";
import WorkspacesPage from "./pages/Workspaces";
import SeatsPage from "./pages/Seats";
import CredentialsPage from "./pages/Credentials";

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

// 侧边栏菜单项（原型 6 视图 + 凭证）
const menuItems = [
  { key: "/overview", icon: <DashboardOutlined />, label: "总览" },
  { key: "/group-business", type: "group" as const, label: "经营", children: [
    { key: "/tenants", icon: <TeamOutlined />, label: "租户管理" },
    { key: "/subscriptions", icon: <CreditCardOutlined />, label: "订阅与计费" },
    { key: "/quotas", icon: <ControlOutlined />, label: "额度与计量" },
  ]},
  { key: "/group-asset", type: "group" as const, label: "资产", children: [
    { key: "/workspaces", icon: <AppstoreOutlined />, label: "工作空间 · 品牌" },
    { key: "/seats", icon: <TeamOutlined />, label: "席位管理" },
    { key: "/credentials", icon: <LockOutlined />, label: "凭证管理" },
  ]},
  { key: "/group-governance", type: "group" as const, label: "治理", children: [
    { key: "/audit", icon: <AuditOutlined />, label: "审计日志" },
  ]},
  { key: "/settings", icon: <SettingOutlined />, label: "系统设置" },
];

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { token: themeToken } = antdTheme.useToken();
  const [tokenInput, setTokenInput] = useState("");
  const [tokenModalOpen, setTokenModalOpen] = useState(!getAdminToken());

  // 已登录但 token 失效时（401 拦截器跳 /login），保持简单：用 /login 路由
  if (location.pathname === "/login") {
    return (
      <LoginCard
        onLogin={(t) => { setAdminToken(t); setTokenModalOpen(false); navigate("/"); }}
      />
    );
  }
  if (!getAdminToken()) {
    return (
      <LoginCard
        onLogin={(t) => { setAdminToken(t); navigate("/"); }}
      />
    );
  }

  // 标题映射
  const titleMap: Record<string, [string, string]> = {
    "/overview": ["总览", "全部租户的实时经营视图"],
    "/tenants": ["租户管理", "开号 · 状态机 · 封号与解封"],
    "/subscriptions": ["订阅与计费", "订阅与按期限合同授权并存"],
    "/quotas": ["额度与计量", "服务端计量正本 · 配额用量"],
    "/workspaces": ["工作空间 · 品牌", "workspace = 品牌实体"],
    "/credentials": ["凭证管理", "只读元信息 · 轮换/吊销（绝不出明文）"],
    "/audit": ["审计日志", "append-only · 不可篡改 · 跨租户取证"],
    "/settings": ["系统设置", "平台配置"],
  };
  const [title, sub] = titleMap[location.pathname] || ["壶天 OPS", ""];

  return (
    <Layout style={{ height: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={236}
        style={{ background: "#10141C", overflow: "hidden" }}
      >
        <div className="admin-logo">
          <div className="mk">壶</div>
          {!collapsed && (
            <div>
              <b>壶天 OPS</b>
              <span>OPERATIONS CONSOLE</span>
            </div>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={["/group-business", "/group-asset", "/group-governance"]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: "transparent", borderRight: 0, flex: 1, paddingTop: 8 }}
        />
        <div className="admin-side-foot" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar className="av" size={32}>运</Avatar>
          {!collapsed && (
            <div>
              <Text style={{ color: "#fff", display: "block", fontSize: 12.5 }}>super-admin</Text>
              <Text style={{ color: "#7E8AA0", fontSize: 10.5, fontFamily: "ui-monospace, monospace" }}>平台运营</Text>
            </div>
          )}
          {!collapsed && (
            <Button
              size="small"
              type="text"
              style={{ marginLeft: "auto", color: "#7E8AA0" }}
              onClick={() => { clearAdminToken(); setTokenModalOpen(true); }}
            >
              登出
            </Button>
          )}
        </div>
      </Sider>
      <Layout>
        <Header className="admin-topbar" style={{ background: "#fff", padding: "0 26px", height: 58 }}>
          <h1>
            {title}
            <small>{sub}</small>
          </h1>
        </Header>
        <Content style={{ padding: 24, overflow: "auto" }}>
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/tenants" element={<TenantsPage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/quotas" element={<QuotasPage />} />
            <Route path="/workspaces" element={<WorkspacesPage />} />
            <Route path="/seats" element={<SeatsPage />} />
            <Route path="/credentials" element={<CredentialsPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/settings" element={<PlaceholderPage title="系统设置（待铺）" />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </Content>
      </Layout>

      {/* 切换 admin token 弹窗（dev 用，生产接 SSO） */}
      <Modal
        title="平台超管登录"
        open={tokenModalOpen}
        onCancel={() => setTokenModalOpen(false)}
        onOk={() => { if (tokenInput) { setAdminToken(tokenInput); setTokenModalOpen(false); navigate("/"); } }}
        okText="登录"
        cancelText="取消"
      >
        <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
          输入平台超管 token（env TENANT_ADMIN_TOKEN）。此 token 跨租户权限，请妥善保管。
        </Text>
        <Input.Password
          placeholder="X-Admin-Token"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          onPressEnter={() => { if (tokenInput) { setAdminToken(tokenInput); setTokenModalOpen(false); navigate("/"); } }}
        />
      </Modal>
    </Layout>
  );
}

// 登录卡片（无 token 时显示）
function LoginCard({ onLogin }: { onLogin: (token: string) => void }) {
  const [t, setT] = useState("");
  return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center", background: "#F3F5F8" }}>
      <div style={{ background: "#fff", padding: 32, borderRadius: 16, width: 380, boxShadow: "0 10px 30px rgba(16,20,28,.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 22 }}>
          <div className="mk" style={{
            width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center",
            background: "linear-gradient(135deg, #3B5BDB, #5470E6)", color: "#fff", fontWeight: 800, fontSize: 18,
          }}>壶</div>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>壶天 OPS</Typography.Title>
            <Text type="secondary" style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", letterSpacing: ".22em" }}>OPERATIONS CONSOLE</Text>
          </div>
        </div>
        <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
          平台超管登录（X-Admin-Token）
        </Text>
        <Input.Password
          placeholder="输入 admin token"
          value={t}
          onChange={(e) => setT(e.target.value)}
          onPressEnter={() => t && onLogin(t)}
          size="large"
        />
        <Button
          type="primary"
          block
          size="large"
          style={{ marginTop: 16 }}
          disabled={!t}
          onClick={() => onLogin(t)}
        >
          登录
        </Button>
        <Text type="secondary" style={{ display: "block", marginTop: 14, fontSize: 11 }}>
          dev 默认 token: <code>dev-admin-token-change-in-prod</code>
        </Text>
      </div>
    </div>
  );
}

// 占位页（待铺的视图）
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div style={{ padding: 40, textAlign: "center", color: "#828DA2" }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{title}</h2>
      <p>该视图待后续迭代铺开（reviewer 开工顺序：先租户+审计验调用链，再铺其他）</p>
    </div>
  );
}

// 防止 lint 报未用
useEffect;
