import { apiClient } from './client';

export interface LangType {
    id: number;
    language_name: string;
    file_name: string;
    status: number;
    is_default: number;
    is_del?: number;
    create_time?: string;
    update_time?: string;
}

export interface LangTypeListParams {
    page?: number;
    limit?: number;
}

export interface LangTypeListResponse {
    code: number;
    message: string;
    data: {
        list: LangType[];
        count: number;
    };
}

export interface LangTypeResponse {
    code: number;
    message: string;
    data: LangType;
}

export interface CreateLangTypeData {
    language_name: string;
    file_name: string;
    is_default?: number;
    status?: number;
}

export interface UpdateLangTypeData {
    language_name?: string;
    file_name?: string;
    is_default?: number;
    status?: number;
}

// 获取语言类型列表
export const getLangTypes = async (params?: LangTypeListParams) => {
    const response = await apiClient.get('/admin/lang_types', { params });
    return response.data;
};

// 获取单个语言类型
export const getLangType = async (id: number) => {
    const response = await apiClient.get(`/admin/lang_types/${id}`);
    return response.data;
};

// 创建语言类型
export const createLangType = async (data: CreateLangTypeData) => {
    const response = await apiClient.post('/admin/lang_types', data);
    return response.data;
};

// 更新语言类型
export const updateLangType = async (id: number, data: UpdateLangTypeData) => {
    const response = await apiClient.put(`/admin/lang_types/${id}`, data);
    return response.data;
};

// 删除语言类型
export const deleteLangType = async (id: number) => {
    const response = await apiClient.delete(`/admin/lang_types/${id}`);
    return response.data;
};

// 切换语言状态
export const toggleLangTypeStatus = async (id: number) => {
    const response = await apiClient.put(`/admin/lang_types/${id}/status`);
    return response.data;
};

// 设置为默认语言
export const setDefaultLangType = async (id: number) => {
    const response = await apiClient.put(`/admin/lang_types/${id}/set-default`);
    return response.data;
};
