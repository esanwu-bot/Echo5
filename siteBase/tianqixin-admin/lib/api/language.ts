import { apiClient } from './client';

export interface Language {
    id: number;
    lang_code: string;
    lang_name: string;
    is_default: number;
    status: number;
    create_time?: string;
    update_time?: string;
}

export interface LanguageListParams {
    page?: number;
    limit?: number;
    search?: string;
}

export interface LanguageListResponse {
    code: number;
    message: string;
    data: {
        list: Language[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export interface LanguageResponse {
    code: number;
    message: string;
    data: Language;
}

export interface CreateLanguageData {
    lang_code: string;
    lang_name: string;
    is_default?: number;
    status?: number;
}

export interface UpdateLanguageData {
    lang_code: string;
    lang_name: string;
    is_default?: number;
    status?: number;
}

// Get languages list
export const getLanguages = async (params?: LanguageListParams): Promise<LanguageListResponse> => {
    const response = await apiClient.get('/admin/languages', { params });
    return response.data;
};

// Get single language
export const getLanguage = async (id: number): Promise<LanguageResponse> => {
    const response = await apiClient.get(`/admin/languages/${id}`);
    return response.data;
};

// Create language
export const createLanguage = async (data: CreateLanguageData): Promise<LanguageResponse> => {
    const response = await apiClient.post('/admin/languages', data);
    return response.data;
};

// Update language
export const updateLanguage = async (id: number, data: UpdateLanguageData): Promise<LanguageResponse> => {
    const response = await apiClient.put(`/admin/languages/${id}`, data);
    return response.data;
};

// Delete language
export const deleteLanguage = async (id: number): Promise<{ code: number; message: string }> => {
    const response = await apiClient.delete(`/admin/languages/${id}`);
    return response.data;
};

// Toggle language status
export const toggleLanguageStatus = async (id: number): Promise<LanguageResponse> => {
    const response = await apiClient.put(`/admin/languages/${id}/status`);
    return response.data;
};

// Set language as default
export const setDefaultLanguage = async (id: number): Promise<LanguageResponse> => {
    const response = await apiClient.put(`/admin/languages/${id}/set-default`);
    return response.data;
};
