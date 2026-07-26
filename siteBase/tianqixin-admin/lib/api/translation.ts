import { apiClient } from './client';

export interface Translation {
    id: number;
    lang_code: string;
    trans_key: string;
    trans_value: string;
    module?: string;
    create_time?: string;
    update_time?: string;
}

export interface TranslationListParams {
    page?: number;
    limit?: number;
    lang_code?: string;
    module?: string;
    search?: string;
}

export interface TranslationListResponse {
    code: number;
    message: string;
    data: {
        list: Translation[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export interface TranslationResponse {
    code: number;
    message: string;
    data: Translation;
}

export interface CreateTranslationData {
    lang_code: string;
    trans_key: string;
    trans_value: string;
    module?: string;
}

export interface UpdateTranslationData {
    trans_value: string;
    module?: string;
}

export interface AutoTranslateData {
    text: string;
    target_lang: string;
    source_lang?: string;
}

export interface AutoTranslateResponse {
    code: number;
    message: string;
    data: {
        original: string;
        translated: string;
        source_lang: string;
        target_lang: string;
    };
}

export interface BatchImportResponse {
    code: number;
    message: string;
    data: {
        imported: number;
        errors: string[];
    };
}

// Get translations list
export const getTranslations = async (params?: TranslationListParams): Promise<TranslationListResponse> => {
    const response = await apiClient.get('/admin/translations', { params });
    return response.data;
};

// Get single translation
export const getTranslation = async (id: number): Promise<TranslationResponse> => {
    const response = await apiClient.get(`/admin/translations/${id}`);
    return response.data;
};

// Create translation
export const createTranslation = async (data: CreateTranslationData): Promise<TranslationResponse> => {
    const response = await apiClient.post('/admin/translations', data);
    return response.data;
};

// Update translation
export const updateTranslation = async (id: number, data: UpdateTranslationData): Promise<TranslationResponse> => {
    const response = await apiClient.put(`/admin/translations/${id}`, data);
    return response.data;
};

// Delete translation
export const deleteTranslation = async (id: number): Promise<{ code: number; message: string }> => {
    const response = await apiClient.delete(`/admin/translations/${id}`);
    return response.data;
};

// Auto-translate text
export const autoTranslate = async (data: AutoTranslateData): Promise<AutoTranslateResponse> => {
    const response = await apiClient.post('/admin/translations/auto-translate', data);
    return response.data;
};

// Batch import translations
export const batchImportTranslations = async (file: File): Promise<BatchImportResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/admin/translations/batch-import', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

// Export translations
export const exportTranslations = async (params?: { lang_code?: string; module?: string }): Promise<Blob> => {
    const response = await apiClient.get('/admin/translations/export', {
        params,
        responseType: 'blob',
    });
    return response.data;
};
