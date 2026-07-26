import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orderId = params.id;

    // 返回模拟订单详情
    const mockOrderDetail = {
      code: 200,
      message: '获取订单详情成功',
      data: {
        id: parseInt(orderId),
        order_no: 'PO202412130915001234',
        status: 'pending',
        payment_status: 'pending',
        payment_method: 1,
        goods_amount: 2680.00,
        delivery_fee: 0.00,
        discount_amount: 0.00,
        total_amount: 2680.00,
        created_at: '2024-12-13 09:15:30',
        paid_at: null,
        shipped_at: null,
        completed_at: null,
        remark: '客户电话订购',
        username: 'test_user',
        nickname: '测试用户',
        user_phone: '13800138000',
        avatar: '',
        receiver_name: '张三',
        receiver_phone: '13800138000',
        province: '北京市',
        city: '北京市',
        district: '朝阳区',
        detail: '三里屯街道工体北路1号院',
        items: [
          {
            id: 1,
            product_id: 1,
            product_name: '茅台飞天53°',
            product_image: '/static/products/maotai.jpg',
            spec_name: '',
            price: 2680.00,
            quantity: 1,
            total_amount: 2680.00
          }
        ]
      }
    };

    return NextResponse.json(mockOrderDetail);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { code: 500, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}
