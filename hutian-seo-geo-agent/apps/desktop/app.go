package main

import "context"

// App —— Wails 绑定对象。v1 仅持有 ctx；v2 加 sidecar 控制 / bridge 健康检查等。
type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

// OnStartup —— Wails 启动回调，保存 ctx 供 runtime API 使用。
func (a *App) OnStartup(ctx context.Context) {
	a.ctx = ctx
}

// Greet —— 占位绑定，用于验证 Go→JS 绑定链路。前端可 import { Greet } from "../wailsjs/go/main/App"。
func (a *App) Greet(name string) string {
	return "壶天 agent v0.1 · hello " + name
}
