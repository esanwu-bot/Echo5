"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * 定价 —— 客户端组件（FR-M05）。
 * 三档（免费/专业/企业），月/年切换实时变价。
 * 年价（按月折算）= round(月价 × 0.8)，省 20%；中间档高亮。
 *
 * 数据真值对照原型：免费 ¥0；专业 ¥99/月 → ¥79/月（按年）；企业 ¥399/月 → ¥319/月（按年）。
 */
type Cycle = "m" | "y";

type Plan = {
  name: string;
  desc: string;
  monthly: number;
  features: { text: string; on: boolean }[];
  cta: { label: string; href: string; variant: "ghost" | "primary" };
  pop?: boolean;
  badge?: string;
};

const PLANS: Plan[] = [
  {
    name: "免费版",
    desc: "适合个人尝鲜与验证想法",
    monthly: 0,
    features: [
      { text: "1 个 AI 生成站点", on: true },
      { text: "基础 SEO 优化", on: true },
      { text: "壶天子域名", on: true },
      { text: "自定义域名", on: false },
      { text: "GEO 生成式优化", on: false },
    ],
    cta: { label: "免费开始", href: "#cta", variant: "ghost" },
  },
  {
    name: "专业版",
    desc: "适合成长期团队与品牌官网",
    monthly: 99,
    features: [
      { text: "10 个站点 · 无限页面", on: true },
      { text: "自定义域名 + HTTPS", on: true },
      { text: "完整 SEO + GEO 优化", on: true },
      { text: "Schema.org 自动生成", on: true },
      { text: "IndexNow 收录提交", on: true },
    ],
    cta: { label: "升级专业版", href: "#cta", variant: "primary" },
    pop: true,
    badge: "★ 最受欢迎",
  },
  {
    name: "企业版",
    desc: "适合多站点与团队协作",
    monthly: 399,
    features: [
      { text: "无限站点 + 团队席位", on: true },
      { text: "私有部署 / SSO", on: true },
      { text: "API 与 Webhook", on: true },
      { text: "专属客户成功经理", on: true },
      { text: "SLA 99.9% 保障", on: true },
    ],
    cta: { label: "联系销售", href: "#cta", variant: "ghost" },
  },
];

/** 年付折算月价 = round(月价 × 0.8)，省 20% */
function yearlyMonthly(m: number): number {
  return Math.round(m * 0.8);
}

export default function Pricing() {
  const [cycle, setCycle] = useState<Cycle>("m");
  const isYear = cycle === "y";

  return (
    <section className="sec price-sec" id="pricing">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="kicker">PRICING</span>
          <h2>简单透明的定价</h2>
          <p>从免费起步，随业务增长平滑升级，无隐藏费用。</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="toggle reveal">
            <button
              className={!isYear ? "on" : ""}
              onClick={() => setCycle("m")}
              aria-pressed={!isYear}
            >
              按月
            </button>
            <button
              className={isYear ? "on" : ""}
              onClick={() => setCycle("y")}
              aria-pressed={isYear}
            >
              按年<span className="save">省 20%</span>
            </button>
          </div>
        </div>
        <div className="price-grid">
          {PLANS.map((p) => {
            const val = p.monthly === 0 ? 0 : isYear ? yearlyMonthly(p.monthly) : p.monthly;
            const showNote = p.monthly > 0 && isYear;
            return (
              <div className={`price reveal${p.pop ? " pop" : ""}`} key={p.name}>
                {p.badge && <span className="badge">{p.badge}</span>}
                <h3>{p.name}</h3>
                <div className="desc">{p.desc}</div>
                <div className="amt">
                  <span className="cur">¥</span>
                  <span className="val">{val}</span>
                  <span className="per">/ 月</span>
                </div>
                <div className="yr-note">{showNote ? "按年支付，折合每月价格" : "\u00A0"}</div>
                <ul>
                  {p.features.map((f) => (
                    <li className={f.on ? "" : "off"} key={f.text}>
                      <svg>
                        <use href={f.on ? "#i-check" : "#i-x"} />
                      </svg>
                      {f.text}
                    </li>
                  ))}
                </ul>
                {p.cta.variant === "primary" ? (
                  p.cta.href.startsWith("/") ? (
                    <Link href={p.cta.href} className="btn btn-primary">
                      {p.cta.label}
                    </Link>
                  ) : (
                    <a href={p.cta.href} className="btn btn-primary">
                      {p.cta.label}
                    </a>
                  )
                ) : (
                  <a
                    href={p.cta.href}
                    className="btn btn-ghost"
                    style={{
                      borderColor: "var(--mkt-line2)",
                      color: "var(--mkt-text)",
                    }}
                  >
                    {p.cta.label}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
