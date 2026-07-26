export default function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  // 这里应该是实际删除商品的逻辑
  // 暂时返回成功响应
  res.status(200).json({ 
    success: true,
    message: `商品 ${id} 删除成功`
  });
}