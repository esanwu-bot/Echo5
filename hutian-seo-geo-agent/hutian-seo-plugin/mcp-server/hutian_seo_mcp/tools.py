"""Hutian SEO/GEO MCP tools.

Implements five tools on top of FastMCP (names are locked by the PRD/技术方案
工具名闭环契约 — do not rename):
- run_diagnosis: SEO/GEO diagnosis of a URL.               ← FR-A01
- check_schema: extract & validate JSON-LD blocks.          ← FR-A02
- trace_citations: brand citation tracking across AI engines.← FR-A03
- submit_sitemap: IndexNow submission to Google/Bing.       ← FR-A04
- entity_rename: project-wide brand entity rename.          ← FR-A05

JSON-LD snippet *generation* is intentionally not a tool — grok's built-in
edit_file/write_file handles authoring; check_schema only reports what is
missing.
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

# Dirs skipped by entity_rename (VCS / build / deps).
_SKIP_DIRS = {
    ".git", "node_modules", "dist", "build", ".next",
    "__pycache__", ".turbo", ".venv", "venv",
}
# Only text/markup extensions are scanned/replaced by entity_rename.
_TEXT_EXTS = {
    ".md", ".json", ".jsonld", ".html", ".htm", ".js", ".jsx",
    ".ts", ".tsx", ".py", ".yaml", ".yml", ".txt", ".css",
    ".xml", ".vue", ".svelte", ".toml", ".ini", ".conf",
}


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

    result = {
        "url": page_url,
        "seo_score": seo_score,
        "geo_score": geo_score,
        "entity_clarity": entity_clarity,
        "jsonld_types": sorted({b.get("@type") for b in typed if b.get("@type")}),
        "pagespeed": pagespeed,
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
        "engines": [
            {"engine": "DeepSeek-V3", "share": 42, "tag": "ds", "note": "主要来源"},
            {"engine": "GPT-4o", "share": 28, "tag": "gpt", "note": "次要权威"},
            {"engine": "Kimi", "share": 15, "tag": "kimi", "note": "提及"},
            {"engine": "其他", "share": 15, "tag": "oth", "note": "长尾"},
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
            results[name] = {
                "status": resp.status_code,
                "ok": resp.status_code in (200, 202),
            }
        except requests.RequestException as exc:
            results[name] = {"status": None, "ok": False, "error": str(exc)}

    any_ok = any(r.get("ok") for r in results.values())
    summary = {
        "host": hostname,
        "submitted": len(urls),
        "key_location": key_location,
        "targets": results,
        "ok": any_ok,
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
    total_matches = 0

    for dirpath, dirnames, filenames in os.walk(root_path):
        # prune in-place so os.walk does not descend into them
        dirnames[:] = [d for d in dirnames if d not in _SKIP_DIRS]
        for fn in filenames:
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
            files_hit.append({"path": rel, "matches": count})
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
        "files": files_hit[:50],
        "next": (
            "set dry_run=false to write changes"
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
