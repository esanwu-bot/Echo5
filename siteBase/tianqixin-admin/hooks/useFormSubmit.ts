'use client';

import { FormInstance, message } from 'antd';

interface ApiResponse {
  code?: number;
  success?: boolean;
  message?: string;
  data?: any;
  [key: string]: any;
}

interface UseFormSubmitOptions {
  /** 成功提示文案 */
  successMessage?: string;
  /** 失败提示文案 */
  errorMessage?: string;
  /** 成功后是否重置表单字段（默认 true） */
  resetOnSuccess?: boolean;
  /** 成功后回调（一般用于刷新列表） */
  onSuccess?: () => void;
  /** 失败后回调 */
  onError?: (error: any) => void;
}

interface UseFormSubmitReturn {
  /** 执行表单提交：验证 → 调 API → 成功重置/失败保持 */
  submit: (
    submitFn: () => Promise<ApiResponse>,
    extraOptions?: Partial<UseFormSubmitOptions>
  ) => Promise<boolean>;
  /** 简写：表单验证后直接提交（用于 Ant Design Form onFinish） */
  handleSubmit: (
    apiCaller: (values: any) => Promise<ApiResponse>,
    extraOptions?: Partial<UseFormSubmitOptions>
  ) => (values: any) => Promise<boolean>;
}

/**
 * 统一表单提交 Hook
 *
 * 核心行为：只有提交成功后才重置表单/关闭弹窗，
 * 失败时保持表单数据完整，供用户修正后重试。
 *
 * 使用示例（Modal CRUD 模式）：
 *   const { handleSubmit } = useFormSubmit(form);
 *   const onSave = handleSubmit(
 *     (values) => editing ? api.update(id, values) : api.create(values),
 *     { onSuccess: () => { setModalVisible(false); fetchList(); } }
 *   );
 */
export function useFormSubmit(form: FormInstance): UseFormSubmitReturn {
  const executeSubmit = async (
    submitFn: () => Promise<ApiResponse>,
    extraOptions?: Partial<UseFormSubmitOptions>
  ): Promise<boolean> => {
    try {
      const res = await submitFn();
      const succeeded = res.code === 200 || res.success === true;

      if (succeeded) {
        message.success(extraOptions?.successMessage || '保存成功');
        // 只在成功时重置表单
        if (extraOptions?.resetOnSuccess !== false) {
          form.resetFields();
        }
        extraOptions?.onSuccess?.();
        return true;
      } else {
        message.error(
          res.message || res.msg || extraOptions?.errorMessage || '操作失败'
        );
        extraOptions?.onError?.(res);
        // 失败时不重置，不关闭 - 由调用方通过返回值判断
        return false;
      }
    } catch (error: any) {
      console.error('Form submission failed:', error);
      message.error(
        error?.message || extraOptions?.errorMessage || '操作失败，请重试'
      );
      extraOptions?.onError?.(error);
      return false;
    }
  };

  const handleSubmit =
    (
      apiCaller: (values: any) => Promise<ApiResponse>,
      extraOptions?: Partial<UseFormSubmitOptions>
    ): ((values: any) => Promise<boolean>) =>
    async (values: any) => {
      return executeSubmit(() => apiCaller(values), extraOptions);
    };

  return { submit: executeSubmit, handleSubmit };
}

/**
 * 简化版：用于非 Ant Design Form 的场景（shadcn/ui 自定义表单）
 * 直接传入表单数据，不依赖 FormInstance
 */
export function useSimpleSubmit() {
  const submit = async (
    submitFn: () => Promise<ApiResponse>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      onSuccess?: () => void;
      onError?: (error: any) => void;
    }
  ): Promise<boolean> => {
    try {
      const res = await submitFn();
      const succeeded = res.code === 200 || res.success === true;

      if (succeeded) {
        message.success(options?.successMessage || '保存成功');
        options?.onSuccess?.();
        return true;
      } else {
        message.error(res.message || res.msg || options?.errorMessage || '操作失败');
        options?.onError?.(res);
        return false;
      }
    } catch (error: any) {
      console.error('Submission failed:', error);
      message.error(error?.message || options?.errorMessage || '操作失败，请重试');
      options?.onError?.(error);
      return false;
    }
  };

  return { submit };
}
