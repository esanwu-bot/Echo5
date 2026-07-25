"use client";

import { useEffect } from "react";

/**
 * 滚动揭示 —— 客户端组件（UX-02 渐进揭示）。
 * 监听所有 .reveal 元素，进入视口后添加 .in 类。
 * 尊重 prefers-reduced-motion：CSS 已处理（reveal 直接显示），此处仍安全观察。
 * 不渲染可见 DOM（返回 null）。
 */
export default function RevealOnScroll() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".mkt .reveal");
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.14 },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
