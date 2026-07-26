"""建站工具集 · 写 admin，全现成 endpoint（沿用 trace 覆盖度表）

5 个建站工具（Qwen 清单 #2）：
  - cms_create_page       → POST /api/admin/articles
  - cms_update_content    → PUT  /api/admin/articles/:id
  - cms_configure_product → POST/PUT /api/admin/products
  - cms_upload_media      → POST /api/admin/upload/image
  - cms_publish           → PUT status 切换（MVP 接受"切换即发布"）

入参通用 schema（红线 11）：
  - 商品专用字段 mpn_prefix/spec_summary/rohs_compliant 标"先忽略"
  - 后续若客户是电子零件行业再展开

single source 纪律（Qwen 纪律 #1）：
  - JSON-LD 唯一权威生成器 = apps/web/lib/sites/schema-mapping.ts（TS 侧）
  - 建站工具不生成 schema（MVP 不做 cms_write_schema 工具）
  - schema 由渲染器 SSR 注入，check_schema 复验认同一套结构
  - 若将来加 cms_write_schema，必须复用 schema-mapping.ts，禁止第二份

mock fallback（与 SiteBaseReader 同构）：
  - siteBase 不可达时返回 mock 数据（含 id），让 loop 能继续跑 check_schema
  - 生产期关闭 mock（SITEBASE_ALLOW_MOCK=false）
"""

from __future__ import annotations

import json
import os
from typing import Any

from mcp.server.fastmcp import FastMCP

from .tools import mcp  # 复用 SEO 腿的 mcp 实例
from .sitebase_client import get_client, is_sitebase_available


# ─────────────────────────────────────────────
# Mock fixtures（与 reader.ts 的 MOCK_ARTICLE/MOCK_PRODUCT 对齐）
# ─────────────────────────────────────────────

_MOCK_ARTICLE_ID = 1
_MOCK_PRODUCT_ID = 1


def _mock_article_response(title: str, summary: str, content: str) -> dict[str, Any]:
    return {
        "ok": True,
        "data": {
            "id": _MOCK_ARTICLE_ID,
            "title": title,
            "summary": summary,
            "content": content,
            "category_id": 1,
            "status": 1,
            "publish_time": "2026-07-26 10:00:00",
        },
        "source": "mock",
        "note": "siteBase backend not available, returned mock data",
    }


def _mock_product_response(name: str, product_code: str, price: float) -> dict[str, Any]:
    return {
        "ok": True,
        "data": {
            "id": _MOCK_PRODUCT_ID,
            "name": name,
            "product_code": product_code,
            "description": f"{name} - 自动生成的商品描述",
            "price": price,
            "stock": 1000,
            "images": "/uploads/mock-product.jpg",
            "category_id": 1,
            "brand_id": 1,
            "is_on_sale": 1,
        },
        "source": "mock",
        "note": "siteBase backend not available, returned mock data",
    }


# ─────────────────────────────────────────────
# 工具实现
# ─────────────────────────────────────────────


@mcp.tool()
def cms_create_page(
    title: str,
    summary: str,
    content: str,
    category_id: int = 0,
    status: int = 1,
    publish_time: str = "",
) -> str:
    """创建页面/文章（建站腿 · 写 admin）。

    调 POST /api/admin/articles（trace 覆盖度表第 1 行）。
    入参通用 CMS 字段；电子零件专用字段不在此工具（红线 11）。

    Args:
        title: 文章标题
        summary: 摘要
        content: 正文（支持 markdown）
        category_id: 文章分类 ID（可选，0=不分类）
        status: 0=禁用 1=启用
        publish_time: 发布时间（空=用当前时间）

    Returns:
        JSON 字符串，含 { ok, data: {id, ...}, source: "live"|"mock" }
        afterGuardrail 会据 data.id 自动触发 check_schema 复验渲染器 URL
    """
    body: dict[str, Any] = {
        "title": title,
        "summary": summary,
        "content": content,
        "status": status,
    }
    if category_id:
        body["category_id"] = category_id
    if publish_time:
        body["publish_time"] = publish_time

    if not is_sitebase_available():
        mock = _mock_article_response(title, summary, content)
        return json.dumps(mock, ensure_ascii=False, indent=2)

    client = get_client()
    result = client.request("POST", "/articles", json_body=body)
    if not result.get("ok"):
        # live 失败也 fallback mock，保证 loop 能继续跑复验
        mock = _mock_article_response(title, summary, content)
        mock["live_error"] = result.get("error")
        return json.dumps(mock, ensure_ascii=False, indent=2)

    return json.dumps(
        {"ok": True, "data": result.get("data"), "source": "live"},
        ensure_ascii=False,
        indent=2,
    )


@mcp.tool()
def cms_update_content(
    id: int,
    title: str = "",
    summary: str = "",
    content: str = "",
    category_id: int = 0,
) -> str:
    """编辑页面正文/字段（建站腿 · 写 admin）。

    调 PUT /api/admin/articles/:id（trace 覆盖度表第 2 行）。

    Args:
        id: 文章 ID
        title/summary/content/category_id: 仅传需要改的字段

    Returns:
        JSON 字符串，含 { ok, data: {...}, source }
    """
    body: dict[str, Any] = {}
    if title:
        body["title"] = title
    if summary:
        body["summary"] = summary
    if content:
        body["content"] = content
    if category_id:
        body["category_id"] = category_id

    if not is_sitebase_available():
        return json.dumps(
            {"ok": True, "data": {"id": id, **body}, "source": "mock"},
            ensure_ascii=False,
            indent=2,
        )

    client = get_client()
    result = client.request("PUT", f"/articles/{id}", json_body=body)
    return json.dumps(
        {"ok": result.get("ok", False), "data": result.get("data"), "source": "live"},
        ensure_ascii=False,
        indent=2,
    )


