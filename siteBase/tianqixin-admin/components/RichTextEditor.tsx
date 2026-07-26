"use client";

import React from 'react';
import dynamic from 'next/dynamic';

// 动态导入 ReactQuill 以避免 SSR 问题
const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div style={{ height: '200px', border: '1px solid #d9d9d9', borderRadius: '6px' }}>加载编辑器中...</div>
});

// 导入样式
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  height?: number;
  disabled?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = '请输入内容...',
  height = 200,
  disabled = false
}) => {
  // 编辑器配置
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false,
    }
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet',
    'indent',
    'direction', 'align',
    'blockquote', 'code-block',
    'link', 'image', 'video'
  ];

  const handleChange = (content: string) => {
    if (onChange) {
      onChange(content);
    }
  };

  // 自定义样式
  const editorStyle = {
    height: `${height}px`,
    marginBottom: '42px' // 为工具栏留出空间
  };

  return (
    <div className="rich-text-editor">
      <style jsx global>{`
        .rich-text-editor .ql-editor {
          min-height: ${height - 42}px;
          font-size: 14px;
          line-height: 1.5;
        }
        
        .rich-text-editor .ql-toolbar {
          border-top: 1px solid #d9d9d9;
          border-left: 1px solid #d9d9d9;
          border-right: 1px solid #d9d9d9;
          border-radius: 6px 6px 0 0;
        }
        
        .rich-text-editor .ql-container {
          border-bottom: 1px solid #d9d9d9;
          border-left: 1px solid #d9d9d9;
          border-right: 1px solid #d9d9d9;
          border-radius: 0 0 6px 6px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
        }
        
        .rich-text-editor .ql-editor.ql-blank::before {
          color: #bfbfbf;
          font-style: normal;
        }
        
        .rich-text-editor .ql-toolbar .ql-formats {
          margin-right: 8px;
        }
        
        .rich-text-editor .ql-toolbar button {
          padding: 2px 4px;
        }
        
        .rich-text-editor .ql-toolbar button:hover {
          color: #1890ff;
        }
        
        .rich-text-editor .ql-toolbar button.ql-active {
          color: #1890ff;
        }
        
        .rich-text-editor .ql-editor h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 0.67em 0;
        }
        
        .rich-text-editor .ql-editor h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 0.83em 0;
        }
        
        .rich-text-editor .ql-editor h3 {
          font-size: 1.17em;
          font-weight: bold;
          margin: 1em 0;
        }
        
        .rich-text-editor .ql-editor h4 {
          font-size: 1em;
          font-weight: bold;
          margin: 1.33em 0;
        }
        
        .rich-text-editor .ql-editor h5 {
          font-size: 0.83em;
          font-weight: bold;
          margin: 1.67em 0;
        }
        
        .rich-text-editor .ql-editor h6 {
          font-size: 0.67em;
          font-weight: bold;
          margin: 2.33em 0;
        }
        
        .rich-text-editor .ql-editor ul, 
        .rich-text-editor .ql-editor ol {
          padding-left: 1.5em;
        }
        
        .rich-text-editor .ql-editor blockquote {
          border-left: 4px solid #ccc;
          margin-bottom: 5px;
          margin-top: 5px;
          padding-left: 16px;
        }
        
        .rich-text-editor .ql-editor code {
          background-color: #f5f5f5;
          border-radius: 3px;
          padding: 2px 4px;
        }
        
        .rich-text-editor .ql-editor pre {
          background-color: #f5f5f5;
          border-radius: 3px;
          padding: 8px 12px;
          overflow-x: auto;
        }
        
        .rich-text-editor .ql-editor img {
          max-width: 100%;
          height: auto;
        }
        
        .rich-text-editor .ql-editor a {
          color: #1890ff;
          text-decoration: none;
        }
        
        .rich-text-editor .ql-editor a:hover {
          text-decoration: underline;
        }
      `}</style>
      
      <ReactQuill
        theme="snow"
        value={value}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={disabled}
        style={editorStyle}
      />
    </div>
  );
};

export default RichTextEditor;