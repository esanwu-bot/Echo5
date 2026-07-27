// 工作空间页 — 接 tenant-api /admin/api/v1/workspaces 真接口
// workspace = 品牌实体（FR-T03 品牌派生落点）

import { useState, useEffect, useCallback } from "react";
import {
  Table, Button, Input, Select, Tag, Space, Typography, App as AntdApp,
  Drawer, Descriptions, Avatar,
} from "antd";
import { ReloadOutlined, AppstoreOutlined } from "@ant-design/icons";
import { api, ApiError } from "../api/client";

interface Workspace {
  id: number;
  tenant_id: number;
  slug: string;
  brand_name: string;
  industry: string;
  sitebase_instance_id: number;
  fallback_copy_json: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  active: "green",
  archived: "default",
};

const AVATAR_COLORS = ["#3B5BDB", "#16A34A", "#D97706", "#7C3AED", "#2563EB", "#DC2626", "#0EA5A4"];
function avatarColor(s: string) {
  const sum = [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export default function WorkspacesPage() {
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Workspace[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [tenantId, setTenantId] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [detail, setDetail] = useState<Workspace | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (tenantId) params.tenant_id = tenantId;
      if (statusFilter) params.status = statusFilter;
      const resp = await api.get("/workspaces", { params });
      setData(resp.data.data || []);
      setTotal(resp.data.total || 0);
    } catch (e) {
      const err = e as ApiError;
      message.error(`工作空间列表加载失败：${err.error}${err.reason ? ` — ${err.reason}` : ""}`);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, tenantId, statusFilter, message]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDetail = async (id: number) => {
    try {
      const resp = await api.get(`/workspaces/${id}`);
      setDetail(resp.data.data);
      setDrawerOpen(true);
    } catch (e) {
      const err = e as ApiError;
      message.error(`详情加载失败：${err.error}`);
    }
  };

  const columns = [
    {
      title: "品牌",
      dataIndex: "brand_name",
      render: (name: string, r: Workspace) => (
        <Space>
          <Avatar style={{ background: avatarColor(name) }} size={30}>
            {name?.[0] || "?"}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{name}</div>
            <div style={{ fontSize: 11, color: "#828DA2", fontFamily: "ui-monospace, monospace" }}>
              {r.slug} · W{r.id}
            </div>
          </div>
        </Space>
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
      title: "行业",
      dataIndex: "industry",
      width: 120,
      render: (i: string) => <Tag>{i || "—"}</Tag>,
    },
    {
      title: "siteBase 实例",
      dataIndex: "sitebase_instance_id",
      width: 130,
      render: (id: number) => (
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
          I-{id}
        </span>
      ),
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
      render: (_: any, r: Workspace) => (
        <Button type="link" size="small" onClick={() => openDetail(r.id)}>详情</Button>
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
            { value: "archived", label: "Archived" },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
        <div style={{ flex: 1 }} />
        <Tag icon={<AppstoreOutlined />} color="processing" style={{ padding: "4px 10px" }}>
          workspace = 品牌实体
        </Tag>
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

      <Drawer
        title={detail ? detail.brand_name : "—"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={520}
        extra={detail && <Tag color={STATUS_COLOR[detail.status]}>{detail.status}</Tag>}
      >
        {detail && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="工作空间 ID">W-{detail.id}</Descriptions.Item>
              <Descriptions.Item label="Slug">{detail.slug}</Descriptions.Item>
              <Descriptions.Item label="租户 ID">T{detail.tenant_id}</Descriptions.Item>
              <Descriptions.Item label="品牌名">{detail.brand_name}</Descriptions.Item>
              <Descriptions.Item label="行业">{detail.industry || "—"}</Descriptions.Item>
              <Descriptions.Item label="siteBase 实例 ID">I-{detail.sitebase_instance_id}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={STATUS_COLOR[detail.status]}>{detail.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(detail.created_at).toLocaleString("zh-CN")}
              </Descriptions.Item>
            </Descriptions>

            {detail.fallback_copy_json && (
              <>
                <Typography.Title level={5} style={{ marginTop: 16 }}>兜底文案 (fallback_copy_json)</Typography.Title>
                <pre style={{
                  background: "#0F1419", color: "#E6E8EB",
                  padding: 12, borderRadius: 8, fontSize: 12,
                  fontFamily: "ui-monospace, monospace", overflow: "auto",
                  maxHeight: 240,
                }}>
                  {(() => {
                    try { return JSON.stringify(JSON.parse(detail.fallback_copy_json), null, 2); }
                    catch { return detail.fallback_copy_json; }
                  })()}
                </pre>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  渲染器 reader.ts MOCK_SETTINGS 兜底真值来源（FR-T03）
                </Typography.Text>
              </>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}
