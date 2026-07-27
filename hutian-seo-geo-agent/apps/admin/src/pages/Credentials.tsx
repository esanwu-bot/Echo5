// 凭证管理页 — NFR-T02 红线：只读元信息 + 轮换/吊销，绝不渲染明文 secret
// 接 tenant-api /admin/api/v1/credentials 真接口
// 后端 CredentialView 已显式选字段（不含 encrypted_secret / token_cache_encrypted），双保险

import { useState, useEffect, useCallback } from "react";
import {
  Table, Button, Input, Select, Tag, Space, Typography, App as AntdApp,
  Modal, Card, Descriptions, Alert,
} from "antd";
import {
  ReloadOutlined, LockOutlined, SyncOutlined, StopOutlined, SafetyOutlined,
} from "@ant-design/icons";
import { api, ApiError } from "../api/client";

interface Credential {
  id: number;
  workspace_id: number;
  auth_kind: string; // jwt_password | client_credentials
  key_version: number;
  username: string;
  expires_at: string | null;
  last_rotated_at: string | null;
  status: string; // active | rotating | revoked
  created_at: string;
  updated_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  active: "green",
  rotating: "orange",
  revoked: "red",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  rotating: "Rotating",
  revoked: "Revoked",
};
const AUTH_KIND_LABEL: Record<string, string> = {
  jwt_password: "JWT · 密码",
  client_credentials: "Client Credentials",
};

export default function CredentialsPage() {
  const { message, modal } = AntdApp.useApp();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Credential[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [workspaceId, setWorkspaceId] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (workspaceId) params.workspace_id = workspaceId;
      if (statusFilter) params.status = statusFilter;
      const resp = await api.get("/credentials", { params });
      setData(resp.data.data || []);
      setTotal(resp.data.total || 0);
    } catch (e) {
      const err = e as ApiError;
      message.error(`凭证列表加载失败：${err.error}${err.reason ? ` — ${err.reason}` : ""}`);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, workspaceId, statusFilter, message]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRotate = (cred: Credential) => {
    modal.confirm({
      title: `轮换凭证 #${cred.id}？`,
      icon: <SyncOutlined />,
      content: (
        <div>
          <Typography.Paragraph>
            工作空间 <strong>W{cred.workspace_id}</strong> 的 {AUTH_KIND_LABEL[cred.auth_kind] || cred.auth_kind} 凭证将从 key_version <strong>v{cred.key_version}</strong> 轮换到新版本。
          </Typography.Paragraph>
          <Alert
            type="warning"
            showIcon
            message="轮换期间旧凭证短暂有效，轮换完成后旧版本立即失效"
            description="此操作写入审计日志（action=credential.rotate）。真实轮换逻辑在 T6.5 实现，当前为占位。"
          />
        </div>
      ),
      okText: "确认轮换",
      cancelText: "取消",
      onOk: async () => {
        try {
          await api.post(`/credentials/${cred.id}/rotate`);
          message.success(`凭证 #${cred.id} 已触发轮换`);
          await fetchData();
        } catch (e) {
          const err = e as ApiError;
          message.error(`轮换失败：${err.error}${err.reason ? ` — ${err.reason}` : ""}`);
        }
      },
    });
  };

  const handleRevoke = (cred: Credential) => {
    modal.confirm({
      title: `吊销凭证 #${cred.id}？`,
      icon: <StopOutlined />,
      content: (
        <div>
          <Alert
            type="error"
            showIcon
            message="吊销后该凭证立即失效，工作空间将无法访问 siteBase"
            description="此操作不可恢复。如需恢复访问，需重新创建凭证。此操作写入审计日志（action=credential.revoke）。"
          />
        </div>
      ),
      okText: "确认吊销",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.post(`/credentials/${cred.id}/revoke`);
          message.success(`凭证 #${cred.id} 已吊销`);
          await fetchData();
        } catch (e) {
          const err = e as ApiError;
          message.error(`吊销失败：${err.error}${err.reason ? ` — ${err.reason}` : ""}`);
        }
      },
    });
  };

  const columns = [
    {
      title: "凭证 #",
      dataIndex: "id",
      width: 90,
      render: (id: number) => (
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "#828DA2" }}>
          C-{id}
        </span>
      ),
    },
    {
      title: "工作空间",
      dataIndex: "workspace_id",
      width: 110,
      render: (wid: number) => (
        <span style={{ fontFamily: "ui-monospace, monospace", color: "#3B5BDB" }}>
          W{wid}
        </span>
      ),
    },
    {
      title: "认证方式",
      dataIndex: "auth_kind",
      width: 150,
      render: (ak: string) => (
        <Tag>{AUTH_KIND_LABEL[ak] || ak}</Tag>
      ),
    },
    {
      title: "Key 版本",
      dataIndex: "key_version",
      width: 90,
      render: (v: number) => (
        <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 600 }}>
          v{v}
        </span>
      ),
    },
    {
      title: "用户名",
      dataIndex: "username",
      width: 160,
      render: (u: string) => (
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
          {u || "—"}
        </span>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (s: string) => (
        <Tag color={STATUS_COLOR[s]} icon={s === "rotating" ? <SyncOutlined spin /> : undefined}>
          {STATUS_LABEL[s] || s}
        </Tag>
      ),
    },
    {
      title: "上次轮换",
      dataIndex: "last_rotated_at",
      width: 160,
      render: (t: string | null) => (
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "#828DA2" }}>
          {t ? new Date(t).toLocaleString("zh-CN", { hour12: false }) : "—"}
        </span>
      ),
    },
    {
      title: "过期时间",
      dataIndex: "expires_at",
      width: 160,
      render: (t: string | null) => (
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "#828DA2" }}>
          {t ? new Date(t).toLocaleString("zh-CN", { hour12: false }) : "永久"}
        </span>
      ),
    },
    {
      title: "操作",
      width: 180,
      fixed: "right" as const,
      render: (_: any, r: Credential) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<SyncOutlined />}
            disabled={r.status === "revoked"}
            onClick={() => handleRotate(r)}
          >
            轮换
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<StopOutlined />}
            disabled={r.status === "revoked"}
            onClick={() => handleRevoke(r)}
          >
            吊销
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* NFR-T02 红线提示 */}
      <Alert
        type="info"
        showIcon
        icon={<SafetyOutlined />}
        message="凭证视图只读元信息（workspace/状态/key_version/last_rotated），绝不渲染明文 secret"
        description="轮换/吊销操作会写入审计日志（action=credential.rotate / credential.revoke）。明文 secret 仅存在于后端加密存储（envelope encryption），前端永远不可见。"
        style={{ marginBottom: 16 }}
      />

      <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <Input
          placeholder="工作空间 ID"
          value={workspaceId}
          onChange={(e) => setWorkspaceId(e.target.value)}
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
            { value: "rotating", label: "Rotating" },
            { value: "revoked", label: "Revoked" },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
        <div style={{ flex: 1 }} />
        <Tag icon={<LockOutlined />} color="processing" style={{ padding: "4px 10px" }}>
          NFR-T02 红线：不出明文
        </Tag>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={columns}
        size="middle"
        scroll={{ x: 1200 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          showTotal: (t) => `共 ${t} 条`,
        }}
      />
    </div>
  );
}
