"""Entry point: run the Hutian SEO/GEO MCP server over stdio.

工具集（共 18 个）：
  SEO 腿（7）：run_diagnosis, check_schema, trace_citations, submit_sitemap,
              entity_rename, analyze_content_gap, crawl_site_audit
  建站腿（5）：cms_create_page, cms_update_content, cms_configure_product,
              cms_upload_media, cms_publish
  监控腿（5）：gsc_query, gsc_index_status, gsc_validate_fix, ga4_events, ga4_conversions
  拓词腿（1）：keyword_research
"""

# import cms_tools 触发 @mcp.tool() 注册（建站腿 5 工具）
from . import cms_tools  # noqa: F401
# import scrape_tools 触发 @mcp.tool() 注册（内容差距分析工具，基于 Serper/OpenSERP）
from . import scrape_tools  # noqa: F401
# import crawl_tools 触发 @mcp.tool() 注册（全站爬取审计）
from . import crawl_tools  # noqa: F401
# import gsc_tools 触发 @mcp.tool() 注册（Google Search Console API 集成）
from . import gsc_tools  # noqa: F401
# import ga4_tools 触发 @mcp.tool() 注册（Google Analytics 4 Data API 集成）
from . import ga4_tools  # noqa: F401
# import keyword_tools 触发 @mcp.tool() 注册（关键词拓词工具）
from . import keyword_tools  # noqa: F401
from .tools import main

if __name__ == "__main__":
    main()
