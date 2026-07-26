import DOMPurify from 'dompurify'

/**
 * 修复机器翻译产生的畸形HTML标签: "< p >" → "<p>", "< /p >" → "</p>"
 */
function fixMalformedHtmlTags(html: string): string {
  return html.replace(/<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)((?:[^>"]*|"[^"]*")*?)\s*>/g, '<$1$2$3>')
}

/**
 * 消毒 HTML 内容，防止存储型 XSS 攻击。
 * 用于所有从后端获取的富文本 HTML（文章、新闻、产品描述等）。
 */
export function sanitizeHtml(html: string | undefined | null): string {
  if (!html) return ''
  const normalized = fixMalformedHtmlTags(html)
  return DOMPurify.sanitize(normalized, {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'i', 'u', 'em', 'strong', 'a', 'img',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'span', 'div', 'hr', 'sub', 'sup',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'style',
      'target', 'rel', 'width', 'height', 'colspan', 'rowspan',
    ],
    ALLOW_DATA_ATTR: false,
  })
}
