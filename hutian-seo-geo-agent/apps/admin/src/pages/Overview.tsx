// 总览页 — 接 tenant-api /admin/api/v1/overview 真接口
// 原型设计：全部租户的实时经营视图
// KPI 5 指标 + 状态分布 + 本月工具调用

import { useState, useEffect, useCallback } from "react";
import { Card, Col, Row, Statistic, Tag, Typography, App as AntdApp, Spin, Table } from "antd";
import {
  TeamOutlined, CheckCircleOutlined, ClockCircleOutlined, PauseCircleOutlined, ToolOutlined,
} from "@ant-design/icons";
import { api, ApiError } from "../api/client";

interface OverviewData {
  active_tenants: number;
  trial_tenants: number;
  grace_tenants: number;
  suspended_tenants: number;
  total_tenants: number;
  status_distribution: { status: string; count: number }[];
  monthly_tool_calls: number;
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

export default function OverviewPage() {
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OverviewData | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.get("/overview");
      setData(resp.data.data);
    } catch (e) {
      const err = e as ApiError;
      message.error(`总览加载失败：${err.error}${err.reason ? ` — ${err.reason}` : ""}`);
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !data) {
    return <Spin tip="加载中..." />;
  }

  if (!data) {
    return null;
  }

  return (
    <div>
      {/* KPI 5 指标 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card bordered={false} style={{ background: "linear-gradient(135deg, #3B5BDB 0%, #5470E6 100%)" }}>
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,.75)" }}>租户总数</span>}
              value={data.total_tenants}
              prefix={<TeamOutlined style={{ color: "#fff" }} />}
              valueStyle={{ color: "#fff", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card bordered={false}>
            <Statistic
              title="活跃租户"
              value={data.active_tenants}
              prefix={<CheckCircleOutlined style={{ color: "#16A34A" }} />}
              valueStyle={{ color: "#16A34A", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card bordered={false}>
            <Statistic
              title="试用中"
              value={data.trial_tenants}
              prefix={<ClockCircleOutlined style={{ color: "#3B5BDB" }} />}
              valueStyle={{ color: "#3B5BDB", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card bordered={false}>
            <Statistic
              title="Grace / 即将到期"
              value={data.grace_tenants}
              prefix={<ClockCircleOutlined style={{ color: "#D97706" }} />}
              valueStyle={{ color: "#D97706", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card bordered={false}>
            <Statistic
              title="已封停"
              value={data.suspended_tenants}
              prefix={<PauseCircleOutlined style={{ color: "#DC2626" }} />}
              valueStyle={{ color: "#DC2626", fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 本月工具调用 */}
      <Card bordered={false} style={{ marginTop: 16 }}>
        <Statistic
          title="本月工具调用（LLM + SEO 审计 + 引用追踪 + 页面构建）"
          value={data.monthly_tool_calls}
          prefix={<ToolOutlined style={{ color: "#7C3AED" }} />}
          valueStyle={{ color: "#7C3AED", fontWeight: 700, fontSize: 28 }}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          数据来源：usage_meters 表当月窗口求和（所有 meter_kind）
        </Typography.Text>
      </Card>

      {/* 状态分布表 */}
      <Card title="租户状态分布" bordered={false} style={{ marginTop: 16 }}>
        <Table
          rowKey="status"
          dataSource={data.status_distribution}
          pagination={false}
          size="small"
          columns={[
            {
              title: "状态",
              dataIndex: "status",
              render: (s: string) => (
                <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s] || s}</Tag>
              ),
            },
            {
              title: "数量",
              dataIndex: "count",
              width: 120,
              render: (n: number) => (
                <span style={{ fontWeight: 600, fontSize: 16 }}>{n}</span>
              ),
            },
            {
              title: "占比",
              width: 200,
              render: (_: any, r: { status: string; count: number }) => {
                const pct = data.total_tenants > 0 ? (r.count / data.total_tenants * 100).toFixed(1) : "0";
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 8, background: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{
                        width: `${pct}%`, height: "100%",
                        background: STATUS_COLOR[r.status] === "green" ? "#16A34A" :
                                    STATUS_COLOR[r.status] === "blue" ? "#3B5BDB" :
                                    STATUS_COLOR[r.status] === "orange" ? "#D97706" :
                                    STATUS_COLOR[r.status] === "gold" ? "#EAB308" :
                                    STATUS_COLOR[r.status] === "red" ? "#DC2626" : "#94A3B8",
                      }} />
                    </div>
                    <span style={{ fontSize: 12, color: "#828DA2", fontFamily: "ui-monospace, monospace", minWidth: 40 }}>
                      {pct}%
                    </span>
                  </div>
                );
              },
            },
          ]}
        />
      </Card>
    </div>
  );
}
