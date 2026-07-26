/**
 * 页脚 —— 服务端组件。
 * 品牌统一为「壶天」（旧称 天启芯/Tikchip 仅作历史映射，不在此出现）。
 */
export default function Footer() {
  return (
    <footer className="foot" id="docs">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <a href="#top" className="brand">
              <span className="mk">壶</span>
              <span>
                壶天AI 建站
                <small>HUTIAN AI BUILDER</small>
              </span>
            </a>
            <p className="foot-about">
              用自然语言驱动的智能建站平台，让每个网站天生具备 SEO 与 GEO 竞争力。
            </p>
            <div className="foot-social">
              <a href="#" aria-label="GitHub">
                <svg>
                  <use href="#i-github" />
                </svg>
              </a>
              <a href="#" aria-label="Twitter">
                <svg>
                  <use href="#i-twitter" />
                </svg>
              </a>
              <a href="#" aria-label="WeChat">
                <svg>
                  <use href="#i-wechat" />
                </svg>
              </a>
            </div>
          </div>
          <div className="foot-col">
            <h4>产品</h4>
            <a href="#features">产品能力</a>
            <a href="#flow">建站流程</a>
            <a href="#templates">模板中心</a>
            <a href="#pricing">定价方案</a>
            <a href="/download">下载桌面版</a>
          </div>
          <div className="foot-col">
            <h4>资源</h4>
            <a href="#">开发文档</a>
            <a href="#">SEO 指南</a>
            <a href="#">GEO 白皮书</a>
            <a href="#">更新日志</a>
          </div>
          <div className="foot-col">
            <h4>公司</h4>
            <a href="#">关于我们</a>
            <a href="#">联系销售</a>
            <a href="#">加入团队</a>
            <a href="#">品牌资源</a>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 壶天AI 建站 · Hutian AI Builder. 保留所有权利。</span>
          <div className="links">
            <a href="#">隐私政策</a>
            <a href="#">服务条款</a>
            <a href="#">Cookie 设置</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
