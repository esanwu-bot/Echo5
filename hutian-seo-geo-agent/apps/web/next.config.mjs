/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@hutian/agent-protocol"],
  async rewrites() {
    // ⚠️ 安全约束（M5 硬约束 · NFR-05）：
    //   rewrites 仅 dev 期生效，绕过 BFF Route Handler 直连 bridge 解决 SSE 缓冲坑。
    //   生产环境禁照搬 —— 否则绕过 BFF 鉴权层，密钥/限流/审计全失效。
    //   生产二选一：① 修好 Route Handler 流式代理（signal/headers/edge runtime）后撤 rewrites；
    //              ② 前置 nginx/Caddy 反代 + 鉴权前置，BFF 仅做业务路由。
    if (process.env.NODE_ENV !== "development") return [];
    const bridge = process.env.BRIDGE_URL || "http://localhost:4317";
    return [
      { source: "/api/sessions", destination: `${bridge}/sessions` },
      { source: "/api/sessions/:id/stream", destination: `${bridge}/sessions/:id/events` },
      { source: "/api/sessions/:id/messages", destination: `${bridge}/sessions/:id/messages` },
    ];
  },
};

export default nextConfig;
