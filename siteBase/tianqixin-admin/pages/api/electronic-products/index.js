// 获取所有电子元器件产品
import ElectronicProduct from '../../../models/electronicProduct';
import { getAllProducts } from '../../../data/electronicProducts';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { q, category } = req.query;
    
    let products = getAllProducts();
    
    // 搜索过滤
    if (q) {
      products = products.filter(p => 
        p.name.includes(q) || 
        p.modelNumber.includes(q) ||
        p.brand.includes(q) ||
        p.category.includes(q) ||
        p.subCategory.includes(q)
      );
    }
    
    // 分类过滤
    if (category) {
      products = products.filter(p => p.category === category);
    }
    
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}