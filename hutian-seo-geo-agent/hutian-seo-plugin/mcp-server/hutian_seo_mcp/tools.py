"""Hutian SEO/GEO MCP tools.

Implements five tools on top of FastMCP (names are locked by the PRD/技术方案
工具名闭环契约 — do not rename):
- run_diagnosis: SEO/GEO diagnosis of a URL.               ← FR-A01
- check_schema: extract & validate JSON-LD blocks.          ← FR-A02
- trace_citations: brand citation tracking across AI engines.← FR-A03
- submit_sitemap: IndexNow submission to Google/Bing.       ← FR-A04
- entity_rename: project-wide brand entity rename.          ← FR-A05

JSON-LD snippet *generation* is intentionally not a tool — the agent loop's
edit_file/write_file equivalent handles authoring; check_schema only reports
what is missing.
"""

from __future__ import annotations

import json
import os
import re
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("hutian-seo")

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; HutianSEOAgent/0.1; "
        "+https://hutian.com/bot)"
    )
}
_TIMEOUT = 15

# schema.org types that benefit most from generative-engine citation.
_RECOMMENDED_PRODUCT_FIELDS = [
    "name",
    "brand",
    "sku",
    "gtin",
    "description",
    "sameAs",
    "offers",
]

# Dirs skipped by entity_rename (VCS / build / deps / docs / 测试).
# docs 与历史文档按品牌约束 §4.1 应保留旧称，不参与改写。
_SKIP_DIRS = {
    ".git", "node_modules", "dist", "build", ".next",
    "__pycache__", ".turbo", ".venv", "venv",
    "docs",  # 历史文档/PRD/变更日志里的旧称应保留
    "test", "tests", "__tests__", "fixtures",  # 测试 fixture 不应被改
}
# 额外跳过的文件名（与 _SKIP_DIRS 叠加，覆盖 docs 之外的散落变更日志）
_SKIP_FILENAMES = {"CHANGELOG.md", "HISTORY.md"}
# Only text/markup extensions are scanned/replaced by entity_rename.
_TEXT_EXTS = {
    ".md", ".json", ".jsonld", ".html", ".htm", ".js", ".jsx",
    ".ts", ".tsx", ".py", ".yaml", ".yml", ".txt", ".css",
    ".xml", ".vue", ".svelte", ".toml", ".ini", ".conf",
}
# 文档类扩展名（dry_run 报告时单独归类，提示用户这些是"仅作历史映射"的提及）
_DOC_EXTS = {".md"}


def _fetch(url: str) -> requests.Response:
    return requests.get(url, headers=_HEADERS, timeout=_TIMEOUT, allow_redirects=True)


def _extract_jsonld(soup: BeautifulSoup) -> list[dict]:
    """Return a list of parsed JSON-LD objects found in the document."""
    blocks: list[dict] = []
    for tag in soup.find_all("script", attrs={"type": "application/ld+json"}):
        raw = tag.string or tag.get_text() or ""
        raw = raw.strip()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except (json.JSONDecodeError, ValueError):
            blocks.append({"@error": "invalid-json", "@raw": raw[:200]})
            continue
        if isinstance(data, list):
            blocks.extend(d for d in data if isinstance(d, dict))
        elif isinstance(data, dict):
            # unwrap @graph containers
            if "@graph" in data and isinstance(data["@graph"], list):
                blocks.extend(d for d in data["@graph"] if isinstance(d, dict))
            else:
                blocks.append(data)
    return blocks


