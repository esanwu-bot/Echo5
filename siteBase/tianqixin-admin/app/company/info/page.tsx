'use client';

import React, { useState, useEffect } from 'react';
import { Card, Form, Button, message, Tabs, Spin } from 'antd';
import { aboutService, AboutItem } from '@/lib/api/about';
// import MultiLangInput from '@/components/MultiLangInput';

export default function CompanyInfoPage() {
  const [loading, setLoading] = useState(false);
  const [aboutItems, setAboutItems] = useState<AboutItem[]>([]);
  const [activeTab, setActiveTab] = useState('about');
  const [form] = Form.useForm();

  const fetchAboutInfo = async () => {
    try {
      setLoading(true);
      const res = await aboutService.listAbout();
      if (res.code === 200) {
        setAboutItems(res.data.list || res.data);
      }
    } catch (e) {
      console.error('Fetch about failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAboutInfo();
  }, []);

  useEffect(() => {
    const activeItem = aboutItems.find(item => item.type === activeTab);
    if (activeItem) {
      form.setFieldsValue({
        title: activeItem.title || '',
        content: activeItem.content || ''
      });
    } else {
      form.resetFields();
    }
  }, [activeTab, aboutItems, form]);

  const onFinish = async (values: any) => {
    const activeItem = aboutItems.find(item => item.type === activeTab);
    if (!activeItem?.id) {
      message.error('未找到对应的内容记录');
      return;
    }

    const payload: any = { ...values };

    try {
      const res = await aboutService.updateAbout(activeItem.id, payload);
      if (res.code === 200) {
        message.success('更新成功');
        fetchAboutInfo();
      } else {
        message.error(res.message || '更新失败');
      }
    } catch (e) {
      message.error('操作失败');
    }
  };

  const tabItems = [
    { key: 'about', label: '公司介绍' },
    { key: 'vision', label: '我们的愿景' },
    { key: 'history', label: '发展历程' },
  ];

  return (
    <div className="p-4">
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />

        {loading ? (
          <div className="flex justify-center p-10"><Spin /></div>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            className="mt-4"
          >
            <Form.Item
              label="标题"
              name="title"
              rules={[{ required: true, message: '请输入标题' }]}
            >
              <Input placeholder="请输入标题" />
            </Form.Item>

            <Form.Item
              label="内容"
              name="content"
              rules={[{ required: true, message: '请输入内容' }]}
            >
              <Input.TextArea rows={8} placeholder="请输入详细内容" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit">
                保存修改
              </Button>
            </Form.Item>
          </Form>
        )}
      </Card>
    </div>
  );
}