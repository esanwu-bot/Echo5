'use client';

import React, { useState, useEffect } from 'react';
import {
    Card,
    Form,
    Input,
    Button,
    Space,
    message,
    Tag,
    Spin,
} from 'antd';
import {
    SaveOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
} from '@ant-design/icons';
import {
    getTranslateConfig,
    updateTranslateConfig,
} from '@/lib/api/translate-config';

export default function TranslateConfigPage() {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [isConfigured, setIsConfigured] = useState(false);

    // Fetch current configuration
    const fetchConfig = async () => {
        setLoading(true);
        try {
            const response = await getTranslateConfig();
            if (response.code === 200) {
                setIsConfigured(response.data.is_configured);
                form.setFieldsValue({
                    volc_access_key_id: response.data.volc_access_key_id,
                    volc_secret_access_key: response.data.volc_secret_access_key,
                });
            } else {
                message.error(response.message || '获取配置失败');
            }
        } catch (error) {
            message.error('获取配置失败');
            console.error('Error fetching config:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    // Handle form submission
    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            const response = await updateTranslateConfig({
                volc_access_key_id: values.volc_access_key_id,
                volc_secret_access_key: values.volc_secret_access_key,
            });

            if (response.code === 200) {
                message.success('配置保存成功');
                fetchConfig();
            } else {
                message.error(response.message || '配置保存失败');
            }
        } catch (error: any) {
            message.error(error.message || '配置保存失败');
            console.error('Error saving config:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <Card
                title="火山引擎翻译配置"
                extra={
                    <Space>
                        {isConfigured && (
                            <Tag color="success" icon={<CheckCircleOutlined />}>
                                已配置
                            </Tag>
                        )}
                        {!isConfigured && (
                            <Tag color="warning" icon={<CloseCircleOutlined />}>
                                未配置
                            </Tag>
                        )}
                    </Space>
                }
            >
                <Spin spinning={loading}>
                    <Form form={form} layout="vertical" name="volc_config_form">
                        <Form.Item
                            name="volc_access_key_id"
                            label="Access Key ID"
                            rules={[{ required: true, message: '请输入 Access Key ID' }]}
                        >
                            <Input placeholder="输入火山引擎 Access Key ID" />
                        </Form.Item>

                        <Form.Item
                            name="volc_secret_access_key"
                            label="Secret Access Key"
                            rules={[{ required: true, message: '请输入 Secret Access Key' }]}
                        >
                            <Input.Password
                                placeholder="输入火山引擎 Secret Access Key"
                                autoComplete="new-password"
                            />
                        </Form.Item>

                        <Form.Item>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                onClick={handleSave}
                                loading={loading}
                            >
                                保存配置
                            </Button>
                        </Form.Item>
                    </Form>
                </Spin>
            </Card>
        </div>
    );
}
