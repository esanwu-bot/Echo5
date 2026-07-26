import { apiClient } from './client';

export interface LangCode {
    id: number;
    type_id: number;
    code: string;
    remarks: string;
    lang_explain: string;
    is_admin: number;
    module?: string;
    business_id?: number;
    language_name?: string;
    create_time?: string;
    update_time?: string;
}

export interface LangCodeListParams {
    page?: number;
    limit?: number;
    is_admin?: number;
    type_id?: number;
    code?: string;
    remarks?: string;
    business_id?: number;
}

export interface LangCodeListResponse {
    code: number;
    message: string;
    data: {
        list: LangCode[];
        count: number;
        langType: {
            isAdmin: Array<{ title: string; value: number }>;
            langType: Array<{ title: string; value: number }>;
        };
    };
}

// 获取翻译词条列表
export const getLangCodes = async (params?: LangCodeListParams) => {
    const response = await apiClient.get('/admin/lang_codes', { params });
    return response.data;
};

// 获取翻译词条详情（按code查所有语言翻译）
export const getLangCodeInfo = async (code: string) => {
    const response = await apiClient.get('/admin/lang_codes/info', { params: { code } });
    return response.data;
};

// 保存翻译词条
export const saveLangCode = async (data: {
    is_admin: number;
    code?: string;
    remarks: string;
    module?: string;
    business_id?: number;
    edit: number;
    list: Array<{
        id?: number;
        type_id: number;
        lang_explain: string;
        language_name?: string;
    }>;
}) => {
    const response = await apiClient.post('/admin/lang_codes', data);
    return response.data;
};

// 删除翻译词条（按code）
export const deleteLangCode = async (code: string) => {
    const response = await apiClient.delete(`/admin/lang_codes/${encodeURIComponent(code)}`);
    return response.data;
};

// 按ID删除
export const deleteLangCodeById = async (id: number) => {
    const response = await apiClient.delete(`/admin/lang_codes/id/${id}`);
    return response.data;
};

// 机器翻译（火山引擎）
export const translateText = async (text: string) => {
    const response = await apiClient.post('/admin/lang_codes/translate', { text });
    return response.data;
};

// 批量翻译
export const batchTranslate = async (type_id: number, file_name: string) => {
    const response = await apiClient.post('/admin/lang_codes/batch_translate', { type_id, file_name });
    return response.data;
};

// 批量删除
export const batchDeleteLangCodes = async (ids: number[]) => {
    const response = await apiClient.post('/admin/lang_codes/batch_delete', { ids });
    return response.data;
};
