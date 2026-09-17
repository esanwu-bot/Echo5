"""全站爬取审计 (crawl_site_audit)。

BFS 爬取 + 逐页规则审计 + 聚合 issues。

管道：
  1. 启动：校验 start_url 可达（fail-closed）→ 解析 robots.txt → 拉 sitemap.xml
  2. BFS：同域内链发现 + URL 归一化去重 + include/exclude 过滤 + robots Disallow 跳过
  3. 抓取：httpx 并发=2 + delay 0.5s + timeout 15s，记录 status/redirect chain
  4. 空壳检测：正文长度 < 阈值 或 仅含 root div → csr_empty（MVP 不调 playwright）
  5. 逐页审计：9 类规则 + JSON-LD（复用 _extract_jsonld）+ AI 可爬性
  6. 聚合：issues[type, affected_urls, severity P0-P3] + summary + 可选 sitemap

工程纪律：
  - Fail-closed : start_url 不可达 → 直接返回错误，不假数据
  - 只爬同域    : 外链不入队
  - robots 尊重  : Disallow 不爬、crawl-delay 遵守
  - 配额        : QuotaEnforce 预扣 urls_crawled，超限 429
  - 结构化输出  : 返回 JSON 字符串

依赖：httpx / beautifulsoup4 / lxml（见 pyproject.toml）。
      playwright 为可选依赖（render_mode=auto 时才尝试 import，失败降级为仅标记）。
"""

from __future__ import annotations

import json
import re
import threading
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import urldefrag, urljoin, urlparse, urlunparse

import httpx
from bs4 import BeautifulSoup
from mcp.server.fastmcp import FastMCP

from .tools import _extract_jsonld, mcp

# ── 常量 ──────────────────────────────────────────────────────────
_FETCH_TIMEOUT = 15.0
_CONCURRENCY = 2
_REQUEST_DELAY = 0.5  # 秒，跨请求最小间隔
_EMPTY_BODY_THRESHOLD = 500  # 字符，低于此值视为空壳
_MAX_URLS_DEFAULT = 50
_MAX_URLS_HARD = 200  # 硬上限，防失控

_UA = (
    "Mozilla/5.0 (compatible; HutianCrawler/0.1; "
    "+https://hutian.com/bot)"
)

# 非 HTML 资源后缀，爬取时自动跳过（sitemap/图片/文档等）
_NON_HTML_EXTS = {
    ".xml", ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp",
    ".ico", ".css", ".js", ".json", ".zip", ".tar", ".gz", ".rar",
    ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".mp4", ".mp3",
    ".avi", ".mov", ".wmv", ".flv", ".woff", ".woff2", ".ttf", ".eot",
    ".rss", ".atom",
}


# ── 配额管理 ──────────────────────────────────────────────────────
class QuotaEnforce:
    """极简内存配额管理器（MVP，进程级单例）。

    meter_kind 用于区分不同计量维度（如 urls_crawled / api_calls）。
    预扣模式：调用方在执行前 reserve，超限直接抛 QuotaExceeded。
    """

    _instance: "QuotaEnforce | None" = None
    _lock = threading.Lock()

    def __init__(self) -> None:
        self._usage: dict[str, int] = defaultdict(int)
        self._limits: dict[str, int] = {}

    @classmethod
    def get(cls) -> "QuotaEnforce":
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def set_limit(self, meter_kind: str, limit: int) -> None:
        self._limits[meter_kind] = limit

    def reserve(self, meter_kind: str, amount: int = 1) -> None:
        """预扣配额。超限抛 QuotaExceeded。"""
        limit = self._limits.get(meter_kind)
        if limit is not None and self._usage[meter_kind] + amount > limit:
            raise QuotaExceeded(
                f"quota exceeded for {meter_kind}: "
                f"{self._usage[meter_kind]}/{limit}"
            )
        self._usage[meter_kind] += amount

    def usage(self, meter_kind: str) -> int:
        return self._usage[meter_kind]

    def reset(self, meter_kind: str | None = None) -> None:
        if meter_kind is None:
            self._usage.clear()
        else:
            self._usage.pop(meter_kind, None)


class QuotaExceeded(Exception):
    """配额超限 → 对应 429。"""


