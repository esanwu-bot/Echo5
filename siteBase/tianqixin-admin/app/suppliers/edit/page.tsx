'use client';

// 新增供应商页面 - 直接重用动态路由的编辑组件
// 因为编辑组件已经处理了id不存在的情况
import EditSupplierPage from './[id]/page';

export default function NewSupplierPage() {
  return <EditSupplierPage />;
}