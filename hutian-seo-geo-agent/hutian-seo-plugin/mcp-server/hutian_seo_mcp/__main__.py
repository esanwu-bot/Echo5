"""Entry point: run the Hutian SEO/GEO MCP server over stdio.

工具集（共 10 个）：
  SEO 腿（5）：run_diagnosis, check_schema, trace_citations, submit_sitemap, entity_rename
  建站腿（5）：cms_create_page, cms_update_content, cms_configure_product,
              cms_upload_media, cms_publish
"""

# import cms_tools 触发 @mcp.tool() 注册（建站腿 5 工具）
from . import cms_tools  # noqa: F401
from .tools import main

if __name__ == "__main__":
    main()
