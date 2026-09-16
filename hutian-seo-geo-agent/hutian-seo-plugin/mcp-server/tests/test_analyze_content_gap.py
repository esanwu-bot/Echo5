"""dry-run 单测：直调 analyze_content_gap 工具，断言核心输出非空。

断言：
  1. serp_results 非空
  2. 至少 1 个 competitor markdown 非空
  3. content_gap_brief 非 null

需要 SERPER_API_KEY 环境变量（从 .env 读取）。
"""

from __future__ import annotations

import json
import os
import sys

# 确保能 import hutian_seo_mcp
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from hutian_seo_mcp.scrape_tools import analyze_content_gap  # noqa: E402


def main() -> int:
    api_key = os.environ.get("SERPER_API_KEY", "").strip()
    if not api_key:
        print("SKIP: SERPER_API_KEY not set (dry-run requires real Serper key)")
        return 0

    print(">>> 调用 analyze_content_gap('electric tricycle', num_results=5) ...")
    raw = analyze_content_gap("electric tricycle", num_results=5)
    result = json.loads(raw)

    errors: list[str] = []

    # 断言 1: serp_results 非空
    serp = result.get("serp_results", [])
    if not serp:
        errors.append("serp_results is empty")
    else:
        print(f"  ✅ serp_results: {len(serp)} items")

    # 断言 2: 至少 1 个 competitor markdown 非空
    competitors = result.get("competitor_analysis", [])
    ok_competitors = [c for c in competitors if c.get("fetched_ok")]
    if not ok_competitors:
        errors.append(
            "no competitor markdown fetched (all fetch_failed) — "
            f"competitors={len(competitors)}"
        )
    else:
        print(f"  ✅ competitor markdown: {len(ok_competitors)}/{len(competitors)} fetched")

    # 断言 3: content_gap_brief 非 null
    brief = result.get("content_gap_brief")
    if brief is None:
        errors.append("content_gap_brief is null")
    else:
        print(f"  ✅ content_gap_brief: competitors_analyzed={brief.get('competitors_analyzed')}")

    if errors:
        print("\n❌ FAIL:")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("\n✅ ALL ASSERTIONS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
