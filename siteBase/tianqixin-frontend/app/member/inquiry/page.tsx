'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken, apiRequest } from '../../../lib/api-client';
import { Card, Empty, List, Button, Tag } from 'antd';
import { MessageOutlined, EyeOutlined } from '@ant-design/icons';

const InquiryPage = () => {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    const loadInquiries = async () => {
      try {
        const response = await apiRequest('/member/inquiries');
        if (response.code === 200) {
          const list = response.data?.list || response.data?.data || response.data || [];
          setInquiries(Array.isArray(list) ? list : []);
        }
      } catch (error) {
        console.error('获取询盘失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInquiries();
  }, [router]);

  const statusMap: Record<string, { text: string; color: string }> = {
    pending: { text: '待回复', color: 'orange' },
    replied: { text: '已回复', color: 'green' },
    closed: { text: '已关闭', color: 'gray' },
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e60012]"></div>
    </div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">我的询盘</h1>

      {inquiries.length === 0 ? (
        <Empty description="暂无询盘" />
      ) : (
        <List
          dataSource={inquiries}
          renderItem={(item) => {
            const statusInfo = statusMap[item.status] || { text: item.status, color: 'default' };
            return (
              <List.Item>
                <Card
                  title={item.product_info || item.product_name || item.title || '商品询盘'}
                  extra={<Tag color={statusInfo.color}>{statusInfo.text}</Tag>}
                >
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-2">{item.created_at || item.create_time || ''}</p>
                    <p className="mb-4">{item.content || ''}</p>
                    {item.reply && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-semibold mb-2">回复：</p>
                        <p>{item.reply}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button icon={<EyeOutlined />} size="small">查看详情</Button>
                  </div>
                </Card>
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );
};

export default InquiryPage;
