import { apiClient } from './client';
import { API_ENDPOINTS } from './config';

interface Supplier {
  id: number;
  supplier_code: string;
  name: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  website: string;
  description: string;
  status: number;
  is_active: number;
  sort: number;
  created_at: string;
  updated_at: string;
  products?: any[];
  productSuppliers?: any[];
  models?: any[];
}

interface SupplierListParams {
  page?: number;
  limit?: number;
  keyword?: string;
  status?: number;
  is_active?: number;
}

interface SupplierListResponse {
  list: Supplier[];
  total: number;
  page: number;
  limit: number;
}

class SupplierApi {
  /**
   * 获取供应商列表
   */
  static async getSuppliers(params?: SupplierListParams): Promise<SupplierListResponse> {
    const endpoint = API_ENDPOINTS.SUPPLIERS.LIST;
    const response = await apiClient.get(endpoint, { params });
    return response.data;
  }

  /**
   * 获取供应商详情
   */
  static async getSupplierById(id: number): Promise<Supplier> {
    const endpoint = API_ENDPOINTS.SUPPLIERS.DETAIL.replace(':id', id.toString());
    const response = await apiClient.get(endpoint);
    return response.data;
  }

  /**
   * 创建供应商
   */
  static async createSupplier(data: Partial<Supplier>): Promise<Supplier> {
    const endpoint = API_ENDPOINTS.SUPPLIERS.CREATE;
    const response = await apiClient.post(endpoint, data);
    return response.data;
  }

  /**
   * 更新供应商
   */
  static async updateSupplier(id: number, data: Partial<Supplier>): Promise<Supplier> {
    const endpoint = API_ENDPOINTS.SUPPLIERS.UPDATE.replace(':id', id.toString());
    const response = await apiClient.put(endpoint, data);
    return response.data;
  }

  /**
   * 删除供应商
   */
  static async deleteSupplier(id: number): Promise<void> {
    const endpoint = API_ENDPOINTS.SUPPLIERS.DELETE.replace(':id', id.toString());
    await apiClient.delete(endpoint);
  }

  /**
   * 获取活跃供应商列表
   */
  static async getActiveSuppliers(): Promise<Supplier[]> {
    const endpoint = API_ENDPOINTS.SUPPLIERS.ACTIVE;
    const response = await apiClient.get(endpoint);
    return response.data;
  }
}

export default SupplierApi;
export type { Supplier, SupplierListParams, SupplierListResponse };