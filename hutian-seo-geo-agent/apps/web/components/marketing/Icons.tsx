import { JSX } from "react";

/**
 * SVG icon sprite — 原型里的 icon symbols 照搬。
 * 使用方式：<svg><use href="#i-xxx"/></svg>
 * 通过 dangerouslySetInnerHTML 注入 symbol 定义，display:none 隐藏容器。
 */
const SPRITE = `
<svg style="display:none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <symbol id="i-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></symbol>
  <symbol id="i-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>
  <symbol id="i-play" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></symbol>
  <symbol id="i-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></symbol>
  <symbol id="i-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 01-11.5 7.2L4 20l1-4.5A8 8 0 1121 12z"/></symbol>
  <symbol id="i-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></symbol>
  <symbol id="i-robot" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M8 4h8"/><circle cx="9" cy="14" r="1.2" fill="currentColor"/><circle cx="15" cy="14" r="1.2" fill="currentColor"/></symbol>
  <symbol id="i-zap" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></symbol>
  <symbol id="i-devices" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="2" y="4" width="14" height="10" rx="1.5"/><path d="M2 18h11"/><rect x="17" y="9" width="5" height="11" rx="1.2"/></symbol>
  <symbol id="i-rocket" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M14.5 4.5C18 3 21 3 21 3s0 3-1.5 6.5C17.5 14 12 17 12 17l-5-5s3-5.5 7.5-7.5z"/><circle cx="15" cy="9" r="1.4"/></symbol>
  <symbol id="i-edit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></symbol>
  <symbol id="i-spark" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2zM19 14l.9 2.6L22 17l-2.1.7L19 20l-.9-2.3L16 17l2.1-.4L19 14z"/></symbol>
  <symbol id="i-tune" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4"/><circle cx="16" cy="6" r="2" fill="currentColor"/><circle cx="8" cy="12" r="2" fill="currentColor"/><circle cx="14" cy="18" r="2" fill="currentColor"/></symbol>
  <symbol id="i-upload" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 16v2a2 2 0 002 2h10a2 2 0 002-2v-2"/></symbol>
  <symbol id="i-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></symbol>
  <symbol id="i-github" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 00-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .8.1-.6.3-1.1.6-1.4-2.2-.2-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.3 9.3 0 015 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.8-4.6 5 .3.3.7 1 .7 2v2.9c0 .3.2.6.7.5A10 10 0 0012 2z"/></symbol>
  <symbol id="i-twitter" viewBox="0 0 24 24" fill="currentColor"><path d="M18 3h3l-7 8 8 10h-6l-5-6-5 6H3l7-9L2 3h6l4 5 6-5z"/></symbol>
  <symbol id="i-wechat" viewBox="0 0 24 24" fill="currentColor"><path d="M9 4C5 4 2 6.7 2 10c0 1.9 1 3.5 2.6 4.6L4 17l2.6-1.3c.8.2 1.6.3 2.4.3h.5a5 5 0 01-.2-1.4c0-3 2.9-5.3 6.4-5.3h.6C15.7 6 12.7 4 9 4zm-2.4 4a1 1 0 110 2 1 1 0 010-2zm4.8 0a1 1 0 110 2 1 1 0 010-2zM16 10c-3 0-5.5 2-5.5 4.6S13 19 16 19c.7 0 1.3-.1 1.9-.3L20 20l-.5-1.7c1.2-.9 2-2.2 2-3.7C21.5 12 19 10 16 10zm-1.8 3a.8.8 0 110 1.6.8.8 0 010-1.6zm3.6 0a.8.8 0 110 1.6.8.8 0 010-1.6z"/></symbol>
</svg>
`;

export default function Icons(): JSX.Element {
  return <div dangerouslySetInnerHTML={{ __html: SPRITE }} aria-hidden="true" />;
}
