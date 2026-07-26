import { apiClient } from './client';

export interface AboutItem {
    id?: number;
    type: string;
    title: string;
    title_en?: string;
    title_ja?: string;
    title_ko?: string;
    title_zh_hant?: string;
    content: string;
    content_en?: string;
    content_ja?: string;
    content_ko?: string;
    content_zh_hant?: string;
    images?: string[];
    sort?: number;
    status?: number;
}

export interface Certificate {
    id?: number;
    cert_name: string;
    cert_name_en?: string;
    cert_name_ja?: string;
    cert_name_ko?: string;
    cert_name_zh_hant?: string;
    cert_image: string;
    description?: string;
    description_en?: string;
    description_ja?: string;
    description_ko?: string;
    description_zh_hant?: string;
    sort?: number;
    status: number;
}

class AboutService {

    // About Info
    async listAbout() {
        const response = await apiClient.get('/admin/about');
        return response.data;
    }

    async updateAbout(id: number, data: Partial<AboutItem>) {
        const response = await apiClient.put(`/admin/about/${id}`, data);
        return response.data;
    }

    // Certificates
    async listCertificates() {
        const response = await apiClient.get('/admin/certificates');
        return response.data;
    }

    async createCertificate(data: Partial<Certificate>) {
        const response = await apiClient.post('/admin/certificates', data);
        return response.data;
    }

    async updateCertificate(id: number, data: Partial<Certificate>) {
        const response = await apiClient.put(`/admin/certificates/${id}`, data);
        return response.data;
    }

    async deleteCertificate(id: number) {
        const response = await apiClient.delete(`/admin/certificates/${id}`);
        return response.data;
    }
}

export const aboutService = new AboutService();
