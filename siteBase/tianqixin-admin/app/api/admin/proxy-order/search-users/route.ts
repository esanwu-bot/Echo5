import { NextRequest, NextResponse } from 'next/server';

// 使用 request.url 解析查询参数，声明为动态路由以消除构建警告
export const dynamic = 'force-dynamic';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';

    // 返回模拟用户数据
    const mockUsers = [
      {
        id: 1,
        username: 'test_user',
        phone: '13800138000',
        nickname: '测试用户',
        avatar: ''
      },
      {
        id: 2,
        username: 'demo_user',
        phone: '13900139000',
        nickname: '演示用户',
        avatar: ''
      },
      {
        id: 3,
        username: 'customer',
        phone: '13700137000',
        nickname: '客户用户',
        avatar: ''
      }
    ];

    // 模拟搜索过滤
    const filteredUsers = keyword
      ? mockUsers.filter(user =>
        user.username.includes(keyword) ||
        user.phone.includes(keyword) ||
        user.nickname.includes(keyword)
      )
      : mockUsers;

    const mockData = {
      code: 200,
      message: '搜索用户成功',
      data: {
        list: filteredUsers
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
