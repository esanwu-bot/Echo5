import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Switch, InputNumber, Upload, Image, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import DynamicFieldEditor from '../../../components/DynamicFieldEditor';
import { API_BASE_URL } from "../../../lib/api/config";
import { getLocalStorage } from "../../../lib/utils";

interface DataModalProps {
    visible: boolean;
    project: any;
    data: any;
    onCancel: () => void;
    onSubmit: (values: any) => void;
}

const DataModal: React.FC<DataModalProps> = ({ visible, project, data, onCancel, onSubmit }) => {
    const [form] = Form.useForm();
    const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            if (data) {
                form.setFieldsValue({
                    ...data.field_values,
                    status: data.status,
                    sort_order: data.sort_order
                });
                // Initialize image URLs for editing mode
                const urls: Record<string, string> = {};
                project?.fields?.forEach((field: any) => {
                    if (field.type === 'image' && data.field_values?.[field.code]) {
                        urls[field.code] = data.field_values[field.code];
                    }
                });
                setImageUrls(urls);
            } else {
                form.resetFields();
                form.setFieldsValue({
                    status: 1,
                    sort_order: 0
                });
                setImageUrls({});
            }
        }
    }, [visible, data, form, project]);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            onSubmit(values);
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    const renderField = (field: any) => {
        // Map field types to DynamicFieldEditor or standard inputs
        // Note: DynamicFieldEditor might need adjustment if it doesn't support all types directly
        // For now, we'll implement basic mapping here or reuse DynamicFieldEditor if suitable

        // Since DynamicFieldEditor takes fieldName, it might be tied to specific logic. 
        // Let's implement direct mapping for better control as per the new requirement.

        const commonProps = {
            placeholder: `请输入${field.name}`
        };

        switch (field.type) {
            case 'text':
                return <DynamicFieldEditor fieldType="text" {...commonProps} />;
            case 'textarea':
                return <DynamicFieldEditor fieldType="textarea" {...commonProps} />;
            case 'number':
                return <InputNumber style={{ width: '100%' }} {...commonProps} />;
            case 'select':
                return (
                    <Select {...commonProps}>
                        {field.options?.split(',').map((opt: string) => (
                            <Select.Option key={opt} value={opt}>{opt}</Select.Option>
                        ))}
                    </Select>
                );
            case 'switch':
                return <Switch />;
            case 'image':
                // Use DynamicFieldEditor's image logic or a simple Upload
                // Assuming DynamicFieldEditor has a generic image editor or we use a custom one
                // For simplicity, let's try to use a generic ImageUpload component if available, 
                // or fallback to Input for URL if not. 
                // Actually, let's use DynamicFieldEditor for complex types if possible.
                return <DynamicFieldEditor fieldName="image" />;
            default:
                return <DynamicFieldEditor fieldType="text" {...commonProps} />;
        }
    };

    return (
        <Modal
            title={data ? '编辑数据' : '添加数据'}
            open={visible}
            onCancel={onCancel}
            onOk={handleOk}
            width={600}
        >
            <Form
                form={form}
                layout="vertical"
            >
                {project?.fields?.map((field: any) => (
                    <Form.Item
                        key={field.code}
                        name={field.code}
                        label={field.name}
                        rules={[{ required: field.required === 1, message: `请${field.type === 'image' ? '上传' : '输入'}${field.name}` }]}
                        valuePropName={field.type === 'switch' ? 'checked' : 'value'}
                    >
                        {field.type === 'image' ? (
                            <div className="flex flex-col gap-2">
                                {(imageUrls[field.code] || form.getFieldValue(field.code)) && (
                                    <Image
                                        src={imageUrls[field.code] || form.getFieldValue(field.code)}
                                        alt={field.name}
                                        width={200}
                                        height={120}
                                        style={{ objectFit: 'cover' }}
                                    />
                                )}
                                <Upload
                                    showUploadList={false}
                                    action={`${API_BASE_URL}/admin/upload/image`}
                                    accept="image/*"
                                    headers={{
                                        'Authorization': `Bearer ${getLocalStorage()?.getItem('auth_token') || ''}`
                                    }}
                                    onChange={({ file }) => {
                                        if (file.status === 'done') {
                                            const url = (file.response as any)?.data?.url || (file.response as any)?.url;
                                            if (url) {
                                                setImageUrls(prev => ({ ...prev, [field.code]: url }));
                                                form.setFieldsValue({ [field.code]: url });
                                                message.success('上传成功');
                                            }
                                        } else if (file.status === 'error') {
                                            message.error('上传失败');
                                        }
                                    }}
                                >
                                    <Button icon={<UploadOutlined />}>上传图片</Button>
                                </Upload>
                            </div>
                        ) : (
                            renderField(field)
                        )}
                    </Form.Item>
                ))}

                <Form.Item
                    name="sort_order"
                    label="排序"
                >
                    <InputNumber style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                    name="status"
                    label="状态"
                    valuePropName="checked"
                    getValueFromEvent={(e) => e ? 1 : 0}
                >
                    <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default DataModal;
