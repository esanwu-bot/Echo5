"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Hero 区 —— 客户端组件（FR-M01）。
 * 含：打字机循环、3D 悬停 tilt、浮动指标（Lighthouse 98 / GEO 92%）、stats 数字滚动。
 * 数据真值来源：PRD §4.3 + 原型（12,000+ / +89% / <30s；Lighthouse 98 / GEO 92%）。
 */

const PHRASES = [
  "帮我建一个 SaaS 产品官网，主打 AI 客服，暗色科技风。",
  "做一个半导体器件的电商品牌站，要带商品结构化数据。",
  "生成我的设计师作品集，突出近三年项目案例。",
];

/** stats 数据（PRD §4.3：搜索流量 +89%；<30s 来自 PRD §2 二级指标） */
const STATS = [
  { to: 12000, pre: "", suf: "+", label: "已生成网站" },
  { to: 89, pre: "+", suf: "%", label: "平均搜索流量提升" },
  { to: 30, pre: "<", suf: "s", label: "从描述到上线" },
];

export default function Hero() {
  const [typed, setTyped] = useState("");
  const mockRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const statRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // 打字机循环
  useEffect(() => {
    let pi = 0;
    let ci = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const word = PHRASES[pi];
      if (!deleting) {
        ci += 1;
        setTyped(word.slice(0, ci));
        if (ci === word.length) {
          deleting = true;
          timer = setTimeout(tick, 1500);
          return;
        }
      } else {
        ci -= 1;
        setTyped(word.slice(0, ci));
        if (ci === 0) {
          deleting = false;
          pi = (pi + 1) % PHRASES.length;
        }
      }
      timer = setTimeout(tick, deleting ? 35 : 70);
    };
    timer = setTimeout(tick, 400);
    return () => clearTimeout(timer);
  }, []);

  // 3D tilt
  useEffect(() => {
    const mock = mockRef.current;
    const frame = frameRef.current;
    if (!mock || !frame) return;

    const onMove = (e: MouseEvent) => {
      const r = mock.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      frame.style.transform = `rotateY(${px * 10}deg) rotateX(${-py * 8}deg)`;
    };
    const onLeave = () => {
      frame.style.transform = "rotateY(-7deg) rotateX(4deg)";
    };
    mock.addEventListener("mousemove", onMove);
    mock.addEventListener("mouseleave", onLeave);
    return () => {
      mock.removeEventListener("mousemove", onMove);
      mock.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // count-up（IntersectionObserver，threshold .5）
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const animate = (el: HTMLSpanElement, to: number, pre: string, suf: string) => {
      if (reduce) {
        el.textContent = pre + to.toLocaleString() + suf;
        return;
      }
      const t0 = performance.now();
      const dur = 1500;
      const step = (t: number) => {
        const p = Math.min((t - t0) / dur, 1);
        const e = 1 - Math.pow(1 - p, 3);
        const v = Math.round(to * e);
        el.textContent = pre + v.toLocaleString() + suf;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            const s = STATS[idx];
            if (s) animate(e.target as HTMLSpanElement, s.to, s.pre, s.suf);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.5 },
    );
    statRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <header className="hero" id="top">
      <div className="wrap">
        <div className="hero-text">
          <span className="eyebrow">
            <i /> SEO 原生 · GEO 生成式优化内置
          </span>
          <h1>
            用一句话描述，<br />
            <span className="grad">AI 帮你建好站</span>
          </h1>
          <p className="lead">
            壶天AI 建站把自然语言变成可上线的高性能网站。无需代码，AI 自动生成结构、内容与 Schema 标记，让你的站点同时被传统搜索引擎与 AI 生成引擎看见。
          </p>
          <div className="hero-cta">
            <Link href="/workbench" className="btn btn-amber btn-lg">
              30 秒免费建站
              <svg>
                <use href="#i-arrow" />
              </svg>
            </Link>
            <a href="#flow" className="btn btn-ghost btn-lg">
              <svg>
                <use href="#i-play" />
              </svg>
              观看演示
            </a>
          </div>
          <div className="trust">
            <div className="avatars">
              <span>L</span>
              <span>W</span>
              <span>Z</span>
              <span>+</span>
            </div>
            <span>
              <span className="stars">★★★★★</span>
              &nbsp; 12,000+ 团队正在用壶天建站
            </span>
          </div>
        </div>

        <div className="mock" ref={mockRef}>
          <div className="mock-frame" ref={frameRef}>
            <div className="mock-bar">
              <div className="dots">
                <i />
                <i />
                <i />
              </div>
              <div className="mock-url">
                <svg className="lock" width="11" height="11">
                  <use href="#i-lock" />
                </svg>
                hutian.ai / build
              </div>
            </div>
            <div className="mock-body">
              <div className="mock-chat">
                <span className="lab">你的需求</span>
                <div className="prompt-box">
                  <span>{typed}</span>
                  <span className="cur" />
                </div>
                <span className="mock-tag">
                  <svg>
                    <use href="#i-check" />
                  </svg>
                  已生成 6 个区块
                </span>
              </div>
              <div className="mock-prev">
                <div className="lab">
                  <span>实时预览</span>
                  <span style={{ color: "var(--mkt-amber2)" }}>生成中…</span>
                </div>
                <div className="prog">
                  <i />
                </div>
                <div className="skel">
                  <div className="row w50" />
                  <div className="row w90" />
                  <div className="row w70" />
                  <div className="blocks">
                    <div />
                    <div />
                    <div />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mock-float f1">
            <svg>
              <use href="#i-zap" />
            </svg>
            <span>
              Lighthouse <b>98</b>
            </span>
          </div>
          <div className="mock-float f2">
            <svg>
              <use href="#i-robot" />
            </svg>
            <span>
              GEO 可见度 <b>92%</b>
            </span>
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className="stats-strip reveal">
          {STATS.map((s, i) => (
            <div className="stat-cell" key={i}>
              <b>
                <span
                  ref={(el) => {
                    statRefs.current[i] = el;
                  }}
                  data-idx={i}
                >
                  0
                </span>
              </b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
