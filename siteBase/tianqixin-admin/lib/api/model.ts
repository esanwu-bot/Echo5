import { apiClient } from './client';
import { API_ENDPOINTS } from './config';

interface Model {
  id: number;
  model_code: string;
  model_name: string;
  category_id: number;
  brand_id: number;
  series_id?: number;
  series?: string | { id: number; series_name: string };
  package_type: string;
  technical_specs: any;
  datasheet_url: string;
  description: string;
  status: number;
  created_at: string;
  updated_at: string;
  category?: {
    id: number;
    name: string;
    category_name?: string;
  };
  brand?: {
    id: number;
    name: string;
    brand_name?: string;
  };
  specifications?: Array<{
    id: number;
    spec_name: string;
    spec_value: string;
    spec_unit: string;
    sort_order: number;
  }>;
}

interface ModelListParams {
  page?: number;
  limit?: number;
  keyword?: string;
  category_id?: number;
  brand_id?: number;
  status?: number;
}

interface ModelListResponse {
  list: Model[];
  total: number;
  page: number;
  limit: number;
}

class ModelApi {
  /**
   * 获取型号列表
   */
  static async getModels(params?: ModelListParams): Promise<ModelListResponse> {
    const endpoint = API_ENDPOINTS.MODELS.LIST;
    const response = await apiClient.get(endpoint, { params });
    return response.data.data;
  }

  /**
   * 获取型号详情
   */
  static async getModelById(id: number): Promise<Model> {
    const endpoint = API_ENDPOINTS.MODELS.DETAIL.replace(':id', id.toString());
    const response = await apiClient.get(endpoint);
    return response.data.data;
  }

  /**
   * 创建型号
   */
  static async createModel(data: Partial<Model>): Promise<Model> {
    const endpoint = API_ENDPOINTS.MODELS.CREATE;
    const response = await apiClient.post(endpoint, data);
    return response.data.data;
  }

  /**
   * 更新型号
   */
  static async updateModel(id: number, data: Partial<Model>): Promise<Model> {
    const endpoint = API_ENDPOINTS.MODELS.UPDATE.replace(':id', id.toString());
    const response = await apiClient.put(endpoint, data);
    return response.data.data;
  }

  /**
   * 删除型号
   */
  static async deleteModel(id: number): Promise<void> {
    const endpoint = API_ENDPOINTS.MODELS.DELETE.replace(':id', id.toString());
    await apiClient.delete(endpoint);
  }

  /**
   * 批量删除型号
   */
  static async batchDeleteModel(ids: (number | string)[]): Promise<void> {
    const endpoint = `${API_ENDPOINTS.MODELS.LIST}/batch-delete`;
    await apiClient.post(endpoint, { ids });
  }

  /**
   * 按品牌获取型号
   */
  static async getModelsByBrand(brandId: number): Promise<Model[]> {
    const endpoint = API_ENDPOINTS.MODELS.BY_BRAND.replace(':brandId', brandId.toString());
    const response = await apiClient.get(endpoint);
    return response.data.data;
  }

  /**
   * 按分类获取型号
   */
  static async getModelsByCategory(categoryId: number): Promise<Model[]> {
    const endpoint = API_ENDPOINTS.MODELS.BY_CATEGORY.replace(':categoryId', categoryId.toString());
    const response = await apiClient.get(endpoint);
    return response.data.data;
  }
  /**
   * 获取分类列表
   */
  static async getCategories(): Promise<any[]> {
    const response = await apiClient.get('/admin/categories');
    const data = response.data?.data;
    // 兼容多种返回格式：{ list: [...] } / { items: [...] } / [...]
    if (Array.isArray(data)) return data;
    if (data?.list && Array.isArray(data.list)) return data.list;
    if (data?.items && Array.isArray(data.items)) return data.items;
    console.warn('ModelApi.getCategories - 未识别的返回格式:', data);
    return [];
  }

  /**
   * 获取品牌列表
   */
  static async getBrands(): Promise<any[]> {
    const response = await apiClient.get('/admin/brands');
    const data = response.data?.data;
    // 兼容多种返回格式：{ items: [...] } / { list: [...] } / [...]
    if (Array.isArray(data)) return data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    if (data?.list && Array.isArray(data.list)) return data.list;
    console.warn('ModelApi.getBrands - 未识别的返回格式:', data);
    return [];
  }
}

export default ModelApi;
export type { Model, ModelListParams, ModelListResponse };