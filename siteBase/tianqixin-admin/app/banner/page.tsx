'use client';

import { useState, useEffect } from 'react';
import { Table, Input, Button, Space, Tag, Modal, message, Select, Card, Form, Upload, Image, Switch } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, EyeOutlined } from '@ant-design/icons';
import { API_BASE_URL, BACKEND_ADMIN_URL } from '../../lib/api/config';
import { bannerService, Banner } from '../../lib/api/banner';
import { useFormSubmit } from '../../hooks/useFormSubmit';
// import MultiLangInput from '../../components/MultiLangInput';

const { Option } = Select;

// Banner position types
const BANNER_POSITIONS = [
  { value: 'home', label: '首页轮播' },
  { value: 'product', label: '产品页轮播' },
  { value: 'about', label: '关于我们页' }
];

// Mock data for banners
const mockBanners = [
  {
    id: 1,
    title: '新品上市 - 高性能电源管理芯片',
    position: 'home',
    image: '/placeholder-banner.jpg',
    link: '/products/new-chip',
    sort: 1,
    status: true,
    created_at: '2024-01-15 10:00:00'
  },
  {
    id: 2,
    title: '技术创新引领未来',
    position: 'home',
    image: '/placeholder-banner.jpg',
    link: '/about/technology',
    sort: 2,
    status: true,
    created_at: '2024-01-12 14:30:00'
  },
  {
    id: 3,
    title: 'MOSFET系列产品',
    position: 'product',
    image: '/placeholder-banner.jpg',
    link: '/products/mosfet',
    sort: 1,
    status: true,
    created_at: '2024-01-10 09:15:00'
  },
  {
    id: 4,
    title: '企业荣誉展示',
    position: 'about',
    image: '/placeholder-banner.jpg',
    link: '',
    sort: 1,
    status: false,
    created_at: '2024-01-08 16:20:00'
  }
];

