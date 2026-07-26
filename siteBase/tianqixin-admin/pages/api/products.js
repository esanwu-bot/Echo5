export default function handler(req, res) {
  const { q, category } = req.query;
  
  let products = [
    {
      id: 1,
      name: '茅台飞天53度',
      category: '白酒',
      price: 2899,
      stock: 100,
      status: 'on_sale',
      createdAt: '2023-01-15'
    },
    {
      id: 2,
      name: '五粮液52度',
      category: '白酒',
      price: 1399,
      stock: 80,
      status: 'on_sale',
      createdAt: '2023-02-20'
    },
    {
      id: 3,
      name: '拉菲传奇波尔多',
      category: '红酒',
      price: 299,
      stock: 150,
      status: 'on_sale',
      createdAt: '2023-03-10'
    },
    {
      id: 4,
      name: '百威啤酒',
      category: '啤酒',
      price: 8,
      stock: 500,
      status: 'on_sale',
      createdAt: '2023-01-05'
    },
    {
      id: 5,
      name: '杰克丹尼威士忌',
      category: '洋酒',
      price: 399,
      stock: 60,
      status: 'on_sale',
      createdAt: '2023-04-18'
    }
  ];

  // 搜索过滤
  if (q) {
    products = products.filter(p => 
      p.name.includes(q) || 
      p.category.includes(q)
    );
  }

  // 分类过滤
  if (category) {
    products = products.filter(p => p.category === category);
  }

  res.status(200).json(products);
}