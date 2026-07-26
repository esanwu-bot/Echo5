import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const orderData = JSON.parse(body);

    console.log('Create order data:', orderData);

    // 模拟订单创建成功
    const mockResponse = {
      code: 200,
      message: '代客下单成功',
      data: {
        order_id: Math.floor(Math.random() * 10000) + 1000,
        order_no: 'PO' + Date.now(),
        total_amount: orderData.items ?
          orderData.items.reduce((sum: number, item: any) => sum + (item.quantity * 100), 0)
          : 299.80
      }
    };

    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { code: 500, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}
