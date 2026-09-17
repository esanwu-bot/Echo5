"""探针：验证 content_calendar_tools 模块注册与工具签名。"""

import json
import sys
from pathlib import Path

# 添加 mcp-server 到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from hutian_seo_mcp import __main__
from hutian_seo_mcp.tools import mcp


def probe_tool_registration():
    """验证 content_calendar_plan 工具已注册。"""
    tools = mcp._tool_manager._tools
    assert "content_calendar_plan" in tools, "content_calendar_plan 工具未注册"
    print("✓ content_calendar_plan 工具已注册")


def probe_tool_signature():
    """验证 content_calendar_plan 工具签名。"""
    tools = mcp._tool_manager._tools
    tool = tools["content_calendar_plan"]

    # 验证参数
    params = tool.parameters
    assert params["type"] == "object"
    assert "keywords" in params["properties"]
    assert "content_gap" in params["properties"]
    assert "num_articles" in params["properties"]
    assert "target_audience" in params["properties"]
    assert "industry" in params["properties"]

    # 验证必填参数（应该没有必填参数，因为 keywords 和 content_gap 至少提供一个即可）
    assert "required" not in params or len(params.get("required", [])) == 0

    print("✓ content_calendar_plan 工具签名正确")
    print(f"  参数: {list(params['properties'].keys())}")


def probe_tool_description():
    """验证 content_calendar_plan 工具描述。"""
    tools = mcp._tool_manager._tools
    tool = tools["content_calendar_plan"]

    assert tool.description, "工具描述为空"
    assert "内容日历" in tool.description or "content calendar" in tool.description.lower()
    assert "关键词" in tool.description or "keyword" in tool.description.lower()

    print("✓ content_calendar_plan 工具描述完整")
    print(f"  描述: {tool.description[:100]}...")


def probe_tool_invocation():
    """验证 content_calendar_plan 工具可调用（不验证实际结果，只验证调用不崩溃）。"""
    from hutian_seo_mcp.content_calendar_tools import content_calendar_plan

    # 测试空参数（应该返回错误而不是崩溃）
    result = content_calendar_plan()
    data = json.loads(result)
    assert "error" in data, "空参数应该返回错误"
    assert "At least one of" in data["error"], "错误信息不正确"

    print("✓ content_calendar_plan 工具可调用（空参数测试通过）")


def main():
    """运行所有探针。"""
    print("=" * 60)
    print("探针：content_calendar_tools 模块验证")
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
