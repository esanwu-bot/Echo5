const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;
const distDir = path.join(__dirname, 'dist');

// 已知前端路由白名单（与 router/index.tsx 保持一致）
const frontendRoutes = [
  /^\/$/,
  /^\/products(\/.*)?$/,
  /^\/product\/[^/]+$/,
  /^\/applications(\/[^/]+)?$/,
  /^\/support$/,
  /^\/about$/,
  /^\/news(\/[^/]+)?$/,
  /^\/article\/[^/]+$/,
  /^\/login$/,
  /^\/register(\/success)?$/,
  /^\/forgot-password$/,
  /^\/reset-password$/,
  /^\/member(\/.*)?$/,
  /^\/mall(\/.*)?$/,
  /^\/series(\/.*)?$/,
  /^\/models\/[^/]+$/,
  /^\/bom$/,
  /^\/compare$/,
  /^\/guide$/,
];

// 静态文件服务（包含 robots.txt、sitemap.xml 等 public 下文件）
app.use(express.static(distDir));

// 对非静态文件请求做路由判断
app.get('*', (req, res) => {
  const pathname = req.path;

  // 匹配前端路由白名单则返回 index.html（SPA 行为）
  const isFrontendRoute = frontendRoutes.some(pattern => pattern.test(pathname));
  if (isFrontendRoute) {
    return res.sendFile(path.join(distDir, 'index.html'));
  }

  // 不匹配任何前端路由，返回真正的 404 状态码
  res.status(404).sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
