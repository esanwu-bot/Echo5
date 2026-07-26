export type FieldEditorType = 'text' | 'textarea' | 'json' | 'array' | 'object-array' | 'nested-object';

export function decodeHtmlEntities(str: string): string {
  if (typeof str !== 'string') return str;
  return str.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

export function tryParseJson(value: any): any {
  if (typeof value !== 'string') return value;
  
  const decoded = decodeHtmlEntities(value);
  try {
    return JSON.parse(decoded);
  } catch {
    return value;
  }
}

export function isArrayOfObjects(arr: any[]): boolean {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  return arr.every(item => typeof item === 'object' && item !== null && !Array.isArray(item));
}

export function isNestedObject(obj: any): boolean {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
  return Object.values(obj).some(val => typeof val === 'object' && val !== null);
}

export function detectFieldType(value: any): FieldEditorType {
  if (value === null || value === undefined) return 'text';
  
  const parsed = tryParseJson(value);
  
  if (typeof parsed === 'string') {
    return parsed.length > 100 ? 'textarea' : 'text';
  }
  
  if (typeof parsed === 'number' || typeof parsed === 'boolean') {
    return 'text';
  }
  
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return 'array';
    if (isArrayOfObjects(parsed)) return 'object-array';
    return 'array';
  }
  
  if (typeof parsed === 'object') {
    if (isNestedObject(parsed)) return 'nested-object';
    return 'json';
  }
  
  return 'json';
}
