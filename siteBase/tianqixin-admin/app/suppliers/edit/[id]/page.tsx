'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Form, Input, Switch, message, Breadcrumb } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';

const { TextArea } = Input;

// 供应商编辑页面
export default function SupplierEditPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const isEditMode = id !== undefined;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 获取供应商详情
  const fetchSupplierDetail = async () => {
    if (!isEditMode) return;
    
    setLoading(true);
    try {
      // 实际项目中替换为真实API调用
      // const response = await fetch(`/api/suppliers/${id}`, {
      //   method: 'GET',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      // });
      // const data = await response.json();
      // form.setFieldsValue(data);
      
      // 使用模拟数据
      const mockData = {
        supplier_code: 'SUP-001',
        name: '供应商A',
        contact_person: '张三',
        contact_phone: '13800138000',
        contact_email: 'contact@supplier-a.com',
        address: '北京市朝阳区',
        status: true
      };
      form.setFieldsValue(mockData);
      message.success('获取供应商详情成功');
    } catch (error) {
      message.error('获取供应商详情失败');
      console.error('Failed to fetch supplier detail:', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存供应商
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      const data = {
        ...values,
        status: values.status ? 1 : 0
      };
      
      // 实际项目中替换为真实API调用
      // const method = isEditMode ? 'PUT' : 'POST';
      // const url = isEditMode ? `/api/suppliers/${id}` : '/api/suppliers';
      // const response = await fetch(url, {
      //   method: method,
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(data),
      // });
      // await response.json();
      
      // 使用模拟数据
      message.success(isEditMode ? '更新供应商成功' : '新增供应商成功');
      router.push('/suppliers');
    } catch (error) {
      message.error(isEditMode ? '更新供应商失败' : '新增供应商失败');
      console.error('Failed to save supplier:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplierDetail();
  }, [id]);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <Breadcrumb items={[
            { title: <a href="/">首页</a> },
            { title: <a href="/suppliers">供应商管理</a> },
            { title: isEditMode ? '编辑供应商' : '新增供应商' }
          ]} />
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => router.push('/suppliers')}>
            返回列表
          </Button>
          <Button type="primary" loading={loading} onClick={handleSave} icon={<SaveOutlined />}>
            保存
          </Button>
        </div>
      </div>

      <Card title={isEditMode ? '编辑供应商' : '新增供应商'}>
        <Form
          form={form}
          layout="vertical"
          className="max-w-3xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Form.Item
              name="supplier_code"
              label="供应商编码"
              rules={[{ required: true, message: '请输入供应商编码' }]}
            >
              <Input placeholder="请输入供应商编码" size="large" />
            </Form.Item>

            <Form.Item
              name="name"
              label="供应商名称"
              rules={[{ required: true, message: '请输入供应商名称' }]}
            >
              <Input placeholder="请输入供应商名称" size="large" />
            </Form.Item>

            <Form.Item
              name="contact_person"
              label="联系人"
              rules={[{ required: true, message: '请输入联系人' }]}
            >
              <Input placeholder="请输入联系人" size="large" />
            </Form.Item>

            <Form.Item
              name="contact_phone"
              label="联系电话"
              rules={[{ required: true, message: '请输入联系电话' }]}
            >
              <Input placeholder="请输入联系电话" size="large" />
            </Form.Item>

            <Form.Item
              name="contact_email"
              label="联系邮箱"
              rules={[
                { required: true, message: '请输入联系邮箱' },
                { type: 'email', message: '请输入正确的邮箱地址' }
              ]}
            >
              <Input placeholder="请输入联系邮箱" size="large" />
            </Form.Item>

            <Form.Item
              name="status"
              label="状态"
              valuePropName="checked"
              initialValue={true}
            >
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
          </div>

          <Form.Item
            name="address"
            label="地址"
          >
            <TextArea 
              placeholder="请输入供应商地址" 
              rows={4} 
              size="large"
            />
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
