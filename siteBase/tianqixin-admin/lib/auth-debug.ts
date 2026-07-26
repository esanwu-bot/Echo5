/**
 * JWT Token 调试工具
 * 用于诊断 Token 验证问题
 */

export interface DecodedToken {
  header: any;
  payload: any;
  signature: string;
}

/**
 * 解码 JWT Token（不验证签名）
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format');
      return null;
    }

    const base64UrlDecode = (str: string): any => {
      // Replace URL-safe characters
      let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      // Add padding
      while (base64.length % 4) {
        base64 += '=';
      }
      try {
        const decoded = atob(base64);
        return JSON.parse(decoded);
      } catch (e) {
        return null;
      }
    };

    return {
      header: base64UrlDecode(parts[0]),
      payload: base64UrlDecode(parts[1]),
      signature: parts[2],
    };
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

/**
 * 检查 Token 是否过期
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.payload || !decoded.payload.exp) {
    return true;
  }
  
  const exp = decoded.payload.exp;
  const now = Math.floor(Date.now() / 1000);
  
  return now > exp;
}

/**
 * 获取 Token 剩余时间（秒）
 */
export function getTokenRemainingTime(token: string): number {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.payload || !decoded.payload.exp) {
    return 0;
  }
  
  const exp = decoded.payload.exp;
  const now = Math.floor(Date.now() / 1000);
  
  return Math.max(0, exp - now);
}

/**
 * 格式化时间显示
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}分钟`;
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}小时`;
  }
  return `${Math.floor(seconds / 86400)}天`;
}

/**
 * 调试当前存储的 Token
 */
export function debugCurrentToken(): void {
  if (typeof window === 'undefined') {
    console.log('Debug only works in browser');
    return;
  }

  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    console.warn('%c[Auth Debug] No token found in localStorage', 'color: orange');
    return;
  }

  console.log('%c[Auth Debug] Token Analysis:', 'color: blue; font-weight: bold');
  console.log('Token preview:', token.substring(0, 50) + '...');

  const decoded = decodeToken(token);
  
  if (!decoded) {
    console.error('%c[Auth Debug] Failed to decode token', 'color: red');
    return;
  }

  console.log('Header:', decoded.header);
  console.log('Payload:', decoded.payload);

  if (decoded.payload.exp) {
    const expDate = new Date(decoded.payload.exp * 1000);
    const isExpired = isTokenExpired(token);
    const remaining = getTokenRemainingTime(token);

    console.log(`
%c[Auth Debug] Expiration Info:%c
  Expires at: ${expDate.toLocaleString()}
  Is expired: ${isExpired ? '%cYES%c' : '%cNO%c'}
  Remaining: ${formatDuration(remaining)}
    `, 
    'color: blue; font-weight: bold', 'color: inherit',
    isExpired ? 'color: red' : 'color: green', 'color: inherit',
    isExpired ? 'color: red' : 'color: green', 'color: inherit'
    );
  }

  if (decoded.payload.iat) {
    const iatDate = new Date(decoded.payload.iat * 1000);
    console.log('Issued at:', iatDate.toLocaleString());
  }

  if (decoded.payload.data) {
    console.log('User data:', decoded.payload.data);
  }
}

// 仅在开发环境暴露调试工具到浏览器控制台
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // @ts-ignore
  window.debugAuth = debugCurrentToken;
  // @ts-ignore
  window.decodeToken = decodeToken;
}
