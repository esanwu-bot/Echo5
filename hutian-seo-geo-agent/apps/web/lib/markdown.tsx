/**
 * markdown.tsx · SSR-safe Markdown 渲染（γ 渲染器与人视角共享）
 *
 * 设计原则：
 *   1. 本组件用于 server component，不引入 client hooks，可在 SSR 初始 HTML 中输出。
 *   2. 只启用 remark-gfm（表格/列表/代码块/删除线），不启用 rehype-raw：
 *      siteBase 文章 content 是干净 markdown，去 raw = 去 XSS 面。
 *   3. 组件映射与 components/workbench/MarkdownRenderer.tsx 保持一致（single source），
 *      但样式更克制，适配站点正文阅读。
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="prose prose-lg max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 标题：站点正文缩小一级，避免 H1 与页面 H1 冲突
          h1: ({ ...props }) => (
            <h2 className="mb-3 mt-6 text-2xl font-bold" {...props} />
          ),
          h2: ({ ...props }) => (
            <h3 className="mb-2 mt-5 text-xl font-semibold" {...props} />
          ),
          h3: ({ ...props }) => (
            <h4 className="mb-2 mt-4 text-lg font-semibold" {...props} />
          ),
          h4: ({ ...props }) => (
            <h5 className="mb-2 mt-4 text-base font-semibold" {...props} />
          ),
          // 表格
          table: ({ ...props }) => (
            <div className="my-4 overflow-x-auto">
              <table
                className="my-0 w-full border-collapse text-sm"
                {...props}
              />
            </div>
          ),
          thead: ({ ...props }) => <thead className="bg-gray-100" {...props} />,
          tbody: ({ ...props }) => (
            <tbody className="divide-y divide-gray-200" {...props} />
          ),
          tr: ({ ...props }) => (
            <tr className="even:bg-gray-50" {...props} />
          ),
          th: ({ ...props }) => (
            <th
              className="border border-gray-300 px-3 py-2 text-left font-semibold"
              {...props}
            />
          ),
          td: ({ ...props }) => (
            <td className="border border-gray-300 px-3 py-2" {...props} />
          ),
          // 列表
          ul: ({ ...props }) => (
            <ul className="my-2 list-disc space-y-1 pl-6" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="my-2 list-decimal space-y-1 pl-6" {...props} />
          ),
          li: ({ ...props }) => <li {...props} />,
          // 段落 / 强调 / 代码 / 链接
          p: ({ ...props }) => <p className="my-3 leading-relaxed" {...props} />,
          strong: ({ ...props }) => (
            <strong className="font-semibold" {...props} />
          ),
          em: ({ ...props }) => <em className="italic" {...props} />,
          code: ({ className, children, ...props }) => {
            const isBlock = className?.startsWith("language-");
            if (isBlock) {
              return (
                <pre className="my-3 overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              );
            }
            return (
              <code
                className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-amber-700"
                {...props}
              >
                {children}
              </code>
            );
          },
          a: ({ ...props }) => (
            <a
              className="text-blue-600 underline hover:text-blue-800"
              target="_blank"
              rel="noreferrer"
              {...props}
            />
          ),
          hr: () => <hr className="my-6 border-gray-300" />,
          blockquote: ({ ...props }) => (
            <blockquote
              className="my-3 border-l-4 border-gray-300 pl-4 italic text-gray-600"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
