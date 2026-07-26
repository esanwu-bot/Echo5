import { apiClient } from './client';

export interface Banner {
  id?: number;
  title: string;
  position: string;
  image: string;
  link: string;
  sort: number;
  status: boolean;
  created_at?: string;
}

export interface BannerListResponse {
  code: number;
  message: string;
  data: {
    list: Banner[];
    total: number;
  };
}

export interface BannerResponse {
  code: number;
  message: string;
  data: Banner;
}

class BannerService {

  async list(params?: { position?: string; page?: number; pageSize?: number }): Promise<BannerListResponse> {
    const response = await apiClient.get('/admin/banners', { params });
    return response.data;
  }

  async create(banner: Omit<Banner, 'id' | 'created_at'>): Promise<BannerResponse> {
    // 转换状态字段：boolean -> number
    const bannerData = {
      ...banner,
      status: banner.status ? 1 : 0
    };

    const response = await apiClient.post('/admin/banners', bannerData);
    return response.data;
  }

  async update(id: number, banner: Partial<Banner>): Promise<BannerResponse> {
    // 转换状态字段：boolean -> number
    const bannerData = {
      ...banner,
      ...(banner.status !== undefined && { status: banner.status ? 1 : 0 })
    };

    const response = await apiClient.put(`/admin/banners/${id}`, bannerData);
    return response.data;
  }

  async updateStatus(id: number, status: boolean): Promise<BannerResponse> {
    const response = await apiClient.put(`/admin/banners/${id}/status`, { status: status ? 1 : 0 });
    return response.data;
  }

  async delete(id: number): Promise<{ code: number; message: string }> {
    const response = await apiClient.delete(`/admin/banners/${id}`);
    return response.data;
  }
}

export const bannerService = new BannerService();
