// 创建新的电子元器件产品
import ElectronicProduct from '../../../models/electronicProduct';
import { addProduct } from '../../../data/electronicProducts';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const productData = req.body;
    
    // 创建新产品实例
    const newProduct = new ElectronicProduct(productData);
    
    // 保存到数据存储
    const savedProduct = addProduct(newProduct.toJSON());
    
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}