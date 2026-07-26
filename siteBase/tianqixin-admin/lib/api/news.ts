import { apiClient } from './client';

export interface News {
    id?: number;
    title: string;
    title_en?: string;
    title_ja?: string;
    title_ko?: string;
    title_zh_hant?: string;
    summary?: string;
    summary_en?: string;
    summary_ja?: string;
    summary_ko?: string;
    summary_zh_hant?: string;
    content?: string;
    content_en?: string;
    content_ja?: string;
    content_ko?: string;
    content_zh_hant?: string;
    status: string;
    is_top?: boolean;
    views?: number;
    publish_time?: string;
    create_time?: string;
}

class NewsService {

    async list(params?: { keyword?: string; page?: number; limit?: number }) {
        const response = await apiClient.get('/admin/news', { params });
        return response.data;
    }

    async create(data: Partial<News>) {
        const response = await apiClient.post('/admin/news', data);
        return response.data;
    }

    async update(id: number, data: Partial<News>) {
        const response = await apiClient.put(`/admin/news/${id}`, data);
        return response.data;
    }

    async delete(id: number) {
        const response = await apiClient.delete(`/admin/news/${id}`);
        return response.data;
    }
}

export const newsService = new NewsService();
