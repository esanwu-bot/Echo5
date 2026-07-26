"use client";

import { useState, useEffect } from "react";
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
    Switch,
    Radio,
    Upload,
    Image,
} from "antd";
import {
    SearchOutlined,
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    PlusCircleOutlined,
    UploadOutlined,
} from "@ant-design/icons";
import { apiClient } from "../../../lib/api/client";
import { useRouter } from "next/navigation";

interface Category {
    id: number;
    name: string;
    name_en: string;
    sort: number;
    status: number;
    create_time: string;
    template_type: string;
    is_hot: number;
    cover_image: string;
}

export default function ApplicationCategoryManagement() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [form] = Form.useForm();
    const router = useRouter();
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [uploadedImage, setUploadedImage] = useState<string>("");

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (searchText) params.keyword = searchText;

            const res = await apiClient.get('/admin/application-categories', { params });
            if (res.data.code === 200) {
                setCategories(res.data.data || []);
            } else {
                message.error(res.data.message || "获取分类列表失败");
            }
        } catch (error) {
            message.error("获取分类列表失败");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleAddCategory = () => {
        setEditingCategory(null);
        setUploadedImage("");
        form.resetFields();
        form.setFieldsValue({ status: 1, sort: 1, template_type: 'A', is_hot: 0 });
        setIsEditModalVisible(true);
    };

    const handleEditCategory = (category: Category) => {
        setEditingCategory(category);
        setUploadedImage(category.cover_image || "");
        form.setFieldsValue({
            ...category,
            status: category.status === 1,
            is_hot: category.is_hot === 1
        });
        setIsEditModalVisible(true);
    };

    const handleSaveCategory = async () => {
        try {
            const values = await form.validateFields();
            const payload = {
                ...values,
                cover_image: uploadedImage,
                status: values.status ? 1 : 0,
                is_hot: values.is_hot ? 1 : 0
            };

            const res = editingCategory
                ? await apiClient.put(`/admin/application-categories/${editingCategory.id}`, payload)
                : await apiClient.post('/admin/application-categories', payload);

            if (res.data.code === 200) {
                message.success(editingCategory ? "更新成功" : "创建成功");
                setIsEditModalVisible(false);
                fetchCategories();
            } else {
                message.error(res.data.message || "保存失败");
            }
        } catch (error) {
            console.error("Save failed:", error);
        }
    };

    const handleDeleteCategory = (id: number) => {
        Modal.confirm({
            title: "确认删除",
            content: "确定要删除这个分类吗？如果分类下有应用，将无法删除。",
            onOk: async () => {
                try {
                    const res = await apiClient.delete(`/admin/application-categories/${id}`);
                    if (res.data.code === 200) {
                        message.success("删除成功");
                        fetchCategories();
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
            content: `确定要删除选中的 ${selectedRowKeys.length} 个分类吗？此操作不可撤销。`,
            onOk: async () => {
                try {
                    const res = await apiClient.post('/admin/application-categories/batch-delete', { ids: selectedRowKeys });
                    if (res.data.code === 200) {
                        message.success('批量删除成功');
                        setSelectedRowKeys([]);
                        fetchCategories();
                    } else {
                        message.error(res.data.message || '批量删除失败');
                    }
                } catch (error) {
                    message.error('批量删除失败');
                }
            },
        });
    };

    const columns = [
        { title: "ID", dataIndex: "id", key: "id", width: 80 },
        {
            title: "封面图",
            dataIndex: "cover_image",
            key: "cover_image",
            width: 100,
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
        { title: "分类名称", dataIndex: "name", key: "name" },
        // { title: "英文名称", dataIndex: "name_en", key: "name_en" },
        {
            title: "模板类型",
            dataIndex: "template_type",
            key: "template_type",
            width: 100,
            render: (type: string) => <Tag color="blue">{type === 'B' ? '模板 B' : '模板 A'}</Tag>
        },
        { title: "排序", dataIndex: "sort", key: "sort", width: 80 },
        {
            title: "状态",
            dataIndex: "status",
            key: "status",
            width: 100,
            render: (status: number) => (
                <Tag color={status === 1 ? "green" : "red"}>{status === 1 ? "启用" : "禁用"}</Tag>
            ),
        },
        {
            title: "热门",
            dataIndex: "is_hot",
            key: "is_hot",
            width: 100,
            render: (is_hot: number) => (
                <Tag color={is_hot === 1 ? "orange" : "default"}>{is_hot === 1 ? "热门" : "常规"}</Tag>
            ),
        },
        {
            title: "操作",
            key: "action",
            width: 250,
            render: (_: any, record: Category) => (
                <Space size="small">
                    <Button
                        type="link"
                        size="small"
                        icon={<PlusCircleOutlined />}
                        onClick={() => router.push(`/applications?add_for_category_id=${record.id}`)}
                    >
                        添加应用
                    </Button>
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
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCategory}>
                    新建分类
                </Button>
            </div>

            <Card className="mb-6">
                <Space>
                    <Input
                        placeholder="搜索分类名称..."
                        prefix={<SearchOutlined />}
                        style={{ width: 300 }}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onPressEnter={fetchCategories}
                    />
                    <Button type="primary" onClick={fetchCategories}>搜索</Button>
                    <Button onClick={() => { setSearchText(""); setSelectedRowKeys([]); fetchCategories(); }}>重置</Button>
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
                    dataSource={categories}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                />
            </Card>

            <Modal
                title={editingCategory ? "编辑分类" : "新建分类"}
                open={isEditModalVisible}
                onCancel={() => setIsEditModalVisible(false)}
                onOk={handleSaveCategory}
                okText="保存"
                cancelText="取消"
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="分类名称" rules={[{ required: true, message: "请输入分类名称" }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="cover_image" label="封面图片">
                        <div className="flex flex-col gap-2">
                            {uploadedImage && (
                                <Image
                                    src={uploadedImage}
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
                    <Form.Item name="sort" label="排序">
                        <Input type="number" />
                    </Form.Item>
                    <Form.Item name="template_type" label="模板类型" initialValue="A">
                        <Radio.Group>
                            <Radio value="A">模板 A (左侧导航)</Radio>
                            <Radio value="B">模板 B (顶部Banner)</Radio>
                        </Radio.Group>
                    </Form.Item>
                    <Form.Item name="status" label="状态" valuePropName="checked">
                        <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                    </Form.Item>
                    <Form.Item name="is_hot" label="是否热门" valuePropName="checked">
                        <Switch checkedChildren="热门" unCheckedChildren="普通" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
