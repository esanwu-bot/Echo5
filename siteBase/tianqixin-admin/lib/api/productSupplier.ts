import { apiClient } from './client';
import { API_ENDPOINTS } from './config';

interface ProductSupplier {
  id: number;
  product_id: number;
  supplier_id: number;
  supplier_product_code: string;
  min_order_quantity: number;
  lead_time: number;
  price_breaks: any;
  is_primary: number;
  status: number;
  created_at: string;
  updated_at: string;
  product?: {
    id: number;
    name: string;
    product_code: string;
  };
  supplier?: {
    id: number;
    name: string;
    supplier_code: string;
  };
}

interface ProductSupplierListParams {
  page?: number;
  limit?: number;
  keyword?: string;
  product_id?: number;
  supplier_id?: number;
  is_primary?: number;
  status?: number;
}

interface ProductSupplierListResponse {
  list: ProductSupplier[];
  total: number;
  page: number;
  limit: number;
}

class ProductSupplierApi {
  /**
   * 获取产品供应商关联列表
   */
  static async getProductSuppliers(params?: ProductSupplierListParams): Promise<ProductSupplierListResponse> {
    const endpoint = API_ENDPOINTS.PRODUCT_SUPPLIERS.LIST;
    const response = await apiClient.get(endpoint, { params });
    return response.data;
  }

  /**
   * 获取产品供应商关联详情
   */
  static async getProductSupplierById(id: number): Promise<ProductSupplier> {
    const endpoint = API_ENDPOINTS.PRODUCT_SUPPLIERS.DETAIL.replace(':id', id.toString());
    const response = await apiClient.get(endpoint);
    return response.data;
  }

  /**
   * 创建产品供应商关联
   */
  static async createProductSupplier(data: Partial<ProductSupplier>): Promise<ProductSupplier> {
    const endpoint = API_ENDPOINTS.PRODUCT_SUPPLIERS.CREATE;
    const response = await apiClient.post(endpoint, data);
    return response.data;
  }

  /**
   * 更新产品供应商关联
   */
  static async updateProductSupplier(id: number, data: Partial<ProductSupplier>): Promise<ProductSupplier> {
    const endpoint = API_ENDPOINTS.PRODUCT_SUPPLIERS.UPDATE.replace(':id', id.toString());
    const response = await apiClient.put(endpoint, data);
    return response.data;
  }

  /**
   * 删除产品供应商关联
   */
  static async deleteProductSupplier(id: number): Promise<void> {
    const endpoint = API_ENDPOINTS.PRODUCT_SUPPLIERS.DELETE.replace(':id', id.toString());
    await apiClient.delete(endpoint);
  }

  /**
   * 获取特定产品的供应商列表
   */
  static async getProductSuppliersByProduct(productId: number): Promise<ProductSupplier[]> {
    const endpoint = API_ENDPOINTS.PRODUCT_SUPPLIERS.BY_PRODUCT.replace(':productId', productId.toString());
    const response = await apiClient.get(endpoint);
    return response.data;
  }

  /**
   * 获取特定供应商的产品列表
   */
  static async getProductSuppliersBySupplier(supplierId: number): Promise<ProductSupplier[]> {
    const endpoint = API_ENDPOINTS.PRODUCT_SUPPLIERS.BY_SUPPLIER.replace(':supplierId', supplierId.toString());
    const response = await apiClient.get(endpoint);
    return response.data;
  }
}

export default ProductSupplierApi;
export type { ProductSupplier, ProductSupplierListParams, ProductSupplierListResponse };