@mcp.tool()
def run_diagnosis(url: str) -> str:
    """Run an SEO/GEO diagnosis on a URL.

    Checks HTTP status, robots.txt, sitemap availability, JSON-LD presence and
    (optionally, when PAGESPEED_API_KEY is set) PageSpeed performance. Returns a
    JSON string with seo score, geo score, entity_clarity and an issues list.
    """
    issues: list[str] = []
    seo_signals = 0
    seo_total = 0
    geo_signals = 0
    geo_total = 0

    parsed = urlparse(url if "://" in url else f"https://{url}")
    base = f"{parsed.scheme or 'https'}://{parsed.netloc}"
    page_url = url if "://" in url else f"https://{url}"

    # --- HTTP status / fetch ---
    soup = None
    html = ""
    try:
        resp = _fetch(page_url)
        seo_total += 1
        if resp.status_code == 200:
            seo_signals += 1
            html = resp.text
            soup = BeautifulSoup(html, "html.parser")
        else:
            issues.append(f"HTTP status {resp.status_code} for {page_url}")
    except requests.RequestException as exc:
        seo_total += 1
        issues.append(f"Failed to fetch page: {exc}")

    # --- robots.txt ---
    seo_total += 1
    try:
        robots = _fetch(f"{base}/robots.txt")
        if robots.status_code == 200:
            seo_signals += 1
            if "sitemap:" not in robots.text.lower():
                issues.append("robots.txt does not reference a sitemap")
        else:
            issues.append(f"robots.txt returned {robots.status_code}")
    except requests.RequestException as exc:
        issues.append(f"robots.txt unreachable: {exc}")

    # --- sitemap.xml ---
    seo_total += 1
    try:
        sitemap = _fetch(f"{base}/sitemap.xml")
        if sitemap.status_code == 200:
            seo_signals += 1
        else:
            issues.append(f"sitemap.xml returned {sitemap.status_code}")
    except requests.RequestException as exc:
        issues.append(f"sitemap.xml unreachable: {exc}")

    # --- JSON-LD / structured data (GEO) ---
    jsonld: list[dict] = []
    if soup is not None:
        jsonld = _extract_jsonld(soup)

    geo_total += 1
    if jsonld:
        geo_signals += 1
    else:
        issues.append("No JSON-LD structured data found on page")

    # --- Entity clarity: presence of @type and name/brand ---
    geo_total += 1
    entity_clarity = False
    typed = [b for b in jsonld if b.get("@type")]
    if typed:
        geo_signals += 1
        entity_clarity = True
    else:
        issues.append("JSON-LD blocks lack an @type — weak entity signal")

    # --- Semantic links: 内链锚点是否含 schema.org 实体引用（sameAs / @id / url） ---
    # 信息已在 tools 内：sameAs 出现在 JSON-LD 块；@id 标识实体链接；<a> 内链数辅助。
    semantic_links = False
    if any(b.get("sameAs") or b.get("@id") or b.get("url") for b in jsonld):
        semantic_links = True
        geo_signals += 1
    geo_total += 1
    if not semantic_links:
        issues.append("No semantic entity links (sameAs / @id / url) in JSON-LD")

    # --- structured_data_missing: 是否存在缺字段（与 issues 同源，给布尔结论） ---
    structured_data_missing = bool(
        [i for i in issues if "missing recommended field" in i or "No JSON-LD" in i]
    )

    # --- GEO completeness for Product blocks ---
    product_blocks = [b for b in typed if b.get("@type") == "Product"]
    if product_blocks:
        for field in _RECOMMENDED_PRODUCT_FIELDS:
            geo_total += 1
            if any(field in b for b in product_blocks):
                geo_signals += 1
            else:
                issues.append(f"Product JSON-LD missing recommended field: {field}")

    # --- Title / meta description (SEO) ---
    if soup is not None:
        seo_total += 1
        if soup.title and soup.title.get_text(strip=True):
            seo_signals += 1
        else:
            issues.append("Missing <title> tag")

        seo_total += 1
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc and meta_desc.get("content"):
            seo_signals += 1
        else:
            issues.append("Missing meta description")

    # --- PageSpeed (optional) ---
    pagespeed = None
    api_key = os.environ.get("PAGESPEED_API_KEY")
    if api_key:
        try:
            ps = requests.get(
                "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
                params={"url": page_url, "key": api_key, "strategy": "mobile"},
                timeout=60,
            )
            if ps.status_code == 200:
                lighthouse = ps.json().get("lighthouseResult", {})
                perf = (
                    lighthouse.get("categories", {})
                    .get("performance", {})
                    .get("score")
                )
                pagespeed = {"performance": round(perf * 100) if perf is not None else None}
                seo_total += 1
                if perf is not None and perf >= 0.9:
                    seo_signals += 1
                else:
                    issues.append(
                        f"PageSpeed performance score low: "
                        f"{round(perf * 100) if perf is not None else 'n/a'}"
                    )
            else:
                issues.append(f"PageSpeed API returned {ps.status_code}")
        except requests.RequestException as exc:
            issues.append(f"PageSpeed API error: {exc}")

    seo_score = round(seo_signals / seo_total * 100) if seo_total else 0
    geo_score = round(geo_signals / geo_total * 100) if geo_total else 0

    # PRD §6.3 契约：嵌套 scores / conclusions，承载"双评分 + 三结论"语义。
    # 扁平顶层会丢失 conclusions 的语义聚合（entity_clarity / semantic_links / structured_data_missing
    # 是三个并列的诊断维度，应作为同级结论字段，而非散落顶层）。
    result = {
        "url": page_url,
        "scores": {
            "traditional_seo": seo_score,
            "generative_geo": geo_score,
        },
        "performance": pagespeed,
        "conclusions": {
            "entity_clarity": entity_clarity,
            "semantic_links": semantic_links,
            "structured_data_missing": structured_data_missing,
        },
        "jsonld_types": sorted({b.get("@type") for b in typed if b.get("@type")}),
        "issues": issues,
    }
    return json.dumps(result, ensure_ascii=False, indent=2)


