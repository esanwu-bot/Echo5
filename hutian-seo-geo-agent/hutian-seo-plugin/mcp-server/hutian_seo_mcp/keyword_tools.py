"""关键词拓词工具（T15.4）。

提供 MCP 工具 `keyword_research`，给定种子词挖出相关关键词表（含搜索量、竞争度、CPC）。

数据源优先级：
  1. DataForSEO API（推荐，$0.001/次，提供完整数据：搜索量/竞争度/CPC）
  2. Serper.dev related searches（降级，无搜索量数据，仅相关词列表）

工程纪律：
  - Fail-closed：DATAFORSEO_LOGIN/PASSWORD 或 SERPER_API_KEY 均未配置时返回错误
  - 结构化输出：返回 JSON 字符串
  - 配额管理：新增 meter_kind `keyword_research_queries`，接 QuotaEnforce
  - 超时：DataForSEO/Serper timeout=30

依赖：requests（见 pyproject.toml）。
"""

from __future__ import annotations

import json
import os
from typing import Any

import requests
from mcp.server.fastmcp import FastMCP

# 复用 tools.py 的 FastMCP 实例
from .tools import mcp

# DataForSEO API 端点
_DATAFORSEO_KEYWORDS_ENDPOINT = "https://api.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live"
_DATAFORSEO_TIMEOUT = 30.0

# Serper.dev 端点（降级方案）
_SERPER_KEYWORDS_ENDPOINT = "https://google.serper.dev/related"
_SERPER_TIMEOUT = 30.0


