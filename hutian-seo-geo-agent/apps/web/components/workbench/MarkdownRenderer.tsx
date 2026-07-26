"use client";

import { useState, type FC } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

/**
 * Markdown 渲染器 · SSE 流式适配
 *
 * 用 react-markdown + remark-gfm（GFM 表格/列表/代码块）+ rehype-raw（兼容 demo HTML）。
 * 替代之前的 dangerouslySetInnerHTML，专业度提升：
 *  - 表格 | a | b | → <table>（GFM）
 *  - 代码块 ```lang → 带 copy 按钮
 *  - 粗体 **text** / 行内 `code` / 列表 / 链接 全支持
 *
 * 兼容：demo 数据是 HTML 字符串（含 <strong> <br/>），rehype-raw 让其正常渲染。
 * 流式：content 是累积文本，每次渲染完整解析（react-markdown 性能可接受）。
 */

interface MarkdownRendererProps {
  content: string;
}

/** 代码块 + copy 按钮（DeepSeek 风格） */
const CodeBlock: FC<{ className?: string; children?: React.ReactNode }> = ({
  className,
  children,
}) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className ?? "");
  const lang = match ? match[1] : "";
  const codeText = String(children ?? "").replace(/\n$/, "");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 剪贴板权限拒绝时静默
    }
  };

  return (
    <pre className="group relative my-2 overflow-x-auto rounded-lg border border-line bg-bg3 p-3 text-[12px] leading-relaxed">
      {lang && (
        <div className="absolute right-0 top-0 rounded-bl-md bg-bg2 px-2 py-0.5 font-mono text-[10px] text-faint">
          {lang}
        </div>
      )}
      <button
        onClick={handleCopy}
        className="absolute right-1.5 top-1.5 rounded border border-line bg-bg2 px-1.5 py-0.5 font-mono text-[10px] text-dim opacity-0 transition group-hover:opacity-100"
        aria-label="复制代码"
      >
        {copied ? "已复制" : "复制"}
      </button>
      <code className={className} style={{ background: "transparent", padding: 0 }}>
        {children}
      </code>
    </pre>
  );
};

export const MarkdownRenderer: FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="md-body text-[13.5px] leading-relaxed text-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // 代码块
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children, ...props }) => {
            // 行内代码 vs 代码块：react-markdown v9+ 行内 code 无 className，块级有 language-xxx
            if (className && className.startsWith("language-")) {
              return <CodeBlock className={className}>{children}</CodeBlock>;
            }
            return (
              <code
                className="rounded border border-line bg-bg2 px-1 py-0.5 font-mono text-[12px] text-amber"
                {...props}
              >
                {children}
              </code>
            );
          },
          // 表格（DeepSeek 风格 · SKILLv2 对齐：table/thead/tbody/th/td/tr 全自定义）
          table: ({ ...props }) => (
            <div className="my-2 overflow-x-auto">
              <table
                className="my-0 w-full border-collapse text-[12.5px]"
                {...props}
              />
            </div>
          ),
          thead: ({ ...props }) => <thead className="bg-bg2" {...props} />,
          tbody: ({ ...props }) => (
            <tbody className="divide-y divide-line/50" {...props} />
          ),
          tr: ({ ...props }) => (
            <tr className="even:bg-bg1/40 transition-colors" {...props} />
          ),
          th: ({ ...props }) => (
            <th
              className="border border-line px-2.5 py-1.5 text-left font-semibold text-text"
              {...props}
            />
          ),
          td: ({ ...props }) => (
            <td className="border border-line px-2.5 py-1.5 text-dim" {...props} />
          ),
          // 标题
          h1: ({ ...props }) => (
            <h1 className="mb-2 mt-3 border-b border-line pb-1 text-[15px] font-bold" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="mb-1.5 mt-2.5 text-[14px] font-bold" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="mb-1 mt-2 text-[13.5px] font-semibold" {...props} />
          ),
          // 列表
          ul: ({ ...props }) => <ul className="my-1 space-y-0.5 pl-5" {...props} />,
          ol: ({ ...props }) => <ol className="my-1 space-y-0.5 pl-5" {...props} />,
          li: ({ ...props }) => <li className="text-text" {...props} />,
          // 段落 / 强调 / 链接 / 分割线
          p: ({ ...props }) => <p className="my-1.5 first:mt-0 last:mb-0" {...props} />,
          strong: ({ ...props }) => (
            <strong className="font-semibold text-text" {...props} />
          ),
          em: ({ ...props }) => <em className="italic" {...props} />,
          a: ({ ...props }) => (
            <a className="text-amber underline hover:brightness-110" target="_blank" rel="noreferrer" {...props} />
          ),
          hr: () => <hr className="my-3 border-line" />,
          blockquote: ({ ...props }) => (
            <blockquote
              className="my-2 border-l-2 border-amber/50 bg-bg1 px-3 py-1 text-dim"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