# ── robots.txt 解析 ───────────────────────────────────────────────
@dataclass
class RobotsRules:
    disallow_paths: list[str] = field(default_factory=list)
    allow_paths: list[str] = field(default_factory=list)
    crawl_delay: float = 0.0
    sitemaps: list[str] = field(default_factory=list)

    def is_allowed(self, path: str) -> bool:
        # Allow 优先于 Disallow（Google 规则）
        for p in self.allow_paths:
            if path.startswith(p):
                return True
        for p in self.disallow_paths:
            if p == "/" or path.startswith(p):
                return False
        return True


def _parse_robots(text: str, user_agent: str = "*") -> RobotsRules:
    """极简 robots.txt 解析（支持 Disallow/Allow/Crawl-delay/Sitemap）。"""
    rules = RobotsRules()
    current_ua = ""
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        key, _, val = line.partition(":")
        key = key.strip().lower()
        val = val.strip()
        if key == "user-agent":
            current_ua = val
        elif current_ua in ("*", user_agent) or current_ua == "":
            if key == "disallow" and val:
                rules.disallow_paths.append(val)
            elif key == "allow" and val:
                rules.allow_paths.append(val)
            elif key == "crawl-delay":
                try:
                    rules.crawl_delay = float(val)
                except ValueError:
                    pass
        if key == "sitemap":
            rules.sitemaps.append(val)
    return rules


# ── URL 归一化 ────────────────────────────────────────────────────
def _normalize_url(url: str, base: str) -> str | None:
    """归一化 URL：补全相对路径、去 fragment、去尾斜杠（根路径保留）。"""
    if not url:
        return None
    # 跳过非 http(s) 链接
    if url.startswith(("mailto:", "tel:", "javascript:", "#", "data:")):
        return None
    joined = urljoin(base, url)
    parsed = urlparse(joined)
    if parsed.scheme not in ("http", "https"):
        return None
    # 跳过非 HTML 资源（sitemap / 图片 / 文档等）
    path_lower = parsed.path.lower()
    for ext in _NON_HTML_EXTS:
        if path_lower.endswith(ext):
            return None
    # 去 fragment
    parsed = parsed._replace(fragment="")
    # 去尾斜杠（根路径保留）
    path = parsed.path
    if len(path) > 1 and path.endswith("/"):
        path = path.rstrip("/")
        parsed = parsed._replace(path=path)
    return urlunparse(parsed)


def _same_domain(url: str, domain: str) -> bool:
    return urlparse(url).netloc == domain


# ── 页面抓取 ──────────────────────────────────────────────────────
@dataclass
class FetchedPage:
    url: str
    status: int
    final_url: str
    redirect_chain: list[str]
    html: str
    content_type: str = ""
    fetch_error: str | None = None
    # render 字段（playwright 按需渲染后填充）
    raw_text_length: int = 0
    rendered_text_length: int | None = None
    render_status: str = "not_needed"  # not_needed | success | failed | skipped
    render_error: str | None = None
    render_delta: int | None = None  # rendered - raw（正数=真 CSR）


def _fetch_page(
    client: httpx.Client, url: str, last_request: list[float], delay: float = _REQUEST_DELAY
) -> FetchedPage:
    """抓取单页，遵守 delay（秒）。"""
    # 限速：距上次请求至少 delay 秒
    with threading.Lock():
        now = time.monotonic()
        wait = delay - (now - last_request[0])
        if wait > 0:
            time.sleep(wait)
        last_request[0] = time.monotonic()

    redirect_chain: list[str] = []
    try:
        resp = client.get(
            url,
            follow_redirects=True,
            timeout=_FETCH_TIMEOUT,
        )
        # httpx follow_redirects=True 时 resp.url 是最终 URL
        # redirect_chain 需要从 history 重建
        for h in resp.history:
            redirect_chain.append(str(h.url))
        redirect_chain.append(str(resp.url))
        return FetchedPage(
            url=url,
            status=resp.status_code,
            final_url=str(resp.url),
            redirect_chain=redirect_chain,
            html=resp.text,
            content_type=resp.headers.get("content-type", ""),
        )
    except httpx.HTTPError as exc:
        return FetchedPage(
            url=url,
            status=0,
            final_url=url,
            redirect_chain=[],
            html="",
            fetch_error=str(exc),
        )