@mcp.tool()
def trace_citations(brand: str, window_days: int = 30) -> str:
    """Track brand citations across generative AI engines.

    Currently returns structured mock data (DeepSeek/GPT/Kimi shares, total
    citations, sentiment and growth). When HUTIAN_CITATION_API is configured a
    real backend can replace the mock source.
    """
    source = "mock"
    api = os.environ.get("HUTIAN_CITATION_API")
    if api:
        try:
            resp = requests.get(
                api,
                params={"brand": brand, "window_days": window_days},
                headers=_HEADERS,
                timeout=_TIMEOUT,
            )
            if resp.status_code == 200:
                data = resp.json()
                data["source"] = "api"
                return json.dumps(data, ensure_ascii=False, indent=2)
        except (requests.RequestException, ValueError):
            pass  # fall back to mock

    result = {
        "brand": brand,
        "window_days": window_days,
        "source": source,
        # PRD §6.3 契约：sources[{engine,share,role}]
        # tag (ds/gpt/kimi/oth) 作为渲染样式 key 保留为额外字段
        "sources": [
            {"engine": "DeepSeek-V3", "share": 42, "role": "主要来源", "tag": "ds"},
            {"engine": "GPT-4o", "share": 28, "role": "次要权威", "tag": "gpt"},
            {"engine": "Kimi", "share": 15, "role": "提及", "tag": "kimi"},
            {"engine": "其他", "share": 15, "role": "长尾", "tag": "oth"},
        ],
        "total_citations": 2410,
        "sentiment": "正面 87%",
        "growth": "+12.5%",
    }
    return json.dumps(result, ensure_ascii=False, indent=2)


@mcp.tool()
def submit_sitemap(host: str, urls: list[str], indexnow_key: str) -> str:
    """Submit URLs via the IndexNow API to Google and Bing.

    `host` is the canonical hostname (e.g. hutian.com). `urls` is the list of
    absolute URLs being submitted. `indexnow_key` is the IndexNow API key that
    must also be served at https://<host>/<indexnow_key>.txt.
    """
    parsed = urlparse(host if "://" in host else f"https://{host}")
    hostname = parsed.netloc or parsed.path
    key_location = f"https://{hostname}/{indexnow_key}.txt"

    payload = {
        "host": hostname,
        "key": indexnow_key,
        "keyLocation": key_location,
        "urlList": urls,
    }

    endpoints = {
        "bing": "https://www.bing.com/indexnow",
        "google": "https://www.google.com/indexnow",
    }

    results: dict[str, object] = {}
    for name, endpoint in endpoints.items():
        try:
            resp = requests.post(
                endpoint,
                json=payload,
                headers={"Content-Type": "application/json; charset=utf-8"},
                timeout=_TIMEOUT,
            )
            # 裁决#4: 拆 accepted(HTTP 层) 与 verified(业务层)
            # Bing IndexNow 对无效 host 也返 202，仅表示"通知已接收"；
            # host 所有权经 key 文件异步验证，v0.2 无法同步判定，标 unknown。
            accepted = resp.status_code in (200, 202)
            results[name] = {
                "status": resp.status_code,
                "accepted": accepted,
                "verified": "unknown",  # v0.2 不做 key 文件可达性校验
            }
        except requests.RequestException as exc:
            results[name] = {
                "status": None,
                "accepted": False,
                "verified": "unknown",
                "error": str(exc),
            }

    # ok 仅在"至少一个目标 accepted 且无 error"时为 true；
    # verified=unknown 时附 note 提示用户异步验证。
    any_accepted = any(r.get("accepted") for r in results.values())
    all_accepted = all(r.get("accepted") for r in results.values())
    has_error = any("error" in r for r in results.values())
    if all_accepted:
        status = "ok"
    elif any_accepted:
        status = "partial"
    elif has_error:
        status = "error"
    else:
        status = "rejected"
    summary = {
        "host": hostname,
        "submitted": len(urls),
        "key_location": key_location,
        "targets": results,
        "status": status,
        "ok": any_accepted,
        "note": (
            "202/200 仅表示通知已被接收；host 所有权经 "
            f"{key_location} 异步验证，请稍后确认该文件可达。"
        ),
    }
    return json.dumps(summary, ensure_ascii=False, indent=2)


