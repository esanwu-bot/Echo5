// 壶天 SEO/GEO Agent 桌面壳 —— Tauri 主进程。
// 仅加载前端静态产物，无 sidecar（工作台走 mock 模式，零后端）。

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
