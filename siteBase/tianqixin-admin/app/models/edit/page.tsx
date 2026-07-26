'use client';

// 新增型号页面 - 直接重用动态路由的编辑组件
// 因为编辑组件已经处理了id不存在的情况
import EditModelPage from './[id]/page';

export default function NewModelPage() {
  return <EditModelPage />;
}