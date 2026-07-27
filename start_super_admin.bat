# 后端（4318）
cd apps/tenant-api
$env:TENANT_ADMIN_TOKEN="dev-admin-token-change-in-prod"
go run .

# 前端（4319，proxy 自动转发 /admin/api/* → 4318）
pnpm --filter @hutian/admin dev
# 打开 http://localhost:4319/ ，输入 admin token 登录