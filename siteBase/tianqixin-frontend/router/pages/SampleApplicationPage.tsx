import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, Empty, List, Button, Tag, Progress, Typography } from 'antd';
import { EyeOutlined, MessageOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { userApi, getAuthToken } from '../../lib/api-client';

const { Paragraph } = Typography;

export function SampleApplicationPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [sampleApplications, setSampleApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSamples = async () => {
            const token = getAuthToken();
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const response = await userApi.getSampleApplications();
                if (response.code === 200) {
                    setSampleApplications(response.data.list);
                }
            } catch (error) {
                console.error('Failed to fetch sample applications:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSamples();
    }, [navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 pt-20">
                <div className="container mx-auto px-4 py-8 flex justify-center items-center h-64">
                    <div className="text-gray-600">{t('加载中...')}</div>
                </div>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'processing': 'blue',
            'shipped': 'orange',
            'completed': 'green',
            'cancelled': 'red'
        };
        return colors[status] || 'default';
    };

    const getStatusText = (status: string) => {
        const texts: Record<string, string> = {
            'processing': t('处理中'),
            'shipped': t('已发货'),
            'completed': t('已完成'),
            'cancelled': t('已取消')
        };
        return texts[status] || status;
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-20">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center mb-8">
                        <Button
                            icon={<ArrowLeftOutlined />}
                            onClick={() => navigate('/member')}
                            className="mr-4"
                        />
                        <h1 className="text-3xl font-bold text-gray-900">{t('样品申请记录')}</h1>
                    </div>

                    {sampleApplications.length === 0 ? (
                        <Card className="text-center py-12">
                            <Empty description={t('暂无样品申请记录')} />
                        </Card>
                    ) : (
                        <List
                            dataSource={sampleApplications}
                            renderItem={(item) => (
                                <List.Item className="border-none px-0">
                                    <Card
                                        className="w-full shadow-sm hover:shadow-md transition-shadow"
                                        title={
                                            <div className="flex items-center justify-between">
                                                <span className="text-lg font-semibold">{item.product_name}</span>
                                                <Tag color={getStatusColor(item.status)}>
                                                    {getStatusText(item.status)}
                                                </Tag>
                                            </div>
                                        }
                                    >
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center text-sm text-gray-500">
                                                <span>{t('申请时间')}：{item.created_at}</span>
                                                {item.completed_date && (
                                                    <span>{t('完成时间')}：{item.completed_date}</span>
                                                )}
                                            </div>

                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm text-gray-600">{t('处理进度')}</span>
                                                    <span className="text-sm font-semibold text-[#e60012]">{item.progress}%</span>
                                                </div>
                                                <Progress
                                                    percent={item.progress}
                                                    status={item.status === 'completed' ? 'success' : 'active'}
                                                    strokeColor={item.status === 'completed' ? undefined : '#e60012'}
                                                />
                                            </div>

                                            {item.reply_content && (
                                                <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                                                    <div className="flex items-center mb-2 text-[#e60012]">
                                                        <MessageOutlined className="mr-2" />
                                                        <span className="font-semibold">{t('管理员回复')}：</span>
                                                    </div>
                                                    <Paragraph className="mb-0 text-gray-700">
                                                        {item.reply_content}
                                                    </Paragraph>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center pt-2">
                                                <span className="text-sm text-gray-500">
                                                    {item.expected_date ? `${t('预计完成')}：${item.expected_date}` : ''}
                                                </span>
                                                <Button icon={<EyeOutlined />} type="link" className="text-[#e60012]">
                                                    {t('查看详情')}
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                </List.Item>
                            )}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
