import { apiClient } from './client';

export interface TranslateConfig {
    volc_access_key_id: string;
    volc_secret_access_key: string;
    is_configured: boolean;
    config_time: string;
}

export interface TranslateConfigResponse {
    code: number;
    message: string;
    data: TranslateConfig;
}

export interface UpdateTranslateConfigData {
    volc_access_key_id: string;
    volc_secret_access_key: string;
}

// Get translate config
export const getTranslateConfig = async (): Promise<TranslateConfigResponse> => {
    const response = await apiClient.get('/admin/translate-config');
    return response.data;
};

// Update translate config
export const updateTranslateConfig = async (data: UpdateTranslateConfigData): Promise<{ code: number; message: string }> => {
    const response = await apiClient.put('/admin/translate-config', data);
    return response.data;
};
