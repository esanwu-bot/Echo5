import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.hutian.workbench",
  appName: "壶天工作台",
  webDir: "dist",
  backgroundColor: "#0a0e14",
  server: {
    // androidScheme: 'https' 让 WebView 用 https origin 而非 file://，
    // 避免 CORS / cookie SameSite 问题（M5 httpOnly cookie 需 https origin）
    androidScheme: "https",
  },
  plugins: {
    StatusBar: {
      style: "DARK" as const,
      backgroundColor: "#0a0e14",
      overlaysWebView: true,
    },
  },
};

export default config;
