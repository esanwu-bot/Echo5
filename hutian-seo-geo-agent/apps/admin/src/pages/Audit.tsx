// 审计日志页 — 接 tenant-api /admin/api/v1/audit-logs 真接口
// 原型设计：append-only · 不可篡改 · 跨租户取证
// 列：时间 / 操作人(actor_kind) / 租户·工作空间 / 动作(action) / 目标(target_kind+target_id) / 元信息

import { useState, useEffect, useCallback } from "react";
import {
  Table, Button, Input, Select, Tag, Space, Typography, App as AntdApp,
  Card, Tooltip, Descriptions, Drawer,
} from "antd";
import { ReloadOutlined, SafetyCertificateOutlined, FilterOutlined } from "@ant-design/icons";
import { api, ApiError } from "../api/client";

interface AuditLog {
  id: number;
  created_at: string;
  tenant_id: number | null;
  workspace_id: number | null;
  seat_id: number | null;
  actor_kind: string; // human | agent
  action: string;
  target_kind: string;
  target_id: number | null;
  meta_json: string;
}

const ACTOR_COLOR: Record<string, string> = {
  human: "blue",
  agent: "purple",
};
const ACTOR_LABEL: Record<string, string> = {
  human: "人工",
  agent: "Agent",
};

// 按动作前缀着色（tenant.* / subscription.* / workspace.* / credential.* / seat.*）
function actionColor(action: string): string {
  if (action.startsWith("tenant.")) return "blue";
  if (action.startsWith("subscription.")) return "cyan";
  if (action.startsWith("workspace.")) return "geekblue";
  if (action.startsWith("credential.")) return "red";
  if (action.startsWith("seat.")) return "green";
  return "default";
}

