import { apiClient } from './client';

export interface Application {
  id?: number;
  title: string;
  slug: string;
  description: string;
  cover_image: string;
  content: string;
  sort: number;
  status: boolean;
  product_count?: number;
  created_at?: string;
}

export interface ApplicationListResponse {
  code: number;
  message: string;
  data: {
    list: Application[];
    total: number;
  };
}

export interface ApplicationResponse {
  code: number;
  message: string;
  data: Application;
}

class ApplicationService {

  async list(params?: { search?: string; page?: number; pageSize?: number }): Promise<ApplicationListResponse> {
    const response = await apiClient.get('/admin/applications', { params });
    return response.data;
  }

  async create(application: Omit<Application, 'id' | 'created_at' | 'product_count'>): Promise<ApplicationResponse> {
    const response = await apiClient.post('/admin/applications', application);
    return response.data;
  }

  async update(id: number, application: Partial<Application>): Promise<ApplicationResponse> {
    const response = await apiClient.put(`/admin/applications/${id}`, application);
    return response.data;
  }

  async updateStatus(id: number, status: boolean): Promise<ApplicationResponse> {
    const response = await apiClient.put(`/admin/applications/${id}/status`, { status });
    return response.data;
  }

  async delete(id: number): Promise<{ code: number; message: string }> {
    const response = await apiClient.delete(`/admin/applications/${id}`);
    return response.data;
  }
}

export const applicationService = new ApplicationService();