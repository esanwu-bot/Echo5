"""探针：验证 keyword_tools 模块注册与工具签名。"""

import json
import sys
from pathlib import Path

# 添加 mcp-server 到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from hutian_seo_mcp import __main__
from hutian_seo_mcp.tools import mcp


def probe_tool_registration():
    """验证 keyword_research 工具已注册。"""
    tools = mcp._tool_manager._tools
    assert "keyword_research" in tools, "keyword_research 工具未注册"
    print("✓ keyword_research 工具已注册")


def probe_tool_signature():
    """验证 keyword_research 工具签名。"""
    tools = mcp._tool_manager._tools
    tool = tools["keyword_research"]

    # 验证参数
    params = tool.parameters
    assert params["type"] == "object"
    assert "seed_keywords" in params["properties"]
    assert "gl" in params["properties"]
    assert "hl" in params["properties"]
    assert "max_results" in params["properties"]

    # 验证必填参数
    assert "seed_keywords" in params["required"]

    print("✓ keyword_research 工具签名正确")
    print(f"  参数: {list(params['properties'].keys())}")
    print(f"  必填: {params['required']}")


def probe_tool_description():
    """验证 keyword_research 工具描述。"""
    tools = mcp._tool_manager._tools
    tool = tools["keyword_research"]

    assert tool.description, "工具描述为空"
    assert "种子词" in tool.description or "seed" in tool.description.lower()
    assert "搜索量" in tool.description or "search volume" in tool.description.lower()

    print("✓ keyword_research 工具描述完整")
    print(f"  描述: {tool.description[:100]}...")


def probe_tool_invocation():
    """验证 keyword_research 工具可调用（不验证实际结果，只验证调用不崩溃）。"""
    import asyncio
    from hutian_seo_mcp.keyword_tools import keyword_research

    # 测试空参数（应该返回错误而不是崩溃）
    result = keyword_research(seed_keywords=[])
    data = json.loads(result)
    assert "error" in data, "空参数应该返回错误"

    print("✓ keyword_research 工具可调用（空参数测试通过）")


def main():
    """运行所有探针。"""
    print("=" * 60)
    print("探针：keyword_tools 模块验证")
    print("=" * 60)

    probes = [
        ("工具注册", probe_tool_registration),
        ("工具签名", probe_tool_signature),
        ("工具描述", probe_tool_description),
        ("工具调用", probe_tool_invocation),
    ]

    for name, probe_fn in probes:
        try:
            probe_fn()
        except Exception as e:
            print(f"✗ {name} 探针失败: {e}")
            return 1

    print("=" * 60)
    print("✓ 所有探针通过")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
