$ErrorActionPreference = "Stop"
$root = Join-Path (Get-Location) "hutian-seo-geo-agent"

function Write-File([string]$rel, [string]$content) {
    $full = Join-Path $root $rel
    $dir  = Split-Path $full -Parent
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($full, $content, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  + $rel"
}

Write-Host ">> 生成项目到 $root" -ForegroundColor Cyan

# ===== 根配置 =====
Write-File "package.json" @'
{
  "name": "hutian",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "scripts": { "dev": "turbo run dev", "build": "turbo run build", "lint": "turbo run lint" },
  "devDependencies": { "turbo": "^2.3.0", "typescript": "^5.6.0" }
}
'@

Write-File "pnpm-workspace.yaml" @'
packages:
  - "apps/*"
  - "packages/*"
'@

Write-File "turbo.json" @'
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "lint": {}
  }
}
'@

Write-File "tsconfig.base.json" @'
{
  "compilerOptions": {
    "target": "ES2022", "lib": ["ES2022","DOM","DOM.Iterable"],
    "module": "ESNext", "moduleResolution": "Bundler", "strict": true,
    "esModuleInterop": true, "skipLibCheck": true, "resolveJsonModule": true,
    "isolatedModules": true, "jsx": "preserve", "incremental": true
  }
}
'@

Write-File ".gitignore" @'
node_modules/
.next/
dist/
.turbo/
*.log
.env
.env.local
.DS_Store
'@

Write-File "LICENSE" @'
Apache License 2.0 — 壶天 SEO/GEO Agent
'@

# ===== 共享协议 =====
Write-File "packages/agent-protocol/package.json" @'
{ "name": "@hutian/agent-protocol", "version": "0.1.0", "private": true,
  "main": "./src/index.ts", "types": "./src/index.ts",
  "scripts": { "build": "tsc --noEmit" }, "devDependencies": { "typescript": "^5.6.0" } }
'@

Write-File "packages/agent-protocol/tsconfig.json" @'
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
'@

Write-File "packages/agent-protocol/src/index.ts" @'
export type PlanStatus = "pending" | "now" | "ok";
export interface PlanItem { text: string; status: PlanStatus }
export interface StatItem { label: string; value: number; prefix?: string; suffix?: string; dec?: number; accent: "amber"|"teal"|"violet"|"green"; sub?: string }
export interface DiffData { file: string; additions: number; deletions: number; lines: { no: number; text: string; kind: "ctx"|"add"|"del" }[] }
export interface ArtifactData { file: string; size: string; status: string; kind: "mod"|"add" }
export type AgentEvent =
  | { type: "meta"; totalTools: number }
  | { type: "thinking"; on: boolean }
  | { type: "message"; role: "user"|"agent"; content: string }
  | { type: "plan"; items: string[] }
  | { type: "plan_update"; done: number; current: number }
  | { type: "tool_start"; id: string; name: string; args: string }
  | { type: "tool_end"; id: string; ok: boolean; durationMs: number; output: unknown }
  | { type: "diff"; data: DiffData }
  | { type: "terminal"; line: string }
  | { type: "artifact"; data: ArtifactData }
  | { type: "stats"; items: StatItem[] }
  | { type: "done" };
'@

# ===== MCP 注册 =====
Write-File "hutian-seo-plugin/.mcp.json" @'
{ "mcpServers": { "hutian-seo": { "command": "hutian-seo-mcp",
  "env": { "PAGESPEED_API_KEY": "${PAGESPEED_API_KEY}", "HUTIAN_CITATION_API": "${HUTIAN_CITATION_API}" } } } }
'@

# ===== Agent Bridge（零依赖 SSE 骨架） =====
Write-File "apps/agent-bridge/package.json" @'
{ "name": "@hutian/agent-bridge", "version": "0.1.0", "private": true, "type": "module",
  "scripts": { "dev": "tsx --watch src/server.ts", "start": "tsx src/server.ts" },
  "devDependencies": { "@types/node": "^22.0.0", "tsx": "^4.19.0" } }
'@

Write-File "apps/agent-bridge/tsconfig.json" @'
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "module": "ESNext", "moduleResolution": "Bundler", "noEmit": true }, "include": ["src"] }
'@

Write-File "apps/agent-bridge/src/server.ts" @'
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
type Sub = (data: string) => void;
const sessions = new Map<string, Set<Sub>>();
function sseHead(res: ServerResponse) {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "Access-Control-Allow-Origin": "*" });
}
function route(req: IncomingMessage, res: ServerResponse) {
  const url = req.url ?? "";
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "POST" && url === "/sessions") {
    const id = crypto.randomUUID(); sessions.set(id, new Set());
    res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ id }));
  }
  const m = url.match(/^\/sessions\/([^/]+)\/events$/);
  if (req.method === "GET" && m) {
    const id = m[1]; if (!sessions.has(id)) sessions.set(id, new Set());
    const subs = sessions.get(id)!; sseHead(res);
    const sub: Sub = (data) => res.write(`data: ${data}\n\n`); subs.add(sub);
    const ping = setInterval(() => res.write(`: ping\n\n`), 15000);
    req.on("close", () => { subs.delete(sub); clearInterval(ping); });
    return;
  }
  res.writeHead(404); res.end("not found");
}
const port = Number(process.env.PORT ?? 4317);
createServer(route).listen(port, () => console.log(`[agent-bridge] :${port}`));
'@

Write-Host ""
Write-Host ">> 骨架已生成 ✔" -ForegroundColor Green
Write-Host ">> 还缺：apps/web（Next.js 全套）、tools.py、skills/commands/agents、docs、README" -ForegroundColor Yellow
Write-Host ">> 推送到 GitHub：" -ForegroundColor Cyan
Write-Host "   cd hutian-seo-geo-agent"
Write-Host "   git init; git add .; git commit -m 'init: 壶天 SEO/GEO Agent 脚手架'"
Write-Host "   git branch -M main"
Write-Host "   git remote add origin https://github.com/esanwu-bot/hutianSEOGEOAGent.git"
Write-Host "   git push -u origin main"