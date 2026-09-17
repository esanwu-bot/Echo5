"""Google Analytics 4 Data API 集成（T15.2）。

提供 2 个 MCP 工具：
  - ga4_events: 查询事件数据（触发次数、用户数）
  - ga4_conversions: 查询转化数据（转化事件、转化用户数）

工程纪律：
  - OAuth 2.0：refresh_token 存储在 tenant_credentials（加密），access_token 自动刷新
  - Fail-closed：未授权时返回明确错误，不静默降级
  - 配额：新增 meter_kind `ga4_queries`，接 QuotaEnforce
  - 结构化输出：返回 JSON 字符串

依赖：google-analytics-data / google-auth（见 pyproject.toml）。
"""

from __future__ import annotations

import json
import os
from typing import Any

from mcp.server.fastmcp import FastMCP

# 复用 tools.py 的 FastMCP 实例
from .tools import mcp

# GA4 Data API scope
_GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly"


def _get_ga4_credentials(refresh_token: str) -> Any:
    """用 refresh_token 构造 GA4 API 凭证。

    返回 google.oauth2.credentials.Credentials 实例，自动刷新 access_token。
    """
    from google.oauth2.credentials import Credentials

    client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()

    if not client_id or not client_secret:
        raise ValueError(
            "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set"
        )

    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=[_GA4_SCOPE],
    )
    return creds


def _build_ga4_client(refresh_token: str) -> Any:
    """构造 GA4 Data API client 实例。"""
    from google.analytics.data_v1beta import BetaAnalyticsDataClient

    creds = _get_ga4_credentials(refresh_token)
    client = BetaAnalyticsDataClient(credentials=creds)
    return client


def _get_refresh_token(workspace_id: int) -> str | None:
    """从 tenant_credentials 获取 workspace 的 GA4 refresh_token。

    实际实现需查询数据库，这里用环境变量占位（MVP 阶段）。
    TODO: 接入 tenant-api 的凭证查询接口。
    """
    # MVP：从环境变量读取（单租户模式）
    # 生产环境：查询 tenant_credentials 表，按 workspace_id + auth_kind='google_oauth' 过滤
    return os.environ.get("GA4_REFRESH_TOKEN", "").strip() or None


@mcp.tool()
def ga4_events(
    property_id: str,
    start_date: str,
    end_date: str,
    event_names: list[str] | None = None,
) -> str:
    """查询 Google Analytics 4 事件数据。

    - property_id: GA4 资源 ID（如 "123456789"）
    - start_date: 开始日期（YYYY-MM-DD 或相对日期如 "7daysAgo"）
    - end_date: 结束日期（YYYY-MM-DD 或 "today"）
    - event_names: 事件名称列表（可选，如 ["search", "view_item", "add_to_cart"]）

    返回 JSON 字符串，包含：
      events: [{event_name, event_count, total_users}]
    """
    refresh_token = _get_refresh_token(workspace_id=0)
    if not refresh_token:
        return json.dumps(
            {"error": "GA4 not authorized: refresh_token not found. Please connect Google Analytics in settings."},
            ensure_ascii=False,
        )

    try:
        from google.analytics.data_v1beta.types import (
            DateRange,
            Dimension,
            Metric,
            RunReportRequest,
        )

        client = _build_ga4_client(refresh_token)

        # 构造请求
        dimensions = [Dimension(name="eventName")]
        metrics = [
            Metric(name="eventCount"),
            Metric(name="totalUsers"),
        ]

        request = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=dimensions,
            metrics=metrics,
            date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
        )

        # 如果有事件过滤
        if event_names:
            from google.analytics.data_v1beta.types import (
                Filter,
                FilterExpression,
                FilterExpressionList,
            )

            filter_expressions = []
            for event_name in event_names:
                filter_expressions.append(
                    FilterExpression(
                        filter=Filter(
                            field_name="eventName",
                            string_filter=Filter.StringFilter(value=event_name),
                        )
                    )
                )

            request.dimension_filter = FilterExpressionList(
                filter_expressions=filter_expressions
            )

        # 执行请求
        response = client.run_report(request)

        # 解析结果
        events = []
        for row in response.rows:
            event_name = row.dimension_values[0].value
            event_count = int(row.metric_values[0].value)
            total_users = int(row.metric_values[1].value)
            events.append(
                {
                    "event_name": event_name,
                    "event_count": event_count,
                    "total_users": total_users,
                }
            )

        return json.dumps(
            {
                "property_id": property_id,
                "start_date": start_date,
                "end_date": end_date,
                "events": events,
                "event_count": len(events),
            },
            ensure_ascii=False,
            indent=2,
        )

    except Exception as exc:
        return json.dumps(
            {"error": f"GA4 API call failed: {exc}"},
            ensure_ascii=False,
        )


@mcp.tool()
def ga4_conversions(
    property_id: str,
    start_date: str,
    end_date: str,
    conversion_events: list[str] | None = None,
) -> str:
    """查询 Google Analytics 4 转化数据。

    - property_id: GA4 资源 ID（如 "123456789"）
    - start_date: 开始日期（YYYY-MM-DD 或相对日期如 "7daysAgo"）
    - end_date: 结束日期（YYYY-MM-DD 或 "today"）
    - conversion_events: 转化事件名称列表（可选，如 ["generate_lead", "purchase"]）

    返回 JSON 字符串，包含：
      conversions: [{event_name, event_count, total_users}]
    """
    refresh_token = _get_refresh_token(workspace_id=0)
    if not refresh_token:
        return json.dumps(
            {"error": "GA4 not authorized: refresh_token not found"},
            ensure_ascii=False,
        )

    try:
        from google.analytics.data_v1beta.types import (
            DateRange,
            Dimension,
            Filter,
            FilterExpression,
            Metric,
            RunReportRequest,
        )

        client = _build_ga4_client(refresh_token)

        # 构造请求
        dimensions = [Dimension(name="eventName")]
        metrics = [
            Metric(name="eventCount"),
            Metric(name="totalUsers"),
        ]

        # 只查询转化事件
        # GA4 中转化事件通过 isConversionEvent 维度标识
        dimensions.append(Dimension(name="isConversionEvent"))

        request = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=dimensions,
            metrics=metrics,
            date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
            dimension_filter=FilterExpression(
                filter=Filter(
                    field_name="isConversionEvent",
                    string_filter=Filter.StringFilter(value="true"),
                )
            ),
        )

        # 执行请求
        response = client.run_report(request)

        # 解析结果
        conversions = []
        for row in response.rows:
            event_name = row.dimension_values[0].value
            # is_conversion = row.dimension_values[1].value  # 应该是 "true"
            event_count = int(row.metric_values[0].value)
            total_users = int(row.metric_values[1].value)

            # 如果指定了转化事件列表，过滤
            if conversion_events and event_name not in conversion_events:
                continue

            conversions.append(
                {
                    "event_name": event_name,
                    "event_count": event_count,
                    "total_users": total_users,
                }
            )

        return json.dumps(
            {
                "property_id": property_id,
                "start_date": start_date,
                "end_date": end_date,
                "conversions": conversions,
                "conversion_count": len(conversions),
            },
            ensure_ascii=False,
            indent=2,
        )

    except Exception as exc:
        return json.dumps(
            {"error": f"GA4 API call failed: {exc}"},
            ensure_ascii=False,
        )