def _dataforseo_keyword_research(
    seed_keywords: list[str],
    gl: str,
    hl: str,
    max_results: int,
) -> tuple[list[dict] | None, str | None]:
    """调用 DataForSEO API 获取关键词数据（含搜索量/竞争度/CPC）。

    返回 (keywords, error)。keywords 为 None 表示失败。
    """
    login = os.environ.get("DATAFORSEO_LOGIN", "").strip()
    password = os.environ.get("DATAFORSEO_PASSWORD", "").strip()

    if not login or not password:
        return None, "DATAFORSEO_LOGIN/PASSWORD not set"

    # DataForSEO 请求体
    payload = [
        {
            "keywords": seed_keywords,
            "location_name": _get_location_name(gl),
            "language_name": _get_language_name(hl),
            "sort_by": "relevance",
            "limit": max_results,
        }
    ]

    headers = {
        "Authorization": f"Basic {_basic_auth(login, password)}",
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(
            _DATAFORSEO_KEYWORDS_ENDPOINT,
            headers=headers,
            json=payload,
            timeout=_DATAFORSEO_TIMEOUT,
        )
    except requests.exceptions.RequestException as exc:
        return None, f"DataForSEO request failed: {exc}"

    if resp.status_code != 200:
        snippet = (resp.text or "")[:300]
        return None, f"DataForSEO HTTP {resp.status_code}: {snippet}"

    try:
        data = resp.json()
    except (ValueError, json.JSONDecodeError) as exc:
        return None, f"DataForSEO invalid JSON: {exc}"

    # 解析响应
    tasks = data.get("tasks", [])
    if not tasks:
        return None, "DataForSEO: no tasks in response"

    task = tasks[0]
    if task.get("status_code") != 20000:
        return None, f"DataForSEO task failed: {task.get('status_message', 'unknown error')}"

    results = task.get("result", [])
    if not results:
        return [], None

    keywords_data = results[0].get("items", [])
    keywords: list[dict] = []

    for item in keywords_data[:max_results]:
        keywords.append(
            {
                "keyword": item.get("keyword", ""),
                "search_volume": item.get("search_volume", 0),
                "competition": item.get("competition", ""),  # "LOW" / "MEDIUM" / "HIGH"
                "cpc": item.get("cpc", 0.0),  # USD
                "monthly_searches": item.get("monthly_searches", []),  # 历史搜索量
            }
        )

    return keywords, None


def _serper_related_searches(
    seed_keywords: list[str],
    gl: str,
    max_results: int,
) -> tuple[list[dict] | None, str | None]:
    """调用 Serper.dev 获取相关搜索建议（降级方案，无搜索量数据）。

    返回 (keywords, error)。keywords 为 None 表示失败。
    """
    api_key = os.environ.get("SERPER_API_KEY", "").strip()
    if not api_key:
        return None, "SERPER_API_KEY not set"

    # 对每个种子词调用 related searches
    all_keywords: list[dict] = []
    seen = set()

    for seed in seed_keywords:
        payload = {"q": seed, "gl": gl}
        headers = {
            "X-API-KEY": api_key,
            "Content-Type": "application/json",
        }

        try:
            resp = requests.post(
                _SERPER_KEYWORDS_ENDPOINT,
                headers=headers,
                json=payload,
                timeout=_SERPER_TIMEOUT,
            )
        except requests.exceptions.RequestException as exc:
            return None, f"Serper request failed: {exc}"

        if resp.status_code != 200:
            snippet = (resp.text or "")[:300]
            return None, f"Serper HTTP {resp.status_code}: {snippet}"

        try:
            data = resp.json()
        except (ValueError, json.JSONDecodeError) as exc:
            return None, f"Serper invalid JSON: {exc}"

        # 提取 related searches
        related = data.get("relatedSearches", [])
        for item in related:
            query = item.get("query", "")
            if query and query not in seen:
                seen.add(query)
                all_keywords.append(
                    {
                        "keyword": query,
                        "search_volume": None,  # Serper 不提供搜索量
                        "competition": None,
                        "cpc": None,
                        "monthly_searches": None,
                    }
                )

            if len(all_keywords) >= max_results:
                break

    return all_keywords[:max_results], None


def _basic_auth(login: str, password: str) -> str:
    """生成 Basic Auth 头。"""
    import base64
    credentials = f"{login}:{password}"
    return base64.b64encode(credentials.encode()).decode()


def _get_location_name(gl: str) -> str:
    """将国家代码转换为 DataForSEO location_name。"""
    location_map = {
        "us": "United States",
        "cn": "China",
        "gb": "United Kingdom",
        "de": "Germany",
        "fr": "France",
        "jp": "Japan",
        "kr": "South Korea",
        "in": "India",
        "br": "Brazil",
        "au": "Australia",
        "ca": "Canada",
    }
    return location_map.get(gl.lower(), "United States")


def _get_language_name(hl: str) -> str:
    """将语言代码转换为 DataForSEO language_name。"""
    language_map = {
        "en": "English",
        "zh": "Chinese",
        "es": "Spanish",
        "de": "German",
        "fr": "French",
        "ja": "Japanese",
        "ko": "Korean",
        "pt": "Portuguese",
        "ru": "Russian",
        "ar": "Arabic",
    }
    return language_map.get(hl.lower(), "English")


@mcp.tool()
def keyword_research(
    seed_keywords: list[str],
    gl: str = "us",
    hl: str = "en",
    max_results: int = 50,
) -> str:
    """给定种子词，挖出相关关键词表（含搜索量、竞争度、CPC）。

    - seed_keywords: 种子词列表（如 ["electric tricycle", "e-bike"]）
    - gl: 国家/地区代码（如 "us", "cn", "gb"）
    - hl: 语言代码（如 "en", "zh", "es"）
    - max_results: 最大返回数（默认 50，最大 1000）

    返回 JSON 字符串，包含：
      keywords: [{keyword, search_volume, competition, cpc, monthly_searches}]
      source: "dataforseo" | "serper"（标识数据来源）
      note: 如果来自 Serper，提示无搜索量数据

    数据源优先级：
      1. DataForSEO API（推荐，需配置 DATAFORSEO_LOGIN/PASSWORD）
      2. Serper.dev related searches（降级，无搜索量数据）
    """
    if not seed_keywords:
        return json.dumps(
            {"error": "seed_keywords is required and cannot be empty"},
            ensure_ascii=False,
        )

    max_results = max(1, min(1000, max_results))

    # 优先尝试 DataForSEO
    keywords, error = _dataforseo_keyword_research(
        seed_keywords=seed_keywords,
        gl=gl,
        hl=hl,
        max_results=max_results,
    )

    if keywords is not None:
        return json.dumps(
            {
                "seed_keywords": seed_keywords,
                "gl": gl,
                "hl": hl,
                "keywords": keywords,
                "keyword_count": len(keywords),
                "source": "dataforseo",
                "note": "Data from DataForSEO API. Search volume is estimated monthly average.",
            },
            ensure_ascii=False,
            indent=2,
        )

    # DataForSEO 失败，降级到 Serper
    dataforseo_error = error
    keywords, error = _serper_related_searches(
        seed_keywords=seed_keywords,
        gl=gl,
        max_results=max_results,
    )

    if keywords is not None:
        return json.dumps(
            {
                "seed_keywords": seed_keywords,
                "gl": gl,
                "hl": hl,
                "keywords": keywords,
                "keyword_count": len(keywords),
                "source": "serper",
                "note": "Data from Serper.dev related searches. Search volume/competition/CPC not available. Configure DATAFORSEO_LOGIN/PASSWORD for complete data.",
                "dataforseo_error": dataforseo_error,
            },
            ensure_ascii=False,
            indent=2,
        )

    # 两个数据源都失败
    return json.dumps(
        {
            "error": "Keyword research failed",
            "dataforseo_error": dataforseo_error,
            "serper_error": error,
            "hint": "Configure DATAFORSEO_LOGIN/PASSWORD or SERPER_API_KEY",
        },
        ensure_ascii=False,
    )
