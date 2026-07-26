import type { ReactNode } from "react";
import Icons from "@/components/marketing/Icons";

/**
 * Marketing Route Group layout.
 *
 * 品牌色隔离（FR-W09 / 技术方案 §8）：
 * - 官网使用固定品牌色（--mkt-* 自定义属性），不读取工作台的 --bg0/--bg1/--text/--dim 主题变量
 * - 工作台切深浅主题时，官网配色保持不变
 * - 原型官网为深色暗底（--mkt-ink），保持一致
 *
 * 根 layout 已注入 --font-disp / --font-sans / --font-mono 字体变量，此处直接引用。
 * 此处仅做 fragment（根 layout 已有 html/body），不重复导出 html/body。
 */
const MARKETING_CSS = `
/* ════════ MARKING SCOPED THEME (固定品牌色，不受工作台主题影响) ════════ */
.mkt{
  --mkt-indigo:#4F46E5;
  --mkt-indigo2:#6366F1;
  --mkt-indigo-d:#3730A3;
  --mkt-amber:#F59E0B;
  --mkt-amber2:#FBBF24;
  --mkt-violet:#7C3AED;
  --mkt-teal:#0EA5A4;
  --mkt-green:#10B981;
  --mkt-pink:#EC4899;
  --mkt-ink:#0F0E17;
  --mkt-ink2:#171527;
  --mkt-ink3:#211F33;
  --mkt-paper:#FAFBFC;
  --mkt-white:#FFFFFF;
  --mkt-text:#1A1A2E;
  --mkt-dim:#5B5B73;
  --mkt-faint:#9090A6;
  --mkt-line:#E8E8F0;
  --mkt-line2:#DADAE6;
  --mkt-shadow-sm:0 2px 8px rgba(20,20,46,.06);
  --mkt-shadow-md:0 12px 32px rgba(20,20,46,.10);
  --mkt-shadow-lg:0 28px 70px rgba(20,20,46,.16);
  --mkt-r:16px;

  font-family:var(--font-sans),system-ui,-apple-system,sans-serif;
  color:var(--mkt-text);
  background:var(--mkt-paper);
  line-height:1.6;
  -webkit-font-smoothing:antialiased;
  overflow-x:hidden;
}
.mkt *{box-sizing:border-box}
.mkt img{max-width:100%;display:block}
.mkt a{color:inherit;text-decoration:none}
.mkt ::selection{background:rgba(79,70,229,.22)}
.mkt .wrap{max-width:1180px;margin:0 auto;padding:0 24px}
.mkt section{scroll-margin-top:84px}

/* ============ NAV ============ */
.mkt .nav{position:fixed;top:0;left:0;right:0;z-index:100;transition:background .3s,box-shadow .3s,border-color .3s;border-bottom:1px solid transparent}
.mkt .nav .wrap{display:flex;align-items:center;height:68px;gap:28px}
.mkt .nav.scrolled{background:rgba(255,255,255,.82);backdrop-filter:saturate(180%) blur(14px);-webkit-backdrop-filter:saturate(180%) blur(14px);box-shadow:var(--mkt-shadow-sm);border-bottom-color:var(--mkt-line)}
.mkt .brand{display:flex;align-items:center;gap:10px;font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-weight:700;font-size:18px;color:#fff;transition:color .3s}
.mkt .nav.scrolled .brand{color:var(--mkt-text)}
.mkt .brand .mk{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;background:linear-gradient(135deg,var(--mkt-indigo),var(--mkt-violet));color:#fff;font-weight:900;font-size:18px;box-shadow:0 4px 14px rgba(79,70,229,.4)}
.mkt .brand small{font-family:var(--font-mono),monospace;font-size:10px;letter-spacing:.18em;color:var(--mkt-faint);display:block;font-weight:500;margin-top:-2px}
.mkt .nav-links{display:flex;align-items:center;gap:6px;margin-left:14px}
.mkt .nav-links a{font-size:14px;color:rgba(255,255,255,.78);padding:8px 12px;border-radius:9px;transition:.2s;font-weight:500}
.mkt .nav.scrolled .nav-links a{color:var(--mkt-dim)}
.mkt .nav-links a:hover{color:#fff;background:rgba(255,255,255,.1)}
.mkt .nav.scrolled .nav-links a:hover{color:var(--mkt-indigo);background:rgba(79,70,229,.08)}
.mkt .nav-links a.nav-dl{color:var(--mkt-amber2);font-weight:600}
.mkt .nav.scrolled .nav-links a.nav-dl{color:var(--mkt-amber)}
.mkt .nav-links a.nav-dl:hover{background:rgba(245,158,11,.14);color:var(--mkt-amber2)}
.mkt .nav.scrolled .nav-links a.nav-dl:hover{color:var(--mkt-amber);background:rgba(245,158,11,.1)}
.mkt .nav-right{margin-left:auto;display:flex;align-items:center;gap:10px}
.mkt .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--font-sans),sans-serif;font-weight:600;font-size:14px;border:none;cursor:pointer;border-radius:11px;padding:10px 18px;transition:transform .2s,box-shadow .2s,background .2s,color .2s;white-space:nowrap}
.mkt .btn svg{width:16px;height:16px}
.mkt .btn-ghost{background:transparent;color:rgba(255,255,255,.85);border:1px solid rgba(255,255,255,.22)}
.mkt .nav.scrolled .btn-ghost{color:var(--mkt-dim);border-color:var(--mkt-line2)}
.mkt .btn-ghost:hover{background:rgba(255,255,255,.1);color:#fff}
.mkt .nav.scrolled .btn-ghost:hover{background:var(--mkt-paper);color:var(--mkt-text)}
.mkt .btn-primary{background:linear-gradient(135deg,var(--mkt-indigo),var(--mkt-indigo2));color:#fff;box-shadow:0 6px 20px rgba(79,70,229,.35)}
.mkt .btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(79,70,229,.45)}
.mkt .btn-amber{background:linear-gradient(135deg,var(--mkt-amber),var(--mkt-amber2));color:#3a2400;box-shadow:0 6px 20px rgba(245,158,11,.35)}
.mkt .btn-amber:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(245,158,11,.45)}
.mkt .btn-lg{padding:14px 26px;font-size:15.5px;border-radius:13px}
.mkt .nav-toggle{display:none;width:42px;height:42px;border-radius:10px;border:1px solid rgba(255,255,255,.22);background:transparent;color:#fff;cursor:pointer;place-items:center}
.mkt .nav.scrolled .nav-toggle{color:var(--mkt-text);border-color:var(--mkt-line2)}
.mkt .nav-toggle svg{width:20px;height:20px}

/* ============ HERO ============ */
.mkt .hero{position:relative;background:var(--mkt-ink);color:#fff;padding:140px 0 90px;overflow:hidden}
.mkt .hero::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:46px 46px;mask-image:radial-gradient(ellipse 80% 70% at 50% 30%,#000 30%,transparent 75%);-webkit-mask-image:radial-gradient(ellipse 80% 70% at 50% 30%,#000 30%,transparent 75%)}
.mkt .hero::after{content:"";position:absolute;inset:0;background:radial-gradient(680px 420px at 12% 8%,rgba(99,102,241,.32),transparent 60%),radial-gradient(620px 420px at 92% 18%,rgba(124,58,237,.26),transparent 60%),radial-gradient(560px 380px at 70% 96%,rgba(245,158,11,.16),transparent 60%)}
.mkt .hero .wrap{position:relative;z-index:2;display:grid;grid-template-columns:1.05fr .95fr;gap:54px;align-items:center}
.mkt .eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:var(--font-mono),monospace;font-size:12px;letter-spacing:.06em;color:var(--mkt-amber2);background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.3);padding:6px 13px;border-radius:999px;margin-bottom:22px}
.mkt .eyebrow i{width:7px;height:7px;border-radius:50%;background:var(--mkt-amber2);box-shadow:0 0 8px var(--mkt-amber2);animation:mkt-blink 1.8s infinite}
@keyframes mkt-blink{0%,100%{opacity:1}50%{opacity:.35}}
.mkt .hero h1{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:clamp(34px,4.6vw,58px);line-height:1.08;font-weight:700;letter-spacing:-.01em}
.mkt .hero h1 .grad{background:linear-gradient(100deg,var(--mkt-amber2),var(--mkt-pink) 55%,var(--mkt-indigo2));-webkit-background-clip:text;background-clip:text;color:transparent}
.mkt .hero p.lead{margin-top:20px;font-size:17px;color:rgba(255,255,255,.72);max-width:520px;line-height:1.75}
.mkt .hero-cta{margin-top:30px;display:flex;gap:14px;flex-wrap:wrap}
.mkt .hero-cta .btn-ghost{padding:14px 22px}
.mkt .trust{margin-top:26px;display:flex;align-items:center;gap:14px;font-size:13px;color:rgba(255,255,255,.55)}
.mkt .avatars{display:flex}
.mkt .avatars span{width:30px;height:30px;border-radius:50%;border:2px solid var(--mkt-ink);margin-left:-9px;display:grid;place-items:center;font-size:12px;font-weight:700;color:#fff}
.mkt .avatars span:first-child{margin-left:0}
.mkt .avatars span:nth-child(1){background:linear-gradient(135deg,#6366F1,#8B5CF6)}
.mkt .avatars span:nth-child(2){background:linear-gradient(135deg,#0EA5A4,#10B981)}
.mkt .avatars span:nth-child(3){background:linear-gradient(135deg,#F59E0B,#EF4444)}
.mkt .avatars span:nth-child(4){background:linear-gradient(135deg,#EC4899,#8B5CF6)}
.mkt .stars{color:var(--mkt-amber2);letter-spacing:2px}

/* mockup */
.mkt .mock{position:relative;perspective:1400px}
.mkt .mock-frame{background:linear-gradient(180deg,#1c1a2e,#15131f);border:1px solid rgba(255,255,255,.1);border-radius:16px;box-shadow:0 40px 90px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.04) inset;overflow:hidden;transform:rotateY(-7deg) rotateX(4deg);transition:transform .4s cubic-bezier(.22,1,.36,1)}
.mkt .mock-bar{display:flex;align-items:center;gap:8px;padding:11px 14px;background:rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.07)}
.mkt .mock-bar .dots{display:flex;gap:6px}
.mkt .mock-bar .dots i{width:11px;height:11px;border-radius:50%}
.mkt .mock-bar .dots i:nth-child(1){background:#FF5F57}
.mkt .mock-bar .dots i:nth-child(2){background:#FEBC2E}
.mkt .mock-bar .dots i:nth-child(3){background:#28C840}
.mkt .mock-url{flex:1;margin-left:8px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.08);border-radius:7px;padding:5px 12px;font-family:var(--font-mono),monospace;font-size:11.5px;color:rgba(255,255,255,.6);display:flex;align-items:center;gap:7px}
.mkt .mock-url .lock{color:var(--mkt-green)}
.mkt .mock-body{display:grid;grid-template-columns:1fr 1.25fr;min-height:300px}
.mkt .mock-chat{padding:16px;border-right:1px solid rgba(255,255,255,.07);display:flex;flex-direction:column;gap:10px}
.mkt .mock-chat .lab{font-family:var(--font-mono),monospace;font-size:10px;letter-spacing:.14em;color:rgba(255,255,255,.4)}
.mkt .prompt-box{background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.3);border-radius:10px;padding:11px 12px;font-size:12.5px;color:rgba(255,255,255,.92);line-height:1.6;min-height:62px}
.mkt .prompt-box .cur{display:inline-block;width:7px;height:14px;background:var(--mkt-amber2);vertical-align:-2px;animation:mkt-blink 1s steps(1) infinite}
.mkt .mock-tag{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--mkt-green);background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3);padding:4px 9px;border-radius:7px;align-self:flex-start}
.mkt .mock-tag svg{width:12px;height:12px}
.mkt .mock-prev{padding:16px;background:rgba(255,255,255,.02)}
.mkt .mock-prev .lab{font-family:var(--font-mono),monospace;font-size:10px;letter-spacing:.14em;color:rgba(255,255,255,.4);margin-bottom:10px;display:flex;align-items:center;justify-content:space-between}
.mkt .prog{height:4px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden}
.mkt .prog i{display:block;height:100%;width:30%;border-radius:3px;background:linear-gradient(90deg,var(--mkt-indigo2),var(--mkt-violet));animation:mkt-load 2.4s ease-in-out infinite}
@keyframes mkt-load{0%{width:8%;margin-left:0}50%{width:60%;margin-left:20%}100%{width:8%;margin-left:92%}}
.mkt .skel{margin-top:12px;display:flex;flex-direction:column;gap:9px}
.mkt .skel .row{height:11px;border-radius:5px;background:linear-gradient(90deg,rgba(255,255,255,.05),rgba(255,255,255,.12),rgba(255,255,255,.05));background-size:200% 100%;animation:mkt-shim 1.5s infinite}
@keyframes mkt-shim{0%{background-position:200% 0}100%{background-position:-200% 0}}
.mkt .skel .row.w70{width:70%}
.mkt .skel .row.w90{width:90%}
.mkt .skel .row.w50{width:50%}
.mkt .skel .blocks{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:6px}
.mkt .skel .blocks div{height:46px;border-radius:8px;background:linear-gradient(90deg,rgba(255,255,255,.05),rgba(255,255,255,.12),rgba(255,255,255,.05));background-size:200% 100%;animation:mkt-shim 1.5s infinite}
.mkt .skel .blocks div:nth-child(2){animation-delay:.2s}
.mkt .skel .blocks div:nth-child(3){animation-delay:.4s}
.mkt .mock-float{position:absolute;background:rgba(23,21,39,.92);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px 13px;font-size:12px;display:flex;align-items:center;gap:9px;box-shadow:0 16px 40px rgba(0,0,0,.45);animation:mkt-floaty 4s ease-in-out infinite}
.mkt .mock-float svg{width:16px;height:16px}
.mkt .mock-float.f1{top:-16px;right:-12px;color:var(--mkt-green)}
.mkt .mock-float.f2{bottom:-16px;left:-14px;color:var(--mkt-amber2);animation-delay:1.5s}
.mkt .mock-float b{color:#fff;font-family:var(--font-disp),'Noto Sans SC',sans-serif}
@keyframes mkt-floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}

/* stats strip */
.mkt .stats-strip{position:relative;z-index:2;margin-top:64px;display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden}
.mkt .stat-cell{background:rgba(255,255,255,.02);padding:24px 26px;text-align:center}
.mkt .stat-cell b{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:34px;font-weight:700;display:block;background:linear-gradient(120deg,#fff,rgba(255,255,255,.7));-webkit-background-clip:text;background-clip:text;color:transparent}
.mkt .stat-cell span{font-size:13px;color:rgba(255,255,255,.55);margin-top:4px;display:block}

/* ============ SECTION HEAD ============ */
.mkt .sec{padding:96px 0}
.mkt .sec-head{text-align:center;max-width:680px;margin:0 auto 56px}
.mkt .kicker{font-family:var(--font-mono),monospace;font-size:12px;letter-spacing:.16em;color:var(--mkt-indigo);text-transform:uppercase;font-weight:600}
.mkt .sec-head h2{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:clamp(28px,3.4vw,42px);font-weight:700;letter-spacing:-.01em;margin-top:12px;line-height:1.15}
.mkt .sec-head p{margin-top:14px;font-size:16.5px;color:var(--mkt-dim)}

/* ============ FEATURES ============ */
.mkt .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.mkt .feat{background:var(--mkt-white);border:1px solid var(--mkt-line);border-radius:var(--mkt-r);padding:30px 26px;transition:transform .3s,box-shadow .3s,border-color .3s;position:relative;overflow:hidden}
.mkt .feat::after{content:"";position:absolute;inset:0;background:radial-gradient(420px 200px at 50% -20%,rgba(79,70,229,.07),transparent 70%);opacity:0;transition:opacity .3s}
.mkt .feat:hover{transform:translateY(-6px);box-shadow:var(--mkt-shadow-md);border-color:transparent}
.mkt .feat:hover::after{opacity:1}
.mkt .feat .ic{width:52px;height:52px;border-radius:13px;display:grid;place-items:center;margin-bottom:18px;position:relative;z-index:1}
.mkt .feat .ic svg{width:24px;height:24px;color:#fff}
.mkt .ic.i1{background:linear-gradient(135deg,#6366F1,#8B5CF6)}
.mkt .ic.i2{background:linear-gradient(135deg,#0EA5A4,#10B981)}
.mkt .ic.i3{background:linear-gradient(135deg,#F59E0B,#EF4444)}
.mkt .ic.i4{background:linear-gradient(135deg,#EC4899,#8B5CF6)}
.mkt .ic.i5{background:linear-gradient(135deg,#3B82F6,#06B6D4)}
.mkt .ic.i6{background:linear-gradient(135deg,#10B981,#0EA5A4)}
.mkt .feat h3{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:19px;font-weight:600;position:relative;z-index:1}
.mkt .feat p{margin-top:9px;font-size:14px;color:var(--mkt-dim);line-height:1.7;position:relative;z-index:1}
.mkt .feat .tag{display:inline-block;margin-top:14px;font-family:var(--font-mono),monospace;font-size:11px;color:var(--mkt-indigo);background:rgba(79,70,229,.08);padding:3px 9px;border-radius:6px;position:relative;z-index:1}

/* ============ FLOW (dark) ============ */
.mkt .flow{background:var(--mkt-ink);color:#fff;position:relative;overflow:hidden}
.mkt .flow::after{content:"";position:absolute;inset:0;background:radial-gradient(620px 380px at 18% 12%,rgba(99,102,241,.18),transparent 60%),radial-gradient(560px 360px at 88% 90%,rgba(124,58,237,.16),transparent 60%)}
.mkt .flow .wrap{position:relative;z-index:2}
.mkt .flow .sec-head h2{color:#fff}
.mkt .flow .sec-head p{color:rgba(255,255,255,.6)}
.mkt .flow .kicker{color:var(--mkt-amber2)}
.mkt .flow-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;position:relative}
.mkt .flow-grid::before{content:"";position:absolute;top:34px;left:12%;right:12%;height:2px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent)}
.mkt .step{text-align:center;position:relative}
.mkt .step .num{width:68px;height:68px;border-radius:18px;margin:0 auto 18px;display:grid;place-items:center;background:var(--mkt-ink3);border:1px solid rgba(255,255,255,.12);position:relative;z-index:2;transition:.3s}
.mkt .step:hover .num{transform:translateY(-5px);border-color:var(--mkt-indigo2);box-shadow:0 12px 30px rgba(99,102,241,.35)}
.mkt .step .num svg{width:28px;height:28px;color:var(--mkt-amber2)}
.mkt .step .idx{position:absolute;top:-9px;right:calc(50% - 42px);width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,var(--mkt-indigo),var(--mkt-violet));color:#fff;font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:12px;font-weight:700;display:grid;place-items:center;z-index:3}
.mkt .step h3{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:18px;font-weight:600}
.mkt .step p{margin-top:8px;font-size:13.5px;color:rgba(255,255,255,.58);line-height:1.65}

/* ============ TEMPLATES ============ */
.mkt .tpl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.mkt .tpl{background:var(--mkt-white);border:1px solid var(--mkt-line);border-radius:var(--mkt-r);overflow:hidden;transition:transform .3s,box-shadow .3s}
.mkt .tpl:hover{transform:translateY(-6px);box-shadow:var(--mkt-shadow-md)}
.mkt .tpl-thumb{height:178px;position:relative;overflow:hidden;padding:18px}
.mkt .tpl-thumb.t1{background:linear-gradient(135deg,#4F46E5,#7C3AED)}
.mkt .tpl-thumb.t2{background:linear-gradient(135deg,#F59E0B,#EF4444)}
.mkt .tpl-thumb.t3{background:linear-gradient(135deg,#0EA5A4,#3B82F6)}
.mkt .tpl-thumb .mini{background:rgba(255,255,255,.95);border-radius:9px;height:100%;padding:12px;box-shadow:0 12px 30px rgba(0,0,0,.25);display:flex;flex-direction:column;gap:7px}
.mkt .tpl-thumb .mini .mh{height:9px;width:40%;border-radius:4px;background:linear-gradient(90deg,#c7c7d6,#e2e2ec)}
.mkt .tpl-thumb .mini .mb{height:14px;width:75%;border-radius:4px;background:#dcdce6}
.mkt .tpl-thumb .mini .mb2{height:8px;width:90%;border-radius:4px;background:#ececf2}
.mkt .tpl-thumb .mini .mc{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:auto}
.mkt .tpl-thumb .mini .mc div{height:30px;border-radius:6px;background:#f0f0f6}
.mkt .tpl-body{padding:20px 22px 24px}
.mkt .tpl-body .pills{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.mkt .tpl-body .pills span{font-size:11px;font-family:var(--font-mono),monospace;color:var(--mkt-dim);background:var(--mkt-paper);border:1px solid var(--mkt-line);padding:3px 9px;border-radius:6px}
.mkt .tpl-body h3{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:18px;font-weight:600}
.mkt .tpl-body p{margin-top:7px;font-size:13.5px;color:var(--mkt-dim);line-height:1.65}
.mkt .tpl-body .use{margin-top:16px;display:inline-flex;align-items:center;gap:7px;font-size:13.5px;font-weight:600;color:var(--mkt-indigo)}
.mkt .tpl-body .use svg{width:15px;height:15px;transition:transform .2s}
.mkt .tpl:hover .use svg{transform:translateX(4px)}

/* ============ PRICING ============ */
.mkt .price-sec{background:linear-gradient(180deg,var(--mkt-paper),#F1F0FB)}
.mkt .toggle{display:inline-flex;align-items:center;gap:12px;background:var(--mkt-white);border:1px solid var(--mkt-line);border-radius:999px;padding:5px;margin:0 auto 44px;font-size:13.5px;font-weight:600}
.mkt .toggle button{border:none;background:transparent;cursor:pointer;padding:8px 18px;border-radius:999px;color:var(--mkt-dim);font-family:var(--font-sans),sans-serif;font-weight:600;font-size:13.5px;transition:.2s}
.mkt .toggle button.on{background:var(--mkt-indigo);color:#fff;box-shadow:0 4px 12px rgba(79,70,229,.3)}
.mkt .toggle .save{font-family:var(--font-mono),monospace;font-size:10.5px;color:var(--mkt-green);background:rgba(16,185,129,.12);padding:2px 7px;border-radius:5px;margin-left:2px}
.mkt .price-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;align-items:stretch}
.mkt .price{background:var(--mkt-white);border:1px solid var(--mkt-line);border-radius:20px;padding:32px 28px;display:flex;flex-direction:column;transition:transform .3s,box-shadow .3s;position:relative}
.mkt .price:hover{transform:translateY(-5px);box-shadow:var(--mkt-shadow-md)}
.mkt .price.pop{border:2px solid var(--mkt-indigo);box-shadow:var(--mkt-shadow-lg);transform:scale(1.03)}
.mkt .price.pop:hover{transform:scale(1.03) translateY(-5px)}
.mkt .price .badge{position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,var(--mkt-indigo),var(--mkt-violet));color:#fff;font-size:12px;font-weight:700;padding:5px 16px;border-radius:999px;box-shadow:0 6px 16px rgba(79,70,229,.4);white-space:nowrap}
.mkt .price h3{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:20px;font-weight:600}
.mkt .price .desc{font-size:13.5px;color:var(--mkt-dim);margin-top:5px;min-height:38px}
.mkt .price .amt{margin:18px 0 4px;display:flex;align-items:baseline;gap:4px}
.mkt .price .amt .cur{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:22px;font-weight:600;color:var(--mkt-dim)}
.mkt .price .amt .val{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:46px;font-weight:700;letter-spacing:-.02em}
.mkt .price .amt .per{font-size:14px;color:var(--mkt-faint)}
.mkt .price .yr-note{font-size:12px;color:var(--mkt-faint);min-height:18px}
.mkt .price ul{list-style:none;margin:22px 0;display:flex;flex-direction:column;gap:11px;flex:1}
.mkt .price li{display:flex;align-items:flex-start;gap:10px;font-size:13.5px;color:var(--mkt-text)}
.mkt .price li svg{width:17px;height:17px;color:var(--mkt-green);flex:0 0 17px;margin-top:2px}
.mkt .price li.off{color:var(--mkt-faint)}
.mkt .price li.off svg{color:var(--mkt-line2)}
.mkt .price .btn{width:100%}
.mkt .price.pop .btn-primary{background:linear-gradient(135deg,var(--mkt-indigo),var(--mkt-violet))}

/* ============ CTA ============ */
.mkt .cta{padding:30px 0 96px}
.mkt .cta-box{position:relative;background:linear-gradient(120deg,var(--mkt-indigo-d),var(--mkt-indigo) 45%,var(--mkt-violet));border-radius:28px;padding:64px 40px;text-align:center;color:#fff;overflow:hidden;box-shadow:0 30px 80px rgba(79,70,229,.35)}
.mkt .cta-box::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px);background-size:40px 40px;mask-image:radial-gradient(ellipse 70% 80% at 50% 50%,#000,transparent 75%);-webkit-mask-image:radial-gradient(ellipse 70% 80% at 50% 50%,#000,transparent 75%)}
.mkt .cta-box::after{content:"";position:absolute;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(245,158,11,.4),transparent 70%);top:-120px;right:-60px}
.mkt .cta-box>*{position:relative;z-index:2}
.mkt .cta-box h2{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:clamp(28px,3.6vw,44px);font-weight:700;letter-spacing:-.01em}
.mkt .cta-box p{margin-top:14px;font-size:17px;color:rgba(255,255,255,.82);max-width:540px;margin-left:auto;margin-right:auto}
.mkt .cta-box .hero-cta{justify-content:center;margin-top:30px}

/* ============ FOOTER ============ */
.mkt .foot{background:var(--mkt-ink);color:rgba(255,255,255,.6);padding:64px 0 30px}
.mkt .foot-grid{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:40px}
.mkt .foot .brand{color:#fff;margin-bottom:16px}
.mkt .foot-about{font-size:13.5px;line-height:1.75;max-width:300px;color:rgba(255,255,255,.5)}
.mkt .foot-social{display:flex;gap:10px;margin-top:20px}
.mkt .foot-social a{width:36px;height:36px;border-radius:9px;display:grid;place-items:center;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);transition:.2s}
.mkt .foot-social a:hover{background:var(--mkt-indigo);border-color:var(--mkt-indigo);color:#fff;transform:translateY(-2px)}
.mkt .foot-social svg{width:17px;height:17px}
.mkt .foot-col h4{color:#fff;font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:14px;font-weight:600;margin-bottom:16px}
.mkt .foot-col a{display:block;font-size:13.5px;padding:6px 0;transition:.2s}
.mkt .foot-col a:hover{color:#fff;transform:translateX(3px)}
.mkt .foot-bottom{margin-top:48px;padding-top:24px;border-top:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;font-size:12.5px;color:rgba(255,255,255,.4)}
.mkt .foot-bottom .links{display:flex;gap:20px}

/* ============ REVEAL ============ */
.mkt .reveal{opacity:0;transform:translateY(26px);transition:opacity .7s cubic-bezier(.22,1,.36,1),transform .7s cubic-bezier(.22,1,.36,1)}
.mkt .reveal.in{opacity:1;transform:none}

/* ============ MOBILE MENU (state-driven via .nav.menu-open) ============ */
.mkt .nav-mobile-panel{display:none}
.mkt .nav.menu-open .nav-mobile-panel{display:flex;position:fixed;top:68px;left:0;right:0;flex-direction:column;align-items:stretch;background:var(--mkt-white);border-bottom:1px solid var(--mkt-line);padding:14px 24px 20px;box-shadow:var(--mkt-shadow-md);gap:2px}
.mkt .nav.menu-open .nav-mobile-panel a{color:var(--mkt-text);padding:12px 14px;border-radius:9px}
.mkt .nav.menu-open .nav-mobile-panel a:hover{background:var(--mkt-paper);color:var(--mkt-indigo)}

/* ============ RESPONSIVE ============ */
@media (max-width:1024px){
  .mkt .hero .wrap{grid-template-columns:1fr;gap:48px}
  .mkt .mock{max-width:560px}
  .mkt .feat-grid{grid-template-columns:repeat(2,1fr)}
  .mkt .flow-grid{grid-template-columns:repeat(2,1fr);gap:34px 20px}
  .mkt .flow-grid::before{display:none}
  .mkt .tpl-grid{grid-template-columns:repeat(2,1fr)}
  .mkt .price-grid{grid-template-columns:1fr;max-width:440px;margin:0 auto}
  .mkt .price.pop{transform:none}
  .mkt .price.pop:hover{transform:translateY(-5px)}
  .mkt .foot-grid{grid-template-columns:1fr 1fr;gap:32px}
}
@media (max-width:760px){
  .mkt .nav-links{display:none}
  .mkt .nav-right .btn-ghost{display:none}
  .mkt .nav-toggle{display:grid}
  .mkt .sec{padding:70px 0}
  .mkt .hero{padding:120px 0 70px}
  .mkt .feat-grid,.tpl-grid{grid-template-columns:1fr}
  .mkt .flow-grid{grid-template-columns:1fr}
  .mkt .stats-strip{grid-template-columns:1fr}
  .mkt .stat-cell{padding:18px}
  .mkt .mock-body{grid-template-columns:1fr}
  .mkt .mock-chat{border-right:none;border-bottom:1px solid rgba(255,255,255,.07)}
  .mkt .foot-grid{grid-template-columns:1fr 1fr}
  .mkt .cta-box{padding:48px 24px}
  .mkt .foot-bottom{flex-direction:column;text-align:center}
}

/* ============ ACCESSIBILITY: prefers-reduced-motion (NFR-04) ============ */
@media (prefers-reduced-motion: reduce){
  .mkt,.mkt *,.mkt *::before,.mkt *::after{
    animation-duration:.01ms !important;
    animation-iteration-count:1 !important;
    transition-duration:.01ms !important;
  }
  .mkt .reveal{opacity:1 !important;transform:none !important}
  html{scroll-behavior:auto}
}
html{scroll-behavior:smooth}
`;

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Icons />
      <style dangerouslySetInnerHTML={{ __html: MARKETING_CSS }} />
      <div className="mkt">{children}</div>
    </>
  );
}
