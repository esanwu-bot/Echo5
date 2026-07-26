// 删除电子元器件产品
import { getProductById, deleteProduct } from '../../../data/electronicProducts';

export default function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ message: 'Product ID is required' });
    }
    
    // 检查产品是否存在
    const existingProduct = getProductById(id);
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // 删除产品
    const deletedProduct = deleteProduct(id);
    
    res.status(200).json({ 
      success: true,
      message: `Product ${id} deleted successfully`,
      product: deletedProduct
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}