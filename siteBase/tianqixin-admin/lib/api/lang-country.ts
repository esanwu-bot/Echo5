import { apiClient } from './client';

export interface LangCountry {
    id: number;
    type_id: number;
    code: string;
    name: string;
    status: number;
    link_lang?: string;
}

export interface LangCountryListParams {
    page?: number;
    limit?: number;
    keyword?: string;
}

export interface LangCountryListResponse {
    code: number;
    message: string;
    data: {
        list: LangCountry[];
        count: number;
    };
}

// 获取地区映射列表
export const getLangCountries = async (params?: LangCountryListParams) => {
    const response = await apiClient.get('/admin/lang_countries', { params });
    return response.data;
};

// 获取单个地区映射
export const getLangCountry = async (id: number) => {
    const response = await apiClient.get(`/admin/lang_countries/${id}`);
    return response.data;
};

// 创建地区映射
export const createLangCountry = async (data: { code: string; name: string; type_id?: number; status?: number }) => {
    const response = await apiClient.post('/admin/lang_countries', data);
    return response.data;
};

// 更新地区映射
export const updateLangCountry = async (id: number, data: { code?: string; name?: string; type_id?: number; status?: number }) => {
    const response = await apiClient.put(`/admin/lang_countries/${id}`, data);
    return response.data;
};

// 删除地区映射
export const deleteLangCountry = async (id: number) => {
    const response = await apiClient.delete(`/admin/lang_countries/${id}`);
    return response.data;
};

// 切换状态
export const updateLangCountryStatus = async (id: number, status: number) => {
    const response = await apiClient.put(`/admin/lang_countries/${id}/status`, { status });
    return response.data;
};

// 批量删除地区映射
export const batchDeleteLangCountries = async (ids: (string | number)[]) => {
    const response = await apiClient.post('/admin/lang_countries/batch-delete', { ids });
    return response.data;
};
