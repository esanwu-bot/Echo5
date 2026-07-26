import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    // 返回模拟商品数据
    const mockData = {
      code: 200,
      message: '获取商品列表成功',
      data: {
        list: [
          {
            id: 1,
            sku: 'MT001',
            name: '茅台飞天53°',
            price: 2680.00,
            original_price: 2980.00,
            stock: 50,
            main_image: '/static/products/maotai.jpg',
            brand: '茅台'
          },
          {
            id: 2,
            sku: 'WLY001',
            name: '五粮液普五52°',
            price: 1280.00,
            original_price: 1480.00,
            stock: 30,
            main_image: '/static/products/wuliangye.jpg',
            brand: '五粮液'
          },
          {
            id: 3,
            sku: 'JNC001',
            name: '剑南春水晶剑52°',
            price: 680.00,
            original_price: 780.00,
            stock: 80,
            main_image: '/static/products/jiannanchun.jpg',
            brand: '剑南春'
          }
        ],
        total: 3,
        page: 1,
        limit: 50
      }
    };

    return NextResponse.json(mockData);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { code: 500, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}
