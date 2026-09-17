"""内容日历规划工具（T15.5）。

提供 MCP 工具 `content_calendar_plan`，把关键词表 + content gap 映射成内容日历（文章清单）。

工程纪律：
  - 纯 LLM 编排：不依赖外部 API，用 LLM 生成文章计划
  - 结构化输出：返回 JSON 字符串，含 articles[] 数组
  - 输入校验：keywords 和 content_gap 至少提供一个
  - 配额管理：新增 meter_kind `content_calendar_plans`，接 QuotaEnforce

依赖：无额外依赖（纯 LLM 编排）。
"""

from __future__ import annotations

import json
import os
from typing import Any

from mcp.server.fastmcp import FastMCP

# 复用 tools.py 的 FastMCP 实例
from .tools import mcp

# 配额管理
from .crawl_tools import QuotaEnforce


def _call_llm(prompt: str) -> str:
    """调用 LLM 生成内容日历。

    复用 tools.py 的 LLM 调用逻辑（SenseNova / OpenAI 兼容）。
    """
    # 从环境变量获取 LLM 配置
    api_key = os.environ.get("LLM_API_KEY", "").strip()
    base_url = os.environ.get("LLM_BASE_URL", "https://api.sensenova.ai/v1").strip()
    model = os.environ.get("LLM_MODEL", "SenseNova-V6-Pro").strip()

    if not api_key:
        raise ValueError("LLM_API_KEY not set")

    import requests

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "你是一个 SEO 内容策划专家。根据用户提供的关键词和内容差距分析，生成一份内容日历（文章清单）。每篇文章包含标题、目标关键词、摘要、预计字数。输出 JSON 格式。",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        "temperature": 0.7,
        "max_tokens": 4000,
    }

    resp = requests.post(
        f"{base_url}/chat/completions",
        headers=headers,
        json=payload,
        timeout=60.0,
    )
    resp.raise_for_status()

    data = resp.json()
    return data["choices"][0]["message"]["content"]


def _parse_llm_response(response: str) -> list[dict]:
    """解析 LLM 返回的 JSON 内容。

    LLM 可能返回 markdown 代码块包裹的 JSON，需要提取。
    """
    # 尝试直接解析
    try:
        data = json.loads(response)
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and "articles" in data:
            return data["articles"]
    except json.JSONDecodeError:
        pass

    # 尝试提取 markdown 代码块
    import re
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", response)
    if match:
        try:
            data = json.loads(match.group(1))
            if isinstance(data, list):
                return data
            if isinstance(data, dict) and "articles" in data:
                return data["articles"]
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Failed to parse LLM response as JSON: {response[:200]}...")


@mcp.tool()
def content_calendar_plan(
    keywords: list[dict] | None = None,
    content_gap: dict | None = None,
    num_articles: int = 10,
    target_audience: str = "",
    industry: str = "",
) -> str:
    """根据关键词表和内容差距分析，生成内容日历（文章清单）。

    - keywords: 关键词列表（来自 keyword_research 工具），每项含 {keyword, search_volume, competition}
    - content_gap: 内容差距分析结果（来自 analyze_content_gap 工具）
    - num_articles: 要生成的文章数量（默认 10）
    - target_audience: 目标受众描述（可选）
    - industry: 行业描述（可选）

    返回 JSON 字符串，包含：
      articles: [{title, target_keyword, summary, estimated_word_count, priority}]
      total_articles: 文章总数
      strategy: 内容策略摘要

    输入校验：keywords 和 content_gap 至少提供一个。
    """
    # 输入校验
    if not keywords and not content_gap:
        return json.dumps(
            {"error": "At least one of 'keywords' or 'content_gap' must be provided"},
            ensure_ascii=False,
        )

    # 配额检查
    quota = QuotaEnforce.get()
    try:
        quota.reserve("content_calendar_plans", 1)
    except Exception as e:
        return json.dumps(
            {"error": f"Quota exceeded: {e}"},
            ensure_ascii=False,
        )

    # 构造 prompt
    prompt_parts = []

    if target_audience:
        prompt_parts.append(f"目标受众：{target_audience}")
    if industry:
        prompt_parts.append(f"行业：{industry}")

    if keywords:
        keyword_list = "\n".join(
            f"- {k.get('keyword', '')} (搜索量: {k.get('search_volume', 'N/A')}, 竞争度: {k.get('competition', 'N/A')})"
            for k in keywords[:20]  # 限制输入长度
        )
        prompt_parts.append(f"\n关键词列表：\n{keyword_list}")

    if content_gap:
        gap_summary = json.dumps(content_gap, ensure_ascii=False, indent=2)[:2000]  # 限制长度
        prompt_parts.append(f"\n内容差距分析：\n{gap_summary}")

    prompt_parts.append(f"\n请生成 {num_articles} 篇文章的内容计划。")

    prompt = "\n".join(prompt_parts)

    # 调用 LLM
    try:
        llm_response = _call_llm(prompt)
        articles = _parse_llm_response(llm_response)
    except Exception as e:
        return json.dumps(
            {"error": f"LLM call failed: {e}"},
            ensure_ascii=False,
        )

    # 构造响应
    return json.dumps(
        {
            "articles": articles,
            "total_articles": len(articles),
            "strategy": f"基于 {len(keywords or [])} 个关键词和 content gap 分析，生成 {len(articles)} 篇文章计划",
            "input_summary": {
                "keyword_count": len(keywords or []),
                "has_content_gap": content_gap is not None,
                "target_audience": target_audience or None,
                "industry": industry or None,
            },
        },
        ensure_ascii=False,
        indent=2,
    )
