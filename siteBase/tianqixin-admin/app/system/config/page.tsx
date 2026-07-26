'use client';

import React from 'react';
import { Card, Form, Input, Button, message, Tabs, Switch, Select } from 'antd';

const { TextArea } = Input;
const { Option } = Select;

export default function SystemConfigPage() {
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    console.log('System config:', values);
    message.success('系统配置保存成功');
  };

  const tabItems = [
    {
      key: 'basic',
      label: '基本设置',
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            siteName: '天启芯半导体',
            siteUrl: 'https://www.tianqixin.com',
            companyName: '天启芯半导体科技有限公司',
            contactEmail: 'info@tianqixin.com',
            contactPhone: '+86-400-123-4567',
            address: '上海市浦东新区张江高科技园区',
            copyright: '© 2024 天启芯半导体科技有限公司 版权所有'
          }}
        >
          <Form.Item
            label="网站名称"
            name="siteName"
            rules={[{ required: true, message: '请输入网站名称' }]}
          >
            <Input placeholder="请输入网站名称" />
          </Form.Item>

          <Form.Item
            label="网站地址"
            name="siteUrl"
            rules={[{ required: true, message: '请输入网站地址' }]}
          >
            <Input placeholder="请输入网站地址" />
          </Form.Item>

          <Form.Item
            label="公司名称"
            name="companyName"
            rules={[{ required: true, message: '请输入公司名称' }]}
          >
            <Input placeholder="请输入公司名称" />
          </Form.Item>

          <Form.Item
            label="联系邮箱"
            name="contactEmail"
            rules={[{ required: true, message: '请输入联系邮箱' }]}
          >
            <Input placeholder="请输入联系邮箱" />
          </Form.Item>

          <Form.Item
            label="联系电话"
            name="contactPhone"
            rules={[{ required: true, message: '请输入联系电话' }]}
          >
            <Input placeholder="请输入联系电话" />
          </Form.Item>

          <Form.Item
            label="公司地址"
            name="address"
            rules={[{ required: true, message: '请输入公司地址' }]}
          >
            <TextArea rows={2} placeholder="请输入公司地址" />
          </Form.Item>

          <Form.Item
            label="版权信息"
            name="copyright"
            rules={[{ required: true, message: '请输入版权信息' }]}
          >
            <Input placeholder="请输入版权信息" />
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
      key: 'advanced',
      label: '高级设置',
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            maintenanceMode: false,
            registrationEnabled: true,
            commentEnabled: true,
            defaultLanguage: 'zh-CN',
            timezone: 'Asia/Shanghai',
            dateFormat: 'YYYY-MM-DD',
            timeFormat: 'HH:mm:ss'
          }}
        >
          <Form.Item
            label="维护模式"
            name="maintenanceMode"
            valuePropName="checked"
          >
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>

          <Form.Item
            label="用户注册"
            name="registrationEnabled"
            valuePropName="checked"
          >
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>

          <Form.Item
            label="评论功能"
            name="commentEnabled"
            valuePropName="checked"
          >
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>

          <Form.Item
            label="默认语言"
            name="defaultLanguage"
            rules={[{ required: true, message: '请选择默认语言' }]}
          >
            <Select placeholder="请选择默认语言">
              <Option value="zh-CN">简体中文</Option>
              <Option value="en-US">English</Option>
              <Option value="ja-JP">日本語</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="时区设置"
            name="timezone"
            rules={[{ required: true, message: '请选择时区' }]}
          >
            <Select placeholder="请选择时区">
              <Option value="Asia/Shanghai">亚洲/上海 (UTC+8)</Option>
              <Option value="America/New_York">美国/纽约 (UTC-5)</Option>
              <Option value="Europe/London">欧洲/伦敦 (UTC+0)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="日期格式"
            name="dateFormat"
            rules={[{ required: true, message: '请选择日期格式' }]}
          >
            <Select placeholder="请选择日期格式">
              <Option value="YYYY-MM-DD">2024-01-01</Option>
              <Option value="DD/MM/YYYY">01/01/2024</Option>
              <Option value="MM/DD/YYYY">01/01/2024</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="时间格式"
            name="timeFormat"
            rules={[{ required: true, message: '请选择时间格式' }]}
          >
            <Select placeholder="请选择时间格式">
              <Option value="HH:mm:ss">14:30:00</Option>
              <Option value="hh:mm A">02:30 PM</Option>
            </Select>
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
      <Card title="系统配置">
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}