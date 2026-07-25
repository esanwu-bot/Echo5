"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * 顶部导航 —— 客户端组件。
 * - 滚动变色（scrollY > 30 添加 .scrolled）
 * - 移动端汉堡菜单（.menu-open 控制 .nav-mobile-panel）
 * - 含「进入工作台」直达 /workbench（FR-M06）
 */
export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className={`nav${scrolled ? " scrolled" : ""}${menuOpen ? " menu-open" : ""}`} id="nav">
      <div className="wrap">
        <a href="#top" className="brand" onClick={closeMenu}>
          <span className="mk">壶</span>
          <span>
            壶天AI 建站
            <small>HUTIAN AI BUILDER</small>
          </span>
        </a>
        <div className="nav-links">
          <a href="#features">产品能力</a>
          <a href="#flow">建站流程</a>
          <a href="#templates">模板中心</a>
          <a href="#pricing">定价</a>
          <a href="#docs">文档</a>
        </div>
        <div className="nav-right">
          <Link href="/workbench" className="btn btn-ghost">
            进入工作台
          </Link>
          <a href="#cta" className="btn btn-primary">
            免费开始
            <svg>
              <use href="#i-arrow" />
            </svg>
          </a>
          <button
            className="nav-toggle"
            aria-label="菜单"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg>
              <use href="#i-menu" />
            </svg>
          </button>
        </div>
      </div>
      {/* 移动端展开面板 */}
      <div className="nav-mobile-panel">
        <a href="#features" onClick={closeMenu}>
          产品能力
        </a>
        <a href="#flow" onClick={closeMenu}>
          建站流程
        </a>
        <a href="#templates" onClick={closeMenu}>
          模板中心
        </a>
        <a href="#pricing" onClick={closeMenu}>
          定价
        </a>
        <a href="#docs" onClick={closeMenu}>
          文档
        </a>
        <Link href="/workbench" onClick={closeMenu}>
          进入工作台
        </Link>
      </div>
    </nav>
  );
}
