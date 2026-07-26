'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { userApi, getAuthToken } from '../../../lib/api-client';
import { Card, Empty, List, Button, Tag, Modal, Form, Input, Checkbox as AntCheckbox, message } from 'antd';
import { HomeOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { toast } from 'sonner';

interface Address {
  id: number;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
  is_default: boolean;
}

const AddressesPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [form] = Form.useForm();

  const loadAddresses = async () => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await userApi.getAddresses();
      if (response.code === 200) {
        const list = response.data?.list || response.data || [];
        setAddresses(Array.isArray(list) ? list : []);
      }
    } catch (error) {
      console.error('获取地址失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      const response = await userApi.deleteAddress(id);
      if (response.code === 200) {
        toast.success(t('删除成功'));
        loadAddresses();
      } else {
        toast.error(response.message || t('删除失败'));
      }
    } catch (error) {
      toast.error(t('删除失败'));
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      const response = await userApi.setDefaultAddress(id);
      if (response.code === 200) {
        toast.success(t('已设为默认地址'));
        loadAddresses();
      } else {
        toast.error(response.message || t('设置失败'));
      }
    } catch (error) {
      toast.error(t('设置失败'));
    }
  };

  const handleEdit = (addr: Address) => {
    setEditingAddress(addr);
    form.setFieldsValue(addr);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      let response;
      if (editingAddress) {
        response = await userApi.updateAddress(editingAddress.id, values);
      } else {
        response = await userApi.addAddress(values);
      }
      if (response.code === 200) {
        toast.success(editingAddress ? t('修改成功') : t('添加成功'));
        setModalVisible(false);
        setEditingAddress(null);
        form.resetFields();
        loadAddresses();
      } else {
        toast.error(response.message || t('操作失败'));
      }
    } catch (error) {
      console.error('提交地址失败:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e60012]"></div>
    </div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t('收货地址管理')}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingAddress(null); form.resetFields(); setModalVisible(true); }}>
          {t('添加新地址')}
        </Button>
      </div>

      {addresses.length === 0 ? (
        <Empty description={t('暂无收货地址')} />
      ) : (
        <List
          dataSource={addresses}
          renderItem={(item) => (
            <List.Item>
              <Card
                title={
                  <div className="flex justify-between items-center">
                    <span>{item.name} {item.phone}</span>
                    {item.is_default && <Tag color="blue">{t('默认地址')}</Tag>}
                  </div>
                }
              >
                <div className="mb-4">
                  <p className="mb-2">
                    {item.province} {item.city} {item.district} {item.address}
                  </p>
                  <div className="flex items-center">
                    <AntCheckbox
                      checked={item.is_default}
                      onChange={() => !item.is_default && handleSetDefault(item.id)}
                      disabled={item.is_default}
                    >
                      {t('默认地址')}
                    </AntCheckbox>
                    <div className="ml-auto space-x-2">
                      <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(item)}>{t('编辑')}</Button>
                      <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(item.id)}>{t('删除')}</Button>
                    </div>
                  </div>
                </div>
              </Card>
            </List.Item>
          )}
        />
      )}

      <Modal
        title={editingAddress ? t('编辑地址') : t('添加新地址')}
        open={modalVisible}
        onCancel={() => { setModalVisible(false); setEditingAddress(null); }}
        onOk={handleSubmit}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('收货人姓名')} rules={[{ required: true, message: t('请输入收货人姓名') }]}>
            <Input placeholder={t('请输入收货人姓名')} />
          </Form.Item>
          <Form.Item name="phone" label={t('手机号码')} rules={[{ required: true, message: t('请输入手机号码') }]}>
            <Input placeholder={t('请输入手机号码')} />
          </Form.Item>
          <div className="flex gap-4">
            <Form.Item name="province" label={t('省份')} rules={[{ required: true }]} className="flex-1">
              <Input placeholder={t('省份')} />
            </Form.Item>
            <Form.Item name="city" label={t('城市')} rules={[{ required: true }]} className="flex-1">
              <Input placeholder={t('城市')} />
            </Form.Item>
            <Form.Item name="district" label={t('区县')} rules={[{ required: true }]} className="flex-1">
              <Input placeholder={t('区县')} />
            </Form.Item>
          </div>
          <Form.Item name="address" label={t('详细地址')} rules={[{ required: true, message: t('请输入详细地址') }]}>
            <Input placeholder={t('请输入详细地址')} />
          </Form.Item>
          <Form.Item name="is_default" valuePropName="checked">
            <AntCheckbox>{t('设为默认地址')}</AntCheckbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AddressesPage;
