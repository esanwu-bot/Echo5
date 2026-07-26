import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import resources from '../lang';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// 避免同一个 missingKey 在同一会话里重复上报
const reportedMissingKeys = new Set<string>();

i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'zh',
        supportedLngs: ['zh', 'en', 'ja', 'ko'],
        debug: import.meta.env.DEV,

        // 本地前端语言包作为基础资源
        resources,

        interpolation: {
            escapeValue: false, // React already escapes
        },

        // 项目使用完整中文字符串作为 key，禁用默认分隔符避免误解析
        nsSeparator: false,
        keySeparator: false,

        // 开发环境自动把 missingKey 上报到后端采集队列
        saveMissing: import.meta.env.DEV,
        missingKeyHandler: (lngs, ns, key, fallbackValue) => {
            const lang = Array.isArray(lngs) ? lngs[0] : lngs;
            if (!key) return; // 跳过空 key，避免后端 400
            const dedupeKey = `${lang}:${ns}:${key}`;
            if (reportedMissingKeys.has(dedupeKey)) return;
            reportedMissingKeys.add(dedupeKey);

            fetch(`${API_BASE_URL}/temp-translation/report-missing-key`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lang,
                    namespace: ns,
                    key,
                    fallbackValue: fallbackValue ?? key,
                }),
            }).catch((err) => {
                console.error('[i18next] 上报 missingKey 失败:', err);
            });
        },

        backend: {
            // 从后端 API 加载翻译（会合并覆盖本地资源）
            loadPath: `${API_BASE_URL}/translations/{{lng}}`,
            parse: (data: string) => {
                try {
                    const response = JSON.parse(data);
                    const parsed = response.data || {};
                    console.log('[i18next] Loaded translations:', Object.keys(parsed).length, 'keys');
                    return parsed;
                } catch (e) {
                    console.error('Failed to parse translation data:', e);
                    return {};
                }
            },
            requestOptions: {
                cache: 'no-store',
            } as any,
        },

        detection: {
            // 语言检测顺序
            order: ['querystring', 'cookie', 'localStorage', 'navigator'],
            lookupQuerystring: 'lang',
            lookupCookie: 'lang',
            lookupLocalStorage: 'lang',
            caches: ['localStorage', 'cookie'],
        },

        // 默认命名空间
        ns: ['common'],
        defaultNS: 'common',
    });

export default i18n;
