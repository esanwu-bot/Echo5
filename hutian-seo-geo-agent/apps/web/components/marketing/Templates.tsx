/**
 * 模板中心 —— 服务端组件（FR-M04）。
 * ≥3 行业模板：SaaS / 电商 / 作品集，含 Schema 标签。
 */
const TEMPLATES = [
  {
    thumb: "t1",
    pills: ["SaaS", "落地页", "暗色"],
    title: "SaaS 产品官网",
    desc: "Hero + 特性 + 定价 + 客户证言的标准高转化结构，适合工具与平台类产品。",
  },
  {
    thumb: "t2",
    pills: ["电商", "品牌站", "Product Schema"],
    title: "电商品牌站",
    desc: "内置 Product / Offer 结构化数据，商品页天然适配富媒体结果与 AI 引用。",
  },
  {
    thumb: "t3",
    pills: ["作品集", "个人", "Person Schema"],
    title: "个人作品集",
    desc: "突出项目与经历的极简布局，Person 实体标记强化个人品牌在搜索中的呈现。",
  },
] as const;

export default function Templates() {
  return (
    <section className="sec" id="templates">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="kicker">TEMPLATE CENTER</span>
          <h2>从模板开始，更快一步</h2>
          <p>精选行业模板，全部预置 SEO/GEO 最佳实践，套用后再用 AI 个性化。</p>
        </div>
        <div className="tpl-grid">
          {TEMPLATES.map((t) => (
            <div className="tpl reveal" key={t.title}>
              <div className={`tpl-thumb ${t.thumb}`}>
                <div className="mini">
                  <div className="mh" />
                  <div className="mb" />
                  <div className="mb2" />
                  <div className="mc">
                    <div />
                    <div />
                    <div />
                  </div>
                </div>
              </div>
              <div className="tpl-body">
                <div className="pills">
                  {t.pills.map((p) => (
                    <span key={p}>{p}</span>
                  ))}
                </div>
                <h3>{t.title}</h3>
                <p>{t.desc}</p>
                <a href="#cta" className="use">
                  使用模板
                  <svg>
                    <use href="#i-arrow" />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
