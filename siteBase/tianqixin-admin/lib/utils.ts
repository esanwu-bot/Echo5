import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getLocalStorage = () => {
  if (typeof window !== 'undefined') {
    return window.localStorage;
  }
  return null;
};

// 后台管理 Token 使用 localStorage，关闭浏览器后自动失效
export const getSessionStorage = () => {
  if (typeof window !== 'undefined') {
    return window.localStorage;
  }
  return null;
};
