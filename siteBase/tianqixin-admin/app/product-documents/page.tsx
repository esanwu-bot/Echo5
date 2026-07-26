'use client';

import { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Table,
  Input,
  Select,
  Popconfirm,
  message,
  Modal,
  Form,
  Switch,
  Space,
  Upload,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileOutlined,
} from '@ant-design/icons';
import ProductDocumentApi, {
  ProductDocument,
  DOC_TYPE_OPTIONS,
  DocType,
} from '../../lib/api/productDocument';
import SeriesApi from '../../lib/api/series';
import ModelApi from '../../lib/api/model';
import { apiClient } from '../../lib/api/client';

const { Search } = Input;
const { Option } = Select;

export default function ProductDocumentsPage() {
  const [documents, setDocuments] = useState<ProductDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [docType, setDocType] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDocument, setEditingDocument] = useState<ProductDocument | null>(null);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);

  const fetchDocuments = async (page = 1) => {
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize: pagination.pageSize,
      };
      if (docType) params.doc_type = docType;

      const response = await ProductDocumentApi.getList(params);
      setDocuments(response.list);
      setPagination({ ...pagination, current: page, total: response.total });
    } catch (error) {
      message.error('获取文档列表失败');
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBasicData = async () => {
    try {
      const [seriesData, modelsData] = await Promise.all([
        SeriesApi.getList({ pageSize: 1000 }),
        ModelApi.getModels({ limit: 1000 }),
      ]);
      setSeriesList(seriesData.list || []);
      setModels(modelsData.list || []);
    } catch (error) {
      console.error('Failed to fetch basic data:', error);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchBasicData();
  }, []);

  const handleSearch = () => {
    fetchDocuments(1);
  };

  const handlePageChange = (page: number, pageSize?: number) => {
    setPagination(prev => ({ ...prev, current: page, pageSize: pageSize || prev.pageSize }));
    fetchDocuments(page);
  };

  const getFileIcon = (fileUrl?: string) => {
    if (!fileUrl) return <FileOutlined />;
    const ext = fileUrl.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
    if (['doc', 'docx'].includes(ext || '')) return <FileWordOutlined style={{ color: '#1890ff' }} />;
    if (['xls', 'xlsx'].includes(ext || '')) return <FileExcelOutlined style={{ color: '#52c41a' }} />;
    return <FileOutlined />;
  };

  const openModal = (record?: ProductDocument) => {
    if (record) {
      setEditingDocument(record);
      form.setFieldsValue({
        ...record,
        status: record.status === 1,
      });
      setFileList(record.file_url ? [{
        uid: '-1',
        name: record.file_url.split('/').pop() || 'document',
        status: 'done',
        url: record.file_url,
        response: { url: record.file_url },
      }] : []);
    } else {
      setEditingDocument(null);
      form.resetFields();
      form.setFieldsValue({ status: true, language: 'zh-CN' });
      setFileList([]);
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const fileUrl = fileList.length > 0 && fileList[0].status === 'done'
        ? (fileList[0].response?.url || fileList[0].url)
        : undefined;

      if (!fileUrl) {
        message.error('请上传文件或输入文件URL');
        return;
      }

      const payload = {
        ...values,
        file_url: fileUrl,
        status: values.status ? 1 : 0,
      };

      if (editingDocument) {
        await ProductDocumentApi.update(editingDocument.id, payload);
        message.success('更新成功');
      } else {
        await ProductDocumentApi.create(payload);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchDocuments(pagination.current);
    } catch (error: any) {
      message.error(error?.message || '保存失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await ProductDocumentApi.delete(id);
      message.success('删除成功');
      fetchDocuments(pagination.current);
    } catch (error) {
      message.error('删除失败');
    }
  };

  const customUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/admin/upload/file', formData);
      const data = response.data;
      if (data.code === 200) {
        setFileList([{
          uid: file.uid,
          name: file.name,
          status: 'done',
          url: data.data.url || data.data,
          response: data.data,
        }]);
        onSuccess?.(data.data);
      } else {
        onError?.(new Error(data.message));
      }
    } catch (error) {
      onError?.(error);
    }
  };

  const columns = [
    {
      title: '文档标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: ProductDocument) => (
        <Space>
          {getFileIcon(record.file_url)}
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '文档类型',
      dataIndex: 'doc_type',
      key: 'doc_type',
      render: (type: DocType) => {
        const option = DOC_TYPE_OPTIONS.find(o => o.value === type);
        return <Tag color="blue">{option?.label || type}</Tag>;
      },
    },
    {
      title: '语言',
      dataIndex: 'language',
      key: 'language',
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      render: (text?: string) => text || '-',
    },
    {
      title: '关联系列',
      dataIndex: 'series_id',
      key: 'series_id',
      render: (id?: number) => {
        const s = seriesList.find(item => item.id === id);
        return s ? s.series_name : (id ? `ID:${id}` : '-');
      },
    },
    {
      title: '关联型号',
      dataIndex: 'model_id',
      key: 'model_id',
      render: (id?: number) => {
        const m = models.find(item => item.id === id);
        return m ? m.model_code : (id ? `ID:${id}` : '-');
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => (
        <Tag color={status === 1 ? 'success' : 'default'}>
          {status === 1 ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ProductDocument) => (
        <Space>
          {record.file_url && (
            <Button type="link" icon={<EyeOutlined />} onClick={() => window.open(record.file_url, '_blank')}>
              查看
            </Button>
          )}
          <Button type="link" icon={<EditOutlined />} onClick={() => openModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除该文档吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">产品文档管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          新增文档
        </Button>
      </div>

      <Card className="mb-4">
        <Space>
          <Search
            placeholder="搜索文档标题"
            allowClear
            enterButton="搜索"
            onSearch={handleSearch}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          <Select
            placeholder="文档类型"
            allowClear
            style={{ width: 180 }}
            onChange={(val) => { setDocType(val); fetchDocuments(1); }}
          >
            {DOC_TYPE_OPTIONS.map(o => (
              <Option key={o.value} value={o.value}>{o.label}</Option>
            ))}
          </Select>
          <Button onClick={() => {
            setSearchKeyword('');
            setDocType('');
            fetchDocuments(1);
          }}>重置</Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={documents}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: handlePageChange,
          }}
        />
      </Card>

      <Modal
        title={editingDocument ? '编辑文档' : '新增文档'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        width={700}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="title"
            label="文档标题"
            rules={[{ required: true, message: '请输入文档标题' }]}
          >
            <Input placeholder="请输入文档标题" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="doc_type"
              label="文档类型"
              rules={[{ required: true, message: '请选择文档类型' }]}
            >
              <Select placeholder="请选择文档类型">
                {DOC_TYPE_OPTIONS.map(o => (
                  <Option key={o.value} value={o.value}>{o.label}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="language"
              label="语言"
              rules={[{ required: true, message: '请输入语言' }]}
            >
              <Select placeholder="请选择语言">
                <Option value="zh-CN">简体中文</Option>
                <Option value="en-US">English</Option>
                <Option value="ja-JP">日本語</Option>
                <Option value="ko-KR">한국어</Option>
              </Select>
            </Form.Item>

            <Form.Item name="series_id" label="关联系列">
              <Select placeholder="请选择系列" allowClear showSearch optionFilterProp="children">
                {seriesList.map((s: any) => (
                  <Option key={s.id} value={s.id}>{s.series_name}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="model_id" label="关联型号">
              <Select placeholder="请选择型号" allowClear showSearch optionFilterProp="children">
                {models.map((m: any) => (
                  <Option key={m.id} value={m.id}>{m.model_code} - {m.model_name}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="version" label="版本号">
              <Input placeholder="如：V1.2" />
            </Form.Item>

            <Form.Item name="file_size" label="文件大小">
              <Input placeholder="如：2.5MB" />
            </Form.Item>
          </div>

          <Form.Item
            label="上传文件"
            required
            extra="支持PDF、Word、Excel等格式"
          >
            <Upload
              fileList={fileList}
              onChange={({ fileList: fl }) => setFileList(fl)}
              customRequest={customUpload}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>点击上传</Button>
            </Upload>
          </Form.Item>

          <Form.Item name="status" label="状态" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