export default function BannerManagement() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [form] = Form.useForm();
  const { submit } = useFormSubmit(form);
  const imageValue = Form.useWatch('image', form);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const response = await bannerService.list({
        position: selectedPosition || undefined,
        page: pagination.current,
        pageSize: pagination.pageSize,
      });

      if (response.code === 200) {
        // Filter by search text on client side
        let filteredBanners = response.data.list;
        if (searchText) {
          filteredBanners = filteredBanners.filter((banner) =>
            banner.title.includes(searchText) ||
            banner.link.includes(searchText)
          );
        }

        // 确保所有 banner 都有有效的 id，创建一个带有必需 id 的新类型
        type BannerWithRequiredId = Omit<Banner, 'id'> & { id: number };
        const validBanners = filteredBanners.filter(banner => banner.id !== undefined) as BannerWithRequiredId[];

        setBanners(validBanners as Banner[]);
        setPagination(prev => ({ ...prev, total: response.data.total }));
      } else {
        message.error(response.message || '获取轮播图列表失败');
      }
    } catch (error: any) {
      console.error('Fetch banners failed:', error);
      message.error(error.message || '获取轮播图列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  useEffect(() => {
    if (isEditModalVisible) {
      if (editingBanner) {
        form.setFieldsValue({
          title: editingBanner.title || '',
          position: editingBanner.position,
          link: editingBanner.link,
          sort: editingBanner.sort,
          status: editingBanner.status,
          image: editingBanner.image
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ status: true, sort: 1 });
      }
    }
  }, [isEditModalVisible, editingBanner, form]);

  const handleSearch = () => {
    setSelectedRowKeys([]);
    fetchBanners();
  };

  const handleReset = () => {
    setSearchText('');
    setSelectedPosition('');
    setSelectedRowKeys([]);
    fetchBanners();
  };

  const handleEditBanner = (banner: Banner) => {
    setEditingBanner(banner);
    setIsEditModalVisible(true);
  };

  const handleAddBanner = () => {
    setEditingBanner(null);
    setIsEditModalVisible(true);
  };

  const handleSaveBanner = async () => {
    try {
      const values = await form.validateFields();

      const payload: any = { ...values };

      await submit(
        async () => {
          if (editingBanner) {
            if (!editingBanner.id) {
              message.error('轮播图ID不存在，无法更新');
              return { code: 400, message: 'ID不存在' };
            }
            return await bannerService.update(editingBanner.id, payload);
          } else {
            return await bannerService.create(payload);
          }
        },
        {
          successMessage: editingBanner ? '轮播图更新成功' : '轮播图创建成功',
          errorMessage: '保存失败',
          onSuccess: () => {
            setIsEditModalVisible(false);
            fetchBanners();
          },
        }
      );
    } catch (error: any) {
      if (error.errorFields) return; // Ant Design 验证错误
      console.error('Save failed:', error);
    }
  };

  const handleDeleteBanner = (banner: Banner) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个轮播图吗？此操作不可撤销。',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          if (!banner.id) {
            message.error('轮播图ID不存在，无法删除');
            return;
          }

          const response = await bannerService.delete(banner.id);
          if (response.code === 200) {
            message.success('轮播图删除成功');
            fetchBanners();
          } else {
            message.error(response.message || '删除失败');
          }
        } catch (error: any) {
          console.error('Delete failed:', error);
          message.error(error.message || '删除失败');
        }
      }
    });
  };

  const handleBatchDelete = () => {
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个轮播图吗？`,
      okText: '确定删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const response = await bannerService.batchDelete(selectedRowKeys as number[]);
          if (response.code === 200) {
            message.success('批量删除成功');
            setSelectedRowKeys([]);
            fetchBanners();
          } else {
            message.error(response.message || '批量删除失败');
          }
        } catch (error: any) {
          message.error('批量删除失败');
        }
      }
    });
  };

  const handleStatusChange = async (banner: Banner, checked: boolean) => {
    try {
      if (!banner.id) {
        message.error('轮播图ID不存在，无法更新状态');
        return;
      }

      const response = await bannerService.updateStatus(banner.id, checked);
      if (response.code === 200) {
        message.success(`${checked ? '启用' : '禁用'}轮播图成功`);
        fetchBanners();
      } else {
        message.error(response.message || '状态更新失败');
      }
    } catch (error: any) {
      console.error('Status update failed:', error);
      message.error(error.message || '状态更新失败');
    }
  };

  const getPositionLabel = (position: string) => {
    const pos = BANNER_POSITIONS.find(p => p.value === position);
    return pos ? pos.label : position;
  };

  // 处理图片URL：相对路径拼接BACKEND_ADMIN_URL，绝对路径直接使用
  const getImageUrl = (image: string) => {
    if (!image) return '/placeholder-banner.jpg';
    if (image.startsWith('http')) return image;
    return `${BACKEND_ADMIN_URL}${image}`;
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '预览',
      dataIndex: 'image',
      key: 'image',
      width: 120,
      render: (image: string) => (
        <Image
          src={getImageUrl(image)}
          alt="banner"
          width={80}
          height={45}
          style={{ objectFit: 'cover', borderRadius: '4px' }}
          placeholder={
            <div style={{ width: 80, height: 45, background: '#f0f0f0', borderRadius: '4px' }} />
          }
        />
      )
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => (
        <div className="max-w-xs truncate" title={text}>
          {text}
        </div>
      )
    },
    {
      title: '位置',
      dataIndex: 'position',
      key: 'position',
      width: 120,
      render: (position: string) => (
        <Tag color="blue">{getPositionLabel(position)}</Tag>
      )
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 80,
      render: (sort: number) => (
        <Tag>{sort}</Tag>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: boolean, record: Banner) => (
        <Switch
          checked={status}
          onChange={(checked) => handleStatusChange(record, checked)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Banner) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => window.open(record.link, '_blank')}
          >
            预览
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditBanner(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteBanner(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 24px', marginTop: '20px' }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">轮播图管理</h1>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddBanner}
          >
            新建轮播图
          </Button>
        </div>
        <p className="text-gray-600 mt-2">
          管理首页、产品页等页面的轮播图展示
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <Space wrap>
          <Input
            placeholder="搜索轮播图标题或链接..."
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Select
            placeholder="选择位置"
            style={{ width: 120 }}
            value={selectedPosition}
            onChange={(value) => setSelectedPosition(value)}
            allowClear
          >
            {BANNER_POSITIONS.map((position) => (
              <Option key={position.value} value={position.value}>
                {position.label}
              </Option>
            ))}
          </Select>
          <Button type="primary" onClick={handleSearch}>搜索</Button>
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </Card>

      {/* 批量操作 */}
      <div className="mb-4">
        {selectedRowKeys.length > 0 && (
          <Space>
            <span className="text-gray-500">已选择 {selectedRowKeys.length} 项</span>
            <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>批量删除</Button>
          </Space>
        )}
      </div>

      {/* Banners Table */}
      <Card>
        <Table
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          columns={columns}
          dataSource={banners}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
          }}
          onChange={(newPagination) => {
            setSelectedRowKeys([]);
            setPagination(prev => ({
              current: newPagination.current || 1,
              pageSize: newPagination.pageSize || 10,
              total: prev.total
            }));
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Edit Banner Modal */}
      <Modal
        title={editingBanner ? '编辑轮播图' : '新建轮播图'}
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        onOk={handleSaveBanner}
        width={700}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: true,
            sort: 1
          }}
        >
          <Form.Item
            name="title"
            label="轮播图标题"
            rules={[{ required: true, message: '请输入轮播图标题' }]}
          >
            <Input placeholder="请输入轮播图标题" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="position"
              label="显示位置"
              rules={[{ required: true, message: '请选择显示位置' }]}
            >
              <Select placeholder="选择显示位置">
                {BANNER_POSITIONS.map((position) => (
                  <Option key={position.value} value={position.value}>
                    {position.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="sort"
              label="排序"
              rules={[{ required: true, message: '请输入排序值' }]}
            >
              <Input
                type="number"
                placeholder="数字越小越靠前"
                min={1}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="link"
            label="跳转链接"
          >
            <Input placeholder="请输入跳转链接（可选）" />
          </Form.Item>

          <Form.Item
            name="image"
            label="轮播图片"
            rules={[{ required: true, message: '请上传轮播图片' }]}
          >
            <Upload
              listType="picture-card"
              className="avatar-uploader"
              showUploadList={false}
              action="/admin/upload/image"
              accept="image/*"
              onChange={({ file }) => {
                if (file.status === 'done') {
                  const url = (file.response as any)?.url;
                  if (url) {
                    form.setFieldsValue({ image: url });
                    message.success('上传成功');
                  }
                } else if (file.status === 'error') {
                  message.error('上传失败');
                }
              }}
            >
              {imageValue ? (
                <Image
                  src={getImageUrl(imageValue)}
                  alt="banner"
                  width={300}
                  height={100}
                  style={{ objectFit: 'cover', borderRadius: '4px' }}
                />
              ) : (
                <div className="w-full h-32 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500">
                  <UploadOutlined className="text-2xl mb-2" />
                  <div>点击上传轮播图片</div>
                  <div className="text-xs mt-1">建议尺寸: 1920x600px</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            valuePropName="checked"
          >
            <div className="flex items-center gap-2">
              <Switch />
              <span className="text-sm">启用轮播图</span>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
