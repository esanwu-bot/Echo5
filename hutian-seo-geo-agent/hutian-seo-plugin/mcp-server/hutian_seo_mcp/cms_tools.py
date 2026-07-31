"""建站工具集 · 写 admin，全现成 endpoint（沿用 trace 覆盖度表）

T8.0 重构：工具函数改为调 CmsAdapter 接口（get_adapter()），不再直接调 sitebase_client。
按 cms_type 分发适配器（当前只有 siteBase，T8.5 升级 WordPress 后按 cms_instances.cms_type 分发）。
工具 schema 不变，LLM 完全无感底座差异（ADR-cms-adapter 决策 2）。

5 个建站工具（Qwen 清单 #2）：
  - cms_create_page       → adapter.create_page(PageInput)
  - cms_update_content    → adapter.update_content(id, PageInput)
  - cms_configure_product → adapter.configure_product(ProductInput)
  - cms_upload_media      → adapter.upload_media(file_path, type)
  - cms_publish           → adapter.publish(id, type, status)

入参通用 schema（红线 11）：
  - 商品专用字段 mpn_prefix/spec_summary/rohs_compliant 标"先忽略"
  - 后续若客户是电子零件行业再展开

single source 纪律（Qwen 纪律 #1）：
  - JSON-LD 唯一权威生成器 = apps/web/lib/sites/schema-mapping.ts（TS 侧）
  - 建站工具不生成 schema（MVP 不做 cms_write_schema 工具）
  - schema 由渲染器 SSR 注入，check_schema 复验认同一套结构
  - 若将来加 cms_write_schema，必须复用 schema-mapping.ts，禁止第二份

mock fallback：已搬进 SitebaseAdapter（T8.0），工具函数不再处理 mock。
"""

from __future__ import annotations

import json
import os
import re
import sys
from typing import Any

from mcp.server.fastmcp import FastMCP

from .tools import mcp  # 复用 SEO 腿的 mcp 实例
from .sitebase_client import get_adapter
from .cms_adapter import PageInput, ProductInput


# ─────────────────────────────────────────────
# 工具实现（调 CmsAdapter 接口，按 cms_type 分发）
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

    调 adapter.create_page(PageInput)（trace 覆盖度表第 1 行）。
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
    # 判官日志：验证 env 是否传到 MCP 子进程（脱敏凭证，写 stderr 避免被 MCP stdio 吞掉）
    admin_url = os.getenv("SITEBASE_ADMIN_URL", "<unset>")
    admin_user = os.getenv("SITEBASE_ADMIN_USER", "<unset>")
    admin_pass_mask = "set" if os.getenv("SITEBASE_ADMIN_PASS") else "<unset>"
    sys.stderr.write(
        f"[cms_create_page] env: SITEBASE_ADMIN_URL={admin_url} "
        f"SITEBASE_ADMIN_USER={admin_user} SITEBASE_ADMIN_PASS={admin_pass_mask}\n"
    )
    sys.stderr.flush()

    # 硬纪律：正文不以一级标题开头，避免页面 H1 与 title 重复
    # LLM prompt 已约束，此处兜底
    content = re.sub(r"^#\s+.+\n?", "", content, count=1)

    input = PageInput(
        title=title,
        summary=summary,
        content=content,
        category_id=category_id,
        status=status,
        publish_time=publish_time,
    )
    result = get_adapter().create_page(input)
    return json.dumps(result, ensure_ascii=False, indent=2)


@mcp.tool()
def cms_update_content(
    id: int,
    title: str = "",
    summary: str = "",
    content: str = "",
    category_id: int = 0,
) -> str:
    """编辑页面正文/字段（建站腿 · 写 admin）。

    调 adapter.update_content(id, PageInput)（trace 覆盖度表第 2 行）。

    Args:
        id: 文章 ID
        title/summary/content/category_id: 仅传需要改的字段

    Returns:
        JSON 字符串，含 { ok, data: {...}, source }
    """
    input = PageInput(
        title=title,
        summary=summary,
        content=content,
        category_id=category_id,
    )
    result = get_adapter().update_content(id, input)
    return json.dumps(result, ensure_ascii=False, indent=2)


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

    调 adapter.configure_product(ProductInput)。
    product_id=0 → 新建，product_id>0 → 编辑。

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
    input = ProductInput(
        name=name,
        product_code=product_code,
        description=description,
        price=price,
        stock=stock,
        images=images,
        category_id=category_id,
        brand_id=brand_id,
        is_on_sale=is_on_sale,
        product_id=product_id,
    )
    result = get_adapter().configure_product(input)
    return json.dumps(result, ensure_ascii=False, indent=2)


@mcp.tool()
def cms_upload_media(file_path: str, type: str = "image") -> str:
    """上传媒体文件（建站腿 · 写 admin）。

    调 adapter.upload_media(file_path, type)（trace 覆盖度表第 8 行）。
    MVP 仅支持本地文件路径；URL 下载后上传留作后续。

    Args:
        file_path: 本地文件绝对路径
        type: "image" | "file"（决定 endpoint）

    Returns:
        JSON 字符串，含 { ok, data: {url, filename, path}, source }
    """
    result = get_adapter().upload_media(file_path, type)
    return json.dumps(result, ensure_ascii=False, indent=2)


@mcp.tool()
def cms_publish(id: int, type: str, status: int = 1) -> str:
    """发布/上线/下线（建站腿 · 写 admin）。

    MVP 接受"切换即发布"（无草稿/定时，trace 第 3 节）。
    调 adapter.publish(id, type, status)（trace 覆盖度表第 9 行）。

    Args:
        id: 业务实体 ID
        type: "article" | "product"
        status: 0=下线 1=上线

    Returns:
        JSON 字符串，含 { ok, data: {id, type, status}, source }
    """
    result = get_adapter().publish(id, type, status)
    return json.dumps(result, ensure_ascii=False, indent=2)
