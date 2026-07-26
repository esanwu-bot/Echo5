"use client";

/**
 * 下载页客户端组件 —— OS 检测、平台 tab、校验和、形态选择、假下载反馈。
 *
 * 依据 qwen 原型 D:/Downloads/Qwen_html_20260726_6ld86v5zx.html 转写。
 * 复用现有 marketing Nav/Footer，本体只管下载相关交互。
 */
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

// ─── 平台数据 ───
type Arch = [string, string, string, string];
type Sig = [string, string, string];
interface PlatDef {
  ic: string;
  title: string;
  sub: string;
  main: { fmt: string; label: string; size: string; sig: string; btnfmt: string };
  hash: string;
  arch: Arch[];
  sig: Sig[];
  dlPath: (fmt: string) => string;
}

const VERSION = "0.3.0-beta";

const PLAT: Record<string, PlatDef> = {
  win: {
    ic: "i-win",
    title: "壶天 桌面版 · Windows",
    sub: "安装程序 · 含 WebView2 运行时检测 · 约 10 MB",
    main: {
      fmt: `Hutian-Setup-${VERSION}-x64.exe`,
      label: "下载 .exe 安装包（x64）",
      size: "10.2 MB",
      sig: "代码签名",
      btnfmt: "exe",
    },
    hash: "a3f9c10e7b2d4f6a8c0e1d3b5a7f9c2e4d6b8a0c1e3f5d7b9a2c4e6f8d0b1a3c",
    arch: [
      ["x64", ".exe", "NSIS 安装程序", "10.2 MB"],
      ["x64", ".msi", "MSI 安装包", "10.8 MB"],
      ["ARM64", ".exe", "NSIS 安装程序", "9.7 MB"],
    ],
    sig: [
      ["发布者", "Hutian Tech Co., Ltd.", "EV cert"],
      ["签名算法", "SHA-256 / RSA-4096", "valid"],
      ["时间戳", "已加盖可信时间戳", "TSA"],
    ],
    dlPath: (fmt) => `/downloads/hutian-agent-setup-v${VERSION}${fmt}`,
  },
  mac: {
    ic: "i-apple",
    title: "壶天 桌面版 · macOS",
    sub: "universal 磁盘映像 · 已公证 · 约 94 MB",
    main: {
      fmt: `Hutian-${VERSION}-universal.dmg`,
      label: "下载 .dmg（universal）",
      size: "94.2 MB",
      sig: "已公证 notarized",
      btnfmt: ".dmg",
    },
    hash: "7c2e4d6b8a0f1c3e5d7b9a2c4e6f8d0b1a3c5e7f9d2b4a6c8e0f1d3b5a7c9e2f",
    arch: [
      ["universal", ".dmg", "磁盘映像", "94.2 MB"],
      ["Apple Silicon", ".dmg", "arm64", "71.5 MB"],
      ["Intel", ".dmg", "x64", "73.8 MB"],
    ],
    sig: [
      ["公证状态", "Apple notarized", "ticket ok"],
      ["签名", "Developer ID 签名", "valid"],
      ["硬化运行时", "已启用 entitlements", "hardened"],
    ],
    dlPath: (fmt) => `/downloads/hutian-agent-setup-v${VERSION}${fmt}`,
  },
  linux: {
    ic: "i-linux",
    title: "壶天 桌面版 · Linux",
    sub: "AppImage 自包含 · 自校验 · 约 102 MB",
    main: {
      fmt: `Hutian-${VERSION}-x86_64.AppImage`,
      label: "下载 .AppImage（x86_64）",
      size: "102.6 MB",
      sig: "AppImage 自校验",
      btnfmt: ".AppImage",
    },
    hash: "4e6f8d0b1a3c5e7f9d2b4a6c8e0f1d3b5a7c9e2f4d6b8a0c1e3f5d7b9a2c4e6f",
    arch: [
      ["x86_64", ".AppImage", "自包含", "102.6 MB"],
      ["x86_64", ".deb", "Debian/Ubuntu", "88.3 MB"],
      ["x86_64", ".rpm", "Fedora/RHEL", "89.1 MB"],
    ],
    sig: [
      ["完整性", "AppImage 内嵌签名", "self-check"],
      ["依赖", "WebKitGTK 2.36+", "required"],
      ["权限", "可选 AppImage 沙箱", "firejail"],
    ],
    dlPath: (fmt) => `/downloads/hutian-agent-setup-v${VERSION}${fmt}`,
  },
};

// ─── OS 检测 ───
function detectOS(): string {
  if (typeof navigator === "undefined") return "win";
  const ua = navigator.userAgent || "";
  const pf = (navigator.platform || "").toLowerCase();
  if (/Mac|iPhone|iPad/.test(ua) || pf.includes("mac")) return "mac";
  if (/Linux/.test(ua) && !/Android/.test(ua)) return "linux";
  return "win";
}

const OS_NAME: Record<string, string> = {
  win: "Windows",
  mac: "macOS",
  linux: "Linux",
};

// ─── SVG sprite ───
const SPRITE = `
<svg style="display:none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<symbol id="i-dl" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></symbol>
<symbol id="i-monitor" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></symbol>
<symbol id="i-globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 010 18 15 15 0 010-18z"/></symbol>
<symbol id="i-win" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5.5l8-1.1v7.1H3V5.5zm0 13l8 1.1v-7.1H3v6zm9 1.2l9 1.3V12.5h-9v7.2zm0-14.4v7.2h9V4.1l-9 1.2z"/></symbol>
<symbol id="i-apple" viewBox="0 0 24 24" fill="currentColor"><path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.8-3.5.8-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .7 1.1 1.6 2.3 2.7 2.2 1.1 0 1.5-.7 2.8-.7s1.6.7 2.8.7c1.2 0 1.9-1.1 2.6-2.1.8-1.2 1.2-2.4 1.2-2.4-.1 0-2.3-.9-2.3-3.5zM14.3 5.9c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6 1 .1 2-.5 2.5-1.2z"/></symbol>
<symbol id="i-linux" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-2 0-3.2 1.6-3.6 3.4-.3 1.4-.2 2.6 0 3.6-.6.7-1.2 1.6-1.7 2.6-1 2-1.4 4.2-1.2 5.6-.6.5-1.3 1.1-1.5 1.8-.2.6 0 1 .4 1.3.4.2 1 .3 1.6.2.6-.1 1.2-.3 1.7-.6.8.4 1.8.6 3 .7h2.6c1.2-.1 2.2-.3 3-.7.5.3 1.1.5 1.7.6.6.1 1.2 0 1.6-.2.4-.3.6-.7.4-1.3-.2-.7-.9-1.3-1.5-1.8.2-1.4-.2-3.6-1.2-5.6-.5-1-1.1-1.9-1.7-2.6.2-1 .3-2.2 0-3.6C15.2 3.6 14 2 12 2zm-2 5.3c.5 0 .9.6.9 1.3s-.4 1.3-.9 1.3-.9-.6-.9-1.3.4-1.3.9-1.3zm4 0c.5 0 .9.6.9 1.3s-.4 1.3-.9 1.3-.9-.6-.9-1.3.4-1.3.9-1.3z"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></symbol>
<symbol id="i-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></symbol>
<symbol id="i-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></symbol>
<symbol id="i-bolt" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></symbol>
<symbol id="i-cpu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/><rect x="10" y="10" width="4" height="4" rx="1"/></symbol>
<symbol id="i-refresh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 11-2.6-6.4M21 3v6h-6"/></symbol>
<symbol id="i-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></symbol>
<symbol id="i-file" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6"/></symbol>
<symbol id="i-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>
<symbol id="i-offline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5a7 7 0 0111.5-3M19 11.5a7 7 0 01-1.5 4.3"/><path d="M2 2l20 20"/><path d="M8.5 8.5A4 4 0 0012 16M12 8a4 4 0 013.5 2"/></symbol>
<symbol id="i-spark" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2z"/></symbol>
</svg>
`;

