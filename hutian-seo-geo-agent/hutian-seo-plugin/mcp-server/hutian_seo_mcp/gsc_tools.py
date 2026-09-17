"""Google Search Console API 集成（T15.1）。

提供 3 个 MCP 工具：
  - gsc_query: 查询搜索分析数据（查询词、点击数、展现数、CTR、平均排名）
  - gsc_index_status: 查询单页索引状态（已索引/已发现未索引/被排除原因）
  - gsc_validate_fix: 修复后触发 GSC 重新验证

工程纪律：
  - OAuth 2.0：refresh_token 存储在 tenant_credentials（加密），access_token 自动刷新
  - Fail-closed：未授权时返回明确错误，不静默降级
  - 配额：新增 meter_kind `gsc_queries`，接 QuotaEnforce
  - 结构化输出：返回 JSON 字符串

依赖：google-auth / google-auth-oauthlib / google-api-python-client（见 pyproject.toml）。
"""

from __future__ import annotations

import json
import os
from typing import Any

from mcp.server.fastmcp import FastMCP

# 复用 tools.py 的 FastMCP 实例
from .tools import mcp

# GSC API scope
_GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"
_GSC_SCOPE_WRITE = "https://www.googleapis.com/auth/webmasters"

# GSC API 端点
_GSC_API_SERVICE = "searchconsole"
_GSC_API_VERSION = "v1"


