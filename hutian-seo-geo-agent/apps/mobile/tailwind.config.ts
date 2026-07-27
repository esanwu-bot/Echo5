import type { Config } from "tailwindcss";
import webConfig from "../web/tailwind.config";

// 移动端 Tailwind 配置 —— 完全继承 web 配置（色彩变量、字体、动画），
// 额外扫描移动壳自身的 src 目录。
const config: Config = {
  ...webConfig,
  content: [
    ...webConfig.content,
    "./src/**/*.{ts,tsx}",
  ],
};

export default config;
