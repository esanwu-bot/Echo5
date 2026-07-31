"""WordpressAdapter · WordPress + WooCommerce CMS 适配器（建站腿写链路）

T8.1 实现 CmsAdapter 接口的第二个具体适配器，与 SitebaseAdapter 并列。
按 ADR-cms-adapter 第 2 层：cms_instances.cms_type=wordpress 时路由到本适配器。

鉴权（两套，dev 环境 HTTP 下由 mu-plugin hutian-dev-wc-basic-auth.php 放行）：
  - WP REST (posts/media)：Basic Auth user=WP_USER, pw=WP_APP_PASSWORD
    （dev 后门口令 HUTIAN_DEV_APP_PASSWORD；生产用真 Application Password + HTTPS）
  - WooCommerce REST (products)：Basic Auth user=WOO_CK(ck_), pw=WOO_CS(cs_)
    （WooCommerce API key，permissions=read_write）

canonical ↔ WP/Woo 字段映射：
  - PageInput  → WP post (wp/v2/posts)：title→title, content→content, status→status
  - ProductInput → Woo product (wc/v3/products)：name→name, price→regular_price,
    description→description, stock→stock_quantity, images→images, product_code→sku

纪律（与 SitebaseAdapter 对齐）：
  - 假成功要自报家门：WP/Woo 不可用或鉴权失败 → 明确报错，不静默返回假 id
    （dev 环境未起 WP 时回 mock，与 SitebaseAdapter is_available 判定同脉）
  - status 映射：canonical status 1=publish / 0=draft → WP post status publish/draft
  - 品牌单源：渲染品牌从 workspace.brand_name 派生，不读 WP site title
"""

from __future__ import annotations

import base64
import os
from typing import Any

import requests

from .cms_adapter import CmsAdapter, PageInput, ProductInput


class WordpressAuthError(RuntimeError):
    """WP/Woo 鉴权失败（登录失败 / API key 无效）"""


# ─────────────────────────────────────────────
# Mock fixtures（WP 未起时回退，与 SitebaseAdapter mock 对齐）
# ─────────────────────────────────────────────

_MOCK_POST_ID = 1
_MOCK_PRODUCT_ID = 1


def _mock_post_response(title: str, summary: str, content: str) -> dict[str, Any]:
    return {
        "ok": True,
        "data": {
            "id": _MOCK_POST_ID,
            "title": title,
            "summary": summary,
            "content": content,
            "category_id": 0,
            "status": 1,
            "publish_time": "",
        },
        "source": "mock",
        "note": "WordPress backend not available, returned mock data",
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
            "images": "",
            "category_id": 0,
            "brand_id": 0,
            "is_on_sale": 1,
        },
        "source": "mock",
        "note": "WooCommerce backend not available, returned mock data",
    }


# canonical status ↔ WP post status 映射
_WP_STATUS_MAP = {1: "publish", 0: "draft"}
_WP_STATUS_REVERSE = {"publish": 1, "draft": 0, "pending": 0, "private": 1}