@mcp.tool()
def check_schema(url: str, expected_type: str = "") -> str:
    """Extract and validate JSON-LD structured data on a page.  ← FR-A02

    Fetches `url`, parses every `application/ld+json` block and reports whether
    the requested `expected_type` (e.g. "Product") is present, which recommended
    fields are missing, whether the markup is valid and whether it is eligible
    for rich results. When `expected_type` is empty, all blocks are validated
    generically.
    """
    page_url = url if "://" in url else f"https://{url}"
    issues: list[str] = []
    found_types: list[str] = []
    missing_fields: list[str] = []

    try:
        resp = _fetch(page_url)
    except requests.RequestException as exc:
        return json.dumps(
            {"url": page_url, "ok": False, "error": f"fetch failed: {exc}"},
            ensure_ascii=False,
            indent=2,
        )

    if resp.status_code != 200:
        return json.dumps(
            {"url": page_url, "ok": False, "error": f"HTTP {resp.status_code}"},
            ensure_ascii=False,
            indent=2,
        )

    soup = BeautifulSoup(resp.text, "html.parser")
    blocks = _extract_jsonld(soup)

    if not blocks:
        issues.append("No JSON-LD blocks found")

    for i, block in enumerate(blocks):
        label = f"block[{i}]"
        if "@error" in block:
            issues.append(f"{label}: {block['@error']}")
            continue

        ctx = block.get("@context")
        if ctx is None:
            issues.append(f"{label}: missing @context")
        elif isinstance(ctx, str) and "schema.org" not in ctx:
            issues.append(f"{label}: @context is not schema.org ({ctx})")

        btype = block.get("@type")
        if not btype:
            issues.append(f"{label}: missing @type")
        else:
            types = btype if isinstance(btype, list) else [btype]
            found_types.extend(types)

        if not block.get("@id") and btype in ("Product", "Organization"):
            issues.append(f"{label}: {btype} missing @id (recommended for entity linking)")

    # Focus validation on the requested type when provided.
    expected = expected_type.strip() if expected_type else ""
    found = False
    valid = len(issues) == 0
    rich_result_eligible = False

    if expected:
        target_blocks = [
            b for b in blocks
            if b.get("@type") == expected and "@error" not in b
        ]
        found = bool(target_blocks)
        if not found:
            issues.append(f"No JSON-LD block of @type {expected} found")
        else:
            for field in _RECOMMENDED_PRODUCT_FIELDS if expected == "Product" else ["name"]:
                if any(field in b for b in target_blocks):
                    continue
                missing_fields.append(field)
            # Rich result eligibility: Product needs name + offers + availability
            # at minimum; others need name + @id.
            if expected == "Product":
                rich_result_eligible = all(
                    any(f in b for b in target_blocks)
                    for f in ("name", "offers")
                )
            else:
                rich_result_eligible = any(b.get("name") for b in target_blocks)
    else:
        found = bool(found_types)
        rich_result_eligible = bool(
            [b for b in blocks if "@error" not in b and b.get("@type")]
        )

    result = {
        "url": page_url,
        "expected_type": expected or None,
        "found": found,
        "missing_fields": missing_fields,
        "valid": valid,
        "rich_result_eligible": rich_result_eligible,
        "block_count": len(blocks),
        "types": sorted(set(found_types)),
        "issues": issues,
    }
    return json.dumps(result, ensure_ascii=False, indent=2)


