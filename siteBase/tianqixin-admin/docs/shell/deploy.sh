#!/bin/bash

# Wine Admin Dashboard 快速部署脚本
# 使用方法: ./deploy.sh

echo "=== Wine Admin Dashboard 部署脚本 ==="

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "错误: Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

# 检查PM2是否安装
if ! command -v pm2 &> /dev/null; then
    echo "安装 PM2..."
    npm install -g pm2
fi

# 停止现有应用（如果存在）
echo "停止现有应用..."
pm2 stop wine-admin-dashboard 2>/dev/null || true
pm2 delete wine-admin-dashboard 2>/dev/null || true

# 安装依赖
echo "安装依赖..."
npm install --production

# 构建应用
echo "构建应用..."
npm run build

# 启动应用
echo "启动应用..."
pm2 start ecosystem.config.js --env production

# 保存PM2配置
pm2 save

# 显示状态
echo "=== 部署完成 ==="
echo "应用状态:"
pm2 status

echo ""
echo "查看日志: pm2 logs wine-admin-dashboard"
echo "重启应用: pm2 restart wine-admin-dashboard"
echo "停止应用: pm2 stop wine-admin-dashboard"

# 检查应用是否正常启动
sleep 5
if pm2 describe wine-admin-dashboard | grep -q "online"; then
    echo ""
    echo "✅ 应用已成功启动并运行中!"
    echo "访问地址: http://localhost:3000"
else
    echo ""
    echo "❌ 应用启动失败，请检查日志: pm2 logs wine-admin-dashboard"
fi