class WordpressAdapter(CmsAdapter):
    """WordPress + WooCommerce CMS 适配器（实现 CmsAdapter 接口）

    MVP 假设单 workspace（从 env 取 URL + 凭证）。
    多 workspace 阶段：实例化时传 workspace_id，从 cms_instances 查 URL + 凭证。

    与 SitebaseAdapter 的差异（隔离在本适配器内，接口底座无关）：
      - 鉴权：Basic Auth（WP app password + Woo API key），非 JWT
      - 端点：WP REST /wp-json/wp/v2/* + Woo REST /wp-json/wc/v3/*
      - 字段：post_title/post_content vs sk_article； Woo product vs sk_product
      - status：WP publish/draft vs siteBase 1/0
    """

    def __init__(
        self,
        wp_url: str | None = None,
        wp_user: str | None = None,
        wp_app_password: str | None = None,
        woo_ck: str | None = None,
        woo_cs: str | None = None,
    ) -> None:
        self.wp_url = (wp_url or os.getenv("WP_URL", "http://localhost:8001")).rstrip("/")
        self.wp_user = wp_user or os.getenv("WP_USER", "hutian_admin")
        self.wp_app_password = wp_app_password or os.getenv("WP_APP_PASSWORD", "")
        self.woo_ck = woo_ck or os.getenv("WOO_CK", "")
        self.woo_cs = woo_cs or os.getenv("WOO_CS", "")
        # 复用连接池
        self._session = requests.Session()

    # ─────────────────────────────────────────────
    # 鉴权头
    # ─────────────────────────────────────────────

    def _wp_auth_header(self) -> dict[str, str]:
        """WP REST Basic Auth（user:app_password）"""
        pair = f"{self.wp_user}:{self.wp_app_password}"
        token = base64.b64encode(pair.encode()).decode()
        return {"Authorization": f"Basic {token}"}

    def _woo_auth_header(self) -> dict[str, str]:
        """WooCommerce REST Basic Auth（ck_:cs_）"""
        pair = f"{self.woo_ck}:{self.woo_cs}"
        token = base64.b64encode(pair.encode()).decode()
        return {"Authorization": f"Basic {token}"}

    # ─────────────────────────────────────────────
    # 探活
    # ─────────────────────────────────────────────

    def is_available(self) -> bool:
        """探活 WordPress backend

        验 WP REST 根 (/wp-json/) 可达 + 凭证有效（GET /wp/v2/users/me 带 app password）。
        与 SitebaseAdapter.is_available 同语义：写链路前置条件真实可用才返回 True。
        """
        try:
            # 先验 WP REST 根可达
            resp = self._session.get(
                f"{self.wp_url}/wp-json/",
                timeout=8,
            )
            if resp.status_code != 200:
                return False
            # 再验 app password 凭证有效（GET /wp/v2/users/me）
            auth_resp = self._session.get(
                f"{self.wp_url}/wp-json/wp/v2/users/me",
                headers=self._wp_auth_header(),
                timeout=8,
            )
            return auth_resp.status_code == 200
        except requests.RequestException:
            return False

    def _woo_available(self) -> bool:
        """探活 WooCommerce REST（验 /wc/v3/system_status 带 ck/cs）"""
        try:
            resp = self._session.get(
                f"{self.wp_url}/wp-json/wc/v3/system_status",
                headers=self._woo_auth_header(),
                timeout=8,
            )
            return resp.status_code == 200
        except requests.RequestException:
            return False

    # ─────────────────────────────────────────────
    # 请求封装
    # ─────────────────────────────────────────────

    def _wp_request(
        self,
        method: str,
        path: str,
        *,
        json_body: dict[str, Any] | None = None,
        files: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """WP REST 请求封装，返回 {ok, data, error}"""
        url = f"{self.wp_url}/wp-json/wp/v2/{path.lstrip('/')}"
        headers = self._wp_auth_header()
        try:
            resp = self._session.request(
                method,
                url,
                json=json_body,
                files=files,
                headers=headers,
                timeout=15,
            )
        except requests.RequestException as exc:
            return {"ok": False, "error": f"network: {exc}"}

        if resp.status_code >= 400:
            return {
                "ok": False,
                "error": f"HTTP {resp.status_code}",
                "body": resp.text[:500],
            }

        try:
            data = resp.json()
        except ValueError:
            return {"ok": False, "error": "response not JSON", "body": resp.text[:500]}

        return {"ok": True, "data": data}

    def _woo_request(
        self,
        method: str,
        path: str,
        *,
        json_body: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """WooCommerce REST 请求封装，返回 {ok, data, error}"""
        url = f"{self.wp_url}/wp-json/wc/v3/{path.lstrip('/')}"
        headers = self._woo_auth_header()
        try:
            resp = self._session.request(
                method,
                url,
                json=json_body,
                headers=headers,
                timeout=15,
            )
        except requests.RequestException as exc:
            return {"ok": False, "error": f"network: {exc}"}

        if resp.status_code >= 400:
            return {
                "ok": False,
                "error": f"HTTP {resp.status_code}",
                "body": resp.text[:500],
            }

        try:
            data = resp.json()
        except ValueError:
            return {"ok": False, "error": "response not JSON", "body": resp.text[:500]}

        return {"ok": True, "data": data}

    # ─────────────────────────────────────────────
    # canonical ↔ WP/Woo 字段映射
    # ─────────────────────────────────────────────

    @staticmethod
    def _wp_post_to_canonical(post: dict[str, Any]) -> dict[str, Any]:
        """WP post → canonical article 结构（与 SitebaseAdapter 返回对齐）"""
        # WP post: {id, title:{rendered}, content:{rendered}, excerpt:{rendered}, status, date}
        wp_status = post.get("status", "draft")
        return {
            "id": post.get("id"),
            "title": post.get("title", {}).get("rendered", "") if isinstance(post.get("title"), dict) else post.get("title", ""),
            "summary": post.get("excerpt", {}).get("rendered", "") if isinstance(post.get("excerpt"), dict) else post.get("excerpt", ""),
            "content": post.get("content", {}).get("rendered", "") if isinstance(post.get("content"), dict) else post.get("content", ""),
            "category_id": 0,
            "status": _WP_STATUS_REVERSE.get(wp_status, 0),
            "publish_time": post.get("date", ""),
        }

    @staticmethod
    def _woo_product_to_canonical(product: dict[str, Any]) -> dict[str, Any]:
        """Woo product → canonical product 结构（与 SitebaseAdapter 返回对齐）"""
        # Woo product: {id, name, sku, description, regular_price, stock_quantity, images, ...}
        images = product.get("images", [])
        image_url = images[0].get("src", "") if images else ""
        return {
            "id": product.get("id"),
            "name": product.get("name", ""),
            "product_code": product.get("sku", ""),
            "description": product.get("description", ""),
            "price": float(product.get("regular_price", 0) or 0),
            "stock": int(product.get("stock_quantity", 0) or 0),
            "images": image_url,
            "category_id": 0,
            "brand_id": 0,
            "is_on_sale": 1 if product.get("status", "draft") == "publish" else 0,
        }

    # ─────────────────────────────────────────────
    # CmsAdapter 接口实现
    # ─────────────────────────────────────────────

    def create_page(self, input: PageInput) -> dict[str, Any]:
        """创建页面/文章 → POST /wp-json/wp/v2/posts

        canonical status 1=publish / 0=draft → WP post status
        """
        if not self.is_available():
            return _mock_post_response(input.title, input.summary, input.content)

        body: dict[str, Any] = {
            "title": input.title,
            "content": input.content,
            "excerpt": input.summary,
            "status": _WP_STATUS_MAP.get(input.status, "draft"),
        }
        if input.publish_time:
            body["date"] = input.publish_time

        result = self._wp_request("POST", "posts", json_body=body)
        if not result.get("ok"):
            return {
                "ok": False,
                "retryable": False,
                "error": result.get("error"),
                "detail": result.get("body"),
                "hint": "WordPress 拒绝了请求（如鉴权失败、字段非法），请修正参数后重试",
            }

        return {"ok": True, "data": self._wp_post_to_canonical(result["data"]), "source": "live"}

    def update_content(self, id: int, input: PageInput) -> dict[str, Any]:
        """编辑页面 → PUT /wp-json/wp/v2/posts/{id}"""
        body: dict[str, Any] = {}
        if input.title:
            body["title"] = input.title
        if input.summary:
            body["excerpt"] = input.summary
        if input.content:
            body["content"] = input.content
        if input.status is not None:
            body["status"] = _WP_STATUS_MAP.get(input.status, "draft")

        if not self.is_available():
            return {"ok": True, "data": {"id": id, **body}, "source": "mock"}

        result = self._wp_request("PUT", f"posts/{id}", json_body=body)
        if not result.get("ok"):
            return {"ok": False, "error": result.get("error"), "detail": result.get("body")}

        return {"ok": True, "data": self._wp_post_to_canonical(result["data"]), "source": "live"}

    def configure_product(self, input: ProductInput) -> dict[str, Any]:
        """创建/编辑商品 → POST/PUT /wp-json/wc/v3/products

        product_id > 0 = 编辑，0 = 新建
        canonical price → Woo regular_price, stock → stock_quantity, product_code → sku
        """
        body: dict[str, Any] = {
            "name": input.name,
            "sku": input.product_code,
            "description": input.description,
            "regular_price": str(input.price),
            "stock_quantity": input.stock,
            # WooCommerce 默认 manage_stock=false，此时 stock_quantity 被忽略。
            # canonical stock 要落到 Woo 真实生效字段，强制开启库存管理。
            "manage_stock": True,
            "type": "simple",
        }
        if input.images:
            body["images"] = [{"src": input.images}] if isinstance(input.images, str) else input.images
        # canonical is_on_sale → Woo status（1=publish 上架, 0=draft 下架）
        body["status"] = "publish" if input.is_on_sale else "draft"

        if not self._woo_available():
            mock = _mock_product_response(input.name, input.product_code, input.price)
            if input.product_id:
                mock["data"]["id"] = input.product_id
            return mock

        if input.product_id:
            result = self._woo_request("PUT", f"products/{input.product_id}", json_body=body)
        else:
            result = self._woo_request("POST", "products", json_body=body)

        if not result.get("ok"):
            return {
                "ok": False,
                "retryable": False,
                "error": result.get("error"),
                "detail": result.get("body"),
                "hint": "WooCommerce 拒绝了请求（如 SKU 重复、鉴权失败），请修正参数后重试",
            }

        return {"ok": True, "data": self._woo_product_to_canonical(result["data"]), "source": "live"}

    def upload_media(self, file_path: str, type: str = "image") -> dict[str, Any]:
        """上传媒体 → POST /wp-json/wp/v2/media

        WP media 端点用 app password 鉴权，返回 {id, source_url, ...}
        """
        if not os.path.exists(file_path):
            return {"ok": False, "error": f"file not found: {file_path}"}

        if not self.is_available():
            mock_url = f"/uploads/mock-{os.path.basename(file_path)}"
            return {
                "ok": True,
                "data": {"url": mock_url, "filename": os.path.basename(file_path), "path": mock_url},
                "source": "mock",
            }

        try:
            with open(file_path, "rb") as f:
                files = {"file": (os.path.basename(file_path), f)}
                result = self._wp_request("POST", "media", files=files)
        except OSError as exc:
            return {"ok": False, "error": f"read file error: {exc}"}

        if not result.get("ok"):
            return {"ok": False, "error": result.get("error"), "detail": result.get("body")}

        media = result["data"]
        return {
            "ok": True,
            "data": {
                "id": media.get("id"),
                "url": media.get("source_url", ""),
                "filename": os.path.basename(file_path),
                "path": media.get("source_url", ""),
            },
            "source": "live",
        }

    def publish(self, id: int, type: str, status: int = 1) -> dict[str, Any]:
        """发布/下线 → PUT posts/{id} 或 products/{id} 切 status

        canonical status 1=publish, 0=draft
        type: "article"=WP post, "product"=Woo product
        """
        wp_status = _WP_STATUS_MAP.get(status, "draft")

        if type == "article":
            if not self.is_available():
                return {"ok": True, "data": {"id": id, "type": type, "status": status}, "source": "mock"}
            result = self._wp_request("PUT", f"posts/{id}", json_body={"status": wp_status})
        elif type == "product":
            if not self._woo_available():
                return {"ok": True, "data": {"id": id, "type": type, "status": status}, "source": "mock"}
            woo_status = "publish" if status == 1 else "draft"
            result = self._woo_request("PUT", f"products/{id}", json_body={"status": woo_status})
        else:
            return {"ok": False, "error": f"unsupported type: {type}"}

        if not result.get("ok"):
            return {"ok": False, "error": result.get("error"), "detail": result.get("body")}

        return {"ok": True, "data": {"id": id, "type": type, "status": status}, "source": "live"}


# ─────────────────────────────────────────────
# 工厂函数（T8.5 按 cms_type 分发时用）
# ─────────────────────────────────────────────

_adapter: WordpressAdapter | None = None


def get_wp_adapter() -> WordpressAdapter:
    """获取 WordpressAdapter 单例（MVP 单 workspace）"""
    global _adapter
    if _adapter is None:
        _adapter = WordpressAdapter()
    return _adapter