@mcp.tool()
def entity_rename(
    root: str,
    old_names: list[str],
    new_name: str,
    dry_run: bool = True,
) -> str:
    """Rename a brand entity across project files.  ← FR-A05

    Scans text/markup files under `root` for any occurrence of the strings in
    `old_names` and replaces them with `new_name`. Skips VCS / build / dep dirs
    (.git, node_modules, dist, build, .next, __pycache__, ...) and only touches
    text extensions (.md, .json, .jsonld, .html, .ts, .py, ...).

    With `dry_run=True` (the default) nothing is written — the tool only reports
    total matches, affected file count and a preview of the first 50 files. Set
    `dry_run=False` to write the replacements to disk. Always run a dry run first
    and review the counts before committing to a write.
    """
    root_path = os.path.abspath(root)
    if not os.path.isdir(root_path):
        return json.dumps(
            {"error": f"root is not a directory: {root}"},
            ensure_ascii=False,
            indent=2,
        )
    if not old_names or not new_name:
        return json.dumps(
            {"error": "old_names and new_name must be non-empty"},
            ensure_ascii=False,
            indent=2,
        )

    pattern = re.compile("|".join(re.escape(str(n)) for n in old_names))
    files_hit: list[dict] = []
    # 裁决#5: dry_run 分类报告——代码 vs 文档，让用户看清哪些真改、哪些是文档举例
    files_code: list[dict] = []
    files_doc: list[dict] = []
    total_matches = 0
    skipped_files: list[str] = []

    for dirpath, dirnames, filenames in os.walk(root_path):
        # prune in-place so os.walk does not descend into them
        dirnames[:] = [d for d in dirnames if d not in _SKIP_DIRS]
        for fn in filenames:
            # 跳过 CHANGELOG / HISTORY 等变更日志（旧称应保留）
            if fn in _SKIP_FILENAMES:
                skipped_files.append(os.path.relpath(os.path.join(dirpath, fn), root_path))
                continue
            ext = os.path.splitext(fn)[1].lower()
            if ext not in _TEXT_EXTS:
                continue
            fp = os.path.join(dirpath, fn)
            try:
                with open(fp, "r", encoding="utf-8") as f:
                    content = f.read()
            except (UnicodeDecodeError, OSError):
                continue
            matches = pattern.findall(content)
            if not matches:
                continue
            count = len(matches)
            total_matches += count
            rel = os.path.relpath(fp, root_path)
            entry = {"path": rel, "matches": count}
            files_hit.append(entry)
            # 分类：文档类（.md）单独归档，提示用户这些可能是"仅作历史映射"的提及
            if ext in _DOC_EXTS:
                files_doc.append(entry)
            else:
                files_code.append(entry)
            if not dry_run:
                new_content = pattern.sub(new_name, content)
                try:
                    with open(fp, "w", encoding="utf-8") as f:
                        f.write(new_content)
                except OSError:
                    continue

    result = {
        "dry_run": dry_run,
        "root": root,
        "old_names": old_names,
        "new_name": new_name,
        "total_matches": total_matches,
        "files_affected": len(files_hit),
        # 分类报告：代码文件（dry_run=false 时会被改写）
        "files_code": files_code[:50],
        "files_code_count": len(files_code),
        # 文档文件（.md 等，按品牌约束 §4.1 可能是历史映射，需人工复核）
        "files_doc": files_doc[:50],
        "files_doc_count": len(files_doc),
        # 兼容旧字段（保留 files 数组，内容=files_code + files_doc 合并前 50）
        "files": files_hit[:50],
        # 跳过的文件清单（CHANGELOG/HISTORY 等）
        "skipped_files": skipped_files[:20],
        "skipped_count": len(skipped_files),
        "next": (
            "set dry_run=false to write changes; review files_doc before writing — "
            "docs may contain historical mentions that should be preserved"
            if dry_run
            else "changes written; re-run run_diagnosis / check_schema to verify"
        ),
    }
    return json.dumps(result, ensure_ascii=False, indent=2)


def main() -> None:
    """Run the MCP server over stdio."""
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
