"""SERP 抓取 + 内容差距分析 (Content Gap Analysis)，基于 Serper.dev / OpenSERP。

新增 MCP 工具 `analyze_content_gap`，执行六阶段管道：
  阶段 1-2 · Search  : Serper.dev（优先，自带高质量代理）→ OpenSERP（回退）
  阶段 3   · Fetch   : httpx 并发抓取竞争者页面 → BeautifulSoup 提纯 → markdownify 转 Markdown
  阶段 4-6 · Analyze : 高频主题 / H2-H3 结构 / 问答覆盖 → 差距矩阵 + 编辑简报

工程纪律（与 tools.py 一致）：
  - Fail-closed : SERPER_API_KEY 与 OPENSERP_* 均未配置时直接返回错误
  - 超时        : Serper/OpenSERP timeout=30；httpx fetch timeout=15
  - 并发抓取    : ThreadPoolExecutor 并发请求多个竞争者 URL
  - 结构化输出  : 返回 JSON 字符串，errors 与 issues 两级模型

依赖：requests / httpx / beautifulsoup4 / markdownify / openserp（见 pyproject.toml）。
"""

from __future__ import annotations

import json
import os
import re
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

import httpx
import requests
from bs4 import BeautifulSoup
from markdownify import markdownify as html_to_md
from mcp.server.fastmcp import FastMCP

# 复用 tools.py 的 FastMCP 实例，确保 @mcp.tool() 注册到同一 server
from .tools import mcp

# Serper.dev 端点与超时
_SERPER_ENDPOINT = "https://google.serper.dev/search"
_SERPER_TIMEOUT = 30.0
# OpenSERP 客户端超时（秒）
_OPENSERP_TIMEOUT = 30.0
# 竞争者页面抓取超时（秒）
_FETCH_TIMEOUT = 15.0

# 抓取时伪装的 User-Agent
_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

# 英文停用词（启发式词频统计用，MVP 不引入 NLTK 依赖）
_EN_STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "can", "this", "that", "these",
    "those", "it", "its", "as", "if", "then", "than", "so", "not", "no",
    "yes", "also", "more", "most", "some", "any", "all", "each", "every",
    "other", "such", "only", "own", "same", "too", "very", "just", "about",
    "up", "out", "into", "over", "after", "before", "between", "through",
    "during", "without", "within", "along", "across", "behind", "below",
    "above", "under", "again", "further", "once", "here", "there", "when",
    "where", "why", "how", "what", "which", "who", "whom", "whose",
    "you", "your", "yours", "we", "our", "ours", "they", "their", "theirs",
    "he", "him", "his", "she", "her", "hers", "i", "me", "my", "mine",
    "us", "them", "get", "got", "make", "made", "like", "use", "using",
    "used", "one", "two", "three", "new", "way", "time", "well", "back",
    "even", "still", "much", "many", "few", "first", "last", "next", "now",
    "today", "site", "page", "read", "info", "click", "home", "see", "find",
    "know", "take", "come", "go", "give", "good", "great", "best", "top",
}


def _build_openserp_client():
    """根据环境变量构造 OpenSERP 客户端。

    优先级：self-hosted (OPENSERP_BASE_URL) > cloud (OPENSERP_API_KEY)。
    两者均未配置返回 None。
    """
    base_url = os.environ.get("OPENSERP_BASE_URL", "").strip()
    api_key = os.environ.get("OPENSERP_API_KEY", "").strip()

    if base_url:
        from openserp import OpenSERP

        return OpenSERP(base_url=base_url, timeout=_OPENSERP_TIMEOUT)
    if api_key:
        from openserp import OpenSERP

        return OpenSERP(api_key=api_key, timeout=_OPENSERP_TIMEOUT)
    return None


