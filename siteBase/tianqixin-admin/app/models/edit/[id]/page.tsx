'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Form, Input, Select, Switch, message, Upload, Space, Tabs } from 'antd';
import { UploadOutlined, PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';

const { Option } = Select;
const { TabPane } = Tabs;

import ModelApi from '../../../../lib/api/model';
import SeriesApi from '../../../../lib/api/series';
import ModelParamValApi from '../../../../lib/api/modelParamVal';
import { apiClient } from '../../../../lib/api/client';

// 型号编辑页面
export default function ModelEditPage() {
  const router = useRouter();
  const params = useParams();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const isEditMode = !!id;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [technicalSpecs, setTechnicalSpecs] = useState<Array<{ name: string; value: string; unit: string }>>([{ name: '', value: '', unit: '' }]);

  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [modelParamVals, setModelParamVals] = useState<any[]>([]);
  const [allAttributes, setAllAttributes] = useState<any[]>([]);
  const [paramValLoading, setParamValLoading] = useState(false);

  // 获取基础数据（分类、品牌、系列、参数定义）
  const fetchBasicData = async () => {
    try {
      const [categoriesData, brandsData, seriesData, attrResponse] = await Promise.all([
        ModelApi.getCategories(),
        ModelApi.getBrands(),
        SeriesApi.getList({ pageSize: 1000 }),
        apiClient.get('/admin/attributes'),
      ]);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setBrands(Array.isArray(brandsData) ? brandsData : []);
      setSeriesList(seriesData.list || []);

      const attrData = attrResponse.data?.data;
      const attributes = Array.isArray(attrData)
        ? attrData
        : attrData?.list || attrData?.items || [];
      setAllAttributes(attributes);
    } catch (error) {
      console.error('Failed to fetch basic data:', error);
      message.error('获取基础数据失败');
    }
  };

  // 获取型号详情
  const fetchModelDetail = async () => {
    if (!isEditMode) return;

    setLoading(true);
    try {
      const data = await ModelApi.getModelById(Number(id));
      form.setFieldsValue({
        ...data,
        status: data.status === 1
      });
      // Parse technical specs if it's a string (JSON) or use as is if array
      let specs = [];
      if (typeof data.technical_specs === 'string') {
        try {
          specs = JSON.parse(data.technical_specs);
        } catch (e) {
          specs = [];
        }
      } else if (Array.isArray(data.technical_specs)) {
        specs = data.technical_specs;
      }

      if (specs.length === 0) {
        specs = [{ name: '', value: '', unit: '' }];
      }
      setTechnicalSpecs(specs);

      // 加载型号参数值
      await fetchModelParamVals(Number(id));

      message.success('获取型号详情成功');
    } catch (error) {
      message.error('获取型号详情失败');
      console.error('Failed to fetch model detail:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取型号参数值
  const fetchModelParamVals = async (modelId: number) => {
    setParamValLoading(true);
    try {
      const items = await ModelParamValApi.getByModel(modelId);
      setModelParamVals(items || []);
    } catch (error) {
      console.error('Failed to fetch model param vals:', error);
    } finally {
      setParamValLoading(false);
    }
  };

  useEffect(() => {
    fetchBasicData();
    if (isEditMode) {
      fetchModelDetail();
    }
  }, [id, isEditMode]);

  // 添加技术规格
  const handleAddSpec = () => {
    setTechnicalSpecs([...technicalSpecs, { name: '', value: '', unit: '' }]);
  };

  // 删除技术规格
  const handleRemoveSpec = (index: number) => {
    const newSpecs = [...technicalSpecs];
    newSpecs.splice(index, 1);
    setTechnicalSpecs(newSpecs);
  };

  // 更新技术规格
  const handleUpdateSpec = (index: number, field: string, value: string) => {
    const newSpecs = [...technicalSpecs];
    newSpecs[index] = { ...newSpecs[index], [field]: value };
    setTechnicalSpecs(newSpecs);
  };

  // 更新型号参数值
  const handleUpdateParamVal = (paramId: number, value: string, valueNumeric?: number | null) => {
    setModelParamVals(prev => {
      const existing = prev.find(item => item.param_id === paramId);
      if (existing) {
        return prev.map(item =>
          item.param_id === paramId
            ? { ...item, value, value_numeric: valueNumeric }
            : item
        );
      }
      const param = allAttributes.find((a: any) => a.id === paramId);
      return [...prev, {
        param_id: paramId,
        value,
        value_numeric: valueNumeric,
        param,
      }];
    });
  };

  // 保存型号
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const data = {
        ...values,
        technical_specs: JSON.stringify(technicalSpecs.filter(spec => spec.name && spec.value)),
        status: values.status ? 1 : 0
      };

      let res: any;
      if (isEditMode) {
        res = await ModelApi.updateModel(Number(id), data);
      } else {
        res = await ModelApi.createModel(data);
      }

      // ModelApi 返回的是 response.data.data，如果 res 存在则表示成功
      if (res !== undefined && res !== null) {
        const modelId = isEditMode ? Number(id) : res.id;

        // 保存型号参数值（仅当存在有效参数时）
        const validParams = modelParamVals
          .filter(item => item.param_id && item.value !== undefined && item.value !== null && item.value !== '')
          .map(item => ({
            param_id: item.param_id,
            value: item.value,
            value_numeric: item.value_numeric ?? null,
          }));

        if (modelId && validParams.length > 0) {
          try {
            await ModelParamValApi.batchSave(modelId, validParams);
          } catch (paramError) {
            console.error('Failed to save model param vals:', paramError);
            message.warning('型号保存成功，但参数值保存失败');
          }
        }

        message.success('保存成功');
        router.push('/models');
      } else {
        message.error('保存失败，服务器返回异常');
        // 失败时保持当前页面
      }
    } catch (error: any) {
      message.error(error?.message || (isEditMode ? '更新型号失败' : '新增型号失败'));
      console.error('Failed to save model:', error);
      // 失败时保持当前页面，不跳转
    } finally {
      setLoading(false);
    }
  };

  const tabItems = [
    {
      key: '1',
      label: '基本信息',
      children: (
        <Form
          form={form}
          layout="vertical"
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="model_code"
              label="型号编码"
              rules={[{ required: true, message: '请输入型号编码' }]}
            >
              <Input placeholder="请输入型号编码" />
            </Form.Item>

            <Form.Item
              name="model_name"
              label="型号名称"
              rules={[{ required: true, message: '请输入型号名称' }]}
            >
              <Input placeholder="请输入型号名称" />
            </Form.Item>

            <Form.Item
              name="category_id"
              label="分类"
              rules={[{ required: true, message: '请选择分类' }]}
            >
              <Select placeholder="请选择分类">
                {categories.map(category => (
                  <Option key={category.id} value={category.id}>
                    {category.category_name || category.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="brand_id"
              label="品牌"
              rules={[{ required: true, message: '请选择品牌' }]}
            >
              <Select placeholder="请选择品牌">
                {brands.map(brand => (
                  <Option key={brand.id} value={brand.id}>
                    {brand.brand_name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="series_id"
              label="所属系列"
            >
              <Select placeholder="请选择所属系列" allowClear showSearch optionFilterProp="children">
                {seriesList.map(series => (
                  <Option key={series.id} value={series.id}>{series.series_name}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="package_type"
              label="封装类型"
            >
              <Input placeholder="请输入封装类型" />
            </Form.Item>

            <Form.Item
              name="datasheet_url"
              label="数据手册链接"
            >
              <Input placeholder="请输入数据手册链接" />
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
            name="description"
            label="描述"
          >
            <Input.TextArea rows={4} placeholder="请输入型号描述" />
          </Form.Item>
        </Form>
      ),
    },
    {
      key: '2',
      label: '技术规格',
      children: (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">技术规格</h3>
          <div className="space-y-4">
            {technicalSpecs.map((spec, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Input
                  placeholder="规格名称"
                  value={spec.name}
                  onChange={(e) => handleUpdateSpec(index, 'name', e.target.value)}
                  className="w-32"
                />
                <Input
                  placeholder="规格值"
                  value={spec.value}
                  onChange={(e) => handleUpdateSpec(index, 'value', e.target.value)}
                  className="w-32"
                />
                <Input
                  placeholder="单位"
                  value={spec.unit}
                  onChange={(e) => handleUpdateSpec(index, 'unit', e.target.value)}
                  className="w-16"
                />
                {technicalSpecs.length > 1 && (
                  <MinusCircleOutlined
                    className="text-red-500 cursor-pointer"
                    onClick={() => handleRemoveSpec(index)}
                  />
                )}
              </div>
            ))}
            <Button type="dashed" onClick={handleAddSpec} icon={<PlusOutlined />}>
              添加技术规格
            </Button>
          </div>
        </div>
      ),
    },
    {
      key: '3',
      label: '型号参数值',
      children: (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">型号参数值（基于参数定义）</h3>
          {allAttributes.length === 0 ? (
            <div style={{ padding: '20px', color: '#999' }}>暂无参数定义，请先前往「分类属性」创建参数</div>
          ) : (
            <div className="space-y-4">
              {allAttributes.map((attr: any) => {
                const existing = modelParamVals.find((item: any) => item.param_id === attr.id);
                const value = existing ? existing.value : '';
                const numericValue = existing ? existing.value_numeric : undefined;
                return (
                  <div key={attr.id} className="grid grid-cols-3 gap-4 items-center">
                    <div className="text-right pr-2">
                      {attr.name}
                      {attr.unit ? ` (${attr.unit})` : ''}
                    </div>
                    <Input
                      placeholder="请输入参数值"
                      value={value}
                      onChange={(e) => handleUpdateParamVal(attr.id, e.target.value, numericValue)}
                    />
                    <Input
                      placeholder="数值化值（可选）"
                      value={numericValue !== undefined && numericValue !== null ? numericValue : ''}
                      onChange={(e) => {
                        const num = e.target.value === '' ? null : Number(e.target.value);
                        handleUpdateParamVal(attr.id, value, num);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          {isEditMode ? '编辑型号' : '新增型号'}
        </h1>
        <div className="flex space-x-2">
          <Button onClick={() => router.push('/models')}>
            返回列表
          </Button>
          <Button type="primary" loading={loading} onClick={handleSave}>
            保存
          </Button>
        </div>
      </div>

      <Card>
        <Tabs defaultActiveKey="1" items={tabItems} />
      </Card>
    </div>
  );
}
