'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { userApi, getAuthToken } from '../../../lib/api-client';
import { Card, Form, Input, Button, Avatar, Upload, message } from 'antd';
import { UserOutlined, CameraOutlined, SaveOutlined } from '@ant-design/icons';
import { toast } from 'sonner';

const ProfilePage = () => {
  const router = useRouter();
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    const loadProfile = async () => {
      try {
        const response = await userApi.getProfile();
        if (response.code === 200 && response.data) {
          setUser(response.data);
          form.setFieldsValue(response.data);
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('获取个人信息失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router, form]);

  const handleSave = async (values: any) => {
    try {
      const response = await userApi.updateProfile(values);
      if (response.code === 200) {
        setUser({ ...user, ...values });
        setIsEditing(false);
        toast.success('个人信息更新成功');
      } else {
        toast.error(response.message || '更新失败');
      }
    } catch (error) {
      console.error('更新失败:', error);
      toast.error('更新失败，请重试');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e60012]"></div>
    </div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">个人信息</h1>

      <Card>
        <div className="flex flex-col md:flex-row gap-8">
          {/* Avatar Section */}
          <div className="flex flex-col items-center md:w-1/4">
            <Avatar
              size={120}
              src={user.avatar || undefined}
              icon={<UserOutlined />}
              className="mb-4"
            />
            <Upload
              name="avatar"
              listType="picture-circle"
              className="avatar-uploader"
              showUploadList={false}
              action="#"
              beforeUpload={() => false}
            >
              <Button icon={<CameraOutlined />} size="small">更换头像</Button>
            </Upload>
          </div>

          {/* Profile Form */}
          <div className="md:w-3/4">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Form.Item
                  name="username"
                  label="用户名"
                  rules={[{ required: true, message: '请输入用户名' }]}
                >
                  <Input disabled={!isEditing} />
                </Form.Item>

                <Form.Item
                  name="nickname"
                  label="昵称"
                  rules={[{ required: true, message: '请输入昵称' }]}
                >
                  <Input disabled={!isEditing} />
                </Form.Item>

                <Form.Item
                  name="email"
                  label="邮箱"
                  rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效的邮箱地址' }]}
                >
                  <Input disabled={!isEditing} />
                </Form.Item>

                <Form.Item
                  name="phone"
                  label="手机号"
                  rules={[{ required: true, message: '请输入手机号' }, { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }]}
                >
                  <Input disabled={!isEditing} />
                </Form.Item>
              </div>

              <Form.Item name="created_at" label="注册时间">
                <Input disabled />
              </Form.Item>

              <div className="flex justify-end gap-2 mt-6">
                {isEditing ? (
                  <>
                    <Button onClick={() => setIsEditing(false)}>取消</Button>
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={false}>保存</Button>
                  </>
                ) : (
                  <Button type="primary" onClick={() => setIsEditing(true)}>
                    编辑信息
                  </Button>
                )}
              </div>
            </Form>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProfilePage;
