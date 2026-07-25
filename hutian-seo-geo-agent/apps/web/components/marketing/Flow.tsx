/**
 * 四步诊断法 —— 服务端组件（FR-M03）。
 * 深色区块四步流程：描述需求 / AI 生成 / 可视化调整 / 一键发布。
 * 方法论资产对照 PRD §4.2。
 */
const STEPS = [
  {
    icon: "i-edit",
    idx: "1",
    title: "描述需求",
    desc: "用自然语言说出你的品牌、产品与目标受众，越具体越好。",
  },
  {
    icon: "i-spark",
    idx: "2",
    title: "AI 生成",
    desc: "模型自动生成页面结构、文案、配图与结构化数据。",
  },
  {
    icon: "i-tune",
    idx: "3",
    title: "可视化调整",
    desc: "在画布上拖拽微调，或继续用对话让 AI 修改任意区块。",
  },
  {
    icon: "i-upload",
    idx: "4",
    title: "一键发布",
    desc: "绑定域名即刻上线，自动提交收录，搜索与 AI 同步可见。",
  },
] as const;

export default function Flow() {
  return (
    <section className="sec flow" id="flow">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="kicker">HOW IT WORKS</span>
          <h2>四步，从想法到上线</h2>
          <p>把过去数周的建站流程，压缩进一杯咖啡的时间。</p>
        </div>
        <div className="flow-grid">
          {STEPS.map((s) => (
            <div className="step reveal" key={s.idx}>
              <div className="num">
                <svg>
                  <use href={`#${s.icon}`} />
                </svg>
              </div>
              <span className="idx">{s.idx}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
