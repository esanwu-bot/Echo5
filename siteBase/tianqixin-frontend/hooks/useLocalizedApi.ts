import { useTranslation } from 'react-i18next';
import { useMemo, useCallback } from 'react';
import { apiRequest } from '../lib/api-client';

export interface ApiOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
}

export function useLocalizedApi() {
    const { i18n } = useTranslation();

    const api = useMemo(() => ({
        /**
         * GET 请求（自动附带语言参数）
         */
        get: async (endpoint: string) => {
            const lang = i18n.language;
            const separator = endpoint.includes('?') ? '&' : '?';
            const url = `${endpoint}${separator}lang=${lang}`;
            return apiRequest(url);
        },

        /**
         * POST 请求（自动附带语言参数）
         */
        post: async (endpoint: string, data?: any) => {
            const lang = i18n.language;
            const separator = endpoint.includes('?') ? '&' : '?';
            const url = `${endpoint}${separator}lang=${lang}`;
            return apiRequest(url, {
                method: 'POST',
                body: data ? JSON.stringify(data) : undefined,
            });
        },

        /**
         * PUT 请求（自动附带语言参数）
         */
        put: async (endpoint: string, data?: any) => {
            const lang = i18n.language;
            const separator = endpoint.includes('?') ? '&' : '?';
            const url = `${endpoint}${separator}lang=${lang}`;
            return apiRequest(url, {
                method: 'PUT',
                body: data ? JSON.stringify(data) : undefined,
            });
        },

        /**
         * DELETE 请求（自动附带语言参数）
         */
        delete: async (endpoint: string) => {
            const lang = i18n.language;
            const separator = endpoint.includes('?') ? '&' : '?';
            const url = `${endpoint}${separator}lang=${lang}`;
            return apiRequest(url, { method: 'DELETE' });
        },
    }), [i18n.language]);

    return api;
}