// 解析 meta_json（后端可能返空串或 JSON）
function parseMeta(s: string): Record<string, any> | null {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export default function AuditPage() {
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [tenantId, setTenantId] = useState("");
  const [actorKind, setActorKind] = useState<string>("");
  const [action, setAction] = useState("");
  const [detail, setDetail] = useState<AuditLog | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (tenantId) params.tenant_id = tenantId;
      if (actorKind) params.actor_kind = actorKind;
      if (action) params.action = action;
      const resp = await api.get("/audit-logs", { params });
      setData(resp.data.data || []);
      setTotal(resp.data.total || 0);
    } catch (e) {
      const err = e as ApiError;
      message.error(`审计加载失败：${err.error}${err.reason ? ` — ${err.reason}` : ""}`);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, tenantId, actorKind, action, message]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDetail = (r: AuditLog) => {
    setDetail(r);
    setDrawerOpen(true);
  };

  const columns = [
    {
      title: "时间",
      dataIndex: "created_at",
      width: 170,
      render: (t: string) => (
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "#828DA2", whiteSpace: "nowrap" }}>
          {new Date(t).toLocaleString("zh-CN", { hour12: false })}
        </span>
      ),
    },
    {
      title: "操作人",
      dataIndex: "actor_kind",
      width: 100,
      render: (ak: string, r: AuditLog) => (
        <Space size={4}>
          <Tag color={ACTOR_COLOR[ak] || "default"}>{ACTOR_LABEL[ak] || ak}</Tag>
          {r.seat_id && (
            <Tooltip title={`seat_id=${r.seat_id}`}>
              <span style={{ fontSize: 11, color: "#828DA2", fontFamily: "ui-monospace, monospace" }}>
                #{r.seat_id}
              </span>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: "租户 / 工作空间",
      width: 200,
      render: (_: any, r: AuditLog) => (
        <div style={{ fontSize: 12 }}>
          <div>
            {r.tenant_id ? (
              <span style={{ color: "#3B5BDB", fontFamily: "ui-monospace, monospace" }}>T{r.tenant_id}</span>
            ) : (
              <span style={{ color: "#C0C6D2" }}>—</span>
            )}
            {r.workspace_id && (
              <span style={{ color: "#828DA2", fontFamily: "ui-monospace, monospace", marginLeft: 6 }}>
                / W{r.workspace_id}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "动作",
      dataIndex: "action",
      width: 200,
      render: (a: string) => (
        <Tag color={actionColor(a)} style={{ fontFamily: "ui-monospace, monospace", fontSize: 11.5 }}>
          {a}
        </Tag>
      ),
    },
    {
      title: "目标",
      width: 160,
      render: (_: any, r: AuditLog) => (
        <span style={{ fontSize: 12, color: "#5C6470" }}>
          {r.target_kind || "—"}
          {r.target_id && (
            <span style={{ fontFamily: "ui-monospace, monospace", marginLeft: 4, color: "#828DA2" }}>
              #{r.target_id}
            </span>
          )}
        </span>
      ),
    },
    {
      title: "审计 #",
      dataIndex: "id",
      width: 90,
      render: (id: number) => (
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "#828DA2" }}>
          A-{id}
        </span>
      ),
    },
    {
      title: "操作",
      width: 80,
      render: (_: any, r: AuditLog) => (
        <Button type="link" size="small" onClick={() => openDetail(r)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Space.Compact>
          <Input
            placeholder="租户 ID"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            style={{ width: 130 }}
            allowClear
          />
          <Select
            placeholder="操作人"
            value={actorKind || undefined}
            onChange={(v) => setActorKind(v || "")}
            allowClear
            style={{ width: 130 }}
            options={[
              { value: "human", label: "人工 (human)" },
              { value: "agent", label: "Agent" },
            ]}
          />
          <Input
            placeholder="动作前缀（如 tenant.）"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
        </Space.Compact>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
        <div style={{ flex: 1 }} />
        <Tag icon={<SafetyCertificateOutlined />} color="success" style={{ padding: "4px 10px" }}>
          append-only · 不可篡改
        </Tag>
      </div>

      <Card size="small" style={{ marginBottom: 12, background: "#F8FAFC", border: "1px solid #E3E8EF" }}>
        <Space size={24} wrap>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            <FilterOutlined style={{ marginRight: 4 }} />
            筛选条件：
          </Typography.Text>
          <Typography.Text style={{ fontSize: 12 }}>
            租户 ID: <strong>{tenantId || "—"}</strong>
          </Typography.Text>
          <Typography.Text style={{ fontSize: 12 }}>
            操作人: <strong>{actorKind || "全部"}</strong>
          </Typography.Text>
          <Typography.Text style={{ fontSize: 12 }}>
            动作前缀: <strong>{action || "—"}</strong>
          </Typography.Text>
          <Typography.Text style={{ fontSize: 12, color: "#828DA2" }}>
            共 {total} 条
          </Typography.Text>
        </Space>
      </Card>

      <Table
        rowKey="ID"
        loading={loading}
        dataSource={data}
        columns={columns}
        size="middle"
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [20, 50, 100, 200],
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          showTotal: (t) => `共 ${t} 条`,
        }}
      />

      <Drawer
        title={detail ? `审计 #A-${detail.id}` : "—"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={520}
      >
        {detail && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="审计 ID">A-{detail.id}</Descriptions.Item>
              <Descriptions.Item label="时间">
                {new Date(detail.created_at).toLocaleString("zh-CN", { hour12: false })}
              </Descriptions.Item>
              <Descriptions.Item label="操作人">
                <Tag color={ACTOR_COLOR[detail.actor_kind] || "default"}>
                  {ACTOR_LABEL[detail.actor_kind] || detail.actor_kind}
                </Tag>
                {detail.seat_id && ` · seat #${detail.seat_id}`}
              </Descriptions.Item>
              <Descriptions.Item label="租户">
                {detail.tenant_id || "—（跨租户/系统操作）"}
              </Descriptions.Item>
              <Descriptions.Item label="工作空间">
                {detail.workspace_id || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="动作">
                <Tag color={actionColor(detail.action)} style={{ fontFamily: "ui-monospace, monospace" }}>
                  {detail.action}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="目标">
                {detail.target_kind || "—"}
                {detail.target_id && ` #${detail.target_id}`}
              </Descriptions.Item>
            </Descriptions>

            {detail.meta_json && (
              <>
                <Typography.Title level={5} style={{ marginTop: 16 }}>元信息 (meta)</Typography.Title>
                <pre style={{
                  background: "#0F1419", color: "#E6E8EB",
                  padding: 12, borderRadius: 8, fontSize: 12,
                  fontFamily: "ui-monospace, monospace", overflow: "auto",
                  maxHeight: 320,
                }}>
                  {JSON.stringify(parseMeta(detail.meta_json) || detail.meta_json, null, 2)}
                </pre>
              </>
            )}

            <Typography.Paragraph type="secondary" style={{ marginTop: 16, fontSize: 12 }}>
              该日志为 append-only，不可篡改。任何对历史记录的修改都会在哈希链中暴露。
              跨租户操作（含 super-admin 行为）必须可追溯到具体 seat。
            </Typography.Paragraph>
          </>
        )}
      </Drawer>
    </div>
  );
}
