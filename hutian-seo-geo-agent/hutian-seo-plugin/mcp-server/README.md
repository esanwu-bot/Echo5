# hutian-seo-mcp

壶天 SEO/GEO 插件的 MCP 服务端。

## 工具

- `run_diagnosis(url)` — SEO/GEO 诊断(HTTP 状态、robots.txt、站点地图、JSON-LD,可选 PageSpeed)。
- `trace_citations(brand, window_days)` — 跨 AI 引擎的品牌引用追踪(示意数据)。
- `submit_sitemap(host, urls, indexnow_key)` — 经 IndexNow 向 Google/Bing 提交 URL。
- `check_schema(url)` — 提取并校验页面上的 JSON-LD 块。
- `entity_rename(root, old_names, new_name, dry_run)` — 跨项目文件重命名品牌实体。

## 运行

```bash
pip install -e .
hutian-seo-mcp
# 或
python -m hutian_seo_mcp
```

环境变量:
- `PAGESPEED_API_KEY`(可选)— 在 `run_diagnosis` 中启用 PageSpeed 洞察。
- `HUTIAN_CITATION_API`(可选)— 为未来的真实引用 API 预留。
