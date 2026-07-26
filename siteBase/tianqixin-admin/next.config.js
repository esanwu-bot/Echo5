/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用 standalone 输出模式，精简 Docker 镜像
  output: 'standalone',

  // 服务器端部署配置 - 保留API路由功能
  trailingSlash: false,
  images: {
    unoptimized: true, // 保留图片优化设置
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/images/**',
      },
    ],
  },

  // API 代理配置 - 解决开发环境 CORS 问题
  // 生产环境 SSR 通过 INTERNAL_API_BASE 访问 php 容器（如 http://php:8000）
  // 开发环境用 localhost:8000
  async rewrites() {
    // Docker 环境中使用 php 容器地址，本地开发使用 localhost
    const remoteApiUrl = process.env.INTERNAL_API_BASE || 'http://php:8000';

    return [
      // 注意：/api/upload 是本地 Next.js API Route，不要代理到后端
      // 必须放在 /api/:path* 之前，优先匹配
      {
        source: '/api/upload',
        destination: '/api/upload',
      },
      {
        source: '/api/upload/',
        destination: '/api/upload/',
      },
      {
        source: '/api/:path*',
        destination: `${remoteApiUrl}/api/:path*`,
      },
      {
        source: '/admin/:path*',
        destination: `${remoteApiUrl}/admin/:path*`,
      },
      {
        source: '/images/:path*',
        destination: `${remoteApiUrl}/images/:path*`,
      },
    ];
  },

  // 跳过 lint 和类型检查
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // 处理 ES 模块配置
  transpilePackages: ['@ant-design/icons', 'react-quill'],

  experimental: {
    optimizePackageImports: ['antd', '@ant-design/icons', 'lucide-react'],
  },

  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  }
}

module.exports = nextConfig