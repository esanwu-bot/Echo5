/**
 * (sites) Route Group layout — 极简，不嵌套 workbench 的 sidebar/navbar
 * 渲染器是建站产物的唯一渲染面，要干净，不带 admin/workbench chrome
 */
export default function SitesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-white text-gray-900">{children}</div>;
}
