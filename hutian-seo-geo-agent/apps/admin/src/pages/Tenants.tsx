// 租户管理页 — 接 tenant-api /admin/api/v1/tenants 真接口
// 含：列表（搜索+状态筛选+分页）+ 详情 drawer + 状态机转移 + 新建

import { useState, useEffect, useCallback } from "react";
import {
  Table, Button, Input, Segmented, Drawer, Descriptions, Tag, Space,
  Modal, Form, Select, App as AntdApp, Avatar, Typography, Spin,
} from "antd";
import { PlusOutlined, ReloadOutlined, TeamOutlined, StopOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { api, ApiError } from "../api/client";

interface Tenant {
  id: number;
  slug: string;
  display_name: string;
  status: string;
  owner_seat_id: number;
  workspace_count: number;
  seat_count: number;
  created_at: string;
  updated_at: string;
}

interface TenantDetail extends Tenant {
  workspaces?: any[];
  subscription?: any;
  seats?: any[];
}

const STATUS_COLOR: Record<string, string> = {
  trial: "blue",
  active: "green",
  grace: "orange",
  readonly: "gold",
  suspended: "red",
};
const STATUS_LABEL: Record<string, string> = {
  trial: "Trial",
  active: "Active",
  grace: "Grace",
  readonly: "Readonly",
  suspended: "Suspended",
};

// 状态机合法转移（与后端 validTenantTransitions 对齐）
const TRANSITIONS: Record<string, { to: string; label: string; danger?: boolean }[]> = {
  trial: [
    { to: "active", label: "转 Active（开通）" },
    { to: "suspended", label: "封停", danger: true },
  ],
  active: [
    { to: "grace", label: "进 Grace（宽限）" },
    { to: "suspended", label: "封停", danger: true },
  ],
  grace: [
    { to: "active", label: "恢复 Active（续费成功）" },
    { to: "readonly", label: "降级 Readonly" },
    { to: "suspended", label: "封停", danger: true },
  ],
  readonly: [
    { to: "active", label: "恢复 Active（补缴）" },
    { to: "suspended", label: "封停", danger: true },
  ],
  suspended: [
    { to: "active", label: "解封（仅人工）" },
  ],
};

const AVATAR_COLORS = ["#3B5BDB", "#16A34A", "#D97706", "#7C3AED", "#2563EB", "#DC2626", "#0EA5A4", "#475569"];
function avatarColor(s: string) {
  const sum = [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export default function TenantsPage() {
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (search) params.search = search;
      if (statusFilter !== "all") params.status = statusFilter;
      const resp = await api.get("/tenants", { params });
      setData(resp.data.data || []);
      setTotal(resp.data.total || 0);
    } catch (e) {
      const err = e as ApiError;
      message.error(`列表加载失败：${err.error}${err.reason ? ` — ${err.reason}` : ""}`);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, message]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDetail = async (id: number) => {
    try {
      const resp = await api.get(`/tenants/${id}`);
      // 后端返 {tenant, workspaces, subscription, seats}；合并到一行展示
      const t = resp.data.tenant;
      setDetail({
        ...t,
        workspaces: resp.data.workspaces,
        subscription: resp.data.subscription,
        seats: resp.data.seats,
      });
      setDrawerOpen(true);
    } catch (e) {
      const err = e as ApiError;
      message.error(`详情加载失败：${err.error}`);
    }
  };

  const transitionStatus = async (id: number, to: string, reason: string) => {
    try {
      await api.post(`/tenants/${id}/status`, { status: to, reason });
      message.success(`状态转移成功：→ ${STATUS_LABEL[to] || to}`);
      // 刷新详情 + 列表
      await openDetail(id);
      await fetchData();
    } catch (e) {
      const err = e as ApiError;
      message.error(`状态转移失败：${err.error}${err.reason ? ` — ${err.reason}` : ""}`);
    }
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      await api.post("/tenants", values);
      message.success("租户开号成功");
      setCreateOpen(false);
      createForm.resetFields();
      await fetchData();
    } catch (e) {
      if ((e as any)?.errorFields) return; // 表单校验错，不处理
      const err = e as ApiError;
      message.error(`开号失败：${err.error}${err.reason ? ` — ${err.reason}` : ""}`);
    }
  };

  const columns = [
    {
      title: "租户",
      dataIndex: "display_name",
      render: (name: string, r: Tenant) => (
        <Space>
          <Avatar style={{ background: avatarColor(name) }} size={30}>
            {name?.[0] || "?"}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{name}</div>
            <div style={{ fontSize: 11, color: "#828DA2", fontFamily: "ui-monospace, monospace" }}>
              {r.slug} · ID {r.id}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      render: (s: string) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s] || s}</Tag>,
    },
    {
      title: "工作空间",
      dataIndex: "workspace_count",
      width: 100,
      render: (n: number) => <span style={{ fontWeight: 600 }}>{n}</span>,
    },
    {
      title: "席位",
      dataIndex: "seat_count",
      width: 80,
      render: (n: number) => <span style={{ fontWeight: 600 }}>{n}</span>,
    },
    {
      title: "创建时间",
      dataIndex: "created_at",
      width: 170,
      render: (t: string) => (
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "#828DA2" }}>
          {new Date(t).toLocaleString("zh-CN")}
        </span>
      ),
    },
    {
      title: "操作",
      width: 120,
      render: (_: any, r: Tenant) => (
        <Button type="link" size="small" onClick={() => openDetail(r.id)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <Input.Search
          placeholder="按名称 / slug / ID 搜索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={fetchData}
          style={{ width: 280 }}
          allowClear
        />
        <Segmented
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v as string); setPage(1); }}
          options={[
            { label: "全部", value: "all" },
            { label: "Active", value: "active" },
            { label: "Trial", value: "trial" },
            { label: "Grace", value: "grace" },
            { label: "Suspended", value: "suspended" },
          ]}
        />
        <div style={{ flex: 1 }} />
        <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          新建租户
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={columns}
        size="middle"
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      />

      {/* 详情 drawer */}
      <Drawer
        title={detail ? detail.display_name : "—"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={520}
        extra={detail && (
          <Tag color={STATUS_COLOR[detail.status]}>{STATUS_LABEL[detail.status]}</Tag>
        )}
      >
        {detail && (
          <>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="租户 ID">{detail.id}</Descriptions.Item>
              <Descriptions.Item label="Slug">{detail.slug}</Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(detail.created_at).toLocaleString("zh-CN")}
              </Descriptions.Item>
              <Descriptions.Item label="工作空间数">{detail.workspace_count}</Descriptions.Item>
              <Descriptions.Item label="活跃席位数">{detail.seat_count}</Descriptions.Item>
            </Descriptions>

            {/* 订阅信息 */}
            {detail.subscription && (
              <>
                <Typography.Title level={5} style={{ marginTop: 8 }}>订阅</Typography.Title>
                <Space wrap size={8} style={{ marginBottom: 8 }}>
                  <Tag color={detail.subscription.plan === "enterprise" ? "purple" : detail.subscription.plan === "pro" ? "blue" : "default"}>
                    {detail.subscription.plan}
                  </Tag>
                  <Tag color={STATUS_COLOR[detail.subscription.status]}>{STATUS_LABEL[detail.subscription.status] || detail.subscription.status}</Tag>
                  <Tag>席位上限 {detail.subscription.seats_limit}</Tag>
                </Space>
                {detail.subscription.current_period_end && (
                  <div style={{ fontSize: 12, color: "#828DA2", marginBottom: 8 }}>
                    到期：{new Date(detail.subscription.current_period_end).toLocaleDateString("zh-CN")}
                  </div>
                )}
              </>
            )}

            {/* 工作空间列表 */}
            {detail.workspaces && detail.workspaces.length > 0 && (
              <>
                <Typography.Title level={5} style={{ marginTop: 16 }}>
                  工作空间 · 品牌（{detail.workspaces.length}）
                </Typography.Title>
                {detail.workspaces.map((ws: any) => (
                  <div key={ws.id} style={{
                    border: "1px solid #E3E8EF", borderRadius: 10,
                    padding: "10px 12px", marginBottom: 8,
                  }}>
                    <Space>
                      <Avatar style={{ background: avatarColor(ws.brand_name) }} size={24}>
                        {ws.brand_name?.[0]}
                      </Avatar>
                      <strong>{ws.brand_name}</strong>
                      <Tag>{ws.slug}</Tag>
                      <Tag color={ws.status === "active" ? "green" : "default"}>{ws.status}</Tag>
                    </Space>
                    {ws.industry && (
                      <div style={{ fontSize: 11, color: "#828DA2", marginTop: 4 }}>行业：{ws.industry}</div>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* 状态机操作 */}
            <Typography.Title level={5} style={{ marginTop: 16 }}>状态转移</Typography.Title>
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
              当前：{STATUS_LABEL[detail.status]} · 可转移到：
            </Text>
            <Space wrap>
              {(TRANSITIONS[detail.status] || []).map((t) => (
                <StateTransitionButton
                  key={t.to}
                  label={t.label}
                  danger={t.danger}
                  onConfirm={(reason) => transitionStatus(detail.id, t.to, reason)}
                />
              ))}
              {(TRANSITIONS[detail.status] || []).length === 0 && (
                <Text type="secondary">无合法转移（终态）</Text>
              )}
            </Space>
          </>
        )}
      </Drawer>

      {/* 新建租户 drawer */}
      <Drawer
        title="新建租户 · 开号"
        open={createOpen}
        onClose={() => { setCreateOpen(false); createForm.resetFields(); }}
        width={460}
        extra={<Button type="primary" onClick={handleCreate}>创建并开号</Button>}
      >
        <Form form={createForm} layout="vertical" initialValues={{ status: "trial", plan: "free", seats_limit: 1 }}>
          <Typography.Title level={5}>基本信息</Typography.Title>
          <Form.Item name="slug" label="Slug" rules={[{ required: true, message: "必填" }]}>
            <Input placeholder="例如：hanhai-iot" />
          </Form.Item>
          <Form.Item name="display_name" label="租户名称" rules={[{ required: true, message: "必填" }]}>
            <Input placeholder="例如：瀚海物联网" />
          </Form.Item>
          <Form.Item name="status" label="初始状态">
            <Select options={[
              { value: "trial", label: "Trial 试用" },
              { value: "active", label: "Active 直接开通" },
            ]} />
          </Form.Item>

          <Typography.Title level={5} style={{ marginTop: 16 }}>订阅与配额</Typography.Title>
          <Form.Item name="plan" label="套餐">
            <Select options={[
              { value: "free", label: "免费版" },
              { value: "pro", label: "专业版" },
              { value: "enterprise", label: "企业版" },
            ]} />
          </Form.Item>
          <Form.Item name="seats_limit" label="席位上限" rules={[{ required: true }]}>
            <Input type="number" min={1} />
          </Form.Item>

          <Typography.Title level={5} style={{ marginTop: 16 }}>首个工作空间（可选）</Typography.Title>
          <Form.Item name="brand_name" label="品牌名">
            <Input placeholder="留空则不建首个 workspace" />
          </Form.Item>
          <Form.Item name="industry" label="行业">
            <Input placeholder="例如：trike / semiconductor / iot" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}

// 状态机转移按钮（带二次确认 + 原因输入）
function StateTransitionButton({ label, danger, onConfirm }: {
  label: string;
  danger?: boolean;
  onConfirm: (reason: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <>
      <Button
        size="small"
        danger={danger}
        icon={danger ? <StopOutlined /> : <CheckCircleOutlined />}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <Modal
        title={`${label}？`}
        open={open}
        onCancel={() => { setOpen(false); setReason(""); }}
        onOk={() => { onConfirm(reason); setOpen(false); setReason(""); }}
        okText="确认"
        cancelText="取消"
        okButtonProps={{ danger }}
      >
        <Typography.Paragraph>
          此操作将写入审计日志（actor=super-admin, action=tenant.status）。
        </Typography.Paragraph>
        <Input.TextArea
          placeholder="操作原因（写审计）"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
      </Modal>
    </>
  );
}

// 防止 lint
const Text = Typography.Text;
Spin;
TeamOutlined;