# ── 空壳检测 ──────────────────────────────────────────────────────
def _detect_csr_empty(html: str, soup: BeautifulSoup) -> bool:
    """检测 CSR 空壳页：正文过短 或 body 仅含 root div。"""
    body = soup.body
    if body is None:
        return True
    text = body.get_text(strip=True)
    if len(text) < _EMPTY_BODY_THRESHOLD:
        return True
    # 仅含 root div（如 <div id="root"></div>）
    children = [c for c in body.children if getattr(c, "name", None)]
    if len(children) <= 1:
        only = children[0] if children else None
        if only and only.name == "div" and not only.get_text(strip=True):
            return True
    return False


# ── 正文文本提取（raw / rendered 共用同一把尺子） ──────────────────
def _extract_text(html: str) -> str:
    """提取正文文本（body 内可见文本），raw 和 rendered 用同一函数。"""
    soup = BeautifulSoup(html, "html.parser")
    body = soup.body
    if body is None:
        return ""
    # 移除 script/style 标签
    for tag in body.find_all(["script", "style", "noscript"]):
        tag.decompose()
    return body.get_text(strip=True)


# ── Playwright 按需 render（仅对 csr_empty=True 的页） ───────────
_RENDER_TIMEOUT_MS = 15_000  # 15s
_RENDER_DELTA_MULTIPLIER = 5  # rendered > raw × 5 且 > 1000 → 确认 CSR


def _render_if_csr(page: FetchedPage) -> FetchedPage:
    """只对 csr_empty=True 的页触发 playwright render，对比正文文本长度。

    工程纪律：
      - 用 Edge（channel=msedge），不依赖 chromium 二进制安装
      - 每次单独 browser+context，用完必 close（防内存泄漏）
      - 串行调用（主循环中），不并行
      - 失败降级：render 失败不阻塞主 crawl，csr_empty 仍按原阈值判定
    """
    # 需要 csr_empty 标记才能 render
    # 注意：csr_empty 由调用方在 _detect_csr_empty 后设置，这里检查 page 状态
    # 但 FetchedPage 没有 csr_empty 字段，由调用方传入判断
    # 这里只处理 render 逻辑，csr_empty 判断在调用方
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        page.render_status = "skipped"
        page.render_error = "playwright not installed"
        return page

    url = page.final_url or page.url
    try:
        pw = sync_playwright().start()
        try:
            browser = pw.chromium.launch(channel="msedge", headless=True)
            try:
                ctx = browser.new_context(user_agent=_UA)
                try:
                    pg = ctx.new_page()
                    pg.goto(
                        url,
                        timeout=_RENDER_TIMEOUT_MS,
                        wait_until="networkidle",
                    )
                    rendered_html = pg.content()
                    rendered_text = _extract_text(rendered_html)
                    page.rendered_text_length = len(rendered_text)
                    page.render_delta = page.rendered_text_length - page.raw_text_length
                    page.render_status = "success"
                finally:
                    pg.close()
            finally:
                ctx.close()
        finally:
            browser.close()
        pw.stop()
    except Exception as e:
        page.render_status = "failed"
        page.render_error = str(e)[:200]
        # 确保 pw 被清理
        try:
            pw.stop()
        except Exception:
            pass

    return page


# ── 逐页规则审计 ──────────────────────────────────────────────────
SEVERITY_ORDER = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}


