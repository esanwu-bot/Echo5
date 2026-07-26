import { apiClient } from './client';

export interface Article {
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
    category?: string;
    author?: string;
    status: string;
    views?: number;
    publish_time?: string;
    create_time?: string;
}

class ArticleService {

    async list(params?: { category?: string; keyword?: string; page?: number; limit?: number }) {
        const response = await apiClient.get('/admin/articles', { params });
        return response.data;
    }

    async create(data: Partial<Article>) {
        const response = await apiClient.post('/admin/articles', data);
        return response.data;
    }

    async update(id: number, data: Partial<Article>) {
        const response = await apiClient.put(`/admin/articles/${id}`, data);
        return response.data;
    }

    async delete(id: number) {
        const response = await apiClient.delete(`/admin/articles/${id}`);
        return response.data;
    }
}

export const articleService = new ArticleService();