def _serper_search(
    keyword: str, gl: str, num: int
) -> tuple[list[dict] | None, str | None]:
    """阶段 1-2（优先）：调用 Serper.dev 抓取 Google SERP。

    返回 (results, error)。results 为 None 表示失败，error 为错误描述。
    Serper.dev 自带高质量代理，无 reCAPTCHA 烦恼，MVP 阶段最稳定。
    """
    api_key = os.environ.get("SERPER_API_KEY", "").strip()
    if not api_key:
        return None, "SERPER_API_KEY not set"

    payload = {"q": keyword, "gl": gl, "num": num}
    headers = {
        "X-API-KEY": api_key,
        "Content-Type": "application/json",
    }
    try:
        resp = requests.post(
            _SERPER_ENDPOINT,
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

    organic = data.get("organic", [])
    if not isinstance(organic, list):
        return None, "Serper: organic is not a list"

    results: list[dict] = []
    for item in organic[:num]:
        if not isinstance(item, dict):
            continue
        results.append(
            {
                "position": item.get("position"),
                "title": item.get("title", ""),
                "link": item.get("link") or item.get("url", ""),
                "snippet": item.get("snippet", ""),
            }
        )
    return results, None


def _search_serp(
    keyword: str, engine: str, gl: str, num: int
) -> tuple[list[dict], list[str]]:
    """阶段 1-2：SERP 抓取，优先 Serper.dev，回退 OpenSERP（仅自托管模式）。

    回退规则：OpenSERP 仅在 OPENSERP_BASE_URL 配置时才启用；
    否则 Serper 失败后直接返回错误，不静默降级。

    top_results 每项含 position / title / link / snippet。
    """
    issues: list[str] = []

    # ── 优先：Serper.dev（仅 Google，自带代理稳定） ──
    if engine == "google":
        results, err = _serper_search(keyword, gl, num)
        if err:
            issues.append(f"Serper.dev failed: {err}")
        elif results:
            return results, issues
        # Serper 返回空但无错误，继续尝试 OpenSERP（若配置了自托管）

    # ── 回退：OpenSERP 自托管（仅当 OPENSERP_BASE_URL 配置时） ──
    openserp_base = os.environ.get("OPENSERP_BASE_URL", "").strip()
    if not openserp_base:
        if not issues:
            issues.append(
                "No SERP provider available: Serper.dev failed and "
                "OPENSERP_BASE_URL not configured"
            )
        return [], issues

    client = _build_openserp_client()
    if client is None:
        issues.append("OpenSERP client construction failed")
        return [], issues

    try:
        response = client.search(
            engine=engine, text=keyword, limit=num, region=gl.upper()
        )
    except Exception as exc:  # noqa: BLE001  捕获所有 OpenSERP 异常
        issues.append(f"OpenSERP search failed: {exc}")
        return [], issues

    # response 可能是 SearchEnvelope 对象或 str（错误时）
    if isinstance(response, str):
        issues.append(f"OpenSERP returned error: {response[:300]}")
        return [], issues

    results: list[dict] = []
    raw_results = getattr(response, "results", []) or []
    for item in raw_results[:num]:
        results.append(
            {
                "position": getattr(item, "position", None)
                or getattr(item, "rank", None),
                "title": getattr(item, "title", "") or "",
                "link": getattr(item, "url", "") or "",
                "snippet": getattr(item, "snippet", "") or "",
            }
        )
    return results, issues


# ─────────────────────────────────────────────────────────────────────
# 阶段 3 · 竞争者页面抓取（httpx + BeautifulSoup + markdownify）
# ─────────────────────────────────────────────────────────────────────

# 需要剔除的干扰标签
_STRIP_TAGS = ["nav", "footer", "header", "aside", "script", "style",
               "noscript", "iframe", "form", "button"]


def _extract_main_html(html: str) -> str:
    """从 HTML 中提纯核心内容区域，剔除导航/页脚/脚本等干扰。

    优先取 <main> 或 <article>，其次 <body>。
    """
    soup = BeautifulSoup(html, "html.parser")

    # 剔除干扰标签
    for tag in soup(_STRIP_TAGS):
        tag.decompose()

    # 优先 main > article > body
    main = soup.find("main") or soup.find("article") or soup.find("body")
    if main is None:
        return str(soup)
    return str(main)


def _fetch_markdown(url: str) -> tuple[str | None, str | None]:
    """阶段 3：抓取单 URL 并转换为 Markdown。

    返回 (markdown_content, error)。
    """
    if not url:
        return None, "empty url"
    try:
        with httpx.Client(
            headers={"User-Agent": _UA}, timeout=_FETCH_TIMEOUT, follow_redirects=True
        ) as client:
            resp = client.get(url)
    except httpx.HTTPError as exc:
        return None, f"fetch failed: {exc}"

    if resp.status_code != 200:
        if resp.status_code == 403:
            return None, "HTTP 403 Forbidden (site blocked scraping, skipped)"
        return None, f"HTTP {resp.status_code}"

    main_html = _extract_main_html(resp.text)
    md = html_to_md(main_html, heading_style="ATX")
    # 清理过多空行
    md = re.sub(r"\n{3,}", "\n\n", md).strip()
    if not md:
        return None, "empty content after extraction"
    return md, None


def _fetch_competitors(urls: list[str], max_workers: int = 5) -> dict[str, dict]:
    """阶段 3 并发：ThreadPoolExecutor 抓取多个竞争者 URL。

    返回 {url: {markdown, error}}，失败的条目 error 非空。
    """
    results: dict[str, dict] = {}
    if not urls:
        return results
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        future_map = {pool.submit(_fetch_markdown, url): url for url in urls}
        for fut in as_completed(future_map):
            url = future_map[fut]
            try:
                md, err = fut.result()
            except Exception as exc:  # noqa: BLE001  并发任务兜底
                md, err = None, f"unexpected error: {exc}"
            results[url] = {"markdown": md, "error": err}
    return results


# ─────────────────────────────────────────────────────────────────────
# 阶段 4-6 · 启发式内容差距分析（MVP，不依赖 LLM）
# ─────────────────────────────────────────────────────────────────────

_HEADING_RE = re.compile(r"^(#{2,6})\s+(.+?)\s*$", re.MULTILINE)


def _extract_headings(md: str) -> list[dict]:
    """从 markdown 提取 H2-H6 标题，返回 [{level, text}]。"""
    headings: list[dict] = []
    for m in _HEADING_RE.finditer(md or ""):
        level = len(m.group(1))
        text = m.group(2).strip()
        if text:
            headings.append({"level": level, "text": text})
    return headings


def _extract_questions(md: str) -> list[str]:
    """提取 markdown 中的问句（含 ? / ？的句子，长度 8-200）。"""
    if not md:
        return []
    sentences = re.split(r"(?<=[.!?。！？])\s+", md)
    questions = [
        s.strip()
        for s in sentences
        if re.search(r"[?？]", s) and 8 <= len(s.strip()) <= 200
    ]
    return questions[:20]


def _top_keywords(md: str, top_n: int = 15) -> list[tuple[str, int]]:
    """词频统计：去停用词、去纯数字、长度>=3，返回 top_n (word, count)。"""
    if not md:
        return []
    words = re.findall(r"[a-zA-Z]{3,}", md.lower())
    filtered = [w for w in words if w not in _EN_STOPWORDS]
    return Counter(filtered).most_common(top_n)


def _analyze_gap(competitors: list[dict], my_markdown: str | None) -> dict[str, Any]:
    """阶段 4-6：对比竞争者内容，生成差距矩阵与编辑简报。

    competitors: [{url, title, position, markdown, error}]
    my_markdown: 目标页面 markdown（可选，用于计算缺失主题）
    """
    valid = [c for c in competitors if c.get("markdown") and not c.get("error")]

    all_headings: list[str] = []
    all_questions: list[str] = []
    keyword_counter: Counter = Counter()
    per_competitor: list[dict] = []

    for c in valid:
        md = c["markdown"]
        headings = _extract_headings(md)
        questions = _extract_questions(md)
        kw = _top_keywords(md, top_n=20)
        all_headings.extend(h["text"] for h in headings)
        all_questions.extend(questions)
        for w, n in kw:
            keyword_counter[w] += 1
        per_competitor.append(
            {
                "url": c["url"],
                "title": c.get("title", ""),
                "position": c.get("position"),
                "heading_count": len(headings),
                "top_headings": [h["text"] for h in headings[:8]],
                "word_count": len(re.findall(r"\w+", md)),
            }
        )

    # 高频主题（出现在 >= 2 个竞争者中的词）
    common_topics = [
        {"keyword": w, "coverage": n}
        for w, n in keyword_counter.most_common(30)
        if n >= 2
    ][:20]

    # 高频问题（去重后按出现次数排序）
    q_counter = Counter(q.strip().rstrip("?？").lower() for q in all_questions)
    top_questions = [
        {"question": q, "mentions": n} for q, n in q_counter.most_common(10)
    ]

    # 高频标题模式（H2 聚合，取出现 >= 2 次的关键词）
    h_counter = Counter(
        w
        for h in all_headings
        for w in re.findall(r"[a-zA-Z]{4,}", h.lower())
        if w not in _EN_STOPWORDS
    )
    heading_themes = [
        {"theme": w, "mentions": n} for w, n in h_counter.most_common(15) if n >= 2
    ]

    # 目标页面差距（若提供了 my_url 的 markdown）
    missing_topics: list[str] = []
    if my_markdown:
        my_words = set(w for w, _ in _top_keywords(my_markdown, top_n=50))
        missing_topics = [
            t["keyword"] for t in common_topics if t["keyword"] not in my_words
        ][:15]
    else:
        # 无目标页面时，把所有高频主题作为"建议覆盖"
        missing_topics = [t["keyword"] for t in common_topics[:15]]

    brief = _build_editorial_brief(
        valid_count=len(valid),
        common_topics=common_topics,
        top_questions=top_questions,
        heading_themes=heading_themes,
        missing_topics=missing_topics,
        has_my_page=bool(my_markdown),
    )

    return {
        "competitors_analyzed": len(valid),
        "competitors_failed": len(competitors) - len(valid),
        "per_competitor": per_competitor,
        "gap_matrix": {
            "common_topics": common_topics,
            "top_questions": top_questions,
            "heading_themes": heading_themes,
        },
        "missing_topics_for_my_page": missing_topics,
        "editorial_brief": brief,
    }


def _build_editorial_brief(
    valid_count: int,
    common_topics: list[dict],
    top_questions: list[dict],
    heading_themes: list[dict],
    missing_topics: list[str],
    has_my_page: bool,
) -> dict[str, Any]:
    """生成编辑简报：内容差距矩阵 + 可执行建议。"""
    if valid_count == 0:
        return {
            "summary": "无有效竞争者内容可供分析（所有抓取均失败）。",
            "recommendations": [
                "检查目标关键词的 SERP 是否有可抓取结果",
                "确认 OPENSERP_BASE_URL 或 OPENSERP_API_KEY 已配置",
            ],
        }

    recs: list[str] = []

    if missing_topics:
        recs.append(
            "在目标页面中补充以下高频主题（竞争者普遍覆盖但你可能缺失）："
            + ", ".join(missing_topics[:8])
        )

    if top_questions:
        recs.append(
            "新增 FAQ 区块，直接回答竞争者高频问题："
            + "; ".join(q["question"] for q in top_questions[:5])
        )

    if heading_themes:
        recs.append(
            "按竞争者高频 H2 主题组织正文结构："
            + " → ".join(t["theme"] for t in heading_themes[:6])
        )

    if not has_my_page:
        recs.append(
            "未提供目标页面（my_url），上述缺失主题为竞争者共性覆盖建议，"
            "可作为新页面的内容骨架。"
        )

    recs.append(
        "建议页面字数不低于竞争者平均水平，并覆盖 H2/H3 层级结构以利于生成式引擎解析。"
    )

    return {
        "summary": (
            f"分析了 {valid_count} 个竞争页面。"
            f"识别出 {len(common_topics)} 个高频主题、"
            f"{len(top_questions)} 个高频问题、"
            f"{len(heading_themes)} 个高频 H2 主题。"
        ),
        "recommendations": recs,
        "priority_topics": common_topics[:10],
    }


@mcp.tool()
def analyze_content_gap(
    keyword: str,
    my_url: str = "",
    engine: str = "google",
    gl: str = "us",
    num_results: int = 5,
) -> str:
    """执行 SERP 抓取与内容差距分析 (基于 OpenSERP)。

    通过开源 OpenSERP 抓取目标关键词的 SERP，并发获取顶部竞争者页面内容，
    然后基于高频主题 / H2-H3 结构 / 问答覆盖生成内容差距矩阵与编辑简报。

    - keyword: 目标搜索关键词
    - my_url: (可选) 你的页面 URL。若在 SERP 中出现则排除在竞争者之外，
              并额外抓取该页面用于计算"缺失主题"。
    - engine: 搜索引擎 (google, bing, yandex, baidu, duckduckgo, ecosia)
    - gl: 国家/地区代码 (如 us, uk, cn)，默认 "us"
    - num_results: 分析的顶部结果数量，默认 5，最大 10

    返回 JSON 字符串，包含：
      serp_results          : 搜索结果（position/title/link/snippet）
      competitor_analysis   : 每个竞争者的抓取结果与结构指标
      content_gap_brief     : 差距矩阵（高频主题/问题/H2主题）+ 编辑简报 + 缺失主题
    """
    t0 = time.time()

    # --- 参数校验 ---
    if not keyword or not keyword.strip():
        return json.dumps({"error": "keyword is required"}, ensure_ascii=False, indent=2)
    num_results = max(1, min(10, int(num_results)))
    valid_engines = {"google", "bing", "yandex", "baidu", "duckduckgo", "ecosia"}
    if engine not in valid_engines:
        return json.dumps(
            {"error": f"invalid engine '{engine}', must be one of {sorted(valid_engines)}"},
            ensure_ascii=False,
            indent=2,
        )

    # --- Fail-closed: SERP 提供商配置检查 ---
    # Serper（SERPER_API_KEY）或 OpenSERP 自托管（OPENSERP_BASE_URL）任一即可
    has_serper = bool(os.environ.get("SERPER_API_KEY", "").strip())
    has_openserp_selfhost = bool(os.environ.get("OPENSERP_BASE_URL", "").strip())
    if not has_serper and not has_openserp_selfhost:
        return json.dumps(
            {
                "error": (
                    "No SERP provider configured: set SERPER_API_KEY "
                    "or OPENSERP_BASE_URL (self-hosted)"
                )
            },
            ensure_ascii=False,
            indent=2,
        )

    issues: list[str] = []

    # --- 阶段 1-2: SERP 搜索 ---
    serp, serp_issues = _search_serp(keyword.strip(), engine, gl, num_results)
    issues.extend(serp_issues)
    if not serp:
        return json.dumps(
            {
                "keyword": keyword,
                "engine": engine,
                "gl": gl,
                "serp_results": [],
                "competitor_analysis": [],
                "content_gap_brief": None,
                "issues": issues or ["no SERP results returned"],
                "duration_ms": round((time.time() - t0) * 1000),
            },
            ensure_ascii=False,
            indent=2,
        )

    # --- 阶段 3: 排除 my_url，抓取竞争者 ---
    my_url_norm = (my_url or "").strip().rstrip("/")
    competitor_urls: list[str] = []
    my_in_serp = False
    for r in serp:
        link = (r.get("link") or "").strip().rstrip("/")
        if not link:
            continue
        if my_url_norm and link == my_url_norm:
            my_in_serp = True
            continue
        competitor_urls.append(link)

    # 去重保序
    seen: set[str] = set()
    unique_urls: list[str] = []
    for u in competitor_urls:
        if u not in seen:
            seen.add(u)
            unique_urls.append(u)

    # 并发抓取竞争者
    fetched = _fetch_competitors(unique_urls)

    competitor_analysis: list[dict] = []
    for r in serp:
        link = (r.get("link") or "").strip().rstrip("/")
        if not link:
            continue
        fetch = fetched.get(link, {})
        fetch_error = fetch.get("error")
        is_403 = bool(fetch_error and "403" in str(fetch_error))
        competitor_analysis.append(
            {
                "position": r.get("position"),
                "title": r.get("title", ""),
                "url": link,
                "snippet": r.get("snippet", ""),
                "fetched_ok": fetch_error is None
                and fetch.get("markdown") is not None,
                "fetch_failed": fetch_error is not None,
                "fetch_blocked_403": is_403,
                "error": fetch_error,
                "markdown_length": len(fetch.get("markdown") or ""),
            }
        )

    # --- 可选：抓取 my_url 用于差距计算 ---
    my_markdown: str | None = None
    my_fetch_error: str | None = None
    if my_url_norm:
        md, err = _fetch_markdown(my_url_norm)
        if err:
            my_fetch_error = err
            issues.append(f"my_url fetch failed: {err}")
        else:
            my_markdown = md

    # --- 阶段 4-6: 内容差距分析 ---
    valid_competitors = [
        {
            "url": c["url"],
            "title": c["title"],
            "position": c["position"],
            "markdown": fetched.get(c["url"], {}).get("markdown"),
            "error": c.get("error"),
        }
        for c in competitor_analysis
        if c["fetched_ok"]
    ]

    analysis = _analyze_gap(valid_competitors, my_markdown)

    result = {
        "keyword": keyword,
        "engine": engine,
        "gl": gl,
        "num_results": num_results,
        "my_url": my_url_norm or None,
        "my_url_in_serp": my_in_serp,
        "my_url_fetch_error": my_fetch_error,
        "serp_results": serp,
        "competitor_analysis": competitor_analysis,
        "content_gap_brief": analysis,
        "issues": issues,
        "duration_ms": round((time.time() - t0) * 1000),
    }
    return json.dumps(result, ensure_ascii=False, indent=2)