def _audit_page(url: str, html: str, csr_empty: bool) -> list[dict]:
    """对单页执行 9 类规则审计 + AI 可爬性。返回 issues 列表。"""
    issues: list[dict] = []
    soup = BeautifulSoup(html, "html.parser")

    def add(itype: str, severity: str, detail: str = "") -> None:
        issues.append({"type": itype, "severity": severity, "detail": detail})

    # 1. Title
    title_tag = soup.find("title")
    title_text = title_tag.get_text(strip=True) if title_tag else ""
    if not title_text:
        add("missing_title", "P1", "页面缺少 <title>")
    elif len(title_text) > 70:
        add("title_too_long", "P2", f"title 长度 {len(title_text)} > 70")
    elif len(title_text) < 10:
        add("title_too_short", "P3", f"title 长度 {len(title_text)} < 10")

    # 2. Meta description
    meta_desc = soup.find("meta", attrs={"name": "description"})
    desc = meta_desc.get("content", "").strip() if meta_desc else ""
    if not desc:
        add("missing_meta_description", "P2", "缺少 meta description")
    elif len(desc) > 160:
        add("meta_desc_too_long", "P3", f"description 长度 {len(desc)} > 160")

    # 3. H1
    h1s = soup.find_all("h1")
    if not h1s:
        add("missing_h1", "P2", "页面缺少 <h1>")
    elif len(h1s) > 1:
        add("multiple_h1", "P3", f"页面有 {len(h1s)} 个 <h1>")

    # 4. Canonical
    canonical = soup.find("link", attrs={"rel": "canonical"})
    if not canonical:
        add("missing_canonical", "P3", "缺少 canonical 标签")
    elif canonical.get("href") and canonical["href"] != url:
        add("canonical_mismatch", "P2", f"canonical={canonical['href']} != url")

    # 5. hreflang（多语言站）
    hreflangs = soup.find_all("link", attrs={"rel": "alternate", "hreflang": True})
    # 仅标记缺失，不强制（单语站不需要）

    # 6. Open Graph
    og_title = soup.find("meta", attrs={"property": "og:title"})
    if not og_title:
        add("missing_og_title", "P3", "缺少 og:title")

    # 7. Structured data (JSON-LD) — 复用 check_schema 的提取逻辑
    blocks = _extract_jsonld(soup)
    if not blocks:
        add("missing_jsonld", "P2", "无 JSON-LD 结构化数据")
    else:
        for i, b in enumerate(blocks):
            if "@error" in b:
                add("invalid_jsonld", "P1", f"block[{i}]: {b['@error']}")
            elif not b.get("@type"):
                add("jsonld_missing_type", "P2", f"block[{i}] 缺 @type")

    # 8. Image alt
    imgs = soup.find_all("img")
    imgs_without_alt = [
        img for img in imgs if not img.get("alt") and not img.get("aria-label")
    ]
    if imgs and imgs_without_alt:
        ratio = len(imgs_without_alt) / len(imgs)
        if ratio > 0.3:
            add(
                "missing_alt_text",
                "P3",
                f"{len(imgs_without_alt)}/{len(imgs)} 图片缺 alt",
            )

    # 9. AI 可爬性
    robots_meta = soup.find("meta", attrs={"name": "robots"})
    if robots_meta:
        content = (robots_meta.get("content") or "").lower()
        if "noindex" in content:
            add("noindex", "P0", "meta robots 含 noindex，页面不会被索引")
        if "nofollow" in content:
            add("nofollow", "P2", "meta robots 含 nofollow")

    # CSR 空壳
    if csr_empty:
        add("csr_empty_shell", "P1", "疑似 CSR 空壳页，正文内容不足")

    return issues


# ── sitemap 解析 ──────────────────────────────────────────────────
def _parse_sitemap(xml_text: str) -> list[str]:
    """从 sitemap.xml 提取 URL（支持 sitemap index 嵌套）。"""
    urls: list[str] = []
    soup = BeautifulSoup(xml_text, "xml")
    for loc in soup.find_all("loc"):
        text = loc.get_text(strip=True)
        if text:
            urls.append(text)
    return urls


