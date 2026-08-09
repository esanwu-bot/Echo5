"""T9.0 探路：轻量 REST 端点，复用 tools.py 的确定性工具函数。

ADR-open-api D1 方案 C 起步形态：
  - 不走 MCP 协议，tenant-api(Go) 用普通 HTTP 调用
  - 工具函数零改动，直接 import 调用
  - 用标准库 http.server，零新依赖（探路阶段最薄）

启动：
  python -m hutian_seo_mcp.http_api  --port 4320

端点（T9.2 开放 3 个，ADR-open-api 5.1 MVP）：
  POST /diagnose         {"url": "https://example.com"}
  POST /schema/check     {"url": "...", "expected_type": "Product"}
  POST /sitemap/submit   {"host": "hutian.com", "urls": [...], "indexnow_key": "..."}
  GET  /healthz          → {"status":"ok"}
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Callable

# 复用 tools.py 的函数——@mcp.tool() 装饰器注册工具但返回原函数，可直接调用
from .tools import run_diagnosis, check_schema, submit_sitemap

logger = logging.getLogger("hutian-seo-http-api")

# T9.2 白名单：开放 diagnose / schema/check / sitemap/submit（ADR-open-api 5.1 MVP 3 端点）
# trace_citations 不开放（D2：mock 红线，卖 mock=卖假数据）
TOOL_ROUTES: dict[str, Callable[..., str]] = {
    "/diagnose": run_diagnosis,
    "/schema/check": check_schema,
    "/sitemap/submit": submit_sitemap,
}


class _Handler(BaseHTTPRequestHandler):
    """轻量 REST handler，JSON in → JSON out。"""

    def _send_json(self, status: int, body: dict | str) -> None:
        if isinstance(body, str):
            body = {"error": body} if status >= 400 else {"result": body}
        raw = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self) -> None:
        if self.path == "/healthz":
            self._send_json(200, {"status": "ok"})
        else:
            self._send_json(404, "not found")

    def do_POST(self) -> None:
        route = self.path.rstrip("/")
        if route not in TOOL_ROUTES:
            self._send_json(404, f"unknown endpoint: {self.path}")
            return

        # 读 body
        try:
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length) if length > 0 else b"{}"
            params = json.loads(raw)
        except (json.JSONDecodeError, ValueError) as exc:
            self._send_json(400, f"invalid JSON body: {exc}")
            return
        if not isinstance(params, dict):
            self._send_json(400, "request body must be a JSON object")
            return

        # 调工具函数
        tool_fn = TOOL_ROUTES[route]
        try:
            # run_diagnosis 返回 JSON 字符串，解析后透传
            result_str = tool_fn(**params)
            result = json.loads(result_str)
            self._send_json(200, result)
        except TypeError as exc:
            self._send_json(400, f"invalid parameters: {exc}")
        except Exception as exc:
            logger.exception("tool execution failed: %s", exc)
            self._send_json(502, f"tool execution failed: {exc}")

    def log_message(self, fmt: str, *args) -> None:
        logger.info("%s - %s", self.address_string(), fmt % args)


def serve(port: int = 4320) -> None:
    """启动轻量 REST 服务。"""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [http-api] %(levelname)s %(message)s",
    )
    server = ThreadingHTTPServer(("0.0.0.0", port), _Handler)
    logger.info("hutian-seo-http-api listening on :%d (T9.2, 3 endpoints)", port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("shutting down")
        server.shutdown()


def main() -> None:
    parser = argparse.ArgumentParser(description="Hutian SEO HTTP API (T9.0 探路)")
    parser.add_argument("--port", type=int, default=4320, help="监听端口（默认 4320）")
    args = parser.parse_args()
    serve(args.port)


if __name__ == "__main__":
    main()
