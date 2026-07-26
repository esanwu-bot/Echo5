import { NextRequest, NextResponse } from 'next/server';

// 使用 request.url 解析查询参数，声明为动态路由以消除构建警告
export const dynamic = 'force-dynamic';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { code: 400, message: '用户ID不能为空' },
        { status: 400 }
      );
    }

    // 返回模拟地址数据
    const mockData = {
      code: 200,
      message: '获取用户地址成功',
      data: {
        list: [
          { id: 1,
            name: '张三',
            phone: '13800138000',
            province: '北京市',
            city: '北京市',
            district: '朝阳区',
            detail: '三里屯街道工体北路1号院',
            is_default: 1
          },
          {
            id: 2,
            name: '李四',
            phone: '13900139000',
            province: '上海市',
            city: '上海市',
            district: '浦东新区',
            detail: '陆家嘴金融贸易区世纪大道100号',
            is_default: 0
          }
        ]
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