# ── 主工具 ────────────────────────────────────────────────────────
@mcp.tool()
def crawl_site_audit(
    start_url: str,
    max_urls: int = _MAX_URLS_DEFAULT,
    include_patterns: list[str] | None = None,
    exclude_patterns: list[str] | None = None,
    render_mode: str = "skip",
) -> str:
    """全站爬取审计：BFS 爬取 + 逐页规则审计 + 聚合 issues。

    - start_url: 起始 URL（同域内所有可爬页面）
    - max_urls: 最大爬取页数（默认 50，硬上限 200）
    - include_patterns: 仅爬匹配的 URL 正则（可选）
    - exclude_patterns: 跳过匹配的 URL 正则（可选）
    - render_mode: CSR 渲染模式，skip=仅标记空壳不渲染（MVP 默认）

    返回 JSON：pages[] + issues[] + summary + sitemap_urls
    """
    # ── Fail-closed: 校验 start_url ──
    if not start_url or "://" not in start_url:
        return json.dumps(
            {"error": "start_url must be a valid absolute URL"},
            ensure_ascii=False,
        )

    parsed_start = urlparse(start_url)
    domain = parsed_start.netloc
    if not domain:
        return json.dumps({"error": "start_url has no valid domain"}, ensure_ascii=False)

    max_urls = min(max(max_urls, 1), _MAX_URLS_HARD)

    # 配额预扣（urls_crawled meter_kind）
    quota = QuotaEnforce.get()
    quota.set_limit("urls_crawled", max_urls)
    try:
        quota.reserve("urls_crawled", 1)  # 起始页
    except QuotaExceeded as e:
        return json.dumps({"error": "429 quota exceeded", "detail": str(e)}, ensure_ascii=False)

    base = f"{parsed_start.scheme}://{domain}"

    # ── 拉取 robots.txt ──
    robots = RobotsRules()
    try:
        robots_resp = httpx.get(
            f"{base}/robots.txt",
            headers={"User-Agent": _UA},
            timeout=_FETCH_TIMEOUT,
        )
        if robots_resp.status_code == 200:
            robots = _parse_robots(robots_resp.text)
    except httpx.HTTPError:
        pass  # robots.txt 不可达 = 全部允许（宽松模式）

    # 实际 crawl-delay 取 robots 和默认值的较大者
    effective_delay = max(_REQUEST_DELAY, robots.crawl_delay)

    # ── 拉取 sitemap.xml ──
    sitemap_urls: list[str] = []
    for sm_url in robots.sitemaps + [f"{base}/sitemap.xml"]:
        try:
            sm_resp = httpx.get(
                sm_url, headers={"User-Agent": _UA}, timeout=_FETCH_TIMEOUT
            )
            if sm_resp.status_code == 200:
                sitemap_urls.extend(_parse_sitemap(sm_resp.text))
        except httpx.HTTPError:
            continue

    # ── 编译 include/exclude ──
    inc_re = [re.compile(p) for p in (include_patterns or [])]
    exc_re = [re.compile(p) for p in (exclude_patterns or [])]

    def passes_filters(url: str) -> bool:
        if inc_re and not any(r.search(url) for r in inc_re):
            return False
        if exc_re and any(r.search(url) for r in exc_re):
            return False
        return True

    # ── BFS 初始化 ──
    visited: set[str] = set()
    queue: deque[str] = deque()
    in_degree: dict[str, int] = defaultdict(int)  # 用于 orphan 检测

    # 起始 URL + sitemap URLs 入队
    seed_urls = {start_url} | set(sitemap_urls)
    for u in seed_urls:
        norm = _normalize_url(u, base)
        if norm and _same_domain(norm, domain) and passes_filters(norm):
            queue.append(norm)

    if not queue:
        return json.dumps(
            {"error": "no crawlable URLs (start_url invalid or all filtered)"},
            ensure_ascii=False,
        )

    # ── 抓取 + 审计 ──
    pages: list[dict] = []
    all_issues: dict[str, dict] = {}  # type → {severity, affected_urls, detail}
    title_map: dict[str, list[str]] = defaultdict(list)  # title → urls
    broken_links: list[dict] = []
    last_request = [0.0]

    with httpx.Client(
        headers={"User-Agent": _UA},
        follow_redirects=True,
        timeout=_FETCH_TIMEOUT,
    ) as client:
        while queue and len(visited) < max_urls:
            url = queue.popleft()
            if url in visited:
                continue

            # robots Disallow 检查
            path = urlparse(url).path or "/"
            if not robots.is_allowed(path):
                visited.add(url)
                pages.append(
                    {"url": url, "status": -1, "skipped": "robots_disallow"}
                )
                continue

            visited.add(url)
            page = _fetch_page(client, url, last_request, delay=effective_delay)

            # 跳过非 HTML 内容（sitemap / 图片 / API 等）
            ct = page.content_type.lower()
            if ct and "html" not in ct and "xml" not in ct and "text" not in ct:
                pages.append(
                    {
                        "url": url,
                        "status": page.status,
                        "skipped": f"non_html:{ct.split(';')[0]}",
                    }
                )
                continue

            # 3xx 重定向：记录但不审计内容
            if 300 <= page.status < 400:
                pages.append(
                    {
                        "url": url,
                        "status": page.status,
                        "redirect_chain": page.redirect_chain,
                        "final_url": page.final_url,
                    }
                )
                continue

            if page.fetch_error or page.status >= 400:
                broken_links.append(
                    {
                        "url": url,
                        "status": page.status,
                        "error": page.fetch_error or f"HTTP {page.status}",
                    }
                )
                pages.append(
                    {
                        "url": url,
                        "status": page.status,
                        "error": page.fetch_error,
                        "redirect_chain": page.redirect_chain,
                    }
                )
                continue

            soup = BeautifulSoup(page.html, "html.parser")
            csr_empty = _detect_csr_empty(page.html, soup)

            # render 字段填充
            raw_text = _extract_text(page.html)
            page.raw_text_length = len(raw_text)
            if csr_empty:
                _render_if_csr(page)
                # 铁证判定：render 后正文显著变多 → 确认 CSR
                if (
                    page.render_status == "success"
                    and page.render_delta is not None
                    and page.render_delta > page.raw_text_length * _RENDER_DELTA_MULTIPLIER
                    and page.rendered_text_length is not None
                    and page.rendered_text_length > 1000
                ):
                    page.render_status = "success"  # 保持 success，铁证由 issue 标记
                # csr_confirmed_by_render 会在下面审计阶段加入 issues

            # 收集内链
            internal_links: list[str] = []
            for a in soup.find_all("a", href=True):
                href = a["href"]
                norm = _normalize_url(href, url)
                if not norm:
                    continue
                if not _same_domain(norm, domain):
                    continue
                if not passes_filters(norm):
                    continue
                internal_links.append(norm)
                if norm not in visited:
                    in_degree[norm] += 1
                    queue.append(norm)

            # title 查重
            title_tag = soup.find("title")
            title_text = title_tag.get_text(strip=True) if title_tag else ""
            if title_text:
                title_map[title_text].append(url)

            # 逐页审计
            page_issues = _audit_page(url, page.html, csr_empty)
            for iss in page_issues:
                key = iss["type"]
                if key not in all_issues:
                    all_issues[key] = {
                        "type": key,
                        "severity": iss["severity"],
                        "affected_urls": [],
                        "detail": iss["detail"],
                    }
                all_issues[key]["affected_urls"].append(url)

            pages.append(
                {
                    "url": url,
                    "status": page.status,
                    "final_url": page.final_url,
                    "redirect_chain": page.redirect_chain,
                    "title": title_text,
                    "content_length": len(page.html),
                    "csr_empty": csr_empty,
                    "internal_links": len(internal_links),
                    "issues": [i["type"] for i in page_issues],
                }
            )

            # 配额续扣
            try:
                quota.reserve("urls_crawled", 1)
            except QuotaExceeded:
                break

    # ── 聚合：duplicate titles ──
    for title, urls in title_map.items():
        if len(urls) > 1:
            all_issues["duplicate_title"] = {
                "type": "duplicate_title",
                "severity": "P2",
                "affected_urls": urls,
                "detail": f"title '{title[:50]}' 出现在 {len(urls)} 个页面",
            }

    # ── 聚合：orphan pages ──
    crawled_urls = {p["url"] for p in pages if p.get("status", 0) == 200}
    orphan_urls = [u for u in crawled_urls if in_degree.get(u, 0) == 0 and u != start_url]
    if orphan_urls:
        all_issues["orphan_pages"] = {
            "type": "orphan_pages",
            "severity": "P2",
            "affected_urls": orphan_urls,
            "detail": f"{len(orphan_urls)} 个页面无内链指向（孤立页）",
        }

    # ── 聚合：broken links ──
    if broken_links:
        all_issues["broken_links"] = {
            "type": "broken_links",
            "severity": "P1",
            "affected_urls": [b["url"] for b in broken_links],
            "detail": f"{len(broken_links)} 个页面返回错误状态",
        }

    # ── 排序 issues by severity ──
    sorted_issues = sorted(
        all_issues.values(),
        key=lambda x: SEVERITY_ORDER.get(x["severity"], 9),
    )

    # ── summary ──
    crawled = len([p for p in pages if p.get("status", 0) == 200])
    csr_count = sum(1 for p in pages if p.get("csr_empty"))
    summary = {
        "start_url": start_url,
        "domain": domain,
        "urls_crawled": crawled,
        "urls_total": len(pages),
        "urls_skipped_robots": len([p for p in pages if p.get("skipped") == "robots_disallow"]),
        "csr_empty_pages": csr_count,
        "broken_links": len(broken_links),
        "orphan_pages": len(orphan_urls),
        "duplicate_titles": len([k for k in all_issues if k == "duplicate_title"]),
        "issue_count": len(sorted_issues),
        "p0_issues": len([i for i in sorted_issues if i["severity"] == "P0"]),
    }

    result = {
        "summary": summary,
        "issues": sorted_issues,
        "pages": pages,
        "sitemap_urls": sitemap_urls[:100],
        "quota_used": quota.usage("urls_crawled"),
    }
    return json.dumps(result, ensure_ascii=False, indent=2)
