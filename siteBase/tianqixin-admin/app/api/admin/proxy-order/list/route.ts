import { NextRequest, NextResponse } from 'next/server';

// 此路由使用了 request.url（查询参数解析），显式声明为动态以避免构建时的静态化警告
export const dynamic = 'force-dynamic';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('API_BASE_URL:', API_BASE_URL);

    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const backendUrl = `${API_BASE_URL}/admin/proxy-order/list${queryString ? `?${queryString}` : ''}`;

    console.log('Backend URL:', backendUrl);

    // 暂时返回模拟数据，避免后端连接问�?
    const mockData = {
      code: 200,
      message: '获取代客下单列表成功',
      data: {
        list: [
          {
            id: 1,
            order_no: 'PO202412130915001234',
            status: 'pending',
            payment_status: 'pending',
            total_amount: 299.80,
            created_at: '2024-12-13 09:15:30',
            remark: '客户电话订购',
            username: 'test_user',
            nickname: '测试用户',
            phone: '13800138000'
          }
        ],
        total: 1,
        page: 1,
        limit: 10
      },
      timestamp: Math.floor(Date.now() / 1000)
    };

    return NextResponse.json(mockData);

    /* 暂时注释掉真实API调用
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
    */
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { code: 500, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}
