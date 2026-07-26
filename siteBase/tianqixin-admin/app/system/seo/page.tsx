'use client';

import React from 'react';
import { Card, Form, Input, Button, message, Tabs } from 'antd';

const { TextArea } = Input;

export default function SeoSettingsPage() {
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    console.log('SEO settings:', values);
    message.success('SEO设置保存成功');
  };

  const tabItems = [
    {
      key: 'home',
      label: '首页',
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            homeTitle: '天启芯半导体 - 专业的半导体解决方案提供商',
            homeKeywords: '半导体,芯片,集成电路,电子元器件,天启芯',
            homeDescription: '天启芯半导体科技有限公司专注于半导体技术研发，提供专业的芯片解决方案和优质的服务。'
          }}
        >
          <Form.Item
            label="页面标题"
            name="homeTitle"
            rules={[{ required: true, message: '请输入页面标题' }]}
          >
            <Input placeholder="请输入页面标题" />
          </Form.Item>

          <Form.Item
            label="关键词"
            name="homeKeywords"
            rules={[{ required: true, message: '请输入关键词' }]}
          >
            <Input placeholder="请输入关键词，用逗号分隔" />
          </Form.Item>

          <Form.Item
            label="页面描述"
            name="homeDescription"
            rules={[{ required: true, message: '请输入页面描述' }]}
          >
            <TextArea rows={3} placeholder="请输入页面描述" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              保存设置
            </Button>
          </Form.Item>
        </Form>
      )
    },
    {
      key: 'products',
      label: '产品页',
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            productsTitle: '产品中心 - 天启芯半导体',
            productsKeywords: '半导体产品,芯片产品,集成电路产品',
            productsDescription: '浏览天启芯半导体的产品系列，包括各种高性能芯片和半导体解决方案。'
          }}
        >
          <Form.Item
            label="页面标题"
            name="productsTitle"
            rules={[{ required: true, message: '请输入页面标题' }]}
          >
            <Input placeholder="请输入页面标题" />
          </Form.Item>

          <Form.Item
            label="关键词"
            name="productsKeywords"
            rules={[{ required: true, message: '请输入关键词' }]}
          >
            <Input placeholder="请输入关键词，用逗号分隔" />
          </Form.Item>

          <Form.Item
            label="页面描述"
            name="productsDescription"
            rules={[{ required: true, message: '请输入页面描述' }]}
          >
            <TextArea rows={3} placeholder="请输入页面描述" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              保存设置
            </Button>
          </Form.Item>
        </Form>
      )
    },
    {
      key: 'about',
      label: '关于我们',
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            aboutTitle: '关于我们 - 天启芯半导体',
            aboutKeywords: '公司介绍,企业历史,团队介绍',
            aboutDescription: '了解天启芯半导体的发展历程、企业文化和专业团队。'
          }}
        >
          <Form.Item
            label="页面标题"
            name="aboutTitle"
            rules={[{ required: true, message: '请输入页面标题' }]}
          >
            <Input placeholder="请输入页面标题" />
          </Form.Item>

          <Form.Item
            label="关键词"
            name="aboutKeywords"
            rules={[{ required: true, message: '请输入关键词' }]}
          >
            <Input placeholder="请输入关键词，用逗号分隔" />
          </Form.Item>

          <Form.Item
            label="页面描述"
            name="aboutDescription"
            rules={[{ required: true, message: '请输入页面描述' }]}
          >
            <TextArea rows={3} placeholder="请输入页面描述" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              保存设置
            </Button>
          </Form.Item>
        </Form>
      )
    }
  ];

  return (
    <div>
      <Card title="SEO设置">
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}