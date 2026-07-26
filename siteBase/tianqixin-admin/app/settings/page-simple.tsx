"use client"

import { useState } from "react"

export default function SettingsPage() {
  const [test] = useState("test")

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">设置页面测试</h1>
      <p>测试值: {test}</p>
    </div>
  )
}