"use client";

import type { EvidenceCard as EvidenceCardData } from "@hutian/agent-protocol";

/**
 * 证据卡渲染器. ← v0.2 inbox 协作流
 *
 * 6 种卡片类型对应 agent-protocol EvidenceCard 联合类型：
 *   scores / diff / bars / term / rename / attach
 * 视觉取自 prototype/email_kanban.html，复用 workbench 主题变量。
 */

export default function EvidenceCard({ data }: { data: EvidenceCardData }) {
  switch (data.type) {
    case "scores":
      return <ScoresCard data={data} />;
    case "diff":
      return <DiffCard data={data} />;
    case "bars":
      return <BarsCard data={data} />;
    case "term":
      return <TermCard data={data} />;
    case "rename":
      return <RenameCard data={data} />;
    case "attach":
      return <AttachCard data={data} />;
  }
}

function CardShell({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-bg2 animate-rise">
      <div className="flex items-center gap-2 border-b border-line bg-bg1 px-3.5 py-2.5 text-[10.5px] font-bold tracking-wider text-dim">
        <svg className="h-3 w-3 text-amber"><use href={`#${icon}`} /></svg>
        {title}
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  );
}

function ScoresCard({
  data,
}: {
  data: Extract<EvidenceCardData, { type: "scores" }>;
}) {
  return (
    <CardShell title={data.title} icon="i-chart">
      <div className="flex gap-3">
        <div className="flex-1 rounded-lg border border-line bg-bg1 p-3">
          <span className="text-[11px] text-dim">传统 SEO</span>
          <b className="mt-0.5 block font-grotesk text-[26px] font-bold text-amber2">
            {data.seo}%
          </b>
        </div>
        <div className="flex-1 rounded-lg border border-line bg-bg1 p-3">
          <span className="text-[11px] text-dim">生成式 GEO</span>
          <b className="mt-0.5 block font-grotesk text-[26px] font-bold text-teal">
            {data.geo}%
          </b>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        {data.conclusions.map((c, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 text-[13px] ${
              c.kind === "ok" ? "text-text" : "text-text"
            }`}
          >
            <svg className={`h-3.5 w-3.5 flex-shrink-0 ${
              c.kind === "ok" ? "text-green" : "text-amber2"
            }`}>
              <use href={c.kind === "ok" ? "#i-check" : "#i-warn"} />
            </svg>
            <span>{c.text}</span>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function DiffCard({
  data,
}: {
  data: Extract<EvidenceCardData, { type: "diff" }>;
}) {
  return (
    <CardShell title={data.title} icon="i-pen">
      <div className="overflow-hidden rounded-lg bg-bg1 font-mono text-[11.5px] leading-[1.85]">
        {data.lines.map((l, i) => (
          <div
            key={i}
            className={`flex px-1 ${
              l.kind === "add"
                ? "bg-green/10"
                : l.kind === "del"
                  ? "bg-red/10"
                  : ""
            }`}
          >
            <span className="w-7 flex-shrink-0 select-none pr-2 text-right text-faint opacity-50">
              {l.no}
            </span>
            <span
              className={`whitespace-pre ${
                l.kind === "add"
                  ? "text-green"
                  : l.kind === "del"
                    ? "text-red line-through"
                    : "text-dim"
              }`}
            >
              {l.text}
            </span>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function BarsCard({
  data,
}: {
  data: Extract<EvidenceCardData, { type: "bars" }>;
}) {
  const barColor = (cls: string) =>
    cls.includes("ds")   ? "bg-teal"   :
    cls.includes("gpt")  ? "bg-violet" :
    cls.includes("kimi") ? "bg-blue"   :
    "bg-faint";
  return (
    <CardShell title={data.title} icon="i-chart">
      <div className="flex flex-col gap-2.5">
        {data.bars.map((b, i) => (
          <div key={i} className="flex items-center gap-2.5 text-[12.5px]">
            <span className="w-24 flex-shrink-0 text-dim">{b.name}</span>
            <div className="h-[7px] flex-1 overflow-hidden rounded bg-bg1">
              <span
                className={`block h-full rounded ${barColor(b.className)}`}
                style={{ width: `${b.value}%` }}
              />
            </div>
            <b className="w-9 flex-shrink-0 text-right font-grotesk">{b.value}%</b>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-dashed border-line pt-2.5">
        {data.extras.map(([k, v], i) => (
          <span key={i} className="text-[12px] text-dim">
            {k}{" "}
            <b className="font-grotesk text-text">{v}</b>
          </span>
        ))}
      </div>
    </CardShell>
  );
}

function TermCard({
  data,
}: {
  data: Extract<EvidenceCardData, { type: "term" }>;
}) {
  const cls = (c: string) =>
    c === "ok" ? "text-green" :
    c === "up" ? "text-amber2" :
    "text-teal";
  return (
    <CardShell title={data.title} icon="i-bolt">
      <div className="rounded-lg bg-[#1C1B19] p-3.5 font-mono text-[12px] leading-[1.9] text-[#C9C7BF]">
        {data.lines.map((l, i) => (
          <div key={i}>
            <span className={cls(l.cls)}>{l.prefix}</span>
            {l.text}
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function RenameCard({
  data,
}: {
  data: Extract<EvidenceCardData, { type: "rename" }>;
}) {
  return (
    <CardShell title={data.title} icon="i-bolt">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2.5 text-[12.5px]">
          <span className="w-24 flex-shrink-0 text-dim">替换处</span>
          <div className="h-[7px] flex-1 overflow-hidden rounded bg-bg1">
            <span className="block h-full w-full rounded bg-teal" />
          </div>
          <b className="w-9 flex-shrink-0 text-right font-grotesk">{data.matches}</b>
        </div>
        <div className="flex items-center gap-2.5 text-[12.5px]">
          <span className="w-24 flex-shrink-0 text-dim">命中文件</span>
          <div className="h-[7px] flex-1 overflow-hidden rounded bg-bg1">
            <span
              className="block h-full rounded bg-violet"
              style={{ width: "74%" }}
            />
          </div>
          <b className="w-9 flex-shrink-0 text-right font-grotesk">{data.files}</b>
        </div>
        <div className="flex items-center gap-2.5 text-[12.5px]">
          <span className="w-24 flex-shrink-0 text-dim">智能排除</span>
          <div className="h-[7px] flex-1 overflow-hidden rounded bg-bg1">
            <span
              className="block h-full rounded bg-faint"
              style={{ width: "14%" }}
            />
          </div>
          <b className="w-9 flex-shrink-0 text-right font-grotesk">{data.excluded}</b>
        </div>
      </div>
      <div className="mt-2.5 text-[12px] leading-relaxed text-dim">
        排除项多为{" "}
        <code className="rounded bg-bg1 px-1.5 py-0.5 font-mono text-[12px] text-teal">
          docs/
        </code>{" "}
        与变更日志中的历史提及，按品牌约束应保留。
      </div>
    </CardShell>
  );
}

function AttachCard({
  data,
}: {
  data: Extract<EvidenceCardData, { type: "attach" }>;
}) {
  return (
    <div className="flex animate-rise items-center gap-3 rounded-lg border border-line bg-bg1 p-3">
      <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-blue/10 text-blue">
        <svg className="h-3.5 w-3.5"><use href="#i-file" /></svg>
      </div>
      <div className="min-w-0 flex-1">
        <b className="block truncate font-mono text-[12.5px] text-text">{data.file}</b>
        <span className="text-[11px] text-faint">{data.size}</span>
      </div>
      <button className="flex items-center gap-1 text-[12px] font-semibold text-amber">
        <svg className="h-3 w-3"><use href="#i-dl" /></svg>
        下载
      </button>
    </div>
  );
}
