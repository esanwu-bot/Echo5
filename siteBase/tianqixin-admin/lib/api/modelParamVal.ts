import { apiClient } from './client';

export interface ModelParamVal {
  id: number;
  model_id: number;
  param_id: number;
  value: string;
  value_numeric?: number;
  create_time?: string;
  update_time?: string;
  model?: { id: number; model_code: string; model_name: string };
  param?: { id: number; name: string; code: string; unit?: string };
}

export interface ModelParamValListParams {
  page?: number;
  pageSize?: number;
  model_id?: number;
  param_id?: number;
}

export interface ModelParamValListResponse {
  list: ModelParamVal[];
  total: number;
  page: number;
  limit: number;
}

class ModelParamValApi {
  static async getList(params?: ModelParamValListParams): Promise<ModelParamValListResponse> {
    const response = await apiClient.get('/admin/model-param-vals', { params });
    return response.data.data;
  }

  static async getById(id: number): Promise<ModelParamVal> {
    const response = await apiClient.get(`/admin/model-param-vals/${id}`);
    return response.data.data;
  }

  static async getByModel(modelId: number): Promise<ModelParamVal[]> {
    const response = await apiClient.get(`/admin/model-param-vals/by-model/${modelId}`);
    return response.data.data;
  }

  static async create(data: Partial<ModelParamVal>): Promise<void> {
    await apiClient.post('/admin/model-param-vals', data);
  }

  static async batchSave(modelId: number, params: Array<{ param_id: number; value: string; value_numeric?: number }>): Promise<void> {
    await apiClient.post('/admin/model-param-vals', { model_id: modelId, params });
  }

  static async update(id: number, data: Partial<ModelParamVal>): Promise<void> {
    await apiClient.put(`/admin/model-param-vals/${id}`, data);
  }

  static async delete(id: number): Promise<void> {
    await apiClient.delete(`/admin/model-param-vals/${id}`);
  }
}

export default ModelParamValApi;
