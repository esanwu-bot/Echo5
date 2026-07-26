import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Space, Upload, message, Switch, InputNumber, Row, Col, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined, EyeOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';

const { TextArea } = Input;
const { Text } = Typography;

interface JsonArrayEditorProps {
    value?: any[];
    onChange?: (value: any[]) => void;
}

const JsonArrayEditor: React.FC<JsonArrayEditorProps> = ({ value = [], onChange }) => {
    const [items, setItems] = useState<any[]>(Array.isArray(value) ? value : []);

    useEffect(() => {
        if (Array.isArray(value)) {
            setItems(value);
        }
    }, [value]);

    const triggerChange = (newItems: any[]) => {
        setItems(newItems);
        if (onChange) {
            onChange(newItems);
        }
    };

    const handleAddItem = () => {
        const newItem = {
            title: '',
            description: '',
            image: '',
            sort: items.length + 1,
            status: 1
        };
        triggerChange([...items, newItem]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        triggerChange(newItems);
    };

    const handleItemChange = (index: number, field: string, val: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: val };
        triggerChange(newItems);
    };

    const getUploadProps = (index: number): UploadProps => ({
        name: 'file',
        action: '/api/upload',
        showUploadList: false,
        onChange(info) {
            if (info.file.status === 'done') {
                message.success(`${info.file.name} 上传成功`);
                const url = info.file.response.url;
                handleItemChange(index, 'image', url);
            } else if (info.file.status === 'error') {
                message.error(`${info.file.name} 上传失败`);
            }
        },
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {items.map((item, index) => (
                <Card
                    key={index}
                    size="small"
                    title={`项目 ${index + 1}`}
                    extra={
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemoveItem(index)}
                        />
                    }
                    style={{ background: '#f9f9f9' }}
                >
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Row gutter={16} align="middle">
                            <Col span={4}>
                                <Text type="secondary">图片:</Text>
                            </Col>
                            <Col span={20}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    {item.image && (
                                        <img
                                            src={item.image}
                                            alt="preview"
                                            style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #eee' }}
                                        />
                                    )}
                                    <Upload {...getUploadProps(index)}>
                                        <Button icon={<UploadOutlined />}>上传图片</Button>
                                    </Upload>
                                    {item.image && (
                                        <Input
                                            style={{ width: 200 }}
                                            value={item.image}
                                            onChange={(e) => handleItemChange(index, 'image', e.target.value)}
                                            placeholder="图片地址"
                                        />
                                    )}
                                </div>
                            </Col>
                        </Row>

                        <Row gutter={16} align="middle">
                            <Col span={4}>
                                <Text type="secondary">标题:</Text>
                            </Col>
                            <Col span={20}>
                                <Input
                                    value={item.title}
                                    onChange={(e) => handleItemChange(index, 'title', e.target.value)}
                                    placeholder="标题"
                                />
                            </Col>
                        </Row>

                        <Row gutter={16} align="top">
                            <Col span={4}>
                                <Text type="secondary">描述:</Text>
                            </Col>
                            <Col span={20}>
                                <TextArea
                                    value={item.description}
                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                    placeholder="描述"
                                    rows={2}
                                />
                            </Col>
                        </Row>

                        <Row gutter={16} align="middle">
                            <Col span={4}>
                                <Text type="secondary">排序:</Text>
                            </Col>
                            <Col span={8}>
                                <InputNumber
                                    value={item.sort}
                                    onChange={(val) => handleItemChange(index, 'sort', val)}
                                    style={{ width: '100%' }}
                                />
                            </Col>
                            <Col span={4} style={{ textAlign: 'right' }}>
                                <Text type="secondary">状态:</Text>
                            </Col>
                            <Col span={8}>
                                <Switch
                                    checked={item.status === 1}
                                    onChange={(checked) => handleItemChange(index, 'status', checked ? 1 : 0)}
                                    checkedChildren="显示"
                                    unCheckedChildren="隐藏"
                                />
                            </Col>
                        </Row>
                    </Space>
                </Card>
            ))}

            <Button type="dashed" onClick={handleAddItem} icon={<PlusOutlined />} block>
                添加项目
            </Button>
        </div>
    );
};

export default JsonArrayEditor;
