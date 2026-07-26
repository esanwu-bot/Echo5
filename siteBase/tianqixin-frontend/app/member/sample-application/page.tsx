'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/auth-context';
import { redirect } from 'next/navigation';
import { Card, Empty, List, Button, Tag, Progress, Typography } from 'antd';
import { EyeOutlined, MessageOutlined } from '@ant-design/icons';
import { userApi } from '../../../lib/api-client';

const { Text, Paragraph } = Typography;

const SampleApplicationPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [sampleApplications, setSampleApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSamples = async () => {
      if (!user) return;

      try {
        const response = await userApi.getSampleApplications();
        if (response.code === 200) {
          setSampleApplications(response.data.list);
        }
      } catch (error) {
        console.error('Failed to fetch sample applications:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchSamples();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return <div className="flex justify-center items-center h-screen">加载中...</div>;
  }

  if (!user) {
    redirect('/login');
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'processing': 'blue',
      'shipped': 'orange',
      'completed': 'green',
      'cancelled': 'red'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      'processing': '处理中',
      'shipped': '已发货',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    return texts[status] || status;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">样品申请</h1>

      {sampleApplications.length === 0 ? (
        <Empty description="暂无样品申请" />
      ) : (
        <List
          dataSource={sampleApplications}
          renderItem={(item) => (
            <List.Item>
              <Card
                className="w-full"
                title={item.product_name}
                extra={
                  <Tag color={getStatusColor(item.status)}>
                    {getStatusText(item.status)}
                  </Tag>
                }
              >
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">申请时间：{item.created_at}</span>
                    {item.completed_date && (
                      <span className="text-sm text-gray-500">完成时间：{item.completed_date}</span>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm">处理进度</span>
                      <span className="text-sm font-semibold">{item.progress}%</span>
                    </div>
                    <Progress percent={item.progress} status={item.status === 'completed' ? 'success' : 'active'} />
                  </div>

                  {item.reply_content && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center mb-2 text-[#e60012]">
                        <MessageOutlined className="mr-2" />
                        <span className="font-semibold">管理员回复：</span>
                      </div>
                      <Paragraph className="mb-0 text-gray-700">
                        {item.reply_content}
                      </Paragraph>
                    </div>
                  )}

                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      {item.expected_date ? `预计完成：${item.expected_date}` : ''}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button icon={<EyeOutlined />} size="small">查看详情</Button>
                </div>
              </Card>
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default SampleApplicationPage;