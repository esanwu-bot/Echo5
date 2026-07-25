/**
 * 产品能力 —— 服务端组件（FR-M02）。
 * 6 项能力：自然语言建站 / SEO 原生 / GEO 生成式优化 / 极致性能 / 全端响应式 / 一键部署。
 * 数据文案对照原型，品牌统一为「壶天」。
 */
const FEATURES = [
  {
    ic: "i1",
    icon: "i-chat",
    title: "自然语言建站",
    desc: "用一句话描述你的业务，AI 自动规划页面结构、撰写文案并生成视觉布局，所见即所得。",
    tag: "no-code",
  },
  {
    ic: "i2",
    icon: "i-search",
    title: "SEO 原生内置",
    desc: "标题层级、Meta、内链、Core Web Vitals 在生成时即达标，技术 SEO 不再事后补救。",
    tag: "schema.org",
  },
  {
    ic: "i3",
    icon: "i-robot",
    title: "GEO 生成式优化",
    desc: "面向 DeepSeek、GPT、Kimi 等生成式引擎优化实体与引用结构，让 AI 主动提及你的品牌。",
    tag: "AI-ready",
  },
  {
    ic: "i4",
    icon: "i-zap",
    title: "极致性能",
    desc: "静态优先 + 边缘分发，首屏毫秒级加载，Lighthouse 性能评分稳定 95+。",
    tag: "edge cdn",
  },
  {
    ic: "i5",
    icon: "i-devices",
    title: "全端响应式",
    desc: "桌面、平板、手机一套结构自适应，断点与触控体验由 AI 自动校准。",
    tag: "responsive",
  },
  {
    ic: "i6",
    icon: "i-rocket",
    title: "一键部署",
    desc: "绑定域名、HTTPS、IndexNow 收录提交全自动，发布即被搜索引擎发现。",
    tag: "auto-deploy",
  },
] as const;

export default function Features() {
  return (
    <section className="sec" id="features">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="kicker">PRODUCT CAPABILITIES</span>
          <h2>不只是建站，而是建一个能被搜到的站</h2>
          <p>从内容生成到搜索优化，壶天把整条链路打包进一次对话。</p>
        </div>
        <div className="feat-grid">
          {FEATURES.map((f) => (
            <div className="feat reveal" key={f.title}>
              <div className={`ic ${f.ic}`}>
                <svg>
                  <use href={`#${f.icon}`} />
                </svg>
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
              <span className="tag">{f.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
