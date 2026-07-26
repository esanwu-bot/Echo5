import { apiClient } from './client';

// 系列实际使用 sk_product 表，字段与 SkProduct 对应
export interface Series {
  id: number;
  name: string;
  product_code?: string;
  category_fk_id?: number;
  category_id?: number; // 前端传入时的映射字段
  brand_id?: number;
  mpn_prefix?: string;
  description?: string;
  features?: string;
  images?: string[];
  image?: string;
  spec_summary?: any;
  specs?: any;
  sort?: number;
  status?: number;
  is_on_sale?: number;
  rohs_compliant?: number;
  model_count?: number;
  create_time?: string;
  update_time?: string;
  category?: { id: number; name: string };
  brand?: { id: number; brand_name: string };
}

export interface SeriesListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  category_id?: number;
  brand_id?: number;
  status?: number;
}

export interface SeriesListResponse {
  list: Series[];
  total: number;
  page: number;
  limit: number;
}

class SeriesApi {
  static async getList(params?: SeriesListParams): Promise<SeriesListResponse> {
    const response = await apiClient.get('/admin/series', { params });
    return response.data.data;
  }

  static async getById(id: number): Promise<Series> {
    const response = await apiClient.get(`/admin/series/${id}`);
    return response.data.data;
  }

  static async create(data: Partial<Series>): Promise<Series> {
    const response = await apiClient.post('/admin/series', data);
    return response.data.data;
  }

  static async update(id: number, data: Partial<Series>): Promise<Series> {
    const response = await apiClient.put(`/admin/series/${id}`, data);
    return response.data.data;
  }

  static async delete(id: number): Promise<void> {
    await apiClient.delete(`/admin/series/${id}`);
  }
}

export default SeriesApi;
