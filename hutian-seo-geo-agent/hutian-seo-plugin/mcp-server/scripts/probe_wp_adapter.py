"""T8.1 · WordpressAdapter 路由探针

直接调 WordpressAdapter 的 5 个 CmsAdapter 接口方法，断言请求真落到
WordPress REST (/wp-json/wp/v2/*) 和 WooCommerce REST (/wp-json/wc/v3/*)，
且 canonical↔WP/Woo 字段映射正确。

前置：
  - WordPress dev server 已起（start_wordpress.bat，端口 8001）
  - wp-config.php 已定义 HUTIAN_DEV_APP_PASSWORD
  - mu-plugins/hutian-dev-wc-basic-auth.php 已生效
  - WooCommerce 已激活且生成了 ck_/cs_ API key（permissions=read_write）
  - .env 配好 WP_URL/WP_USER/WP_APP_PASSWORD/WOO_CK/WOO_CS

诚实边界：
  - 本探针验"WordpressAdapter → WP/Woo REST 路由 + 字段映射"
  - 不验 MCP server/bridge 链路（由 probe-e2e-routing.ts 覆盖 siteBase 链路）
  - 不验多租户路由（cms_instances.cms_type=wordpress 分发由 T8.5 实现）
  - 探针会创建真实 post/product/media，结束时 DELETE 清理

用法：python scripts/probe_wp_adapter.py
退出码：0=全绿，1=有断言失败
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import time
from pathlib import Path
from typing import Any

# 让 hutian_seo_mcp 可 import
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# 加载 .env（位于 hutian-seo-geo-agent/.env，即探针上溯 4 层）
# MCP 模块本身不加载 .env，依赖外部注入；探针独立运行时手动 parse。
_ENV_FILE = Path(__file__).resolve().parent.parent.parent.parent / ".env"
if _ENV_FILE.exists():
    for _line in _ENV_FILE.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if not _line or _line.startswith("#") or "=" not in _line:
            continue
        _k, _, _v = _line.partition("=")
        os.environ.setdefault(_k.strip(), _v.strip())

from hutian_seo_mcp.cms_adapter import PageInput, ProductInput  # noqa: E402
from hutian_seo_mcp.wp_client import WordpressAdapter  # noqa: E402


# ─────────────────────────────────────────────
# 断言工具
# ─────────────────────────────────────────────

_passed = 0
_failed = 0
_failures: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    global _passed, _failed
    if cond:
        _passed += 1
        print(f"  ✓ {name}")
    else:
        _failed += 1
        _failures.append(f"{name}: {detail}")
        print(f"  ✗ {name}  {detail}")


def section(title: str) -> None:
    print(f"\n── {title} ──")


# ─────────────────────────────────────────────
# 探针主体
# ─────────────────────────────────────────────


def main() -> int:
    print("─" * 60)
    print("T8.1 · WordpressAdapter 路由探针")
    print("─" * 60)

    adapter = WordpressAdapter()
    print(f"WP_URL  = {adapter.wp_url}")
    print(f"WP_USER = {adapter.wp_user}")
    print(f"WOO_CK  = {adapter.woo_ck[:8]}...{adapter.woo_ck[-4:]}")

    # 创建的资源 id，结束时清理
    created_post_ids: list[int] = []
    created_product_ids: list[int] = []
    created_media_ids: list[int] = []

    try:
        # ── ① is_available / _woo_available 探活 ──
        section("① 探活 is_available + _woo_available")
        wp_ok = adapter.is_available()
        check("WP REST 探活 (is_available)", wp_ok, "WP 不可达或 app password 鉴权失败")
        woo_ok = adapter._woo_available()
        check("Woo REST 探活 (_woo_available)", woo_ok, "Woo 不可达或 ck/cs 鉴权失败")

        if not (wp_ok and woo_ok):
            print("\n[fatal] WP/Woo 未就绪，无法跑 live 路由断言，终止。")
            print("        请先跑 start_wordpress.bat 并确认 WooCommerce + mu-plugin 生效。")
            return 1

        # ── ② create_page → POST /wp/v2/posts ──
        section("② create_page → POST /wp/v2/posts")
        stamp = time.strftime("%H%M%S")
        page_input = PageInput(
            title=f"[probe] T8.1 测试文章 {stamp}",
            summary="probe_wp_adapter 路由验证用，稍后删除",
            content="## 概述\n\n这是 WordpressAdapter.create_page 创建的测试文章。",
            status=0,  # draft，避免污染前端
        )
        result = adapter.create_page(page_input)
        check("create_page ok=True", result.get("ok") is True, json.dumps(result, ensure_ascii=False)[:200])
        check("create_page source=live", result.get("source") == "live", f"source={result.get('source')}")
        post_id = result.get("data", {}).get("id") if result.get("ok") else None
        check("create_page 返回 id", isinstance(post_id, int) and post_id > 0, f"id={post_id}")
        if post_id:
            created_post_ids.append(post_id)
            # 验字段映射：title/excerpt/content 回读一致
            title_back = result["data"].get("title", "")
            check(
                "create_page title 映射一致",
                page_input.title in title_back or title_back in page_input.title,
                f"expected={page_input.title!r}, got={title_back!r}",
            )
            check(
                "create_page status=draft → canonical status=0",
                result["data"].get("status") == 0,
                f"status={result['data'].get('status')}",
            )

        # ── ③ update_content → PUT /wp/v2/posts/{id} ──
        section("③ update_content → PUT /wp/v2/posts/{id}")
        if post_id:
            update_input = PageInput(
                title=f"[probe] 已更新 {stamp}",
                summary="update_content 改过的摘要",
                content="## 更新后\n\n内容已被 WordpressAdapter.update_content 覆盖。",
                status=0,
            )
            result = adapter.update_content(post_id, update_input)
            check("update_content ok=True", result.get("ok") is True, json.dumps(result, ensure_ascii=False)[:200])
            check("update_content source=live", result.get("source") == "live", f"source={result.get('source')}")
            title_back = result.get("data", {}).get("title", "") if result.get("ok") else ""
            check(
                "update_content title 已改",
                "已更新" in title_back,
                f"got title={title_back!r}",
            )

        # ── ④ configure_product → POST /wc/v3/products ──
        section("④ configure_product → POST /wc/v3/products")
        # SKU 唯一，加时间戳防冲突
        sku = f"PROBE-T81-{stamp}"
        product_input = ProductInput(
            name=f"[probe] T8.1 测试商品 {stamp}",
            product_code=sku,
            description="probe_wp_adapter 路由验证用 WooCommerce 商品，稍后删除",
            price=12.34,
            stock=56,
            is_on_sale=1,
        )
        result = adapter.configure_product(product_input)
        check("configure_product ok=True", result.get("ok") is True, json.dumps(result, ensure_ascii=False)[:200])
        check("configure_product source=live", result.get("source") == "live", f"source={result.get('source')}")
        product_id = result.get("data", {}).get("id") if result.get("ok") else None
        check("configure_product 返回 id", isinstance(product_id, int) and product_id > 0, f"id={product_id}")
        if product_id:
            created_product_ids.append(product_id)
            # 验字段映射：name/product_code(sku)/price 回读一致
            name_back = result["data"].get("name", "")
            check(
                "configure_product name 映射一致",
                product_input.name in name_back or name_back in product_input.name,
                f"expected={product_input.name!r}, got={name_back!r}",
            )
            check(
                "configure_product product_code→sku 映射一致",
                result["data"].get("product_code") == sku,
                f"expected sku={sku!r}, got={result['data'].get('product_code')!r}",
            )
            check(
                "configure_product price→regular_price 映射一致",
                abs(result["data"].get("price", 0) - 12.34) < 0.001,
                f"got price={result['data'].get('price')}",
            )
            check(
                "configure_product stock→stock_quantity 映射一致",
                result["data"].get("stock") == 56,
                f"got stock={result['data'].get('stock')}",
            )

        # ── ⑤ configure_product 编辑（product_id>0 → PUT）──
        section("⑤ configure_product 编辑 → PUT /wc/v3/products/{id}")
        if product_id:
            edit_input = ProductInput(
                name=f"[probe] 已改价 {stamp}",
                product_code=sku,  # SKU 不变
                description="update 后的商品描述",
                price=99.99,
                stock=10,
                is_on_sale=1,
                product_id=product_id,
            )
            result = adapter.configure_product(edit_input)
            check("configure_product PUT ok=True", result.get("ok") is True, json.dumps(result, ensure_ascii=False)[:200])
            check(
                "configure_product PUT price 已改",
                abs(result.get("data", {}).get("price", 0) - 99.99) < 0.001,
                f"got price={result.get('data', {}).get('price')}",
            )

        # ── ⑥ upload_media → POST /wp/v2/media ──
        section("⑥ upload_media → POST /wp/v2/media")
        # 写一个临时 PNG（1×1 透明像素）
        tmp_dir = Path(tempfile.gettempdir()) / "probe-wp-adapter"
        tmp_dir.mkdir(exist_ok=True)
        img_path = tmp_dir / f"probe-{stamp}.png"
        # 1×1 透明 PNG 的最小字节序列
        img_path.write_bytes(
            bytes.fromhex(
                "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
                "0000000d49444154789c63600100000005000100"
                "0d0a2db40000000049454e44ae426082"
            )
        )
        result = adapter.upload_media(str(img_path), type="image")
        check("upload_media ok=True", result.get("ok") is True, json.dumps(result, ensure_ascii=False)[:200])
        check("upload_media source=live", result.get("source") == "live", f"source={result.get('source')}")
        media_url = result.get("data", {}).get("url", "") if result.get("ok") else ""
        check("upload_media 返回 url", bool(media_url), f"url={media_url!r}")
        # 从 url 反查 media id 用于清理（WP media 返回的 source_url 不直接含 id，
        # 我们额外 GET 一次 /wp/v2/media?parent=0 取最新一条作为本次上传的）
        try:
            probe_resp = adapter._session.get(
                f"{adapter.wp_url}/wp-json/wp/v2/media",
                headers=adapter._wp_auth_header(),
                params={"per_page": 1, "orderby": "date", "order": "desc"},
                timeout=10,
            )
            if probe_resp.status_code == 200 and probe_resp.json():
                created_media_ids.append(probe_resp.json()[0].get("id"))
        except Exception:  # noqa: BLE001
            pass
        img_path.unlink(missing_ok=True)

        # ── ⑦ publish (article, 1=publish) → PUT /wp/v2/posts/{id} status=publish ──
        section("⑦ publish(article, 1) → PUT posts/{id} status=publish")
        if post_id:
            result = adapter.publish(post_id, "article", 1)
            check("publish article ok=True", result.get("ok") is True, json.dumps(result, ensure_ascii=False)[:200])
            check("publish article source=live", result.get("source") == "live", f"source={result.get('source')}")
            # 回读 WP 确认 status 真改了
            verify = adapter._wp_request("GET", f"posts/{post_id}")
            wp_status = verify.get("data", {}).get("status", "") if verify.get("ok") else ""
            check(
                "publish article 回读 WP status=publish",
                wp_status == "publish",
                f"wp status={wp_status!r}",
            )

        # ── ⑧ publish (article, 0=draft) → 切回 draft ──
        section("⑧ publish(article, 0) → PUT posts/{id} status=draft")
        if post_id:
            result = adapter.publish(post_id, "article", 0)
            check("publish article 0 ok=True", result.get("ok") is True, json.dumps(result, ensure_ascii=False)[:200])
            verify = adapter._wp_request("GET", f"posts/{post_id}")
            wp_status = verify.get("data", {}).get("status", "") if verify.get("ok") else ""
            check(
                "publish article 0 回读 WP status=draft",
                wp_status == "draft",
                f"wp status={wp_status!r}",
            )

        # ── ⑨ publish (product, 0=draft) → PUT /wc/v3/products/{id} status=draft ──
        section("⑨ publish(product, 0) → PUT products/{id} status=draft")
        if product_id:
            result = adapter.publish(product_id, "product", 0)
            check("publish product 0 ok=True", result.get("ok") is True, json.dumps(result, ensure_ascii=False)[:200])
            verify = adapter._woo_request("GET", f"products/{product_id}")
            woo_status = verify.get("data", {}).get("status", "") if verify.get("ok") else ""
            check(
                "publish product 0 回读 Woo status=draft",
                woo_status == "draft",
                f"woo status={woo_status!r}",
            )

        # ── ⑩ mock fallback：WP 不可用时回 mock ──
        section("⑩ mock fallback：WP 不可用时回 mock")
        mock_adapter = WordpressAdapter(
            wp_url="http://127.0.0.1:1",  # 必失败的端口
            wp_user="x",
            wp_app_password="x",
            woo_ck="ck_x",
            woo_cs="cs_x",
        )
        result = mock_adapter.create_page(PageInput(title="mock", summary="m", content="m"))
        check(
            "mock create_page source=mock",
            result.get("source") == "mock" and result.get("ok") is True,
            json.dumps(result, ensure_ascii=False)[:200],
        )
        result = mock_adapter.configure_product(ProductInput(name="m", product_code="m"))
        check(
            "mock configure_product source=mock",
            result.get("source") == "mock" and result.get("ok") is True,
            json.dumps(result, ensure_ascii=False)[:200],
        )

    finally:
        # ── 清理：DELETE 创建的 post/product/media ──
        section("清理创建的资源")
        for pid in created_post_ids:
            try:
                adapter._wp_request("DELETE", f"posts/{pid}", json_body={"force": True})
                print(f"  · deleted post {pid}")
            except Exception as exc:  # noqa: BLE001
                print(f"  ! delete post {pid} failed: {exc}")
        for pid in created_product_ids:
            try:
                adapter._woo_request("DELETE", f"products/{pid}", json_body={"force": True})
                print(f"  · deleted product {pid}")
            except Exception as exc:  # noqa: BLE001
                print(f"  ! delete product {pid} failed: {exc}")
        for mid in created_media_ids:
            try:
                adapter._wp_request("DELETE", f"media/{mid}", json_body={"force": True})
                print(f"  · deleted media {mid}")
            except Exception as exc:  # noqa: BLE001
                print(f"  ! delete media {mid} failed: {exc}")

    # ── 汇总 ──
    print("\n" + "─" * 60)
    total = _passed + _failed
    print(f"结果：{_passed}/{total} 通过")
    if _failed == 0:
        print("🟢 WordpressAdapter 路由 + canonical↔WP/Woo 字段映射全部成立")
        return 0
    print(f"🔴 有 {_failed} 项断言失败：")
    for f in _failures:
        print(f"   - {f}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
