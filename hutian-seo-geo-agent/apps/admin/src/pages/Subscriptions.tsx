// 订阅与计费页 — 接 tenant-api /admin/api/v1/subscriptions 真接口
// 含：列表（筛选+分页）+ 编辑 drawer + 状态机转移

import { useState, useEffect, useCallback } from "react";
import {
  Table, Button, Input, Select, Tag, Space, Typography, App as AntdApp,
  Drawer, Descriptions, Form, InputNumber, Modal,
} from "antd";
import { ReloadOutlined, EditOutlined } from "@ant-design/icons";
import { api, ApiError } from "../api/client";

interface Subscription {
  id: number;
  tenant_id: number;
  plan: string;
  status: string;
  seats_limit: number;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  grace_days: number;
  cancel_at: string | null;
  created_at: string;
  updated_at: string;
}

const PLAN_COLOR: Record<string, string> = {
  free: "default",
  pro: "blue",
  enterprise: "purple",
};
const STATUS_COLOR: Record<string, string> = {
  trial: "blue",
  active: "green",
  grace: "orange",
  readonly: "gold",
  suspended: "red",
  canceled: "default",
};

const SUB_TRANSITIONS: Record<string, { to: string; label: string; danger?: boolean }[]> = {
  trial: [
    { to: "active", label: "转 Active（开通）" },
    { to: "grace", label: "进 Grace" },
    { to: "suspended", label: "封停", danger: true },
    { to: "canceled", label: "取消", danger: true },
  ],
  active: [
    { to: "grace", label: "进 Grace" },
    { to: "readonly", label: "降级 Readonly" },
    { to: "suspended", label: "封停", danger: true },
    { to: "canceled", label: "取消", danger: true },
  ],
  grace: [
    { to: "active", label: "恢复 Active" },
    { to: "readonly", label: "降级 Readonly" },
    { to: "suspended", label: "封停", danger: true },
    { to: "canceled", label: "取消", danger: true },
  ],
  readonly: [
    { to: "active", label: "恢复 Active" },
    { to: "suspended", label: "封停", danger: true },
    { to: "canceled", label: "取消", danger: true },
  ],
  suspended: [
    { to: "active", label: "解封" },
    { to: "canceled", label: "取消", danger: true },
  ],
};

function fmtDate(t: string | null): string {
  if (!t) return "—";
  return new Date(t).toLocaleDateString("zh-CN");
}

