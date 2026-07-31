"""SiteBaseClient · admin JWT 客户端（建站腿写链路）

设计原则（Qwen 清单 #3）：
  - admin JWT，token 缓存 + 401 自动重登
  - workspace→siteBase URL 映射（MVP 单 workspace，从 env 取；多 workspace 后置）
  - 专用账号 hutian_agent 限 role（中期，MVP 用现有 admin 账号）

读写分链路（γ 红线）：
  - SiteBaseReader（TS 侧 lib/sites/reader.ts）只读 v1 public GET
  - SiteBaseClient（本模块）只写 admin API，不读 v1

证据：route/admin.php 全部 admin 路由在 /api/admin/* 下，
       统一 AdminAuthMiddleware 保护（JWT Bearer Token，HS256，30 天过期）
       trace 报告第 6 节：无 refresh token endpoint，过期需重新 POST /api/admin/login
"""

from __future__ import annotations

import json
import os
import time
from typing import Any

import requests


class SiteBaseAuthError(RuntimeError):
    """admin 鉴权失败（登录失败 / token 失效且重登失败）"""


class SiteBaseClient:
    """siteBase backend admin API 客户端

    MVP 假设单 workspace（从 env 取 URL + 账号）。
    多 workspace 阶段：实例化时传 workspace_id，从映射表查 URL + 账号。

    多租户路由（ADR-cross-lang）：
      base_url 从 env SITEBASE_ADMIN_URL 读，由 bridge 实例池在 spawn 时注入。
      bridge 按 session 验签 payload 的 sitebase_base_url 维护独立 Python 子进程，
      不同租户 → 不同子进程 → 不同 env → 路由到不同 siteBase 实例。

    信任边界（stdio 同域前提）：
      MCP 信任 bridge 经 stdio 传入的 env 路由，自身不验签——前提是 stdio 同信任域
      （bridge 已验过 HMAC 签名，验签后的可信 payload 通过 stdio 内部传给 MCP）。
      若 MCP 将来独立部署/走网络，必须在此补 HMAC 验签：
      不能信任网络传入的 env，必须自己验签 tenant token 后才取 base_url。
      这个"不验签"的正确性绑定在 stdio 同域这个前提上，前提一变就要补。
    """

    def __init__(
        self,
        base_url: str | None = None,
        username: str | None = None,
        password: str | None = None,
    ) -> None:
        self.base_url = (
            base_url
            or os.getenv("SITEBASE_ADMIN_URL")
            or "http://localhost:8000/api/admin"
        )
        self.base_url = self.base_url.rstrip("/")
        self.username = username or os.getenv("SITEBASE_ADMIN_USER", "admin")
        self.password = password or os.getenv("SITEBASE_ADMIN_PASS", "admin123")
        # token 缓存（内存，进程级；30 天过期，提前 1 小时刷新）
        self._token: str | None = None
        self._token_expires_at: float = 0.0
        # 单调 session，复用连接池
        self._session = requests.Session()

    # ─────────────────────────────────────────────
    # 鉴权
    # ─────────────────────────────────────────────

    def login(self) -> str:
        """POST /api/admin/login 拿 JWT

        返回 token 并缓存。30 天有效期，提前 1 小时刷新。
        """
        url = f"{self.base_url}/login"
        try:
            resp = self._session.post(
                url,
                json={"username": self.username, "password": self.password},
                timeout=10,
            )
        except requests.RequestException as exc:
            raise SiteBaseAuthError(f"login network error: {exc}") from exc

        if resp.status_code != 200:
            raise SiteBaseAuthError(
                f"login HTTP {resp.status_code}: {resp.text[:200]}"
            )

        try:
            data = resp.json()
        except ValueError as exc:
            raise SiteBaseAuthError(f"login response not JSON: {exc}") from exc

        # siteBase 统一返回 { code, data, msg }，token 在 data.token
        token = (
            data.get("data", {}).get("token")
            if isinstance(data, dict)
            else None
        )
        if not token:
            raise SiteBaseAuthError(f"login response missing token: {data}")

        self._token = token
        # JWT_EXPIRE=2592000（30 天），提前 1 小时刷新
        self._token_expires_at = time.time() + 2592000 - 3600
        return token

    def _get_token(self) -> str | None:
        if self._token and time.time() < self._token_expires_at:
            return self._token
        try:
            return self.login()
        except SiteBaseAuthError as exc:
            # 让 request 统一返回结构化错误，不抛 traceback 给模型
            return None

    # ─────────────────────────────────────────────
    # 请求封装（401 自动重登）
    # ─────────────────────────────────────────────

    def request(
        self,
        method: str,
        path: str,
        *,
        json_body: dict[str, Any] | None = None,
        files: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
        retry_on_401: bool = True,
    ) -> dict[str, Any]:
        """统一请求封装

        返回 siteBase 的 { code, data, msg } 结构的 data 字段。
        401 时自动重登一次（retry_on_401=True）。
        """
        url = f"{self.base_url}{path}"
        token = self._get_token()
        headers = {"Authorization": f"Bearer {token}"}

        try:
            resp = self._session.request(
                method,
                url,
                json=json_body,
                files=files,
                params=params,
                headers=headers,
                timeout=15,
            )
        except requests.RequestException as exc:
            return {"ok": False, "error": f"network: {exc}"}

        # 401 → 重登一次
        if resp.status_code == 401 and retry_on_401:
            self._token = None
            self._token_expires_at = 0.0
            self.login()
            return self.request(
                method,
                path,
                json_body=json_body,
                files=files,
                params=params,
                retry_on_401=False,
            )

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

        # siteBase 统一 { code: 0/200, data, msg }
        if isinstance(data, dict) and data.get("code") in (0, 200):
            return {"ok": True, "data": data.get("data"), "msg": data.get("msg")}
        return {"ok": False, "error": "business error", "body": data}


# ─────────────────────────────────────────────
# 模块级单例（MVP 单 workspace）
# ─────────────────────────────────────────────

_client: SiteBaseClient | None = None


def get_client() -> SiteBaseClient:
    global _client
    if _client is None:
        _client = SiteBaseClient()
    return _client


def is_sitebase_available() -> bool:
    """探活 siteBase backend（用于 mock fallback 判断）

    红线：探活验 admin login 拿 token，不验 public 读接口。
    原因：public v1 接口可能有既有 bug（如 /api/v1/products/:id 返回 500），
    但 admin 写链路仍可用；验 public 会让 cms 工具误判"siteBase 不可用"走 mock。
    admin login 是写链路的真实前置，验它才准确。
    """
    try:
        client = get_client()
        token = client._get_token()
        return token is not None
    except SiteBaseAuthError:
        return False
