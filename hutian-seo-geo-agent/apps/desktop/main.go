// 壶天 SEO/GEO Agent 桌面壳 —— Wails 主进程。
//
// 仅嵌入前端静态产物（dist/），无 sidecar：工作台走 mock 模式，
// 零后端依赖，单 exe 双击即可体验完整 UI 时间线。
//
// v2 计划：通过 os/exec 起 Node bridge + Python MCP 作 sidecar，
// 配合 NEXT_PUBLIC_DESKTOP=true 让前端 SSE/POST 直连 127.0.0.1:4317。
package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:dist
var assets embed.FS

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:     "壶天 · SEO/GEO Agent",
		Width:     1440,
		Height:    900,
		MinWidth:  1024,
		MinHeight: 680,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 10, G: 14, B: 26, A: 1},
		OnStartup:        app.OnStartup,
		Bind: []interface{}{
			app,
		},
		Windows: &windows.Options{
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
		},
	})
	if err != nil {
		log.Fatal(err)
	}
}