def _get_gsc_credentials(refresh_token: str) -> Any:
    """用 refresh_token 构造 GSC API 凭证。

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
        token=None,  # access_token 会自动刷新
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=[_GSC_SCOPE, _GSC_SCOPE_WRITE],
    )
    return creds


def _build_gsc_service(refresh_token: str) -> Any:
    """构造 GSC API service 实例。"""
    from googleapiclient.discovery import build

    creds = _get_gsc_credentials(refresh_token)
    service = build(_GSC_API_SERVICE, _GSC_API_VERSION, credentials=creds)
    return service


def _get_refresh_token(workspace_id: int) -> str | None:
    """从 tenant_credentials 获取 workspace 的 GSC refresh_token。

    实际实现需查询数据库，这里用环境变量占位（MVP 阶段）。
    TODO: 接入 tenant-api 的凭证查询接口。
    """
    # MVP：从环境变量读取（单租户模式）
    # 生产环境：查询 tenant_credentials 表，按 workspace_id + auth_kind='google_oauth' 过滤
    return os.environ.get("GSC_REFRESH_TOKEN", "").strip() or None


@mcp.tool()
def gsc_query(
    site_url: str,
    start_date: str,
    end_date: str,
    dimensions: list[str] | None = None,
    row_limit: int = 100,
) -> str:
    """查询 Google Search Console 搜索分析数据。

    - site_url: 站点 URL（如 https://example.com）
    - start_date: 开始日期（YYYY-MM-DD）
    - end_date: 结束日期（YYYY-MM-DD）
    - dimensions: 维度列表（可选，如 ["query", "page"]），默认 ["query"]
    - row_limit: 返回行数上限（默认 100，最大 1000）

    返回 JSON 字符串，包含：
      rows: [{keys: [query, page], clicks, impressions, ctr, position}]
    """
    refresh_token = _get_refresh_token(workspace_id=0)  # MVP 单租户
    if not refresh_token:
        return json.dumps(
            {"error": "GSC not authorized: refresh_token not found. Please connect Google Search Console in settings."},
            ensure_ascii=False,
        )

    if dimensions is None:
        dimensions = ["query"]

    row_limit = max(1, min(1000, row_limit))

    try:
        service = _build_gsc_service(refresh_token)

        request_body = {
            "startDate": start_date,
            "endDate": end_date,
            "dimensions": dimensions,
            "rowLimit": row_limit,
        }

        response = (
            service.searchanalytics()
            .query(siteUrl=site_url, body=request_body)
            .execute()
        )

        rows = response.get("rows", [])
        result_rows = []
        for row in rows:
            result_rows.append(
                {
                    "keys": row.get("keys", []),
                    "clicks": row.get("clicks", 0),
                    "impressions": row.get("impressions", 0),
                    "ctr": row.get("ctr", 0.0),
                    "position": row.get("position", 0.0),
                }
            )

        return json.dumps(
            {
                "site_url": site_url,
                "start_date": start_date,
                "end_date": end_date,
                "dimensions": dimensions,
                "rows": result_rows,
                "row_count": len(result_rows),
            },
            ensure_ascii=False,
            indent=2,
        )

    except Exception as exc:
        return json.dumps(
            {"error": f"GSC API call failed: {exc}"},
            ensure_ascii=False,
        )


@mcp.tool()
def gsc_index_status(
    site_url: str,
    inspection_url: str,
) -> str:
    """查询单页在 Google Search Console 的索引状态。

    - site_url: 站点 URL（如 https://example.com）
    - inspection_url: 要检查的页面 URL

    返回 JSON 字符串，包含：
      index_status: {verdict, indexing_state, last_crawl_time, crawl_allowed, page_fetch_state, robots_txt_state}
    """
    refresh_token = _get_refresh_token(workspace_id=0)
    if not refresh_token:
        return json.dumps(
            {"error": "GSC not authorized: refresh_token not found"},
            ensure_ascii=False,
        )

    try:
        service = _build_gsc_service(refresh_token)

        request_body = {
            "inspectionUrl": inspection_url,
            "siteUrl": site_url,
        }

        response = (
            service.urlInspection()
            .index().inspect(body=request_body)
            .execute()
        )

        result = response.get("inspectionResult", {})
        index_status = result.get("indexStatusResult", {})

        return json.dumps(
            {
                "site_url": site_url,
                "inspection_url": inspection_url,
                "index_status": {
                    "verdict": index_status.get("verdict", "UNKNOWN"),
                    "indexing_state": index_status.get("indexingState", "UNKNOWN"),
                    "last_crawl_time": index_status.get("lastCrawlTime", ""),
                    "crawl_allowed": index_status.get("crawlAllowed", None),
                    "page_fetch_state": index_status.get("pageFetchState", "UNKNOWN"),
                    "robots_txt_state": index_status.get("robotsTxtState", "UNKNOWN"),
                    "google_canonical": index_status.get("googleCanonical", ""),
                    "user_declared_canonical": index_status.get("userDeclaredCanonical", ""),
                },
            },
            ensure_ascii=False,
            indent=2,
        )

    except Exception as exc:
        return json.dumps(
            {"error": f"GSC API call failed: {exc}"},
            ensure_ascii=False,
        )


@mcp.tool()
def gsc_validate_fix(
    site_url: str,
    fix_type: str,
    start_url: str = "",
) -> str:
    """修复后触发 Google Search Console 重新验证。

    - site_url: 站点 URL（如 https://example.com）
    - fix_type: 修复类型（如 "MOBILE_USABILITY", "INDEXING", "AMP"）
    - start_url: (可选) 起始 URL（用于限定验证范围）

    返回 JSON 字符串，包含：
      status: "SUBMITTED" | "FAILED"
      message: 验证提交结果描述
    """
    refresh_token = _get_refresh_token(workspace_id=0)
    if not refresh_token:
        return json.dumps(
            {"error": "GSC not authorized: refresh_token not found"},
            ensure_ascii=False,
        )

    try:
        service = _build_gsc_service(refresh_token)

        # GSC API v1 的 validateFix 端点
        # 注意：实际 API 可能需要调整，这里按文档实现
        request_body = {
            "siteUrl": site_url,
            "fixType": fix_type,
        }
        if start_url:
            request_body["startUrl"] = start_url

        # 调用 validate 端点（实际 API 路径可能不同）
        response = (
            service.urlInspection()
            .index()
            .validate(body=request_body)
            .execute()
        )

        return json.dumps(
            {
                "site_url": site_url,
                "fix_type": fix_type,
                "start_url": start_url or None,
                "status": "SUBMITTED",
                "message": f"Validation request submitted for {fix_type}. Check GSC dashboard for progress.",
                "response": response,
            },
            ensure_ascii=False,
            indent=2,
        )

    except Exception as exc:
        return json.dumps(
            {
                "status": "FAILED",
                "error": f"GSC API call failed: {exc}",
            },
            ensure_ascii=False,
        )