export default function SubscriptionsPage() {
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [tenantId, setTenantId] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Subscription | null>(null);
  const [editForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (tenantId) params.tenant_id = tenantId;
      if (statusFilter) params.status = statusFilter;
      const resp = await api.get("/subscriptions", { params });
      setData(resp.data.data || []);
      setTotal(resp.data.total || 0);
    } catch (e) {
      const err = e as ApiError;
      message.error(`订阅列表加载失败：${err.error}${err.reason ? ` — ${err.reason}` : ""}`);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, tenantId, statusFilter, message]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openEdit = (s: Subscription) => {
    setEditItem(s);
    editForm.setFieldsValue({
      plan: s.plan,
      seats_limit: s.seats_limit,
      grace_days: s.grace_days,
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editItem) return;
    try {
      const values = await editForm.validateFields();
      await api.patch(`/subscriptions/${editItem.id}`, values);
      message.success("订阅更新成功");
      setEditOpen(false);
      await fetchData();
    } catch (e) {
      if ((e as any)?.errorFields) return;
      const err = e as ApiError;
      message.error(`更新失败：${err.error}${err.reason ? ` — ${err.reason}` : ""}`);
    }
  };

  const transitionStatus = async (id: number, to: string, reason: string) => {
    try {
      await api.post(`/subscriptions/${id}/status`, { status: to, reason });
      message.success(`状态转移成功：→ ${to}`);
      await fetchData();
    } catch (e) {
      const err = e as ApiError;
      message.error(`状态转移失败：${err.error}${err.reason ? ` — ${err.reason}` : ""}`);
    }
  };

  const columns = [
    {
      title: "订阅 #",
      dataIndex: "id",
      width: 80,
      render: (id: number) => (
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "#828DA2" }}>
          S-{id}
        </span>
      ),
    },
    {
      title: "租户",
      dataIndex: "tenant_id",
      width: 100,
      render: (tid: number) => (
        <span style={{ fontFamily: "ui-monospace, monospace", color: "#3B5BDB" }}>T{tid}</span>
      ),
    },
    {
      title: "套餐",
      dataIndex: "plan",
      width: 100,
      render: (p: string) => <Tag color={PLAN_COLOR[p]}>{p}</Tag>,
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (s: string) => <Tag color={STATUS_COLOR[s]}>{s}</Tag>,
    },
    {
      title: "席位上限",
      dataIndex: "seats_limit",
      width: 90,
      render: (n: number) => <span style={{ fontWeight: 600 }}>{n}</span>,
    },
    {
      title: "当前周期",
      width: 200,
      render: (_: any, r: Subscription) => (
        <span style={{ fontSize: 12, color: "#828DA2" }}>
          {fmtDate(r.current_period_start)} ~ {fmtDate(r.current_period_end)}
        </span>
      ),
    },
    {
      title: "试用期截止",
      dataIndex: "trial_ends_at",
      width: 130,
      render: (t: string | null) => (
        <span style={{ fontSize: 12 }}>{fmtDate(t)}</span>
      ),
    },
    {
      title: "Grace 天数",
      dataIndex: "grace_days",
      width: 100,
      render: (n: number) => <span>{n} 天</span>,
    },
    {
      title: "操作",
      width: 100,
      render: (_: any, r: Subscription) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <Input
          placeholder="租户 ID"
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          style={{ width: 160 }}
          allowClear
        />
        <Select
          placeholder="状态"
          value={statusFilter || undefined}
          onChange={(v) => setStatusFilter(v || "")}
          allowClear
          style={{ width: 140 }}
          options={[
            { value: "trial", label: "Trial" },
            { value: "active", label: "Active" },
            { value: "grace", label: "Grace" },
            { value: "readonly", label: "Readonly" },
            { value: "suspended", label: "Suspended" },
            { value: "canceled", label: "Canceled" },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={columns}
        size="middle"
        scroll={{ x: 1100 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      />

      <Drawer
        title={editItem ? `订阅 #S-${editItem.id} · 租户 T${editItem.tenant_id}` : "—"}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        width={520}
        extra={editItem && <Tag color={STATUS_COLOR[editItem.status]}>{editItem.status}</Tag>}
      >
        {editItem && (
          <>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="订阅 ID">S-{editItem.id}</Descriptions.Item>
              <Descriptions.Item label="租户 ID">T{editItem.tenant_id}</Descriptions.Item>
              <Descriptions.Item label="当前周期">
                {fmtDate(editItem.current_period_start)} ~ {fmtDate(editItem.current_period_end)}
              </Descriptions.Item>
              <Descriptions.Item label="试用期截止">{fmtDate(editItem.trial_ends_at)}</Descriptions.Item>
            </Descriptions>

            <Typography.Title level={5}>编辑订阅</Typography.Title>
            <Form form={editForm} layout="vertical">
              <Form.Item name="plan" label="套餐" rules={[{ required: true }]}>
                <Select options={[
                  { value: "free", label: "Free 免费版" },
                  { value: "pro", label: "Pro 专业版" },
                  { value: "enterprise", label: "Enterprise 企业版" },
                ]} />
              </Form.Item>
              <Form.Item name="seats_limit" label="席位上限" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item name="grace_days" label="Grace 天数">
                <InputNumber min={0} max={30} style={{ width: "100%" }} />
              </Form.Item>
              <Button type="primary" onClick={handleEdit}>保存</Button>
            </Form>

            <Typography.Title level={5} style={{ marginTop: 16 }}>状态转移</Typography.Title>
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
              当前：{editItem.status} · 可转移到：
            </Text>
            <Space wrap>
              {(SUB_TRANSITIONS[editItem.status] || []).map((t) => (
                <StateButton
                  key={t.to}
                  label={t.label}
                  danger={t.danger}
                  onConfirm={(reason) => transitionStatus(editItem.id, t.to, reason)}
                />
              ))}
              {(SUB_TRANSITIONS[editItem.status] || []).length === 0 && (
                <Text type="secondary">无合法转移（终态）</Text>
              )}
            </Space>
          </>
        )}
      </Drawer>
    </div>
  );
}

function StateButton({ label, danger, onConfirm }: {
  label: string;
  danger?: boolean;
  onConfirm: (reason: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <>
      <Button size="small" danger={danger} onClick={() => setOpen(true)}>{label}</Button>
      <Modal
        title={`${label}？`}
        open={open}
        onCancel={() => { setOpen(false); setReason(""); }}
        onOk={() => { onConfirm(reason); setOpen(false); setReason(""); }}
        okText="确认"
        cancelText="取消"
        okButtonProps={{ danger }}
      >
        <Typography.Paragraph>此操作将写入审计日志（action=subscription.status）。</Typography.Paragraph>
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

const Text = Typography.Text;
