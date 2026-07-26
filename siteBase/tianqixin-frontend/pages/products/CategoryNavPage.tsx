import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout, Menu, Typography, Row, Col, Card, Spin } from 'antd';
import { RightOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { categoryApi } from '../../lib/api-client';
import { BreadcrumbNav } from '../../components/BreadcrumbNav';
import { Seo } from '../../components/Seo';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

interface Category {
    id: number;
    name: string;
    children?: Category[];
}

export const CategoryNavPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedTopCategory, setSelectedTopCategory] = useState<Category | null>(null);

    useEffect(() => {
        fetchCategoryTree();
    }, []);

    const fetchCategoryTree = async () => {
        try {
            setLoading(true);
            const data = await categoryApi.getCategoryTree();
            if (data.code === 200) {
                const tree = data.data || [];
                setCategories(tree);
                if (tree.length > 0) {
                    setSelectedTopCategory(tree[0]);
                }
            }
        } catch (error) {
            console.error('Failed to fetch category tree:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTopCategorySelect = (id: string) => {
        const cat = categories.find(c => c.id.toString() === id);
        if (cat) {
            setSelectedTopCategory(cat);
        }
    };

    const handleCategoryClick = (id: number) => {
        navigate(`/products/${id}`);
    };

    const categoryNames = categories.map(c => t(c.name)).join('、');

    return (
        <Layout style={{ minHeight: 'calc(100vh - 64px)', background: '#fff' }}>
            <Seo
                title="产品分类"
                description={`天启芯科技产品分类中心，涵盖${categoryNames || '半导体、被动元件、连接器、电阻电容'}等电子元器件品类，支持按分类快速选型。`}
                url="/products"
                type="website"
            />
            <Sider width={250} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', fontWeight: 'bold' }}>
                   {t('所有产品')}
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={selectedTopCategory ? [selectedTopCategory.id.toString()] : []}
                    onClick={({ key }) => handleTopCategorySelect(key)}
                    style={{ borderRight: 0 }}
                    items={categories.map(cat => ({
                        key: cat.id.toString(),
                        label: t(cat.name),
                        icon: <RightOutlined style={{ float: 'right', marginTop: '14px', fontSize: '10px' }} />,
                    }))}
                />
            </Sider>
            <Content style={{ padding: '24px 48px', background: '#fff' }}>
                <BreadcrumbNav />
                <Spin spinning={loading}>
                    {selectedTopCategory && (
                        <>
                            <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center' }}>
                                <AppstoreOutlined style={{ fontSize: '24px', color: '#cc0000', marginRight: 12 }} />
                                <Title level={2} style={{ margin: 0, fontWeight: 400 }}>
                                    {t(selectedTopCategory.name)}
                                </Title>
                                <RightOutlined style={{ marginLeft: 12, color: '#999' }} />
                            </div>

                            <Row gutter={[32, 32]}>
                                {selectedTopCategory.children?.map(subCat => (
                                    <Col xs={24} sm={12} md={8} lg={8} key={subCat.id}>
                                        <div style={{ marginBottom: 16 }}>
                                            <Title
                                                level={4}
                                                style={{
                                                    fontSize: '16px',
                                                    marginBottom: 12,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}
                                                onClick={() => handleCategoryClick(subCat.id)}
                                            >
                                                <RightOutlined style={{ fontSize: '12px', marginRight: 8, color: '#cc0000' }} />
                                                {t(subCat.name)}
                                            </Title>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px' }}>
                                                {subCat.children?.map(child => (
                                                    <Text
                                                        key={child.id}
                                                        style={{
                                                            fontSize: '13px',
                                                            color: '#666',
                                                            cursor: 'pointer'
                                                        }}
                                                        className="hover-red"
                                                        onClick={() => handleCategoryClick(child.id)}
                                                    >
                                                        {t(child.name)}
                                                    </Text>
                                                ))}
                                            </div>
                                        </div>
                                    </Col>
                                ))}
                            </Row>
                        </>
                    )}
                </Spin>
            </Content>
            <style dangerouslySetInnerHTML={{
                __html: `
                .hover-red:hover {
                    color: #cc0000 !important;
                    text-decoration: underline;
                }
                .ant-menu-item-selected {
                    background-color: #fff !important;
                    color: #cc0000 !important;
                    border-left: 3px solid #cc0000;
                }
                .ant-menu-item:hover {
                    color: #cc0000 !important;
                }
            ` }} />
        </Layout>
    );
};
