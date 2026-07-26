// 更新电子元器件产品
import { getProductById, updateProduct } from '../../../data/electronicProducts';

export default function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const updateData = req.body;
    
    if (!id) {
      return res.status(400).json({ message: 'Product ID is required' });
    }
    
    // 检查产品是否存在
    const existingProduct = getProductById(id);
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // 更新产品
    const updatedProduct = updateProduct(id, updateData);
    
    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}