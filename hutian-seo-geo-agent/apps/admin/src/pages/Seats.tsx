// 席位管理页 — 接 tenant-api /admin/api/v1/seats 真接口
// FR-S02 席位管理：租户成员 + 角色（owner/admin/member）
// 校验：active 席位数 ≤ subscriptions.seats_limit

import { useState, useEffect, useCallback } from "react";
import {
  Table, Button, Input, Select, Tag, Space, Typography, App as AntdApp,
  Drawer, Descriptions, Form, Select as AntSelect,
} from "antd";
import { ReloadOutlined, UserAddOutlined, EditOutlined } from "@ant-design/icons";
import { api, ApiError } from "../api/client";

interface Seat {
  id: number;
  tenant_id: number;
  user_id: number;
  role: string; // owner/admin/member
  status: string; // active/disabled
  created_at: string;
  updated_at: string;
}

const ROLE_COLOR: Record<string, string> = {
  owner: "gold",
  admin: "blue",
  member: "default",
};
const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};
const STATUS_COLOR: Record<string, string> = {
  active: "green",
  disabled: "default",
};

export default function SeatsPage() {
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Seat[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [tenantId, setTenantId] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [editItem, setEditItem] = useState<Seat | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (tenantId) params.tenant_id = tenantId;
      if (statusFilter) params.status = statusFilter;
      const resp = await api.get("/seats", { params });
      setData(resp.data.data || []);
      setTotal(resp.data.total || 0);
    } catch (e) {
      const err = e as ApiError;
      message.error(`席位列表加载失败：${err.error}${err.reason ? ` — ${err.reason}` : ""}`);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, tenantId, statusFilter, message]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      await api.post("/seats", values);
      message.success("席位添加成功");
      setCreateOpen(false);
      createForm.resetFields();
      await fetchData();
    } catch (e) {
      if ((e as any)?.errorFields) return;
      const err = e as ApiError;
      message.error(`添加失败：${err.error}${err.reason ? ` — ${err.reason}` : ""}`);
    }
  };

  const openEdit = (s: Seat) => {
    setEditItem(s);
    editForm.setFieldsValue({ role: s.role, status: s.status });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editItem) return;
    try {
      const values = await editForm.validateFields();
      await api.patch(`/seats/${editItem.id}`, values);
      message.success("席位更新成功");
      setEditOpen(false);
      await fetchData();
    } catch (e) {
      if ((e as any)?.errorFields) return;
      const err = e as ApiError;
      message.error(`更新失败：${err.error}${err.reason ? ` — ${err.reason}` : ""}`);
    }
  };

  const columns = [
    {
      title: "席位 #",
      dataIndex: "id",
      width: 80,
      render: (id: number) => (
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "#828DA2" }}>
          SE-{id}
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
      title: "用户 ID",
      dataIndex: "user_id",
      width: 120,
      render: (uid: number) => (
        <span style={{ fontFamily: "ui-monospace, monospace" }}>U-{uid}</span>
      ),
    },
    {
      title: "角色",
      dataIndex: "role",
      width: 110,
      render: (r: string) => <Tag color={ROLE_COLOR[r]}>{ROLE_LABEL[r] || r}</Tag>,
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (s: string) => <Tag color={STATUS_COLOR[s]}>{s}</Tag>,
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
      width: 100,
      render: (_: any, r: Seat) => (
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
            { value: "active", label: "Active" },
            { value: "disabled", label: "Disabled" },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<UserAddOutlined />} onClick={() => setCreateOpen(true)}>
          添加席位
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
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      />

      {/* 添加席位 drawer */}
      <Drawer
        title="添加席位"
        open={createOpen}
        onClose={() => { setCreateOpen(false); createForm.resetFields(); }}
        width={460}
        extra={<Button type="primary" onClick={handleCreate}>添加</Button>}
      >
        <Form form={createForm} layout="vertical" initialValues={{ role: "member" }}>
          <Form.Item name="tenant_id" label="租户 ID" rules={[{ required: true, message: "必填" }]}>
            <Input type="number" placeholder="例如：1" />
          </Form.Item>
          <Form.Item name="user_id" label="用户 ID" rules={[{ required: true, message: "必填" }]}>
            <Input type="number" placeholder="例如：100" />
          </Form.Item>
          <Form.Item name="role" label="角色">
            <AntSelect options={[
              { value: "member", label: "Member 普通成员" },
              { value: "admin", label: "Admin 管理员" },
              { value: "owner", label: "Owner 所有者" },
            ]} />
          </Form.Item>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            校验：active 席位数 ≤ subscriptions.seats_limit（FR-S02）。超出时后端返回 400。
          </Typography.Text>
        </Form>
      </Drawer>

      {/* 编辑席位 drawer */}
      <Drawer
        title={editItem ? `席位 #SE-${editItem.id}` : "—"}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        width={460}
      >
        {editItem && (
          <>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="席位 ID">SE-{editItem.id}</Descriptions.Item>
              <Descriptions.Item label="租户 ID">T{editItem.tenant_id}</Descriptions.Item>
              <Descriptions.Item label="用户 ID">U-{editItem.user_id}</Descriptions.Item>
            </Descriptions>
            <Typography.Title level={5}>编辑</Typography.Title>
            <Form form={editForm} layout="vertical">
              <Form.Item name="role" label="角色" rules={[{ required: true }]}>
                <AntSelect options={[
                  { value: "member", label: "Member" },
                  { value: "admin", label: "Admin" },
                  { value: "owner", label: "Owner" },
                ]} />
              </Form.Item>
              <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                <AntSelect options={[
                  { value: "active", label: "Active" },
                  { value: "disabled", label: "Disabled" },
                ]} />
              </Form.Item>
              <Button type="primary" onClick={handleEdit}>保存</Button>
            </Form>
          </>
        )}
      </Drawer>
    </div>
  );
}
