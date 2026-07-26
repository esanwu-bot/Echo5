// 多语言管理 - 翻译词条管理页面
// 对标 CRMEB pages/setting/multiLanguage/langList.vue
// 集成火山引擎机器翻译
import { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Popconfirm, Card, Select, Row, Col, Spin, Divider } from 'antd';
import { PlusOutlined, TranslationOutlined } from '@ant-design/icons';
import { getLangCodes, getLangCodeInfo, saveLangCode, deleteLangCode, translateText, batchDeleteLangCodes } from '../../lib/api/lang-code';

export default function LangCodesPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [langType, setLangType] = useState({ isAdmin: [], langType: [] });
  const [form] = Form.useForm();
  const [searchForm, setSearchForm] = useState({ lang_code: '', module: '', business_id: '', remarks: '' });
  const [moduleOptions, setModuleOptions] = useState([]);
  const [langCodeOptions, setLangCodeOptions] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // 翻译词条表单
  const [langFormData, setLangFormData] = useState({
    is_admin: 1,
    code: '',
    remarks: '',
    module: '',
    business_id: undefined,
    edit: 0,
    list: [],
  });

  const fetchList = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.pageSize };
      if (searchForm.lang_code) params.lang_code = searchForm.lang_code;
      if (searchForm.module) params.module = searchForm.module;
      if (searchForm.business_id) params.business_id = searchForm.business_id;
      if (searchForm.remarks) params.remarks = searchForm.remarks;
      const res = await getLangCodes(params);
      if (res.code === 200) {
        setList(res.data.list);
        setPagination(prev => ({ ...prev, current: page, total: res.data.count }));
        if (res.data.moduleOptions) setModuleOptions(res.data.moduleOptions);
        if (res.data.langCodeOptions) setLangCodeOptions(Array.from(new Set(res.data.langCodeOptions)));
        if (res.data.langType) setLangType(res.data.langType);
      } else {
        message.error(res.message || '获取列表失败');
      }
    } catch (err) {
      message.error('获取列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  // 搜索
  const handleSearch = () => { setPagination(prev => ({ ...prev, current: 1 })); fetchList(1); };

  // 重置
  const handleReset = () => {
    setSearchForm({ lang_code: '', module: '', business_id: '', remarks: '' });
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchList(1);
  };

  // 新增词条
  const handleAdd = () => {
    const typeList = (langType.langType || []).map((t) => ({
      language_name: t.title || t.language_name || '',
      lang_explain: '',
      type_id: t.value || t.id || 0,
    }));
    setLangFormData({
      is_admin: 1,
      code: '',
      remarks: '',
      module: '',
      business_id: undefined,
      edit: 0,
      list: typeList.length ? typeList : [
        { language_name: '中文(zh-CN)', lang_explain: '', type_id: 1 },
        { language_name: 'English(en-US)', lang_explain: '', type_id: 2 },
        { language_name: '日本語(ja-JP)', lang_explain: '', type_id: 3 },
        { language_name: '한국어(ko-KR)', lang_explain: '', type_id: 4 },
      ],
    });
    setIsModalVisible(true);
  };

  // 编辑词条
  const handleEdit = async (row) => {
    try {
      const res = await getLangCodeInfo(row.code);
      if (res.code === 200) {
        setLangFormData({
          is_admin: 1,
          code: res.data.code,
          remarks: res.data.remarks,
          module: res.data.module || '',
          business_id: res.data.business_id,
          edit: 1,
          list: res.data.list,
        });
        setIsModalVisible(true);
      } else {
        message.error(res.message || '获取词条详情失败');
      }
    } catch (err) {
      message.error('获取词条详情失败');
    }
  };

  // 机器翻译
  const handleTranslate = async () => {
    if (!langFormData.remarks.trim()) {
      message.warning('请先输入需要翻译的语句');
      return;
    }
    setTranslateLoading(true);
    try {
      const res = await translateText(langFormData.remarks);
      if (res.code === 200) {
        const newList = langFormData.list.map((e) => {
          // 从 language_name 中提取语言代码，如 "中文(zh-CN)" -> "zh-CN"
          const match = e.language_name.match(/\(([^)]+)\)/);
          const langCode = match ? match[1] : e.language_name;
          return {
            ...e,
            lang_explain: res.data[langCode] || e.lang_explain,
          };
        });
        setLangFormData(prev => ({ ...prev, list: newList }));
        message.success('翻译成功');
      } else {
        message.error(res.message || '翻译失败');
      }
    } catch (err) {
      message.error('翻译失败，请检查火山翻译配置');
    } finally {
      setTranslateLoading(false);
    }
  };

  // 保存词条
  const handleSave = async () => {
    if (!langFormData.remarks.trim()) {
      message.error('请先输入备注标识');
      return;
    }
    try {
      const res = await saveLangCode(langFormData);
      if (res.code === 200) {
        message.success('翻译词条保存成功');
        setIsModalVisible(false);
        fetchList(pagination.current);
      } else {
        message.error(res.message || '保存失败');
      }
    } catch (err) {
      message.error('保存失败');
    }
  };

  // 删除词条
  const handleDelete = async (code) => {
    try {
      const res = await deleteLangCode(code);
      if (res.code === 200) {
        message.success('删除成功');
        fetchList(list.length === 1 && pagination.current > 1 ? pagination.current - 1 : pagination.current);
      } else {
        message.error(res.message || '删除失败');
      }
    } catch (err) {
      message.error('删除失败');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的词条');
      return;
    }
    try {
      const res = await batchDeleteLangCodes(selectedRowKeys);
      if (res.code === 200) {
        message.success(`成功删除 ${selectedRowKeys.length} 条词条`);
        setSelectedRowKeys([]);
        fetchList(pagination.current);
      } else {
        message.error(res.message || '批量删除失败');
      }
    } catch (err) {
      message.error('批量删除失败');
    }
  };

  const columns = [
    { title: '编号', dataIndex: 'id', key: 'id', width: 70 },
    {
      title: '字段', dataIndex: 'remarks', key: 'remarks', width: 180,
      render: (text) => <strong>{text}</strong>
    },
    {
      title: '翻译内容', dataIndex: 'lang_explain', key: 'lang_explain', width: 200,
      ellipsis: true
    },
    {
      title: '模块', dataIndex: 'module', key: 'module', width: 100,
      render: (text) => text || '-'
    },
    {
      title: '业务ID', dataIndex: 'business_id', key: 'business_id', width: 80
    },
    {
      title: '调用码', dataIndex: 'code', key: 'code', width: 160,
      render: (text) => <code style={{ fontSize: 12 }}>{text}</code>
    },
    {
      title: '语言类型', dataIndex: 'language_name', key: 'language_name', width: 100
    },
    {
      title: '操作', key: 'action', width: 150, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="删除词条" description="确定删除该翻译词条吗？" onConfirm={() => handleDelete(record.code)}
            okText="确定" cancelText="取消">
            <Button type="link" danger size="small">删除</Button>
          </Popconfirm>
        </Space>
      )
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="翻译词条管理"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增词条</Button>}
      >
        {/* 搜索栏 */}
        <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
          <Col style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>模块：</span>
            <Select allowClear value={searchForm.module || undefined}
              onChange={(v) => setSearchForm(s => ({ ...s, module: v || '' }))}
              style={{ width: 160 }} options={moduleOptions.map(m => ({ label: m, value: m }))}
              placeholder="全部模块" />
          </Col>
          <Col style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>语言：</span>
            <Select allowClear value={searchForm.lang_code || undefined}
              onChange={(v) => setSearchForm(s => ({ ...s, lang_code: v || '' }))}
              style={{ width: 160 }} options={langCodeOptions.map(l => ({ label: l, value: l }))}
              placeholder="全部语言" />
          </Col>
          <Col style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>业务ID：</span>
            <Input placeholder="业务ID" value={searchForm.business_id}
              onChange={(e) => setSearchForm(s => ({ ...s, business_id: e.target.value }))}
              onPressEnter={handleSearch} style={{ width: 120 }} />
          </Col>
          <Col style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>关键词：</span>
            <Input.Search placeholder="搜索备注" value={searchForm.remarks}
              onChange={(e) => setSearchForm(s => ({ ...s, remarks: e.target.value }))}
              onSearch={handleSearch} style={{ width: 200 }} />
          </Col>
          <Col>
            <Button onClick={handleReset}>重置</Button>
          </Col>
          {selectedRowKeys.length > 0 && (
            <Col>
              <Popconfirm
                title="批量删除"
                description={`确定删除选中的 ${selectedRowKeys.length} 条词条吗？`}
                onConfirm={handleBatchDelete}
                okText="确定"
                cancelText="取消"
              >
                <Button danger>批量删除 ({selectedRowKeys.length})</Button>
              </Popconfirm>
            </Col>
          )}
        </Row>

        <Table
          columns={columns}
          dataSource={list}
          loading={loading}
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page) => fetchList(page),
            onShowSizeChange: (current, size) => {
              setPagination(prev => ({ ...prev, pageSize: size }));
              fetchList(current);
            }
          }}
        />
      </Card>

      {/* 新增/编辑翻译词条 Modal */}
      <Modal
        title={langFormData.edit ? '编辑翻译词条' : '新增翻译词条'}
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={handleSave}
        width={750}
        okText="保存"
        cancelText="取消"
      >
        <Form layout="vertical">
          <Form.Item label="应用端">
            <Select value={langFormData.is_admin} onChange={(v) => setLangFormData(prev => ({ ...prev, is_admin: v }))}
              options={langType.isAdmin} style={{ width: 140 }} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="模块">
                <Select
                  allowClear
                  value={langFormData.module || undefined}
                  onChange={(v) => setLangFormData(prev => ({ ...prev, module: v || '' }))}
                  style={{ width: '100%' }}
                  options={moduleOptions.map(m => ({ label: m, value: m }))}
                  placeholder="请选择模块"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="业务ID">
                <Input
                  type="number"
                  value={langFormData.business_id}
                  onChange={(e) => setLangFormData(prev => ({ ...prev, business_id: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="请输入业务ID"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="需要翻译的语句（中文标识）" required>
            <Input.Search
              value={langFormData.remarks}
              onChange={(e) => setLangFormData(prev => ({ ...prev, remarks: e.target.value }))}
              placeholder="请输入需要翻译的中文语句"
              enterButton={<><TranslationOutlined /> 机器翻译</>}
              onSearch={handleTranslate}
              loading={translateLoading}
            />
          </Form.Item>

          <Divider />

          <Spin spinning={translateLoading}>
            <Table
              dataSource={langFormData.list}
              rowKey="type_id"
              pagination={false}
              size="small"
              columns={[
                {
                  title: '语言类型', dataIndex: 'language_name', key: 'language_name', width: 140,
                },
                {
                  title: '对应语言翻译', dataIndex: 'lang_explain', key: 'lang_explain',
                  render: (text, record) => (
                    <Input
                      value={text}
                      onChange={(e) => {
                        const newList = langFormData.list.map((item) =>
                          item.type_id === record.type_id ? { ...item, lang_explain: e.target.value } : item
                        );
                        setLangFormData(prev => ({ ...prev, list: newList }));
                      }}
                      placeholder="请输入翻译内容"
                    />
                  )
                },
              ]}
            />
          </Spin>
        </Form>
      </Modal>
    </div>
  );
}
