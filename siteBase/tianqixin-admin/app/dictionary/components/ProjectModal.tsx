import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Button, Space, Table, Popconfirm, Row, Col, Card } from 'antd';
import { PlusOutlined, DeleteOutlined, MenuOutlined } from '@ant-design/icons';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const { Option } = Select;
const { TextArea } = Input;

interface ProjectModalProps {
    visible: boolean;
    project: any;
    onCancel: () => void;
    onSubmit: (values: any) => void;
}

interface FieldType {
    key: string;
    id?: number;
    name: string;
    code: string;
    type: string;
    options?: string;
    sort_order?: number;
}

// Sortable Row Component
const RowContext = React.createContext({});

const DragHandle = () => {
    const { setActivatorNodeRef, listeners } = React.useContext(RowContext) as any;
    return (
        <Button
            type="text"
            size="small"
            icon={<MenuOutlined style={{ cursor: 'grab', color: '#999' }} />}
            style={{ cursor: 'grab' }}
            ref={setActivatorNodeRef}
            {...listeners}
        />
    );
};

const SortableRow = (props: any) => {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
        id: props['data-row-key'],
    });

    const style: React.CSSProperties = {
        ...props.style,
        transform: CSS.Transform.toString(transform && { ...transform, scaleY: 1 }),
        transition,
        ...(isDragging ? { position: 'relative', zIndex: 9999 } : {}),
    };

    const contextValue = React.useMemo(
        () => ({ setActivatorNodeRef, listeners }),
        [setActivatorNodeRef, listeners],
    );

    return (
        <RowContext.Provider value={contextValue}>
            <tr {...props} ref={setNodeRef} style={style} {...attributes} />
        </RowContext.Provider>
    );
};

const ProjectModal: React.FC<ProjectModalProps> = ({ visible, project, onCancel, onSubmit }) => {
    const [form] = Form.useForm();
    const [fields, setFields] = useState<FieldType[]>([]);

    useEffect(() => {
        if (visible) {
            if (project) {
                form.setFieldsValue(project);
                // Map existing fields if available
                if (project.fields) {
                    setFields(project.fields.map((f: any, index: number) => ({
                        ...f,
                        key: f.id ? `id-${f.id}` : `temp-${index}`,
                        type: f.field_type || f.type // Handle field_type vs type
                    })));
                } else {
                    setFields([]);
                }
            } else {
                form.resetFields();
                setFields([]);
            }
        }
    }, [visible, project, form]);

    const handleAddField = () => {
        const newField: FieldType = {
            key: `temp-${Date.now()}`,
            name: '',
            code: '',
            type: 'text',
            sort_order: fields.length
        };
        setFields([...fields, newField]);
    };

    const handleRemoveField = (key: string) => {
        setFields(fields.filter(f => f.key !== key));
    };

    const handleFieldChange = (key: string, field: string, value: any) => {
        const newFields = fields.map(f => {
            if (f.key === key) {
                return { ...f, [field]: value };
            }
            return f;
        });
        setFields(newFields);
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            // Combine project values with fields
            const submitData = {
                ...values,
                fields: fields.map((f, index) => ({
                    ...f,
                    sort_order: index // Update sort order based on current list order
                }))
            };
            onSubmit(submitData);
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    // Drag and Drop handlers
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 1,
            },
        }),
    );

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        if (active.id !== over?.id) {
            setFields((prev) => {
                const activeIndex = prev.findIndex((i) => i.key === active.id);
                const overIndex = prev.findIndex((i) => i.key === over?.id);
                return arrayMove(prev, activeIndex, overIndex);
            });
        }
    };

    const columns = [
        {
            key: 'sort',
            width: 30,
            render: () => <DragHandle />,
        },
        {
            title: '字段名称',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: FieldType) => (
                <Input
                    value={text}
                    onChange={e => handleFieldChange(record.key, 'name', e.target.value)}
                    placeholder="字段名称"
                />
            )
        },
        {
            title: '字段编码',
            dataIndex: 'code',
            key: 'code',
            render: (text: string, record: FieldType) => (
                <Input
                    value={text}
                    onChange={e => handleFieldChange(record.key, 'code', e.target.value)}
                    placeholder="字段编码"
                />
            )
        },
        {
            title: '类型',
            dataIndex: 'type',
            key: 'type',
            width: 120,
            render: (text: string, record: FieldType) => (
                <Select
                    value={text}
                    onChange={value => handleFieldChange(record.key, 'type', value)}
                    style={{ width: '100%' }}
                >
                    <Option value="text">Input</Option>
                    <Option value="textarea">Textarea</Option>
                    <Option value="number">Number</Option>
                    <Option value="select">Select</Option>
                    <Option value="image">Image</Option>
                    <Option value="file">File</Option>
                    <Option value="date">Date</Option>
                    <Option value="switch">Switch</Option>
                </Select>
            )
        },
        {
            title: '配置',
            dataIndex: 'options',
            key: 'options',
            render: (text: string, record: FieldType) => {
                if (['select', 'radio', 'checkbox'].includes(record.type)) {
                    return (
                        <Input
                            value={text}
                            onChange={e => handleFieldChange(record.key, 'options', e.target.value)}
                            placeholder="选项(逗号分隔)"
                        />
                    );
                }
                return <span style={{ color: '#ccc' }}>无配置</span>;
            }
        },
        {
            title: '操作',
            key: 'action',
            width: 60,
            render: (_: any, record: FieldType) => (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveField(record.key)}
                />
            )
        }
    ];

    return (
        <Modal
            title={project ? '编辑组合数据' : '添加组合数据'}
            open={visible}
            onCancel={onCancel}
            onOk={handleOk}
            width={900}
            maskClosable={false}
        >
            <Form
                form={form}
                layout="vertical"
            >
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="name"
                            label="数据组名称"
                            rules={[{ required: true, message: '请输入名称' }]}
                        >
                            <Input placeholder="请输入数据组名称" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="code"
                            label="数据组KEY"
                            rules={[{ required: true, message: '请输入KEY' }]}
                        >
                            <Input placeholder="请输入数据组KEY" />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item
                    name="description"
                    label="简介"
                >
                    <TextArea rows={2} placeholder="请输入简介" />
                </Form.Item>

                <Form.Item
                    name="status"
                    label="状态"
                    initialValue={1}
                >
                    <Select>
                        <Option value={1}>开启</Option>
                        <Option value={0}>关闭</Option>
                    </Select>
                </Form.Item>

                <Card
                    title="字段配置"
                    size="small"
                    extra={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddField}>添加字段</Button>}
                    style={{ marginTop: 16 }}
                >
                    <DndContext sensors={sensors} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
                        <SortableContext items={fields.map((i) => i.key)} strategy={verticalListSortingStrategy}>
                            <Table
                                components={{
                                    body: {
                                        row: SortableRow,
                                    },
                                }}
                                rowKey="key"
                                columns={columns}
                                dataSource={fields}
                                pagination={false}
                                size="small"
                            />
                        </SortableContext>
                    </DndContext>
                </Card>

            </Form>
        </Modal>
    );
};

export default ProjectModal;
