import { apiClient } from './client';

export type DocType = 'datasheet' | 'application_note' | 'reference_design' | 'cad_model' | 'certification' | 'soldering_guide';

export interface ProductDocument {
  id: number;
  series_id?: number;
  model_id?: number;
  doc_type: DocType;
  title: string;
  language: string;
  file_url: string;
  file_size?: string;
  version?: string;
  status: number;
  upload_time?: string;
  create_time?: string;
  update_time?: string;
}

export interface ProductDocumentListParams {
  page?: number;
  pageSize?: number;
  series_id?: number;
  model_id?: number;
  doc_type?: DocType;
}

export interface ProductDocumentListResponse {
  list: ProductDocument[];
  total: number;
  page: number;
  limit: number;
}

export const DOC_TYPE_OPTIONS = [
  { label: '规格书 (Datasheet)', value: 'datasheet' },
  { label: '应用笔记 (Application Note)', value: 'application_note' },
  { label: '参考设计 (Reference Design)', value: 'reference_design' },
  { label: 'CAD 模型 (CAD Model)', value: 'cad_model' },
  { label: '认证证书 (Certification)', value: 'certification' },
  { label: '焊接指南 (Soldering Guide)', value: 'soldering_guide' },
];

class ProductDocumentApi {
  static async getList(params?: ProductDocumentListParams): Promise<ProductDocumentListResponse> {
    const response = await apiClient.get('/admin/product-documents', { params });
    return response.data.data;
  }

  static async getById(id: number): Promise<ProductDocument> {
    const response = await apiClient.get(`/admin/product-documents/${id}`);
    return response.data.data;
  }

  static async create(data: Partial<ProductDocument>): Promise<void> {
    await apiClient.post('/admin/product-documents', data);
  }

  static async update(id: number, data: Partial<ProductDocument>): Promise<void> {
    await apiClient.put(`/admin/product-documents/${id}`, data);
  }

  static async delete(id: number): Promise<void> {
    await apiClient.delete(`/admin/product-documents/${id}`);
  }

  static async batchDelete(ids: number[]): Promise<void> {
    await apiClient.post('/admin/product-documents/batch-delete', { ids });
  }
}

export default ProductDocumentApi;
