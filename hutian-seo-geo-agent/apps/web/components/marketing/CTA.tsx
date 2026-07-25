import Link from "next/link";

/**
 * CTA 行动召唤区 —— 服务端组件。
 * 「立即免费建站」直达 /workbench（FR-M06）。
 */
export default function CTA() {
  return (
    <section className="cta" id="cta">
      <div className="wrap">
        <div className="cta-box reveal">
          <h2>30 秒，让 AI 为你建好站</h2>
          <p>无需信用卡，免费生成你的第一个站点。看看一句话能变成什么。</p>
          <div className="hero-cta">
            <Link href="/workbench" className="btn btn-amber btn-lg">
              立即免费建站
              <svg>
                <use href="#i-arrow" />
              </svg>
            </Link>
            <a href="#docs" className="btn btn-ghost btn-lg">
              查看文档
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
