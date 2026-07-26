"use client";

import { useState, useEffect, Suspense } from "react";
import {
  Table,
  Input,
  Button,
  Space,
  Tag,
  Modal,
  message,
  Card,
  Form,
  Upload,
  Image,
  Switch,
  Select,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { apiClient } from "../../lib/api/client";
import RichTextEditor from "../../components/RichTextEditor";
import { useSearchParams } from "next/navigation";

const { Option } = Select;

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  product_code: string;
  price?: number;
}

interface Application {
  id: number;
  title: string;
  slug: string;
  description: string;
  cover_image: string;
  content: string;
  sort: number;
  status: boolean;
  product_count: number;
  category_id: number;
  category?: Category;
  products?: Product[];
  created_at: string;
}

function ApplicationAreasContent() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingApplication, setEditingApplication] =
    useState<Application | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [form] = Form.useForm();
  const [uploadedImage, setUploadedImage] = useState<string>("");
  const searchParams = useSearchParams();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const fetchProducts = async () => {
    try {
      const res = await apiClient.get('/admin/applications/available-products');
      if (res.data.code === 200) {
        setProducts(res.data.data || []);
      } else {
        message.error(res.data.message || "获取产品列表失败");
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/admin/application-categories');
      if (res.data.code === 200) {
        setCategories(res.data.data || []);
      } else {
        message.error(res.data.message || "获取分类列表失败");
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchText) params.keyword = searchText;
      if (selectedCategoryId) params.category_id = String(selectedCategoryId);
      params.page = String(pagination.current);
      params.pageSize = String(pagination.pageSize);

      const res = await apiClient.get('/admin/applications', { params });
      if (res.data.code === 200 && res.data.data) {
        setApplications(res.data.data.list || []);
        setPagination(prev => ({ ...prev, total: res.data.data.total || 0 }));
      } else {
        message.error(res.data.message || "获取应用领域列表失败");
      }
    } catch (error) {
      console.error("Failed to fetch applications:", error);
      message.error("获取应用领域列表失败，请检查网络连接");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
    fetchApplications();
  }, [pagination.current, pagination.pageSize]);

  useEffect(() => {
    const addForCategoryId = searchParams?.get("add_for_category_id");
    if (addForCategoryId) {
      handleAddApplication(parseInt(addForCategoryId));
    }
  }, [searchParams]);

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchApplications();
  };

  const handleReset = () => {
    setSearchText("");
    setSelectedCategoryId(undefined);
    setSelectedRowKeys([]);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchApplications();
  };

  const handleEditApplication = async (application: Application) => {
    setEditingApplication(application);
    setUploadedImage(application.cover_image || "");

    // 获取应用详情以读取已关联产品
    let selectedProductIds: number[] = [];
    try {
      const res = await apiClient.get(`/admin/applications/${application.id}`);
      if (res.data.code === 200 && res.data.data && Array.isArray(res.data.data.products)) {
        selectedProductIds = res.data.data.products.map((p: Product) => p.id);
      }
    } catch (error) {
      console.error("Failed to fetch application detail:", error);
    }

    form.setFieldsValue({
      title: application.title,
      slug: application.slug,
      description: application.description,
      cover_image: application.cover_image,
      content: application.content,
      sort: application.sort,
      status: !!application.status,
      category_id: application.category_id,
      products: selectedProductIds,
    });
    setIsEditModalVisible(true);
  };

  const handleAddApplication = (categoryId?: number) => {
    setEditingApplication(null);
    setUploadedImage("");
    form.resetFields();
    form.setFieldsValue({
      status: true,
      sort: 1,
      category_id: categoryId || undefined
    });
    setIsEditModalVisible(true);
  };

  const handleSaveApplication = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        status: values.status ? 1 : 0,
        products: values.products || [],
      };

      const res = editingApplication
        ? await apiClient.put(`/admin/applications/${editingApplication.id}`, payload)
        : await apiClient.post('/admin/applications', payload);

      if (res.data.code === 200) {
        message.success(editingApplication ? "更新成功" : "创建成功");
        setIsEditModalVisible(false);
        fetchApplications();
      } else {
        message.error(res.data.message || "保存失败");
      }
    } catch (error) {
      console.error("Save failed:", error);
    }
  };

  const handleDeleteApplication = (id: number) => {
    Modal.confirm({
      title: "确认删除",
      content: "确定要删除这个应用领域吗？此操作不可撤销。",
      onOk: async () => {
        try {
          const res = await apiClient.delete(`/admin/applications/${id}`);
          if (res.data.code === 200) {
            message.success("删除成功");
            fetchApplications();
          } else {
            message.error(res.data.message || "删除失败");
          }
        } catch (error) {
          message.error("删除失败");
        }
      },
    });
  };

  const handleBatchDelete = async () => {
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个应用领域吗？此操作不可撤销。`,
      onOk: async () => {
        try {
          const res = await apiClient.post('/admin/applications/batch-delete', { ids: selectedRowKeys });
          if (res.data.code === 200) {
            message.success('批量删除成功');
            setSelectedRowKeys([]);
            fetchApplications();
          } else {
            message.error(res.data.message || '批量删除失败');
          }
        } catch (error) {
          message.error('批量删除失败');
        }
      },
    });
  };

  const handleStatusChange = async (id: number, checked: boolean) => {
    try {
      const res = await apiClient.put(`/admin/applications/${id}/status`, { status: checked ? 1 : 0 });
      if (res.data.code === 200) {
        message.success(`${checked ? "启用" : "禁用"}成功`);
        setApplications(prev => prev.map(app => app.id === id ? { ...app, status: checked } : app));
      } else {
        message.error(res.data.message || "更新状态失败");
      }
    } catch (error) {
      message.error("更新状态失败");
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "预览",
      dataIndex: "cover_image",
      key: "cover_image",
      width: 120,
      render: (image: string) => (
        <Image
          src={image || "/placeholder-app.jpg"}
          alt="application"
          width={80}
          height={60}
          style={{ objectFit: "cover", borderRadius: "4px" }}
        />
      ),
    },
    {
      title: "应用领域",
      dataIndex: "title",
      key: "title",
      render: (text: string, record: Application) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-gray-500 text-xs truncate max-w-xs">{record.description}</div>
        </div>
      ),
    },
    {
      title: "所属分类",
      dataIndex: ["category", "name"],
      key: "category",
      width: 120,
      render: (name: string) => <Tag color="cyan">{name || "未分类"}</Tag>,
    },
    {
      title: "关联产品",
      dataIndex: "product_count",
      key: "product_count",
      width: 120,
      render: (count: number, record: Application) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleEditApplication(record)}
        >
          {count || 0} 个产品
        </Button>
      ),
    },
    {
      title: "排序",
      dataIndex: "sort",
      key: "sort",
      width: 80,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: boolean, record: Application) => (
        <Switch
          checked={!!status}
          onChange={(checked) => handleStatusChange(record.id, checked)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 180,
      render: (_: any, record: Application) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditApplication(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteApplication(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">应用领域管理</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleAddApplication()}
        >
          新建应用领域
        </Button>
      </div>

      <Card className="mb-6">
        <Space wrap>
          <Input
            placeholder="搜索标题、描述..."
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Select
            placeholder="按分类筛选"
            style={{ width: 180 }}
            allowClear
            value={selectedCategoryId}
            onChange={setSelectedCategoryId}
          >
            {categories.map(cat => (
              <Option key={cat.id} value={cat.id}>{cat.name}</Option>
            ))}
          </Select>
          <Button type="primary" onClick={handleSearch}>搜索</Button>
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </Card>

      <Card>
        <div className="mb-4">
          {selectedRowKeys.length > 0 && (
            <Space>
              <span>已选择 {selectedRowKeys.length} 项</span>
              <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>批量删除</Button>
            </Space>
          )}
        </div>
        <Table
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          columns={columns}
          dataSource={applications}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          onChange={(p) => { setPagination(prev => ({ ...prev, current: p.current || 1, pageSize: p.pageSize || 10 })); setSelectedRowKeys([]); }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title={editingApplication ? "编辑应用领域" : "新建应用领域"}
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        onOk={handleSaveApplication}
        width={1000}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="title" label="应用领域标题" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="category_id" label="所属分类" rules={[{ required: true }]}>
              <Select placeholder="请选择分类">
                {categories.map(cat => (
                  <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <Form.Item name="slug" label="URL别名" rules={[{ required: true }]}>
            <Input placeholder="如: smart-city" />
          </Form.Item>

          <Form.Item name="description" label="应用描述" rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="sort" label="排序">
              <Input type="number" />
            </Form.Item>
            <Form.Item name="status" label="状态" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>
          </div>

          <Form.Item name="cover_image" label="封面图片">
            <div className="flex flex-col gap-2">
              {(uploadedImage || form.getFieldValue("cover_image")) && (
                <Image 
                  src={uploadedImage || form.getFieldValue("cover_image")} 
                  width={200} 
                  height={120} 
                  style={{ objectFit: "cover" }} 
                  alt="封面图片"
                />
              )}
              <Upload
                showUploadList={false}
                customRequest={async ({ file, onSuccess, onError }) => {
                  try {
                    const formData = new FormData();
                    formData.append('file', file);
                    const res = await apiClient.post('/admin/upload/image', formData);
                    if (res.data.code === 200) {
                      const url = res.data.data?.url;
                      setUploadedImage(url);
                      form.setFieldValue('cover_image', url);
                      onSuccess?.(res.data.data);
                      message.success('上传成功');
                    } else {
                      throw new Error(res.data.message || '上传失败');
                    }
                  } catch (err: any) {
                    message.error(err.message || '上传失败');
                    onError?.(err);
                  }
                }}
              >
                <Button icon={<UploadOutlined />}>上传图片</Button>
              </Upload>
            </div>
          </Form.Item>

          <Form.Item name="content" label="详细内容" rules={[{ required: true }]}>
            <RichTextEditor />
          </Form.Item>

          <Form.Item name="products" label="关联产品">
            <Select
              mode="multiple"
              placeholder="请选择关联产品"
              showSearch
              optionFilterProp="label"
              style={{ width: "100%" }}
              maxTagCount={5}
            >
              {products.map((product) => (
                <Option
                  key={product.id}
                  value={product.id}
                  label={`${product.name} (${product.product_code || "无型号"})`}
                >
                  <div className="flex justify-between items-center">
                    <span>{product.name}</span>
                    <span className="text-gray-400 text-xs">{product.product_code || "无型号"}</span>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default function ApplicationAreasManagement() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <ApplicationAreasContent />
    </Suspense>
  );
}