// ─── 小工具 ───
function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <svg className={className}>
      <use href={`#${name}`} />
    </svg>
  );
}

// ─── Toast ───
interface ToastMsg {
  id: number;
  text: string;
}

export default function DownloadApp() {
  const [mounted, setMounted] = useState(false);
  const [myOS, setMyOS] = useState("win");
  const [curPlat, setCurPlat] = useState("win");
  const [dlState, setDlState] = useState<"idle" | "busy" | "done">("idle");
  const [dlLabel, setDlLabel] = useState("");
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [form, setForm] = useState<"desk" | "web">("desk");
  const toastId = useRef(0);

  useEffect(() => {
    setMounted(true);
    const os = detectOS();
    setMyOS(os);
    setCurPlat(os);
    setDlLabel(PLAT[os].main.label);
  }, []);

  // 切平台时更新下载按钮文案
  useEffect(() => {
    setDlLabel(PLAT[curPlat].main.label);
    setDlState("idle");
  }, [curPlat]);

  const showToast = useCallback((text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3000);
  }, []);

  const handleDownload = useCallback(() => {
    if (dlState === "busy") return;
    const p = PLAT[curPlat];
    setDlState("busy");
    setDlLabel("校验 SHA-256…");
    setTimeout(() => {
      setDlState("done");
      setDlLabel("✓ 校验通过 · 已开始下载");
      showToast(`已开始下载 ${p.main.fmt} · 校验和匹配`);
      setTimeout(() => {
        setDlState("idle");
        setDlLabel(p.main.label);
      }, 2600);
    }, 1400);
  }, [curPlat, dlState, showToast]);

  const copyHash = useCallback(() => {
    const v = PLAT[curPlat].hash;
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(v)
        .then(() => showToast("SHA-256 已复制到剪贴板"))
        .catch(() => showToast("复制失败，请手动选取"));
    } else {
      showToast("复制失败，请手动选取");
    }
  }, [curPlat, showToast]);

  const pickForm = (f: "desk" | "web") => {
    setForm(f);
    if (f === "web") {
      showToast("正在为你打开在线工作台…");
      setTimeout(() => window.open("/workbench", "_blank"), 800);
    } else {
      document.getElementById("download")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const p = PLAT[curPlat];

  return (
    <>
      {/* SVG sprite */}
      <div dangerouslySetInnerHTML={{ __html: SPRITE }} aria-hidden="true" />

      <DownloadStyles />

      {/* HERO */}
      <header className="dl-hero">
        <div className="wrap">
          <div className="dl-hero-grid">
            <div>
              <span className="dl-eyebrow">
                <i /> v{VERSION} · 桌面版首次发布
              </span>
              <h1>
                把壶天装进你的电脑，
                <br />
                或<em>直接在浏览器</em>打开
              </h1>
              <p className="dl-lead">
                桌面版<b>本地优先、零部署、数据不出机器</b>，还能直接调度本地 grok
                跑完整 Agent；不想装？在线版免运维、打开即用。两条路，同一套 SEO/GEO 能力。
              </p>

              <div className="dl-pick-lab">先选你的形态</div>
              <div className="dl-picks">
                <button
                  className={`dl-pick p-desk ${form === "desk" ? "on" : ""}`}
                  onClick={() => pickForm("desk")}
                >
                  <div className="pic">
                    <Icon name="i-monitor" />
                  </div>
                  <div className="pt">
                    <h3>
                      桌面版 <span className="rec">本地优先</span>
                    </h3>
                    <p>下载即用，全部在你机器上跑。可接本地 grok，文件改动看得见、可回滚。</p>
                    <div className="tags">
                      <span>离线可用</span>
                      <span>数据本地</span>
                      <span>接 grok</span>
                      <span>免费</span>
                    </div>
                  </div>
                  <span className="radio" />
                </button>
                <button
                  className={`dl-pick p-web ${form === "web" ? "on" : ""}`}
                  onClick={() => pickForm("web")}
                >
                  <div className="pic">
                    <Icon name="i-globe" />
                  </div>
                  <div className="pt">
                    <h3>
                      在线版 <span className="rec" style={{ background: "var(--teal)" }}>免运维</span>
                    </h3>
                    <p>浏览器打开即用，团队协作、多设备同步，无需安装与更新。</p>
                    <div className="tags">
                      <span>打开即用</span>
                      <span>团队席位</span>
                      <span>自动更新</span>
                      <span>订阅制</span>
                    </div>
                  </div>
                  <span className="radio" />
                </button>
              </div>
            </div>

            {/* 环境检测面板 */}
            <div className="dl-detect">
              <div className="dl-detect-bar">
                <div className="dots">
                  <i /> <i /> <i />
                </div>
                <span className="ttl">hutian · environment check</span>
                <span className="live">
                  <i />
                  {mounted ? "ready" : "detecting"}
                </span>
              </div>
              <div className="dl-detect-b">
                {(["win", "mac", "linux"] as const).map((os) => (
                  <div
                    key={os}
                    className={`dl-det-row ${mounted && myOS === os ? "found" : ""}`}
                  >
                    <div className="os-ic">
                      <Icon name={`i-${os === "win" ? "win" : os === "mac" ? "apple" : "linux"}`} />
                    </div>
                    <div>
                      <div className="os-nm">{OS_NAME[os]}</div>
                      <div className="os-sub">
                        {os === "win" && "10 / 11 · x64 · ARM64"}
                        {os === "mac" && "12+ · Apple Silicon / Intel"}
                        {os === "linux" && "AppImage · deb · rpm"}
                      </div>
                    </div>
                    <div className="os-st">
                      <Icon name="i-check" />
                      <span>{mounted ? (myOS === os ? "检测到 · 推荐" : "可用") : "—"}</span>
                    </div>
                  </div>
                ))}
                <div className="dl-det-foot">
                  {mounted ? (
                    <>
                      检测到你的系统为 <b>{OS_NAME[myOS]}</b>，已为你预选对应安装包。也可在下方手动切换平台，或核对{" "}
                      <code>SHA-256</code> 后下载其他架构。
                    </>
                  ) : (
                    "正在读取你的系统环境…"
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* trust strip */}
          <div className="dl-trust-strip">
            <div className="ti">
              <Icon name="i-shield" />
              <span>
                <b>代码签名</b> · Win EV / mac 公证
              </span>
            </div>
            <div className="ti">
              <Icon name="i-lock" />
              <span>
                <b>SHA-256</b> 校验和公开
              </span>
            </div>
            <div className="ti">
              <Icon name="i-refresh" />
              <span>
                <b>自动更新</b> · 内置 updater
              </span>
            </div>
            <div className="ti">
              <Icon name="i-offline" />
              <span>
                <b>离线</b>核心功能可用
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* PLATFORM DOWNLOAD */}
      <section className="sec plat" id="download">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="kicker">DOWNLOAD</span>
            <h2>选你的平台，下载桌面版</h2>
            <p>每个安装包都附带校验和与签名信息。下载后建议先核对 SHA-256，再运行安装程序。</p>
          </div>

          <div className="plat-tabs reveal">
            {(["win", "mac", "linux"] as const).map((os) => (
              <button
                key={os}
                className={`ptab ${curPlat === os ? "on" : ""}`}
                onClick={() => setCurPlat(os)}
              >
                <Icon name={`i-${os === "win" ? "win" : os === "mac" ? "apple" : "linux"}`} />
                {OS_NAME[os]}
                {mounted && myOS === os && <span className="det">检测到</span>}
              </button>
            ))}
          </div>

          <div className="plat-body reveal">
            <div className="dl-card">
              <div className="dc-top">
                <div className="dc-ic">
                  <Icon name={p.ic} />
                </div>
                <div>
                  <h3>
                    {p.title}
                    <span className="ver">v{VERSION}</span>
                  </h3>
                  <p>{p.sub}</p>
                </div>
              </div>
              <div className="dl-main">
                <a
                  href={p.dlPath(p.main.btnfmt)}
                  download
                  className={`dl-btn ${dlState === "busy" ? "busy" : ""} ${dlState === "done" ? "done" : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleDownload();
                  }}
                >
                  <span className="spin" />
                  <Icon name="i-dl" className="ico-dl" />
                  <span>{dlLabel}</span>
                </a>
                <div className="dl-meta">
                  <span>
                    <Icon name="i-file" />
                    {p.main.fmt}
                  </span>
                  <span>
                    <Icon name="i-bolt" />
                    {p.main.size}
                  </span>
                  <span>
                    <Icon name="i-shield" />
                    {p.main.sig}
                  </span>
                </div>
                <div className="arch-list">
                  <div className="al-t">其他架构 / 格式</div>
                  {p.arch.map((a, i) => (
                    <div className="arch" key={i}>
                      <span className="ar-chip">{a[0]}</span>
                      <span className="ar-fmt">
                        {a[1]} <small>{a[2]}</small>
                      </span>
                      <span className="ar-size">{a[3]}</span>
                      <a
                        href={p.dlPath(a[1])}
                        download
                        className="ar-dl"
                        title={`下载 ${a[0]} ${a[1]}`}
                      >
                        <Icon name="i-dl" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="verify">
              <h4>
                <Icon name="i-shield" />
                下载后请校验
              </h4>
              <p>用以下 SHA-256 比对文件，确保下载完整、未被篡改。签名信息保证发布者身份。</p>
              <div className="hash-box">
                <div className="hb-lab">
                  <span>SHA-256</span>
                  <button onClick={copyHash}>
                    <Icon name="i-copy" />
                    复制
                  </button>
                </div>
                <code>{p.hash}</code>
              </div>
              <div className="sig-list">
                {p.sig.map((s, i) => (
                  <div className="sig" key={i}>
                    <Icon name="i-check" />
                    <span>
                      <b>{s[0]}</b> {s[1]}
                    </span>
                    <span className="mono">{s[2]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARE */}
      <section className="sec cmp">
        <div className="wrap">
          <div className="sec-head center reveal">
            <span className="kicker">DESKTOP vs CLOUD</span>
            <h2>桌面版还是在线版？看你的场景</h2>
            <p>两者共享同一套 SEO/GEO 能力，差异在数据归属、部署与协作方式。</p>
          </div>
          <div className="cmp-grid reveal">
            <div className="cmp-col desk">
              <div className="cmp-head">
                <div className="ch-ic">
                  <Icon name="i-monitor" />
                </div>
                <h3>桌面版</h3>
                <div className="ch-tag">LOCAL-FIRST · 单机</div>
                <p>装在你电脑上，本地跑诊断与文件操作，数据不离开你的机器。</p>
              </div>
              <div className="cmp-rows">
                <CmpRow k="数据在哪" v={<><b>你的本地磁盘</b>，会话与产物归档在本地</>} />
                <CmpRow k="联网" v={<><span className="yes">核心离线可用</span>，仅真实数据源/引用监测需联网</>} />
                <CmpRow k="接 grok" v={<><span className="yes">直接 spawn 本地 grok</span>，最自然的接入方式</>} />
                <CmpRow k="部署" v={<><span className="yes">零部署</span>，双击安装即用</>} />
                <CmpRow k="协作" v={<span className="no">单机为主</span>} />
                <CmpRow k="价格" v={<><b>免费</b>体验 + 专业版买断</>} />
              </div>
              <div className="cmp-foot">
                <div className="who">最适合</div>
                <div className="who-list">
                  <span>独立开发者</span>
                  <span>技术 SEO / 前端</span>
                  <span>重视数据隐私</span>
                </div>
              </div>
            </div>
            <div className="cmp-col saas">
              <div className="cmp-head">
                <div className="ch-ic">
                  <Icon name="i-globe" />
                </div>
                <h3>在线版</h3>
                <div className="ch-tag">CLOUD · 多租户</div>
                <p>浏览器打开即用，团队共享工作空间，无需安装与维护。</p>
              </div>
              <div className="cmp-rows">
                <CmpRow k="数据在哪" v={<>云端，按 <b>workspace（品牌）</b>隔离</>} />
                <CmpRow k="联网" v={<span className="no">需联网</span>} />
                <CmpRow k="Agent 引擎" v={<>经远程 bridge 调度，<span className="no">较重</span></>} />
                <CmpRow k="部署" v={<><span className="yes">免运维</span>，我们托管</>} />
                <CmpRow k="协作" v={<span className="yes">团队席位 + 多设备同步</span>} />
                <CmpRow k="价格" v="订阅制（免费 / 专业 / 企业）" />
              </div>
              <div className="cmp-foot">
                <div className="who">最适合</div>
                <div className="who-list">
                  <span>增长 / SEO 负责人</span>
                  <span>品牌 / 电商运营</span>
                  <span>要团队协作</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITY LADDER */}
      <section className="sec ladder">
        <div className="wrap">
          <div className="sec-head center reveal">
            <span className="kicker">DESKTOP ROADMAP</span>
            <h2>桌面版能干什么——现在与未来</h2>
            <p>当前可下载的是体验版，本地工具闭环与满血 Agent 将随版本解锁。</p>
          </div>
          <div className="lad-track">
            <div className="lad now reveal">
              <span className="ld-tag">你现在在这</span>
              <div className="ld-num">
                <Icon name="i-spark" />
              </div>
              <h3>v1 · 体验版</h3>
              <div className="ld-ver">v{VERSION} · 可下载</div>
              <p>纯前端工作台打包，下载即看完整产品形态。</p>
              <ul>
                <li><Icon name="i-check" />工作台三栏 + mock 全链路</li>
                <li><Icon name="i-check" />主题切换 / 工具块 / Diff / 终端</li>
                <li><Icon name="i-check" />零后端依赖，离线可演示</li>
              </ul>
            </div>
            <div className="lad future reveal" style={{ transitionDelay: ".08s" }}>
              <span className="ld-tag">规划中</span>
              <div className="ld-num">
                <Icon name="i-cpu" />
              </div>
              <h3>v2 · 本地闭环</h3>
              <div className="ld-ver">sidecar 内置</div>
              <p>内置 bridge + MCP 为本地 sidecar，五工具真跑。</p>
              <ul>
                <li><Icon name="i-check" />本地诊断 / 修补 / 提交</li>
                <li><Icon name="i-check" />Node/Python 编译为独立可执行</li>
                <li><Icon name="i-check" />不要求用户装运行时</li>
              </ul>
            </div>
            <div className="lad future reveal" style={{ transitionDelay: ".16s" }}>
              <span className="ld-tag">规划中</span>
              <div className="ld-num">
                <Icon name="i-bolt" />
              </div>
              <h3>v3 · 满血 Agent</h3>
              <div className="ld-ver">本地 Agent sidecar</div>
              <p>本地 Agent Loop + LLM，真 Agent 编排 + 真数据。</p>
              <ul>
                <li><Icon name="i-check" />一句话 → 真工具执行 → 回流</li>
                <li><Icon name="i-check" />接真实 PageSpeed / IndexNow</li>
                <li><Icon name="i-check" />完整 SEO/GEO Agent 闭环</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SAFETY / FAQ */}
      <section className="sec safety">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="kicker">INSTALL & SECURITY</span>
            <h2>安装前，先打消几个顾虑</h2>
          </div>
          <div className="safe-grid">
            <div className="safe reveal">
              <div className="sf-ic"><Icon name="i-monitor" /></div>
              <h3>Windows 需要 WebView2</h3>
              <p>
                桌面版基于系统 WebView2（Edge 内核）。新版 Windows 10/11 已自带；若你的机器较旧，安装程序会
                <strong>自动检测并引导安装</strong> WebView2 运行时，无需手动操作。
              </p>
            </div>
            <div className="safe reveal" style={{ transitionDelay: ".06s" }}>
              <div className="sf-ic"><Icon name="i-shield" /></div>
              <h3>首次运行被 SmartScreen 拦？</h3>
              <p>
                未签名或新证书的程序会被 Windows SmartScreen 提示"未知发布者"。壶天桌面版使用{" "}
                <strong>EV 代码签名</strong>，累积信誉后提示会消失；macOS 已做{" "}
                <strong>公证（notarized）</strong>，可直接打开。
              </p>
            </div>
            <div className="safe reveal" style={{ transitionDelay: ".12s" }}>
              <div className="sf-ic"><Icon name="i-refresh" /></div>
              <h3>怎么更新？</h3>
              <p>
                内置 Tauri updater，启动时检查新版本，<strong>一键增量更新</strong>
                ，无需重新下载整包。更新清单托管在官网静态服务，签名校验后才应用。
              </p>
            </div>
            <div className="safe reveal" style={{ transitionDelay: ".18s" }}>
              <div className="sf-ic"><Icon name="i-lock" /></div>
              <h3>会动我的文件吗？</h3>
              <p>
                涉及本地文件的操作（如 <code>entity_rename</code>）<strong>默认 dry_run 只统计</strong>
                ，必须你二次确认才写盘，并保留一键回滚。桌面版下这条保护比云端更重要。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CHANGELOG */}
      <section className="sec log">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="kicker">CHANGELOG</span>
            <h2>版本历史</h2>
          </div>
          <div className="log-list reveal">
            <div className="log-item cur">
              <div className="li-head">
                <span className="li-ver">v{VERSION}</span>
                <span className="li-badge">桌面版首版</span>
                <span className="li-date">2026-07-26</span>
              </div>
              <ul>
                <li><span className="lt feat">NEW</span>桌面版（Tauri）首次发布：Win / mac / Linux 三平台安装包</li>
                <li><span className="lt feat">NEW</span>官网下载页：环境检测、SHA-256 校验、签名信息、平台架构列表</li>
                <li><span className="lt perf">UX</span>工作台三栏 + mock 全链路在桌面壳内完整可体验</li>
              </ul>
            </div>
            <div className="log-item">
              <div className="li-head">
                <span className="li-ver">v0.2.0</span>
                <span className="li-badge">本地 MCP</span>
                <span className="li-date">2026-07-25</span>
              </div>
              <ul>
                <li><span className="lt feat">NEW</span>五工具本地可跑：run_diagnosis / check_schema / trace_citations / submit_sitemap / entity_rename</li>
                <li><span className="lt feat">NEW</span>verify:tools 门禁 + fixture 回归基线，出参与契约逐字段对齐</li>
                <li><span className="lt fix">FIX</span>引用追踪字段统一为 sources[].role，旧 note 字段拦截</li>
              </ul>
            </div>
            <div className="log-item">
              <div className="li-head">
                <span className="li-ver">v0.1.0</span>
                <span className="li-badge">看得见</span>
                <span className="li-date">2026-07-24</span>
              </div>
              <ul>
                <li><span className="lt feat">NEW</span>官网 SSG + 工作台 UI + mock 时间线全链路</li>
                <li><span className="lt feat">NEW</span>深/浅主题切换，官网配色隔离</li>
                <li><span className="lt perf">PERF</span>刻意最小依赖，Diff/终端/Markdown 轻量自实现</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SYSREQ */}
      <section className="sec req">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="kicker">SYSTEM REQUIREMENTS</span>
            <h2>系统要求</h2>
          </div>
          <div className="req-table reveal">
            <table>
              <thead>
                <tr>
                  <th>平台</th>
                  <th>最低要求</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Windows</td><td>Windows 10 / 11 · x64 或 ARM64</td><td>需 WebView2（安装包自动检测引导）</td></tr>
                <tr><td>macOS</td><td>macOS 12 Monterey+ · Apple Silicon / Intel</td><td>universal 二进制，已公证</td></tr>
                <tr><td>Linux</td><td>glibc 2.31+ · WebKitGTK 2.36+</td><td>提供 AppImage / deb / rpm</td></tr>
                <tr><td>磁盘</td><td>≥ 300 MB 可用空间</td><td>含运行时与本地归档</td></tr>
                <tr><td>网络</td><td>可选</td><td>核心离线可用；真实数据源/更新需联网</td></tr>
                <tr><td>LLM API Key</td><td>必填（v3）</td><td>满血 Agent 需配置 CodeBuddy / OpenAI 兼容 Key</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="dl-cta">
        <div className="wrap">
          <div className="dl-cta-box reveal">
            <h2>还不确定？先在浏览器里试一遍</h2>
            <p>
              在线版免安装，30 秒看到壶天怎么诊断、修补、提交。喜欢了再下载桌面版，工作空间无缝延续。
            </p>
            <div className="acts">
              <Link href="/workbench" className="btn btn-brand btn-lg">
                在线免费体验
                <Icon name="i-arrow" />
              </Link>
              <a href="#download" className="btn btn-ghost btn-lg" style={{ borderColor: "rgba(255,255,255,.25)" }}>
                <Icon name="i-dl" />
                下载桌面版
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Toasts */}
      <div className="dl-toasts">
        {toasts.map((t) => (
          <div key={t.id} className="dl-toast">
            <Icon name="i-check" />
            {t.text}
          </div>
        ))}
      </div>
    </>
  );
}

function CmpRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="cmp-r">
      <span className="cr-k">{k}</span>
      <span className="cr-v">{v}</span>
    </div>
  );
}

// ─── 样式 ───
function DownloadStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
.mkt{--mkt-mut:#8A887F;--mkt-sink:#F1F1EE;--mkt-blue:#2E6FD0;--mkt-amber-soft:rgba(245,158,11,.1);--mkt-teal-soft:rgba(14,165,164,.1);--mkt-violet-soft:rgba(124,58,237,.1);--mkt-sh:0 2px 8px rgba(20,20,46,.06);--mkt-sh-h:0 12px 32px rgba(20,20,46,.10)}
.dl-hero{position:relative;background:var(--mkt-ink);color:#fff;padding:128px 0 84px;overflow:hidden}
.dl-hero::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:46px 46px;mask-image:radial-gradient(ellipse 90% 80% at 50% 0%,#000 25%,transparent 78%);-webkit-mask-image:radial-gradient(ellipse 90% 80% at 50% 0%,#000 25%,transparent 78%)}
.dl-hero::after{content:"";position:absolute;inset:0;background:radial-gradient(620px 380px at 8% 6%,rgba(232,98,44,.22),transparent 60%),radial-gradient(560px 360px at 96% 22%,rgba(14,156,146,.14),transparent 60%)}
.dl-hero .wrap{position:relative;z-index:2}
.dl-hero-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:start}
.dl-eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:var(--font-mono),monospace;font-size:12px;letter-spacing:.06em;color:var(--mkt-amber2);background:rgba(232,98,44,.12);border:1px solid rgba(232,98,44,.3);padding:6px 13px;border-radius:999px;margin-bottom:22px}
.dl-eyebrow i{width:7px;height:7px;border-radius:50%;background:var(--mkt-amber2);box-shadow:0 0 8px var(--mkt-amber2);animation:dl-blink 1.8s infinite}
.dl-hero h1{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:clamp(32px,4.2vw,52px);line-height:1.08;font-weight:700;letter-spacing:-.015em}
.dl-hero h1 em{font-style:normal;color:var(--mkt-amber2)}
.dl-hero p.dl-lead{margin-top:18px;font-size:16.5px;color:rgba(255,255,255,.7);max-width:520px;line-height:1.75}
.dl-hero p.dl-lead b{color:#fff;font-weight:600}
.dl-pick-lab{font-family:var(--font-mono),monospace;font-size:11px;letter-spacing:.14em;color:rgba(255,255,255,.45);margin:30px 0 12px}
.dl-picks{display:flex;flex-direction:column;gap:12px}
.dl-pick{display:flex;gap:14px;align-items:flex-start;padding:16px 18px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);cursor:pointer;transition:.22s;position:relative;text-align:left;width:100%;font-family:inherit;color:inherit}
.dl-pick:hover{border-color:rgba(255,255,255,.28);background:rgba(255,255,255,.06);transform:translateX(3px)}
.dl-pick.on{border-color:var(--mkt-amber);background:rgba(232,98,44,.1);box-shadow:0 0 0 1px var(--mkt-amber) inset}
.dl-pick .pic{width:42px;height:42px;border-radius:11px;flex:0 0 42px;display:grid;place-items:center}
.dl-pick .pic svg{width:22px;height:22px}
.dl-pick.p-desk .pic{background:linear-gradient(135deg,var(--mkt-amber),var(--mkt-amber2));color:#fff}
.dl-pick.p-web .pic{background:linear-gradient(135deg,var(--mkt-teal),var(--mkt-blue));color:#fff}
.dl-pick .pt h3{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:17px;font-weight:600;display:flex;align-items:center;gap:9px}
.dl-pick .pt h3 .rec{font-family:var(--font-mono),monospace;font-size:9.5px;letter-spacing:.08em;color:var(--mkt-ink);background:var(--mkt-amber2);padding:2px 7px;border-radius:5px;font-weight:700}
.dl-pick .pt p{font-size:13px;color:rgba(255,255,255,.6);margin-top:4px;line-height:1.6}
.dl-pick .pt .tags{display:flex;gap:6px;margin-top:9px;flex-wrap:wrap}
.dl-pick .pt .tags span{font-family:var(--font-mono),monospace;font-size:10.5px;color:rgba(255,255,255,.65);background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);padding:2px 8px;border-radius:6px}
.dl-pick .radio{position:absolute;top:18px;right:18px;width:18px;height:18px;border-radius:50%;border:2px solid rgba(255,255,255,.3);transition:.2s}
.dl-pick.on .radio{border-color:var(--mkt-amber);background:radial-gradient(circle,var(--mkt-amber) 0 5px,transparent 6px)}
.dl-detect{background:linear-gradient(180deg,#1c1a2e,#15131f);border:1px solid rgba(255,255,255,.1);border-radius:18px;overflow:hidden;box-shadow:0 30px 70px rgba(0,0,0,.45)}
.dl-detect-bar{display:flex;align-items:center;gap:8px;padding:11px 15px;background:rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.07)}
.dl-detect-bar .dots{display:flex;gap:6px}
.dl-detect-bar .dots i{width:11px;height:11px;border-radius:50%}
.dl-detect-bar .dots i:nth-child(1){background:#FF5F57}.dl-detect-bar .dots i:nth-child(2){background:#FEBC2E}.dl-detect-bar .dots i:nth-child(3){background:#28C840}
.dl-detect-bar .ttl{margin-left:8px;font-family:var(--font-mono),monospace;font-size:11.5px;color:rgba(255,255,255,.55)}
.dl-detect-bar .live{margin-left:auto;font-family:var(--font-mono),monospace;font-size:10px;color:var(--mkt-green);display:flex;align-items:center;gap:5px}
.dl-detect-bar .live i{width:6px;height:6px;border-radius:50%;background:var(--mkt-green);animation:dl-blink 1.6s infinite}
.dl-detect-b{padding:18px}
.dl-det-row{display:flex;align-items:center;gap:12px;padding:11px 13px;border-radius:11px;border:1px solid rgba(255,255,255,.08);margin-bottom:9px;transition:.25s}
.dl-det-row.found{border-color:rgba(232,98,44,.5);background:rgba(232,98,44,.08)}
.dl-det-row .os-ic{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;background:rgba(255,255,255,.06);flex:0 0 34px}
.dl-det-row .os-ic svg{width:18px;height:18px;color:rgba(255,255,255,.7)}
.dl-det-row.found .os-ic{background:rgba(232,98,44,.18)}
.dl-det-row.found .os-ic svg{color:var(--mkt-amber2)}
.dl-det-row .os-nm{font-size:13.5px;font-weight:600}
.dl-det-row .os-sub{font-family:var(--font-mono),monospace;font-size:10.5px;color:rgba(255,255,255,.45);margin-top:1px}
.dl-det-row .os-st{margin-left:auto;font-family:var(--font-mono),monospace;font-size:10.5px;color:rgba(255,255,255,.4);display:flex;align-items:center;gap:6px}
.dl-det-row.found .os-st{color:var(--mkt-amber2)}
.dl-det-row .os-st svg{width:14px;height:14px}
.dl-det-foot{margin-top:6px;padding:13px;border-radius:11px;background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.12);font-size:12px;color:rgba(255,255,255,.55);line-height:1.65}
.dl-det-foot b{color:#fff}
.dl-det-foot code{font-family:var(--font-mono),monospace;font-size:11px;color:var(--mkt-teal);background:rgba(14,156,146,.12);padding:1px 6px;border-radius:4px}
.dl-trust-strip{margin-top:40px;display:flex;gap:26px;flex-wrap:wrap;padding-top:26px;border-top:1px solid rgba(255,255,255,.08)}
.dl-trust-strip .ti{display:flex;align-items:center;gap:9px;font-size:13px;color:rgba(255,255,255,.6)}
.dl-trust-strip .ti svg{width:17px;height:17px;color:var(--mkt-green);flex:0 0 17px}
.dl-trust-strip .ti b{color:#fff;font-family:var(--font-disp),'Noto Sans SC',sans-serif}

.sec{padding:92px 0}
.sec-head{max-width:680px;margin-bottom:48px}
.sec-head.center{margin-left:auto;margin-right:auto;text-align:center}
.kicker{font-family:var(--font-mono),monospace;font-size:12px;letter-spacing:.16em;color:var(--mkt-amber);text-transform:uppercase;font-weight:600}
.sec-head h2{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:clamp(27px,3.3vw,40px);font-weight:700;letter-spacing:-.01em;margin-top:12px;line-height:1.15}
.sec-head p{margin-top:13px;font-size:16px;color:var(--mkt-dim)}

.plat{background:var(--mkt-white)}
.plat-tabs{display:flex;gap:8px;margin-bottom:26px;flex-wrap:wrap}
.ptab{display:flex;align-items:center;gap:10px;padding:12px 20px;border-radius:12px;border:1px solid var(--mkt-line);background:var(--mkt-paper);color:var(--mkt-dim);font-weight:600;font-size:14px;transition:.2s;position:relative;cursor:pointer;font-family:inherit}
.ptab svg{width:20px;height:20px}
.ptab:hover{border-color:var(--mkt-line2);color:var(--mkt-text)}
.ptab.on{background:var(--mkt-ink);color:#fff;border-color:var(--mkt-ink)}
.ptab .det{position:absolute;top:-7px;right:-7px;font-family:var(--font-mono),monospace;font-size:9px;font-weight:700;color:#fff;background:var(--mkt-amber);padding:2px 6px;border-radius:999px;letter-spacing:.04em}
.plat-body{display:grid;grid-template-columns:1.35fr 1fr;gap:24px;align-items:start}
.dl-card{background:var(--mkt-paper);border:1px solid var(--mkt-line);border-radius:16px;padding:30px;position:relative;overflow:hidden}
.dl-card::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--mkt-amber),var(--mkt-amber2))}
.dl-card .dc-top{display:flex;align-items:center;gap:14px}
.dl-card .dc-ic{width:54px;height:54px;border-radius:14px;display:grid;place-items:center;background:var(--mkt-ink);color:#fff}
.dl-card .dc-ic svg{width:28px;height:28px}
.dl-card .dc-top h3{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:22px;font-weight:700}
.dl-card .dc-top .ver{font-family:var(--font-mono),monospace;font-size:12px;color:var(--mkt-amber);background:var(--mkt-amber-soft);padding:3px 9px;border-radius:6px;margin-left:8px;vertical-align:3px}
.dl-card .dc-top p{font-size:13px;color:var(--mkt-dim);margin-top:3px}
.dl-main{margin-top:24px}
.dl-btn{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:16px;border-radius:13px;border:none;background:linear-gradient(135deg,var(--mkt-amber),var(--mkt-amber2));color:#fff;font-weight:700;font-size:16px;font-family:var(--font-disp),'Noto Sans SC',sans-serif;box-shadow:0 8px 24px rgba(232,98,44,.32);transition:.2s;position:relative;overflow:hidden;cursor:pointer;text-decoration:none}
.dl-btn:hover{transform:translateY(-2px);box-shadow:0 14px 32px rgba(232,98,44,.42)}
.dl-btn svg{width:19px;height:19px}
.dl-btn.busy{pointer-events:none;background:var(--mkt-ink)}
.dl-btn .spin{width:18px;height:18px;border-radius:50%;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;animation:dl-spin .7s linear infinite;display:none}
.dl-btn.busy .spin{display:block}
.dl-btn.busy .ico-dl{display:none}
.dl-btn.done{background:var(--mkt-green)}
.dl-meta{display:flex;gap:18px;margin-top:14px;font-family:var(--font-mono),monospace;font-size:11.5px;color:var(--mkt-mut);flex-wrap:wrap}
.dl-meta span{display:flex;align-items:center;gap:6px}
.dl-meta svg{width:13px;height:13px}
.arch-list{margin-top:22px;border-top:1px solid var(--mkt-line);padding-top:18px}
.arch-list .al-t{font-size:11px;letter-spacing:.12em;color:var(--mkt-mut);font-weight:700;margin-bottom:12px}
.arch{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--mkt-line)}
.arch:last-child{border-bottom:none}
.arch .ar-chip{font-family:var(--font-mono),monospace;font-size:11px;font-weight:600;color:var(--mkt-text);background:var(--mkt-sink);padding:3px 9px;border-radius:6px;flex:0 0 auto;min-width:64px;text-align:center}
.arch .ar-fmt{font-size:13px;color:var(--mkt-dim);flex:1}
.arch .ar-fmt small{font-family:var(--font-mono),monospace;color:var(--mkt-mut);font-size:11px}
.arch .ar-size{font-family:var(--font-mono),monospace;font-size:12px;color:var(--mkt-mut);flex:0 0 auto}
.arch .ar-dl{width:32px;height:32px;border-radius:8px;display:grid;place-items:center;color:var(--mkt-mut);border:1px solid var(--mkt-line);background:#fff;transition:.15s;flex:0 0 32px}
.arch .ar-dl:hover{color:var(--mkt-amber);border-color:var(--mkt-amber);background:var(--mkt-amber-soft)}
.arch .ar-dl svg{width:15px;height:15px}

.verify{background:var(--mkt-ink);color:#fff;border-radius:16px;padding:26px;position:relative;overflow:hidden}
.verify::after{content:"";position:absolute;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,rgba(14,156,146,.18),transparent 70%);bottom:-90px;right:-60px}
.verify>*{position:relative;z-index:1}
.verify h4{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:16px;font-weight:600;display:flex;align-items:center;gap:9px}
.verify h4 svg{width:18px;height:18px;color:var(--mkt-teal)}
.verify p{font-size:12.5px;color:rgba(255,255,255,.55);margin-top:6px;line-height:1.65}
.hash-box{margin-top:16px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:12px 13px}
.hash-box .hb-lab{font-family:var(--font-mono),monospace;font-size:10px;letter-spacing:.1em;color:rgba(255,255,255,.4);margin-bottom:7px;display:flex;align-items:center;justify-content:space-between}
.hash-box .hb-lab button{font-family:var(--font-mono),monospace;font-size:10px;color:var(--mkt-teal);background:rgba(14,156,146,.12);border:1px solid rgba(14,156,146,.3);padding:2px 8px;border-radius:5px;display:flex;align-items:center;gap:5px;transition:.15s;cursor:pointer}
.hash-box .hb-lab button:hover{background:rgba(14,156,146,.2)}
.hash-box .hb-lab button svg{width:11px;height:11px}
.hash-box code{font-family:var(--font-mono),monospace;font-size:11px;color:rgba(255,255,255,.8);word-break:break-all;line-height:1.7;display:block}
.sig-list{margin-top:18px;display:flex;flex-direction:column;gap:11px}
.sig{display:flex;align-items:center;gap:10px;font-size:12.5px;color:rgba(255,255,255,.7)}
.sig svg{width:16px;height:16px;color:var(--mkt-green);flex:0 0 16px}
.sig b{color:#fff;font-weight:600}
.sig .mono{font-family:var(--font-mono),monospace;font-size:11px;color:rgba(255,255,255,.45);margin-left:auto}

.cmp{background:var(--mkt-paper)}
.cmp-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid var(--mkt-line);border-radius:16px;overflow:hidden;background:#fff}
.cmp-col{padding:0}
.cmp-col+.cmp-col{border-left:1px solid var(--mkt-line)}
.cmp-head{padding:26px 28px;border-bottom:1px solid var(--mkt-line)}
.cmp-col.desk .cmp-head{background:linear-gradient(135deg,rgba(232,98,44,.06),transparent)}
.cmp-col.saas .cmp-head{background:linear-gradient(135deg,rgba(14,156,146,.06),transparent)}
.cmp-head .ch-ic{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;margin-bottom:13px}
.cmp-col.desk .ch-ic{background:linear-gradient(135deg,var(--mkt-amber),var(--mkt-amber2));color:#fff}
.cmp-col.saas .ch-ic{background:linear-gradient(135deg,var(--mkt-teal),var(--mkt-blue));color:#fff}
.cmp-head .ch-ic svg{width:22px;height:22px}
.cmp-head h3{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:20px;font-weight:700}
.cmp-head .ch-tag{font-family:var(--font-mono),monospace;font-size:10.5px;letter-spacing:.08em;color:var(--mkt-mut);margin-top:4px}
.cmp-head p{font-size:13px;color:var(--mkt-dim);margin-top:9px;line-height:1.6}
.cmp-rows{padding:8px 0}
.cmp-r{display:flex;gap:12px;padding:13px 28px;border-bottom:1px solid var(--mkt-line);align-items:flex-start}
.cmp-r:last-child{border-bottom:none}
.cmp-r .cr-k{font-size:11px;letter-spacing:.04em;color:var(--mkt-mut);font-weight:700;width:84px;flex:0 0 84px;padding-top:2px}
.cmp-r .cr-v{font-size:13.5px;color:var(--mkt-text);line-height:1.55}
.cmp-r .cr-v .yes{color:var(--mkt-green);font-weight:600}
.cmp-r .cr-v .no{color:var(--mkt-mut)}
.cmp-r .cr-v b{font-weight:600}
.cmp-foot{padding:20px 28px;border-top:1px solid var(--mkt-line);background:var(--mkt-paper)}
.cmp-foot .who{font-size:11px;letter-spacing:.08em;color:var(--mkt-mut);font-weight:700;margin-bottom:8px}
.cmp-foot .who-list{display:flex;flex-wrap:wrap;gap:7px}
.cmp-foot .who-list span{font-size:12px;color:var(--mkt-dim);background:#fff;border:1px solid var(--mkt-line);padding:4px 10px;border-radius:7px}

.ladder{background:var(--mkt-white)}
.lad-track{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.lad-track::before{content:"";position:absolute;top:34px;left:8%;right:8%;height:2px;background:repeating-linear-gradient(90deg,var(--mkt-line2) 0 8px,transparent 8px 16px)}
.lad{position:relative;background:var(--mkt-paper);border:1px solid var(--mkt-line);border-radius:16px;padding:26px 24px;transition:.25s}
.lad:hover{transform:translateY(-5px);box-shadow:var(--mkt-sh)}
.lad.now{border-color:var(--mkt-amber);box-shadow:0 0 0 1px var(--mkt-amber) inset,0 18px 44px rgba(232,98,44,.12)}
.lad .ld-num{width:68px;height:68px;border-radius:18px;margin:0 auto 18px;display:grid;place-items:center;background:#fff;border:1px solid var(--mkt-line);position:relative;z-index:2}
.lad .ld-num svg{width:28px;height:28px;color:var(--mkt-dim)}
.lad.now .ld-num{background:linear-gradient(135deg,var(--mkt-amber),var(--mkt-amber2));border-color:transparent}
.lad.now .ld-num svg{color:#fff}
.lad .ld-tag{position:absolute;top:-11px;left:50%;transform:translateX(-50%);font-family:var(--font-mono),monospace;font-size:9.5px;font-weight:700;letter-spacing:.06em;color:#fff;background:var(--mkt-amber);padding:3px 10px;border-radius:999px;white-space:nowrap;box-shadow:0 4px 12px rgba(232,98,44,.4)}
.lad.future .ld-tag{background:var(--mkt-mut)}
.lad h3{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:18px;font-weight:600;text-align:center}
.lad .ld-ver{font-family:var(--font-mono),monospace;font-size:11px;color:var(--mkt-amber);text-align:center;margin-top:4px}
.lad.future .ld-ver{color:var(--mkt-mut)}
.lad p{font-size:13px;color:var(--mkt-dim);text-align:center;margin-top:10px;line-height:1.6}
.lad ul{list-style:none;margin-top:16px;display:flex;flex-direction:column;gap:8px}
.lad li{display:flex;gap:9px;font-size:12.5px;color:var(--mkt-text);align-items:flex-start}
.lad li svg{width:15px;height:15px;color:var(--mkt-green);flex:0 0 15px;margin-top:2px}
.lad.future li{color:var(--mkt-mut)}
.lad.future li svg{color:var(--mkt-line2)}

.safety{background:var(--mkt-paper)}
.safe-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.safe{background:#fff;border:1px solid var(--mkt-line);border-radius:16px;padding:24px 26px;transition:.2s}
.safe:hover{border-color:var(--mkt-line2);box-shadow:var(--mkt-sh)}
.safe .sf-ic{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:var(--mkt-amber-soft);color:var(--mkt-amber);margin-bottom:15px}
.safe .sf-ic svg{width:22px;height:22px}
.safe h3{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:16.5px;font-weight:600}
.safe p{font-size:13.5px;color:var(--mkt-dim);margin-top:8px;line-height:1.7}
.safe p code{font-family:var(--font-mono),monospace;font-size:12px;background:var(--mkt-sink);padding:1px 6px;border-radius:5px;color:var(--mkt-teal)}

.log{background:var(--mkt-white)}
.log-list{max-width:760px;position:relative;padding-left:30px}
.log-list::before{content:"";position:absolute;left:7px;top:8px;bottom:8px;width:2px;background:var(--mkt-line)}
.log-item{position:relative;padding-bottom:30px}
.log-item:last-child{padding-bottom:0}
.log-item::before{content:"";position:absolute;left:-30px;top:5px;width:16px;height:16px;border-radius:50%;background:#fff;border:3px solid var(--mkt-line2)}
.log-item.cur::before{border-color:var(--mkt-amber);background:var(--mkt-amber);box-shadow:0 0 0 4px var(--mkt-amber-soft)}
.log-item .li-head{display:flex;align-items:center;gap:11px;flex-wrap:wrap}
.log-item .li-ver{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:18px;font-weight:700}
.log-item .li-date{font-family:var(--font-mono),monospace;font-size:11.5px;color:var(--mkt-mut)}
.log-item .li-badge{font-family:var(--font-mono),monospace;font-size:10px;font-weight:700;color:#fff;background:var(--mkt-amber);padding:2px 9px;border-radius:999px}
.log-item:not(.cur) .li-badge{background:var(--mkt-mut)}
.log-item ul{list-style:none;margin-top:12px;display:flex;flex-direction:column;gap:8px}
.log-item li{display:flex;gap:10px;font-size:13.5px;color:var(--mkt-dim);line-height:1.55}
.log-item li .lt{font-family:var(--font-mono),monospace;font-size:9.5px;font-weight:700;flex:0 0 auto;padding:2px 7px;border-radius:5px;height:fit-content;margin-top:2px}
.log-item li .lt.feat{color:var(--mkt-amber);background:var(--mkt-amber-soft)}
.log-item li .lt.fix{color:var(--mkt-teal);background:var(--mkt-teal-soft)}
.log-item li .lt.perf{color:var(--mkt-violet);background:var(--mkt-violet-soft)}

.req{background:var(--mkt-paper)}
.req-table{border:1px solid var(--mkt-line);border-radius:16px;overflow:hidden;background:#fff}
.req-table table{width:100%;border-collapse:collapse}
.req-table th,.req-table td{padding:14px 22px;text-align:left;font-size:13.5px;border-bottom:1px solid var(--mkt-line)}
.req-table th{font-family:var(--font-mono),monospace;font-size:11px;letter-spacing:.06em;color:var(--mkt-mut);font-weight:700;text-transform:uppercase;background:var(--mkt-paper)}
.req-table td{color:var(--mkt-dim)}
.req-table td:first-child{font-weight:600;color:var(--mkt-text);width:160px}
.req-table tr:last-child td{border-bottom:none}
.req-table td code{font-family:var(--font-mono),monospace;font-size:12px;background:var(--mkt-sink);padding:1px 6px;border-radius:5px;color:var(--mkt-teal)}

.dl-cta{padding:24px 0 96px}
.dl-cta-box{position:relative;background:var(--mkt-ink);border-radius:28px;padding:64px 44px;text-align:center;color:#fff;overflow:hidden}
.dl-cta-box::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:40px 40px;mask-image:radial-gradient(ellipse 70% 80% at 50% 50%,#000,transparent 75%);-webkit-mask-image:radial-gradient(ellipse 70% 80% at 50% 50%,#000,transparent 75%)}
.dl-cta-box::after{content:"";position:absolute;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,rgba(232,98,44,.3),transparent 70%);top:-130px;right:-70px}
.dl-cta-box>*{position:relative;z-index:2}
.dl-cta-box h2{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:clamp(27px,3.5vw,42px);font-weight:700;letter-spacing:-.01em}
.dl-cta-box p{margin-top:14px;font-size:16.5px;color:rgba(255,255,255,.72);max-width:520px;margin-left:auto;margin-right:auto}
.dl-cta-box .acts{display:flex;gap:14px;justify-content:center;margin-top:30px;flex-wrap:wrap}

.dl-toasts{position:fixed;right:22px;bottom:22px;z-index:120;display:flex;flex-direction:column;gap:9px;align-items:flex-end}
.dl-toast{display:flex;align-items:center;gap:10px;background:var(--mkt-ink);color:#fff;padding:12px 16px;border-radius:11px;font-size:13px;box-shadow:var(--mkt-sh-h);animation:dl-fly .3s cubic-bezier(.34,1.4,.64,1) both;border-left:3px solid var(--mkt-green)}
.dl-toast svg{width:16px;height:16px;color:var(--mkt-green);flex:0 0 16px}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:600;font-size:14px;border-radius:11px;padding:10px 18px;transition:transform .2s,box-shadow .2s,background .2s,color .2s;white-space:nowrap;border:1px solid transparent;cursor:pointer;text-decoration:none}
.btn svg{width:16px;height:16px}
.btn-brand{background:linear-gradient(135deg,var(--mkt-amber),var(--mkt-amber2));color:#fff;box-shadow:0 6px 20px rgba(232,98,44,.35)}
.btn-brand:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(232,98,44,.45)}
.btn-lg{padding:14px 26px;font-size:15.5px;border-radius:13px}
.btn-ghost{background:transparent;color:rgba(255,255,255,.85);border-color:rgba(255,255,255,.22)}
.btn-ghost:hover{background:rgba(255,255,255,.1);color:#fff}

.reveal{opacity:0;transform:translateY(24px);transition:opacity .7s cubic-bezier(.22,1,.36,1),transform .7s cubic-bezier(.22,1,.36,1)}
.reveal.in{opacity:1;transform:none}

@keyframes dl-blink{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes dl-spin{to{transform:rotate(360deg)}}
@keyframes dl-fly{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}

@media (max-width:980px){
  .dl-hero-grid{grid-template-columns:1fr;gap:36px}
  .plat-body{grid-template-columns:1fr}
  .cmp-grid{grid-template-columns:1fr}
  .cmp-col+.cmp-col{border-left:none;border-top:1px solid var(--mkt-line)}
  .lad-track{grid-template-columns:1fr;gap:30px}
  .lad-track::before{display:none}
  .safe-grid{grid-template-columns:1fr}
}
@media (max-width:560px){
  .dl-meta{gap:12px}
  .req-table th,.req-table td{padding:12px 14px}
}
` }} />
  );
}
