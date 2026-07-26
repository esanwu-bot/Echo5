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
  UploadOutlined,
} from "@ant-design/icons";
import { API_BASE_URL } from "../../lib/api/config";
import { getLocalStorage } from "../../lib/utils";

const { Option } = Select;

interface ApplicationCategory {
  id: number;
  name: string;
  name_en: string;
  cover_image: string;
  description: string;
  template_type: string;
  sort: number;
  status: number | boolean;
  created_at: string;
}

function ApplicationCategoriesContent() {
  const [categories, setCategories] = useState<ApplicationCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<ApplicationCategory | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [form] = Form.useForm();
  const [uploadedImage, setUploadedImage] = useState<string>("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const token =
        typeof window !== "undefined"
          ? getLocalStorage()?.getItem("auth_token")
          : null;

      const params = new URLSearchParams();
      if (searchText) params.append("keyword", searchText);
      params.append("page", String(pagination.current));
      params.append("pageSize", String(pagination.pageSize));

      const response = await fetch(
        `${API_BASE_URL}/admin/application-categories?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.code === 200 && data.data) {
          setCategories(data.data.list || data.data || []);
          setPagination(prev => ({
            ...prev,
            total: data.data.total || data.data?.length || 0,
          }));
        } else {
          message.error(data.message || "获取应用分类列表失败");
        }
      } else {
        throw new Error("API request failed");
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      message.error("获取应用分类列表失败，请检查网络连接");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [pagination.current, pagination.pageSize]);

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchCategories();
  };

  const handleReset = () => {
    setSearchText("");
    setSelectedRowKeys([]);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchCategories();
  };

  const handleEditCategory = (category: ApplicationCategory) => {
    setEditingCategory(category);
    setUploadedImage(category.cover_image || "");
    form.setFieldsValue({
      name: category.name,
      name_en: category.name_en,
      cover_image: category.cover_image,
      description: category.description,
      template_type: category.template_type,
      sort: category.sort,
      status: !!category.status,
    });
    setIsEditModalVisible(true);
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setUploadedImage("");
    form.resetFields();
    form.setFieldsValue({
      status: true,
      sort: 1,
      template_type: "A",
    });
    setIsEditModalVisible(true);
  };

  const handleSaveCategory = async () => {
    try {
      const values = await form.validateFields();
      const token = getLocalStorage()?.getItem("auth_token");
      const url = editingCategory
        ? `${API_BASE_URL}/admin/application-categories/${editingCategory.id}`
        : `${API_BASE_URL}/admin/application-categories`;

      const response = await fetch(url, {
        method: editingCategory ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...values,
          status: values.status ? 1 : 0,
        }),
      });

      const data = await response.json();
      if (data.code === 200) {
        message.success(editingCategory ? "更新成功" : "创建成功");
        setIsEditModalVisible(false);
        fetchCategories();
      } else {
        message.error(data.message || "保存失败");
      }
    } catch (error) {
      console.error("Save failed:", error);
    }
  };

  const handleDeleteCategory = (id: number) => {
    Modal.confirm({
      title: "确认删除",
      content: "确定要删除这个应用分类吗？如果分类下有关联应用，将无法删除。",
      onOk: async () => {
        const token = getLocalStorage()?.getItem("auth_token");
        const response = await fetch(
          `${API_BASE_URL}/admin/application-categories/${id}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await response.json();
        if (data.code === 200) {
          message.success("删除成功");
          fetchCategories();
        } else {
          message.error(data.message || "删除失败");
        }
      },
    });
  };

  const handleBatchDelete = async () => {
    Modal.confirm({
      title: "确认批量删除",
      content: `确定要删除选中的 ${selectedRowKeys.length} 个应用分类吗？此操作不可撤销。`,
      onOk: async () => {
        const token = getLocalStorage()?.getItem("auth_token");
        try {
          const response = await fetch(
            `${API_BASE_URL}/admin/application-categories/batch-delete`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ ids: selectedRowKeys }),
            }
          );
          const data = await response.json();
          if (data.code === 200) {
            message.success("批量删除成功");
            setSelectedRowKeys([]);
            fetchCategories();
          } else {
            message.error(data.message || "批量删除失败");
          }
        } catch (error) {
          message.error("批量删除失败");
        }
      },
    });
  };

  const handleStatusChange = async (id: number, checked: boolean) => {
    try {
      const token = getLocalStorage()?.getItem("auth_token");
      const response = await fetch(
        `${API_BASE_URL}/admin/application-categories/${id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: checked ? 1 : 0 }),
        }
      );
      const data = await response.json();
      if (data.code === 200) {
        message.success(`${checked ? "启用" : "禁用"}成功`);
        setCategories(prev =>
          prev.map(cat =>
            cat.id === id ? { ...cat, status: checked ? 1 : 0 } : cat
          )
        );
      } else {
        message.error(data.message || "更新状态失败");
        fetchCategories();
      }
    } catch (error) {
      message.error("更新状态失败");
      fetchCategories();
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
      title: "封面图",
      dataIndex: "cover_image",
      key: "cover_image",
      width: 120,
      render: (image: string) => (
        <Image
          src={image || "/placeholder.jpg"}
          alt="category"
          width={80}
          height={60}
          style={{ objectFit: "cover", borderRadius: "4px" }}
        />
      ),
    },
    {
      title: "分类名称",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: ApplicationCategory) => (
        <div>
          <div className="font-medium">{text}</div>
          {record.description && (
            <div className="text-gray-500 text-xs truncate max-w-xs">
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "英文名",
      dataIndex: "name_en",
      key: "name_en",
      width: 150,
    },
    {
      title: "模板类型",
      dataIndex: "template_type",
      key: "template_type",
      width: 100,
      render: (type: string) => (
        <Tag color={type === "B" ? "purple" : "blue"}>
          {type === "B" ? "模板 B" : "模板 A"}
        </Tag>
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
      render: (status: number | boolean, record: ApplicationCategory) => (
        <Switch
          checked={!!status}
          onChange={checked => handleStatusChange(record.id, checked)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 180,
      render: (_: any, record: ApplicationCategory) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditCategory(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteCategory(record.id)}
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
        <h1 className="text-2xl font-bold">应用分类管理</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddCategory}
        >
          新建分类
        </Button>
      </div>

      <Card className="mb-6">
        <Space wrap>
          <Input
            placeholder="搜索分类名称..."
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Button type="primary" onClick={handleSearch}>
            搜索
          </Button>
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </Card>

      <Card>
        <div className="mb-4">
          {selectedRowKeys.length > 0 && (
            <Space>
              <span>已选择 {selectedRowKeys.length} 项</span>
              <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
                批量删除
              </Button>
            </Space>
          )}
        </div>
        <Table
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          columns={columns}
          dataSource={categories}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: total => `共 ${total} 条记录`,
          }}
          onChange={p => {
            setPagination(prev => ({
              ...prev,
              current: p.current || 1,
              pageSize: p.pageSize || 10,
            }));
            setSelectedRowKeys([]);
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title={editingCategory ? "编辑应用分类" : "新建应用分类"}
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        onOk={handleSaveCategory}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="分类名称"
            rules={[{ required: true, message: "请输入分类名称" }]}
          >
            <Input placeholder="请输入分类名称" />
          </Form.Item>

          <Form.Item name="name_en" label="英文名">
            <Input placeholder="请输入英文名" />
          </Form.Item>

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
                action={`${API_BASE_URL}/admin/upload/image`}
                headers={{
                  Authorization: `Bearer ${getLocalStorage()?.getItem("auth_token")}`,
                }}
                onChange={info => {
                  if (info.file.status === "done") {
                    const url =
                      info.file.response?.data?.url ||
                      info.file.response?.url;
                    setUploadedImage(url);
                    form.setFieldValue("cover_image", url);
                    message.success("上传成功");
                  } else if (info.file.status === "error") {
                    message.error("上传失败");
                  }
                }}
              >
                <Button icon={<UploadOutlined />}>上传图片</Button>
              </Upload>
            </div>
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请输入分类描述" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="template_type"
              label="模板类型"
              rules={[{ required: true, message: "请选择模板类型" }]}
            >
              <Select placeholder="请选择模板类型">
                <Option value="A">模板 A</Option>
                <Option value="B">模板 B</Option>
              </Select>
            </Form.Item>

            <Form.Item name="sort" label="排序">
              <Input type="number" placeholder="请输入排序值" />
            </Form.Item>
          </div>

          <Form.Item name="status" label="状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default function ApplicationCategoriesManagement() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <ApplicationCategoriesContent />
    </Suspense>
  );
}
