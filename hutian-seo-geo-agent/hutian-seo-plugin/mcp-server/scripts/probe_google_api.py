"""探针：验证 GSC/GA4 API 工具集成（T15.1 + T15.2）。

验证点：
1. 模块可导入
2. 工具已注册到 FastMCP
3. 工具签名正确
4. 未授权时返回明确错误（fail-closed）
"""

import json
import sys

sys.path.insert(0, ".")

from hutian_seo_mcp import gsc_tools, ga4_tools
from hutian_seo_mcp.tools import mcp


def probe_module_import():
    """探针 1：模块可导入"""
    print("✓ 探针 1：模块导入成功")
    return True


def probe_tool_registration():
    """探针 2：工具已注册到 FastMCP"""
    tools = mcp._tool_manager._tools
    expected_tools = [
        "gsc_query",
        "gsc_index_status",
        "gsc_validate_fix",
        "ga4_events",
        "ga4_conversions",
    ]
    
    for tool_name in expected_tools:
        if tool_name not in tools:
            print(f"✗ 探针 2：工具 {tool_name} 未注册")
            return False
    
    print(f"✓ 探针 2：{len(expected_tools)} 个工具已注册")
    return True


def probe_tool_signatures():
    """探针 3：工具签名正确"""
    tools = mcp._tool_manager._tools
    
    # gsc_query 签名
    gsc_query_tool = tools["gsc_query"]
    params = gsc_query_tool.parameters
    required_params = ["site_url", "start_date", "end_date"]
    for param in required_params:
        if param not in params["properties"]:
            print(f"✗ 探针 3：gsc_query 缺少参数 {param}")
            return False
    
    # ga4_events 签名
    ga4_events_tool = tools["ga4_events"]
    params = ga4_events_tool.parameters
    required_params = ["property_id", "start_date", "end_date"]
    for param in required_params:
        if param not in params["properties"]:
            print(f"✗ 探针 3：ga4_events 缺少参数 {param}")
            return False
    
    print("✓ 探针 3：工具签名正确")
    return True


def probe_fail_closed():
    """探针 4：未授权时返回明确错误（fail-closed）"""
    # 清除环境变量，模拟未授权
    import os
    old_gsc_token = os.environ.pop("GSC_REFRESH_TOKEN", None)
    old_ga4_token = os.environ.pop("GA4_REFRESH_TOKEN", None)
    
    try:
        # 测试 gsc_query
        result = gsc_tools.gsc_query(
            site_url="https://example.com",
            start_date="2024-01-01",
            end_date="2024-01-31",
        )
        data = json.loads(result)
        if "error" not in data or "not authorized" not in data["error"].lower():
            print(f"✗ 探针 4：gsc_query 未授权时未返回错误")
            return False
        
        # 测试 ga4_events
        result = ga4_tools.ga4_events(
            property_id="123456789",
            start_date="2024-01-01",
            end_date="2024-01-31",
        )
        data = json.loads(result)
        if "error" not in data or "not authorized" not in data["error"].lower():
            print(f"✗ 探针 4：ga4_events 未授权时未返回错误")
            return False
        
        print("✓ 探针 4：未授权时返回明确错误（fail-closed）")
        return True
    finally:
        # 恢复环境变量
        if old_gsc_token:
            os.environ["GSC_REFRESH_TOKEN"] = old_gsc_token
        if old_ga4_token:
            os.environ["GA4_REFRESH_TOKEN"] = old_ga4_token


def main():
    print("=" * 60)
    print("探针：GSC/GA4 API 工具集成验证")
    print("=" * 60)
    
    results = []
    
    # 探针 1：模块导入
    results.append(probe_module_import())
    
    # 探针 2：工具注册
    results.append(probe_tool_registration())
    
    # 探针 3：工具签名
    results.append(probe_tool_signatures())
    
    # 探针 4：fail-closed
    results.append(probe_fail_closed())
    
    print("=" * 60)
    print(f"探针结果：{sum(results)}/{len(results)} 通过")
    print("=" * 60)
    
    if all(results):
        print("✓ 所有探针通过")
        return 0
    else:
        print("✗ 部分探针失败")
        return 1


if __name__ == "__main__":
    sys.exit(main())
