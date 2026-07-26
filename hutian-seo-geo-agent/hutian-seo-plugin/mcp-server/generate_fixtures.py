"""生成五工具实跑 JSON fixture，供 verify:tools 门禁消费。

跑法：python generate_fixtures.py
输出：__fixtures__/tool_outputs.json

这是上一轮 _probe_qwen_v02.py 的持久化演进版 —— 逻辑一脉相承，
区别在于把 stdout 打印同时落盘成 fixture，让 TS 侧门禁能读。
改了 tools.py 后重跑本脚本即可刷新 fixture。
"""
from __future__ import annotations

import json
import os
from pathlib import Path

from hutian_seo_mcp.tools import (
    run_diagnosis,
    check_schema,
    trace_citations,
    submit_sitemap,
    entity_rename,
)

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FIXTURES_DIR = Path(__file__).parent / "__fixtures__"
FIXTURES_DIR.mkdir(exist_ok=True)
FIXTURE_PATH = FIXTURES_DIR / "tool_outputs.json"


def banner(t: str) -> None:
    print("\n" + "=" * 72)
    print(f"# {t}")
    print("=" * 72)


fixtures: dict[str, object] = {}

banner("1. run_diagnosis(url='https://example.com')")
out = run_diagnosis("https://example.com")
print(out)
fixtures["run_diagnosis"] = json.loads(out)

banner("2. check_schema(url='https://example.com', expected_type='Product')")
out = check_schema("https://example.com", "Product")
print(out)
fixtures["check_schema"] = json.loads(out)

banner("3. trace_citations(brand='壶天', window_days=30)  — 无 HUTIAN_CITATION_API，走 mock")
os.environ.pop("HUTIAN_CITATION_API", None)
out = trace_citations("壶天", 30)
print(out)
fixtures["trace_citations"] = json.loads(out)

banner("4. submit_sitemap(host='this-host-does-not-exist-xyz.invalid', urls=[...], indexnow_key='test')")
out = submit_sitemap(
    "this-host-does-not-exist-xyz.invalid",
    urls=["https://this-host-does-not-exist-xyz.invalid/"],
    indexnow_key="test-key-not-real",
)
print(out)
fixtures["submit_sitemap"] = json.loads(out)

banner("5. entity_rename(root=REPO_ROOT, old_names=['Tikchip','天启芯'], new_name='壶天', dry_run=True)")
out = entity_rename(
    REPO_ROOT,
    old_names=["Tikchip", "天启芯"],
    new_name="壶天",
    dry_run=True,
)
print(out)
fixtures["entity_rename"] = json.loads(out)

banner("6. 错误模型 — entity_rename 传不存在目录")
out = entity_rename(
    os.path.join(REPO_ROOT, "nonexistent-dir-xyz"),
    old_names=["foo"],
    new_name="bar",
    dry_run=True,
)
print(out)
fixtures["entity_rename_error"] = json.loads(out)

FIXTURE_PATH.write_text(
    json.dumps(fixtures, ensure_ascii=False, indent=2),
    encoding="utf-8",
)
print(f"\n✅ fixture 已写入：{FIXTURE_PATH}")