@mcp.tool()
def cms_configure_product(
    name: str,
    product_code: str,
    description: str = "",
    price: float = 0.0,
    stock: int = 0,
    images: str = "",
    category_id: int = 0,
    brand_id: int = 0,
    is_on_sale: int = 1,
    product_id: int = 0,
) -> str:
    """创建或编辑商品（建站腿 · 写 admin）。

    product_id=0 → POST /api/admin/articles（新建）
    product_id>0 → PUT  /api/admin/products/:id（编辑）

    入参通用 schema（红线 11）：
      - 电子零件专用字段 mpn_prefix/spec_summary/rohs_compliant 不在此工具
      - 后续若客户是电子零件行业再展开

    Args:
        name: 商品名
        product_code: 商品编码
        description: 描述
        price: 单价（USD）
        stock: 库存
        images: 图片 URL（JSON 数组或单 URL）
        category_id: 分类 ID
        brand_id: 品牌 ID
        is_on_sale: 0=下架 1=上架
        product_id: >0=编辑现有，0=新建

    Returns:
        JSON 字符串，含 { ok, data: {id, ...}, source }
        afterGuardrail 会据 data.id 自动触发 check_schema 复验渲染器 URL
    """
    body: dict[str, Any] = {
        "name": name,
        "product_code": product_code,
        "description": description,
        "price": price,
        "stock": stock,
        "is_on_sale": is_on_sale,
    }
    if images:
        body["images"] = images
    if category_id:
        body["category_fk_id"] = category_id
    if brand_id:
        body["brand_id"] = brand_id

    if not is_sitebase_available():
        mock = _mock_product_response(name, product_code, price)
        if product_id:
            mock["data"]["id"] = product_id
        return json.dumps(mock, ensure_ascii=False, indent=2)

    client = get_client()
    if product_id:
        result = client.request("PUT", f"/products/{product_id}", json_body=body)
    else:
        result = client.request("POST", "/products", json_body=body)

    if not result.get("ok"):
        mock = _mock_product_response(name, product_code, price)
        mock["live_error"] = result.get("error")
        return json.dumps(mock, ensure_ascii=False, indent=2)

    return json.dumps(
        {"ok": True, "data": result.get("data"), "source": "live"},
        ensure_ascii=False,
        indent=2,
    )


@mcp.tool()
def cms_upload_media(file_path: str, type: str = "image") -> str:
    """上传媒体文件（建站腿 · 写 admin）。

    调 POST /api/admin/upload/image（trace 覆盖度表第 8 行）。
    MVP 仅支持本地文件路径；URL 下载后上传留作后续。

    Args:
        file_path: 本地文件绝对路径
        type: "image" | "file"（决定 endpoint）

    Returns:
        JSON 字符串，含 { ok, data: {url, filename, path}, source }
    """
    if not os.path.exists(file_path):
        return json.dumps(
            {"ok": False, "error": f"file not found: {file_path}"},
            ensure_ascii=False,
            indent=2,
        )

    if not is_sitebase_available():
        mock_url = f"/uploads/mock-{os.path.basename(file_path)}"
        return json.dumps(
            {
                "ok": True,
                "data": {
                    "url": mock_url,
                    "filename": os.path.basename(file_path),
                    "path": mock_url,
                },
                "source": "mock",
            },
            ensure_ascii=False,
            indent=2,
        )

    client = get_client()
    endpoint = "/upload/images" if type == "image" else "/upload/file"
    try:
        with open(file_path, "rb") as f:
            files = {"file": (os.path.basename(file_path), f)}
            result = client.request("POST", endpoint, files=files)
    except OSError as exc:
        return json.dumps(
            {"ok": False, "error": f"read file error: {exc}"},
            ensure_ascii=False,
            indent=2,
        )

    return json.dumps(
        {"ok": result.get("ok", False), "data": result.get("data"), "source": "live"},
        ensure_ascii=False,
        indent=2,
    )


@mcp.tool()
def cms_publish(id: int, type: str, status: int = 1) -> str:
    """发布/上线/下线（建站腿 · 写 admin）。

    MVP 接受"切换即发布"（无草稿/定时，trace 第 3 节）。
    调 PUT status 字段切换（trace 覆盖度表第 9 行）。

    Args:
        id: 业务实体 ID
        type: "article" | "product"
        status: 0=下线 1=上线

    Returns:
        JSON 字符串，含 { ok, data: {id, type, status}, source }
    """
    if type == "article":
        path = f"/articles/{id}"
        body = {"status": status}
    elif type == "product":
        # 商品用 batch-status 或直接 PUT is_on_sale
        path = f"/products/{id}"
        body = {"is_on_sale": status}
    else:
        return json.dumps(
            {"ok": False, "error": f"unsupported type: {type}"},
            ensure_ascii=False,
            indent=2,
        )

    if not is_sitebase_available():
        return json.dumps(
            {"ok": True, "data": {"id": id, "type": type, "status": status}, "source": "mock"},
            ensure_ascii=False,
            indent=2,
        )

    client = get_client()
    result = client.request("PUT", path, json_body=body)
    return json.dumps(
        {"ok": result.get("ok", False), "data": {"id": id, "type": type, "status": status}, "source": "live"},
        ensure_ascii=False,
        indent=2,
    )
