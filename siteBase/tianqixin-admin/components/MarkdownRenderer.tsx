'use client';

/**
 * 电子元器件商城 - Markdown 渲染组件
 * 文件说明：基于 react-markdown + remark-gfm 的 DeepSeek 风格 Markdown 渲染器，
 *         用于 AI 聊天 SSE 流式输出，支持代码块（含复制按钮）、表格、列表、标题等。
 */

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './MarkdownRenderer.css';

interface CodeBlockProps {
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

/**
 * 自定义代码块组件
 *
 * @param className 代码块语言类名
 * @param children 代码内容
 * @param props 其他属性
 */
const CodeBlock: React.FC<CodeBlockProps> = ({ className, children, ...props }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';
  const codeText = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 复制失败时静默处理
    }
  };

  return (
    <pre className="md-pre">
      {lang && <div className="md-code-lang">{lang}</div>}
      <button className="md-copy-btn" onClick={handleCopy} type="button">
        {copied ? '已复制' : '复制'}
      </button>
      <code className={className} {...props}>
        {children}
      </code>
    </pre>
  );
};

interface MarkdownRendererProps {
  content: string;
}

/**
 * Markdown 渲染器
 *
 * @param content 待渲染的 Markdown 文本
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // 过滤 <think> 思考过程，避免展示内部推理内容
  const cleanContent = content.replace(/<think[\s\S]*?<\/think>/gi, '').trim();

  if (!cleanContent) {
    return null;
  }

  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: CodeBlock,
          table: ({ node, ...props }) => <table className="md-table" {...props} />,
          thead: ({ node, ...props }) => <thead className="md-table-head" {...props} />,
          tbody: ({ node, ...props }) => <tbody className="md-table-body" {...props} />,
          tr: ({ node, ...props }) => <tr className="md-table-tr" {...props} />,
          th: ({ node, ...props }) => <th className="md-table-th" {...props} />,
          td: ({ node, ...props }) => <td className="md-table-td" {...props} />,
          h1: ({ node, ...props }) => <h1 className="md-h1" {...props} />,
          h2: ({ node, ...props }) => <h2 className="md-h2" {...props} />,
          h3: ({ node, ...props }) => <h3 className="md-h3" {...props} />,
          h4: ({ node, ...props }) => <h4 className="md-h4" {...props} />,
          h5: ({ node, ...props }) => <h5 className="md-h5" {...props} />,
          h6: ({ node, ...props }) => <h6 className="md-h6" {...props} />,
          p: ({ node, ...props }) => <p className="md-p" {...props} />,
          ul: ({ node, ...props }) => <ul className="md-ul" {...props} />,
          ol: ({ node, ...props }) => <ol className="md-ol" {...props} />,
          li: ({ node, ...props }) => <li className="md-li" {...props} />,
          a: ({ node, ...props }) => <a className="md-link" target="_blank" rel="noopener noreferrer" {...props} />,
          strong: ({ node, ...props }) => <strong className="md-strong" {...props} />,
          em: ({ node, ...props }) => <em className="md-em" {...props} />,
          hr: ({ node, ...props }) => <hr className="md-hr" {...props} />,
          blockquote: ({ node, ...props }) => <blockquote className="md-blockquote" {...props} />,
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
