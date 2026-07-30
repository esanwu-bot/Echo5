#!/usr/bin/env python3
"""
Admin API 登录/总览链路探针
直接请求 tenant-api (默认 localhost:4318)，不经过 admin 前端和 vite proxy。
用法: python test_admin_api.py [base_url] [admin_token]
默认: base_url=http://localhost:4318, token=dev-admin-token-change-in-prod
"""
import sys
import json
from urllib import request, error

DEFAULT_BASE = "http://localhost:4318"
DEFAULT_TOKEN = "dev-admin-token-change-in-prod"


def fetch(url, headers=None, method="GET", data=None):
    req = request.Request(url, method=method)
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    try:
        with request.urlopen(req, data=data, timeout=10) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return resp.status, body, None
    except error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace") if e.fp else ""
        return e.code, body, None
    except Exception as e:
        return 0, "", str(e)


def main():
    base = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_BASE
    token = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_TOKEN
    overview_url = f"{base}/admin/api/v1/overview"

    print(f"target tenant-api: {base}")
    print(f"admin token: {token}")
    print("-" * 60)

    # 1. healthz
    status, body, err = fetch(f"{base}/healthz")
    print(f"[1] GET {base}/healthz -> {status}")
    if err:
        print(f"    ERROR: {err}")
    else:
        print(f"    body: {body[:200]}")
    print()

    # 2. overview 无 token -> 401
    status, body, err = fetch(overview_url)
    print(f"[2] GET {overview_url} (no token) -> {status}")
    print(f"    body: {body[:200]}")
    ok_no_token = status == 401
    print(f"    expect 401: {'PASS' if ok_no_token else 'FAIL'}")
    print()

    # 3. overview 错误 token -> 401
    status, body, err = fetch(overview_url, headers={"X-Admin-Token": "wrong-token"})
    print(f"[3] GET {overview_url} (wrong token) -> {status}")
    print(f"    body: {body[:200]}")
    ok_wrong_token = status == 401
    print(f"    expect 401: {'PASS' if ok_wrong_token else 'FAIL'}")
    print()

    # 4. overview 正确 token -> 200
    status, body, err = fetch(overview_url, headers={"X-Admin-Token": token})
    print(f"[4] GET {overview_url} (correct token) -> {status}")
    if err:
        print(f"    ERROR: {err}")
    else:
        try:
            parsed = json.loads(body)
            print(f"    body keys: {list(parsed.keys())}")
            print(f"    body preview: {json.dumps(parsed, ensure_ascii=False, indent=2)[:500]}")
        except Exception:
            print(f"    body: {body[:500]}")
    ok_correct_token = status == 200
    print(f"    expect 200: {'PASS' if ok_correct_token else 'FAIL'}")
    print()

    print("-" * 60)
    if ok_correct_token and ok_no_token and ok_wrong_token:
        print("RESULT: ALL PASS — 后端 admin 鉴权链路正常，问题大概率在前端")
        return 0
    else:
        print("RESULT: FAIL — 后端 admin 鉴权链路有问题，先修后端")
        return 1


if __name__ == "__main__":
    sys.exit(main())
