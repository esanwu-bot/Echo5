// 额度与计量页 — 接 tenant-api /admin/api/v1/quotas 真接口
// 服务端计量正本 · 配额用量（usage_meters + plan_quotas 联读）

import { useState, useEffect, useCallback } from "react";
import {
  Table, Button, Input, Tag, Space, Typography, App as AntdApp, Card, Tabs,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { api, ApiError } from "../api/client";

interface QuotaUsageRow {
  tenant_id: number;
  tenant_name: string;
  meter_kind: string;
  window_start: string;
  count: number;
  plan: string;
  limit_per_window: number;
  window_kind: string;
  overage_policy: string;
}

interface PlanQuota {
  id: number;
  plan: string;
  meter_kind: string;
  limit_per_window: number;
  window_kind: string;
  overage_policy: string;
}

const METER_LABEL: Record<string, string> = {
  llm_calls: "LLM 调用",
  pages_built: "页面构建",
  seo_audits: "SEO 审计",
  citations_tracked: "引用追踪",
};
const PLAN_COLOR: Record<string, string> = {
  free: "default",
  pro: "blue",
  enterprise: "purple",
};
const OVERAGE_LABEL: Record<string, string> = {
  reject: "拒绝",
  degrade: "降级",
  allow: "允许",
};
const OVERAGE_COLOR: Record<string, string> = {
  reject: "red",
  degrade: "orange",
  allow: "green",
};

export default function QuotasPage() {
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<QuotaUsageRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [tenantId, setTenantId] = useState("");
  const [windowStart, setWindowStart] = useState<string>("");
  const [planQuotas, setPlanQuotas] = useState<PlanQuota[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (tenantId) params.tenant_id = tenantId;
      const resp = await api.get("/quotas", { params });
      setData(resp.data.data || []);
      setTotal(resp.data.total || 0);
      setWindowStart(resp.data.window_start || "");
    } catch (e) {
      const err = e as ApiError;
      message.error(`配额用量加载失败：${err.error}${err.reason ? ` — ${err.reason}` : ""}`);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, tenantId, message]);

  const fetchPlanQuotas = useCallback(async () => {
    try {
      const resp = await api.get("/quotas/plans");
      setPlanQuotas(resp.data.data || []);
    } catch (e) {
      // 静默
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchPlanQuotas();
  }, [fetchData, fetchPlanQuotas]);

  const usageColumns = [
    {
      title: "租户",
      dataIndex: "tenant_name",
      render: (name: string, r: QuotaUsageRow) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 600 }}>{name || "—"}</span>
          <span style={{ fontSize: 11, color: "#828DA2", fontFamily: "ui-monospace, monospace" }}>
            T{r.tenant_id}
          </span>
        </Space>
      ),
    },
    {
      title: "计量项",
      dataIndex: "meter_kind",
      width: 130,
      render: (k: string) => <Tag>{METER_LABEL[k] || k}</Tag>,
    },
    {
      title: "套餐",
      dataIndex: "plan",
      width: 100,
      render: (p: string) => <Tag color={PLAN_COLOR[p]}>{p || "—"}</Tag>,
    },
    {
      title: "本月用量",
      dataIndex: "count",
      width: 120,
      render: (n: number, r: QuotaUsageRow) => {
        const limit = r.limit_per_window;
        const isUnlimited = limit === -1;
        const pct = isUnlimited || limit === 0 ? 0 : (n / limit * 100);
        const over = !isUnlimited && n > limit;
        return (
          <Space direction="vertical" size={2}>
            <span style={{ fontWeight: 700, color: over ? "#DC2626" : "#0F1419" }}>
              {n.toLocaleString()}
              {!isUnlimited && (
                <span style={{ fontSize: 11, color: "#828DA2", marginLeft: 4 }}>
                  / {limit.toLocaleString()}
                </span>
              )}
              {isUnlimited && (
                <span style={{ fontSize: 11, color: "#828DA2", marginLeft: 4 }}>∞</span>
              )}
            </span>
            {!isUnlimited && limit > 0 && (
              <div style={{ width: 100, height: 4, background: "#F1F5F9", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  width: `${Math.min(pct, 100)}%`, height: "100%",
                  background: over ? "#DC2626" : pct > 80 ? "#D97706" : "#16A34A",
                }} />
              </div>
            )}
          </Space>
        );
      },
    },
    {
      title: "超限策略",
      dataIndex: "overage_policy",
      width: 100,
      render: (p: string) => (
        <Tag color={OVERAGE_COLOR[p] || "default"}>{OVERAGE_LABEL[p] || p || "—"}</Tag>
      ),
    },
    {
      title: "窗口起点",
      dataIndex: "window_start",
      width: 130,
      render: (t: string) => (
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "#828DA2" }}>
          {t ? new Date(t).toLocaleDateString("zh-CN") : "—"}
        </span>
      ),
    },
  ];

  const planColumns = [
    {
      title: "套餐",
      dataIndex: "plan",
      width: 100,
      render: (p: string) => <Tag color={PLAN_COLOR[p]}>{p}</Tag>,
    },
    {
      title: "计量项",
      dataIndex: "meter_kind",
      width: 130,
      render: (k: string) => <Tag>{METER_LABEL[k] || k}</Tag>,
    },
    {
      title: "窗口",
      dataIndex: "window_kind",
      width: 100,
      render: (w: string) => <Tag>{w === "month" ? "月" : w === "total" ? "总量" : w}</Tag>,
    },
    {
      title: "上限/窗口",
      dataIndex: "limit_per_window",
      width: 120,
      render: (n: number) => (
        <span style={{ fontWeight: 600, fontFamily: "ui-monospace, monospace" }}>
          {n === -1 ? "∞ 无限" : n.toLocaleString()}
        </span>
      ),
    },
    {
      title: "超限策略",
      dataIndex: "overage_policy",
      width: 100,
      render: (p: string) => (
        <Tag color={OVERAGE_COLOR[p] || "default"}>{OVERAGE_LABEL[p] || p}</Tag>
      ),
    },
  ];

  return (
    <div>
      <Card size="small" style={{ marginBottom: 12, background: "#F8FAFC", border: "1px solid #E3E8EF" }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          数据来源：usage_meters 表当月窗口（window_start={windowStart ? new Date(windowStart).toLocaleDateString("zh-CN") : "—"}）
          联 plan_quotas 表（plan + meter_kind + window_kind=month）
        </Typography.Text>
      </Card>

      <Tabs
        defaultActiveKey="usage"
        items={[
          {
            key: "usage",
            label: "配额用量",
            children: (
              <>
                <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
                  <Input
                    placeholder="租户 ID"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    style={{ width: 160 }}
                    allowClear
                  />
                  <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
                </div>
                <Table
                  rowKey={(r) => `${r.tenant_id}-${r.meter_kind}`}
                  loading={loading}
                  dataSource={data}
                  columns={usageColumns}
                  size="middle"
                  pagination={{
                    current: page,
                    pageSize,
                    total,
                    showSizeChanger: true,
                    onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                  }}
                />
              </>
            ),
          },
          {
            key: "plans",
            label: "套餐配额定义",
            children: (
              <Table
                rowKey="id"
                dataSource={planQuotas}
                columns={planColumns}
                size="middle"
                pagination={false}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
