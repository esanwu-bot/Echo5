import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout, Typography, Row, Col, Spin, Button } from 'antd';
import { RightOutlined, FilterOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { categoryApi } from '../../lib/api-client';
import { BreadcrumbNav } from '../../components/BreadcrumbNav';
import { Seo } from '../../components/Seo';
import { t } from 'i18next';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

interface Category {
    id: number;
    name: string;
    description?: string;
    children?: Category[];
}

interface AttributeFilterValue {
    attribute_id: number;
    values?: string[];
    min?: number;
    max?: number;
    logic: string;
}

interface Attribute {
    id: number;
    name: string;
    code: string;
    type?: string;
    data_type?: string;
    unit?: string;
    options?: string | string[] | null;
    available_values?: string[];
    value_range?: { min: number; max: number };
}

const getAvailableValues = (attr: Attribute): string[] => {
    if (attr.available_values && attr.available_values.length > 0) {
        return attr.available_values;
    }

    if (!attr.options) {
        return [];
    }

    if (Array.isArray(attr.options)) {
        return attr.options;
    }

    try {
        const parsed = JSON.parse(attr.options);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const CategoryDetailPage: React.FC = () => {
    const { categoryId } = useParams<{ categoryId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [category, setCategory] = useState<Category | null>(null);
    const [attributes, setAttributes] = useState<Attribute[]>([]);

    useEffect(() => {
        if (categoryId) {
            fetchCategoryData(Number(categoryId));
        }
    }, [categoryId]);

    const fetchCategoryData = async (id: number) => {
        try {
            setLoading(true);
            const [attrData, catTreeData] = await Promise.all([
                categoryApi.getCategoryAttributesWithValues(id),
                categoryApi.getCategoryTree()
            ]);

            if (attrData.code !== 200) {
                return;
            }

            setAttributes(attrData.data.attributes || []);

            const findCategory = (tree: Category[], targetId: number): Category | null => {
                for (const node of tree) {
                    if (node.id === targetId) {
                        return node;
                    }
                    if (node.children) {
                        const found = findCategory(node.children, targetId);
                        if (found) {
                            return found;
                        }
                    }
                }
                return null;
            };

            const foundCategory = findCategory(catTreeData.data || [], id);
            setCategory(foundCategory || attrData.data.category || null);
        } catch (error) {
            console.error('Failed to fetch category data:', error);
        } finally {
            setLoading(false);
        }
    };

    const navigateToList = (search = '', initialFilters?: Record<number, AttributeFilterValue>) => {
        navigate(`/products/${categoryId}/list${search}`, initialFilters ? { state: { initialFilters } } : undefined);
    };

    const handleViewAll = () => {
        navigateToList();
    };

    const handleViewSpecs = () => {
        navigateToList('?spec=1');
    };

    const handleSubCategoryClick = (id: number) => {
        navigate(`/products/${id}`);
    };

    const handleAttributeClick = (attrId: number, value: string) => {
        navigateToList('?spec=1', {
            [attrId]: { attribute_id: attrId, values: [value], logic: 'or' }
        });
    };

    const handleAttributeRangeClick = (attrId: number, min: number, max: number) => {
        navigateToList('?spec=1', {
            [attrId]: { attribute_id: attrId, min, max, logic: 'and' }
        });
    };

    const handleViewAllWithAttr = (attrId: number) => {
        navigateToList('?spec=1', {
            [attrId]: { attribute_id: attrId, values: [], logic: 'or' }
        });
    };

    if (loading) {
        return <div style={{ padding: 50, textAlign: 'center' }}><Spin size="large" /></div>;
    }

    if (!category) {
        return <div style={{ padding: 50, textAlign: 'center' }}>{t('未找到分类')}</div>;
    }

    return (
        <Layout style={{ background: '#fff', minHeight: '100vh' }}>
            <Seo
                title={category.name}
                description={category.description || `浏览天启芯科技 ${category.name} 分类下的电子元器件产品，支持参数筛选、规格对比与在线采购。`}
                url={`/products/${category.id}`}
                type="website"
            />
            <Content style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
                <BreadcrumbNav categoryId={category.id} />

                <div style={{ marginTop: 32, marginBottom: 48 }}>
                    <Title level={1} style={{ fontWeight: 300, fontSize: '42px', marginBottom: 16 }}>
                        {category.name}
                    </Title>
                    <Paragraph style={{ fontSize: '16px', color: '#666', maxWidth: 800, marginBottom: 24 }}>
                        {category.description || t('分类的器件可通过规格表快速筛选，便于从分类浏览直接进入参数对比与选型。', { name: category.name })}
                    </Paragraph>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <Button size="large" onClick={handleViewAll} style={{ borderRadius: 2 }}>
                           {t('查看所有产品')} 
                        </Button>
                        <Button
                            type="primary"
                            danger
                            size="large"
                            icon={<RightOutlined />}
                            onClick={handleViewSpecs}
                            style={{ background: '#cc0000', borderRadius: 2 }}
                        >
                             {t('查看规格表')}
                        </Button>
                    </div>
                </div>

                {category.children && category.children.length > 0 && (
                    <div style={{ marginBottom: 48 }}>
                        <Title level={3} style={{ fontWeight: 400, marginBottom: 24 }}>{t('按类别浏览')}</Title>
                        <Row gutter={[24, 24]}>
                            {category.children.map(sub => (
                                <Col xs={24} sm={12} md={8} key={sub.id}>
                                    <div
                                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                        onClick={() => handleSubCategoryClick(sub.id)}
                                    >
                                        <RightOutlined style={{ color: '#cc0000', marginRight: 8 }} />
                                        <Text strong style={{ fontSize: '16px' }}>{sub.name}</Text>
                                    </div>
                                </Col>
                            ))}
                        </Row>
                    </div>
                )}

                {attributes.length > 0 && (
                    <div>
                        <Title level={3} style={{ fontWeight: 400, marginBottom: 8 }}>{t('按参数规格进行选择')}</Title>
                        <Paragraph style={{ color: '#666', marginBottom: 24 }}>{t('点击任一规格值可直接带着预设筛选进入规格表。')}</Paragraph>

                        <Row gutter={[48, 32]}>
                            {attributes.slice(0, 6).map(attr => (
                                <Col xs={24} sm={12} md={8} key={attr.id}>
                                    <div style={{ marginBottom: 16 }}>
                                        <Title
                                            level={5}
                                            style={{
                                                fontSize: '14px',
                                                color: '#333',
                                                marginBottom: 12,
                                                borderBottom: '1px solid #f0f0f0',
                                                paddingBottom: 8
                                            }}
                                        >
                                            {attr.name}{attr.unit ? ` (${attr.unit})` : ''}
                                        </Title>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {attr.type === 'range' && attr.value_range ? (
                                                <div
                                                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                    className="hover-link"
                                                    onClick={() => handleAttributeRangeClick(attr.id, attr.value_range!.min, attr.value_range!.max)}
                                                >
                                                    <FilterOutlined style={{ fontSize: '12px', marginRight: 8, color: '#005fb8' }} />
                                                    <Text style={{ color: '#005fb8', fontSize: '13px' }}>
                                                        {attr.value_range.min} ~ {attr.value_range.max}
                                                    </Text>
                                                </div>
                                            ) : (
                                                <>
                                                    {getAvailableValues(attr).slice(0, 5).map(value => (
                                                        <div
                                                            key={value}
                                                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                            className="hover-link"
                                                            onClick={() => handleAttributeClick(attr.id, value)}
                                                        >
                                                            <FilterOutlined style={{ fontSize: '12px', marginRight: 8, color: '#005fb8' }} />
                                                            <Text style={{ color: '#005fb8', fontSize: '13px' }}>{value}</Text>
                                                        </div>
                                                    ))}
                                                    {getAvailableValues(attr).length > 5 && (
                                                        <div
                                                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', marginTop: 4 }}
                                                            className="hover-link"
                                                            onClick={() => handleViewAllWithAttr(attr.id)}
                                                        >
                                                            <Text style={{ color: '#666', fontSize: '12px' }}>
                                                                {t('更多')} ({getAvailableValues(attr).length - 5})...
                                                            </Text>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </Col>
                            ))}
                        </Row>
                    </div>
                )}
            </Content>
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                .hover-link:hover span {
                    color: #cc0000 !important;
                    text-decoration: underline;
                }
            `
                }}
            />
        </Layout>
    );
};
