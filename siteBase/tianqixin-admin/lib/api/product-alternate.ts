import { apiClient } from './client';

interface ProductAlternate {
  id: number;
  model_id: number;
  alternate_model_id: number;
  match_type: 'DIRECT' | 'FUNCTIONAL';
  similarity_score?: number;
  notes?: string;
  status: number;
  model?: { id: number; model_code: string; model_name: string };
  alternate_model?: { id: number; model_code: string; model_name: string; package_type: string };
}

interface AlternateListParams {
  page?: number;
  pageSize?: number;
  model_id?: number;
  match_type?: string;
}

interface AlternateListResponse {
  list: ProductAlternate[];
  total: number;
  page: number;
  limit: number;
}

class ProductAlternateApi {
  static async getList(params?: AlternateListParams): Promise<AlternateListResponse> {
    const response = await apiClient.get('/admin/product-alternates', { params });
    return response.data.data;
  }

  static async getById(id: number): Promise<ProductAlternate> {
    const response = await apiClient.get(`/admin/product-alternates/${id}`);
    return response.data.data;
  }

  static async create(data: Partial<ProductAlternate>): Promise<void> {
    await apiClient.post('/admin/product-alternates', data);
  }

  static async update(id: number, data: Partial<ProductAlternate>): Promise<void> {
    await apiClient.put(`/admin/product-alternates/${id}`, data);
  }

  static async delete(id: number): Promise<void> {
    await apiClient.delete(`/admin/product-alternates/${id}`);
  }
}

export default ProductAlternateApi;
export type { ProductAlternate, AlternateListParams };
