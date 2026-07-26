import zhCn from './zh-cn';
import enUs from './en-us';
import jaJp from './ja-jp';
import koKr from './ko-kr';

// 语言包注册：本地语言包作为兜底
// 后端 API（HttpBackend）加载的翻译会合并覆盖本地资源
// 前端组件通过 t('中文key') 直接使用翻译
const resources = {
  zh: { common: zhCn },
  en: { common: enUs },
  ja: { common: jaJp },
  ko: { common: koKr },
} as const;

export default resources;
