import type { Config } from "tailwindcss";
import webConfig from "../web/tailwind.config";

// 移动端 Tailwind 配置 —— 完全继承 web 配置（色彩变量、字体、动画），
// 额外扫描移动壳自身的 src 目录。
// 关键：webConfig.content 里的 "./components/**/*" 在 mobile 目录下会被解析成
//       apps/mobile/components/，而不是 apps/web/components/。
//       必须通过相对路径显式指向 ../web/components/，否则 web 组件里的
//       h-3/w-3/h-4/w-4 等 Tailwind 类不会被 JIT 扫描到，导致 <svg><use>
//       引用的图标因缺 CSS 尺寸约束而按浏览器默认 300×150 渲染成巨大图标。
const config: Config = {
  ...webConfig,
  content: [
    "../web/app/**/*.{ts,tsx}",
    "../web/components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
};

export default config;
