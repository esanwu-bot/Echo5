"""项目事件存储与查询工具（T15.3 排名趋势存储）。

提供 3 个 MCP 工具：
  - store_project_event: 存储项目事件快照（如 analyze_content_gap 结果）
  - query_project_events: 查询项目事件列表（支持按 kind、时间范围过滤）
  - get_event_trend: 获取特定指标的趋势数据（如排名变化）

工程纪律：
  - 结构化输出：返回 JSON 字符串
  - 租户隔离：所有查询必须带 tenant_id + workspace_id
  - 事件类型：serp_rank_snapshot / crawl_audit / content_gap
  - 时间索引：event_time 用于趋势查询

依赖：tenant-api 的 project_events 表（models.go 已定义）。
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta
from typing import Any

import httpx
from mcp.server.fastmcp import FastMCP

# 复用 tools.py 的 FastMCP 实例
from .tools import mcp

# tenant-api 端点（MVP 阶段通过 HTTP 调用 tenant-api）
_TENANT_API_BASE_URL = os.environ.get("TENANT_API_BASE_URL", "http://localhost:8080").rstrip("/")
_TENANT_API_TIMEOUT = 10.0


def _get_auth_headers() -> dict[str, str]:
    """获取调用 tenant-api 的认证头。

    MVP 阶段：从环境变量读取内部 API token。
    生产环境：应该用 service account 或内部 JWT。
    """
    token = os.environ.get("TENANT_API_INTERNAL_TOKEN", "").strip()
    if not token:
        raise ValueError("TENANT_API_INTERNAL_TOKEN must be set")
    return {"Authorization": f"Bearer {token}"}


@mcp.tool()
def store_project_event(
    tenant_id: int,
    workspace_id: int,
    kind: str,
    payload: str,
    source_tool: str = "",
    event_time: str | None = None,
) -> str:
    """存储项目事件快照。

    - tenant_id: 租户 ID
    - workspace_id: 工作区 ID
    - kind: 事件类型（serp_rank_snapshot / crawl_audit / content_gap）
    - payload: JSON 格式的详细数据（字符串）
    - source_tool: 产生此事件的工具名称（可选）
    - event_time: 事件时间（ISO 8601 格式，可选，默认当前时间）

    返回 JSON 字符串，包含 event_id。
    """
    # 验证 kind
    valid_kinds = {"serp_rank_snapshot", "crawl_audit", "content_gap"}
    if kind not in valid_kinds:
        return json.dumps(
            {"error": f"Invalid kind '{kind}'. Must be one of: {', '.join(valid_kinds)}"},
            ensure_ascii=False,
        )

    # 验证 payload 是合法 JSON
    try:
        json.loads(payload)
    except json.JSONDecodeError as e:
        return json.dumps(
            {"error": f"Invalid payload JSON: {e}"},
            ensure_ascii=False,
        )

    # 构造请求体
    body = {
        "tenant_id": tenant_id,
        "workspace_id": workspace_id,
        "kind": kind,
        "payload": payload,
        "source_tool": source_tool,
    }
    if event_time:
        body["event_time"] = event_time

    try:
        headers = _get_auth_headers()
        resp = httpx.post(
            f"{_TENANT_API_BASE_URL}/internal/project-events",
            json=body,
            headers=headers,
            timeout=_TENANT_API_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()

        return json.dumps(
            {
                "success": True,
                "event_id": data.get("event_id"),
                "message": "Project event stored successfully",
            },
            ensure_ascii=False,
        )

    except httpx.HTTPStatusError as e:
        return json.dumps(
            {"error": f"Tenant API error: {e.response.status_code} - {e.response.text}"},
            ensure_ascii=False,
        )
    except Exception as e:
        return json.dumps(
            {"error": f"Failed to store project event: {e}"},
            ensure_ascii=False,
        )


@mcp.tool()
def query_project_events(
    tenant_id: int,
    workspace_id: int,
    kind: str | None = None,
    start_time: str | None = None,
    end_time: str | None = None,
    limit: int = 100,
) -> str:
    """查询项目事件列表。

    - tenant_id: 租户 ID
    - workspace_id: 工作区 ID
    - kind: 事件类型过滤（可选）
    - start_time: 开始时间（ISO 8601 格式，可选）
    - end_time: 结束时间（ISO 8601 格式，可选）
    - limit: 返回数量上限（默认 100）

    返回 JSON 字符串，包含 events 列表。
    """
    # 构造查询参数
    params = {
        "tenant_id": tenant_id,
        "workspace_id": workspace_id,
        "limit": limit,
    }
    if kind:
        params["kind"] = kind
    if start_time:
        params["start_time"] = start_time
    if end_time:
        params["end_time"] = end_time

    try:
        headers = _get_auth_headers()
        resp = httpx.get(
            f"{_TENANT_API_BASE_URL}/internal/project-events",
            params=params,
            headers=headers,
            timeout=_TENANT_API_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()

        return json.dumps(
            {
                "success": True,
                "count": len(data.get("events", [])),
                "events": data.get("events", []),
            },
            ensure_ascii=False,
            indent=2,
        )

    except httpx.HTTPStatusError as e:
        return json.dumps(
            {"error": f"Tenant API error: {e.response.status_code} - {e.response.text}"},
            ensure_ascii=False,
        )
    except Exception as e:
        return json.dumps(
            {"error": f"Failed to query project events: {e}"},
            ensure_ascii=False,
        )


@mcp.tool()
def get_event_trend(
    tenant_id: int,
    workspace_id: int,
    kind: str,
    metric_path: str,
    days: int = 30,
) -> str:
    """获取特定指标的趋势数据。

    - tenant_id: 租户 ID
    - workspace_id: 工作区 ID
    - kind: 事件类型（serp_rank_snapshot / crawl_audit / content_gap）
    - metric_path: 要提取的指标路径（JSONPath 风格，如 "serp_results[0].position"）
    - days: 查询最近多少天的数据（默认 30）

    返回 JSON 字符串，包含 trend 数据点列表 [{event_time, value}]。

    示例：
      metric_path="serp_results[0].position" 提取第一个搜索结果的排名位置
      metric_path="content_gap_brief.gap_matrix.common_topics.length" 提取共同主题数量
    """
    # 计算时间范围
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=days)

    # 先查询事件列表
    events_json = query_project_events(
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        kind=kind,
        start_time=start_time.isoformat() + "Z",
        end_time=end_time.isoformat() + "Z",
        limit=1000,
    )
    events_data = json.loads(events_json)

    if not events_data.get("success"):
        return events_json

    events = events_data.get("events", [])
    if not events:
        return json.dumps(
            {
                "success": True,
                "count": 0,
                "trend": [],
                "message": "No events found in the specified time range",
            },
            ensure_ascii=False,
        )

    # 提取指标值（简单 JSONPath 实现）
    trend = []
    for event in events:
        payload = json.loads(event.get("payload", "{}"))
        value = _extract_metric(payload, metric_path)
        if value is not None:
            trend.append(
                {
                    "event_time": event.get("event_time"),
                    "value": value,
                }
            )

    # 按时间排序
    trend.sort(key=lambda x: x["event_time"])

    return json.dumps(
        {
            "success": True,
            "count": len(trend),
            "trend": trend,
            "metric_path": metric_path,
            "days": days,
        },
        ensure_ascii=False,
        indent=2,
    )


def _extract_metric(data: dict, path: str) -> Any:
    """从 JSON 数据中提取指标值（简单 JSONPath 实现）。

    支持的路径格式：
      - "field"  → data["field"]
      - "field.subfield"  → data["field"]["subfield"]
      - "field[0]"  → data["field"][0]
      - "field[0].subfield"  → data["field"][0]["subfield"]
    """
    try:
        parts = []
        current = ""
        for char in path:
            if char == ".":
                if current:
                    parts.append(current)
                    current = ""
            elif char == "[":
                if current:
                    parts.append(current)
                    current = ""
            elif char == "]":
                if current:
                    parts.append(int(current))
                    current = ""
            else:
                current += char
        if current:
            parts.append(current)

        # 遍历路径提取值
        value = data
        for part in parts:
            if isinstance(part, int):
                value = value[part]
            else:
                value = value[part]

        return value
    except (KeyError, IndexError, TypeError):
        return None
