"""CMS 适配器接口 + canonical 模型（底座无关）

ADR-cms-adapter 第 1 层：把"建站底座"抽象成 CmsAdapter 接口，
siteBase/WordPress 各自实现此接口，siteBase 特有字段假设隔离进 SitebaseAdapter。
MCP 工具只认此接口，不碰底座字段。

canonical 模型（Article/Product/PageInput/ProductInput）是壶天定义的底座无关模型，
适配器负责 canonical ↔ 底座字段双向映射；渲染器/SEO 工具只认 canonical。

T8.0 铁律：先有接口再谈第二个实现。这一步零行为变化，纯重构立抽象层。
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


# ─────────────────────────────────────────────
# canonical 模型（壶天定义，底座无关）
# ─────────────────────────────────────────────


@dataclass
class PageInput:
    """创建/编辑页面的 canonical 输入（底座无关）。

    siteBase 映射: title→sk_article.title, content→sk_article.content(markdown), ...
    WordPress 映射: title→post_title, content→post_content(markdown→HTML), ...
    """
    title: str
    summary: str
    content: str
    category_id: int = 0
    status: int = 1
    publish_time: str = ""


@dataclass
class ProductInput:
    """创建/编辑商品的 canonical 输入（底座无关）。

    siteBase 映射: name→sk_product.name, price→sk_product.price, ...
    WordPress 映射: name→WooCommerce product name, price→regular_price, ...
    """
    name: str
    product_code: str
    description: str = ""
    price: float = 0.0
    stock: int = 0
    images: str = ""
    category_id: int = 0
    brand_id: int = 0
    is_on_sale: int = 1
    product_id: int = 0  # >0=编辑现有，0=新建


@dataclass
class Article:
    """canonical Article（底座无关，渲染器/SEO 工具认这个）"""
    id: int
    title: str
    summary: str
    content: str
    category_id: int = 0
    status: int = 1
    publish_time: str = ""


@dataclass
class Product:
    """canonical Product（底座无关，渲染器/SEO 工具认这个）"""
    id: int
    name: str
    product_code: str
    description: str = ""
    price: float = 0.0
    stock: int = 0
    images: str = ""
    category_id: int = 0
    brand_id: int = 0
    is_on_sale: int = 1


# ─────────────────────────────────────────────
# CmsAdapter 接口（底座无关）
# ─────────────────────────────────────────────


class CmsAdapter(ABC):
    """CMS 适配器接口。

    siteBase/WordPress 各自实现此接口。siteBase 特有字段假设（category_id/brand_id/
    is_on_sale 等）全部隔离进 SitebaseAdapter，接口本身底座无关。

    纪律（ADR-cms-adapter）：
      - 假成功要自报家门：能力不支持/API 限流/鉴权失败 → 明确报错，
        绝不静默返回假 id/假数据（跟 siteBase public API 500 不 mock 同脉）
      - 品牌单源：渲染品牌从 workspace.brand_name 派生，不读底座 site title
    """

    @abstractmethod
    def is_available(self) -> bool:
        """探活（验 admin login 拿 token，不验 public 读接口）"""
        ...

    @abstractmethod
    def create_page(self, input: PageInput) -> dict[str, Any]:
        """创建页面/文章 → {ok, data: {id, ...}, source: "live"|"mock"}"""
        ...

    @abstractmethod
    def update_content(self, id: int, input: PageInput) -> dict[str, Any]:
        """编辑页面 → {ok, data, source}"""
        ...

    @abstractmethod
    def configure_product(self, input: ProductInput) -> dict[str, Any]:
        """创建/编辑商品 → {ok, data: {id, ...}, source}"""
        ...

    @abstractmethod
    def upload_media(self, file_path: str, type: str = "image") -> dict[str, Any]:
        """上传媒体 → {ok, data: {url, ...}, source}"""
        ...

    @abstractmethod
    def publish(self, id: int, type: str, status: int = 1) -> dict[str, Any]:
        """发布/下线 → {ok, data, source}"""
        ...
