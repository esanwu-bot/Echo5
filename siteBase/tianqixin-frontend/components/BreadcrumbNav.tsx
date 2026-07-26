import React, { useState, useEffect } from 'react';
import { Breadcrumb, Dropdown, Space } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { DownOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { categoryApi } from '../lib/api-client';

interface Category {
    id: number;
    name: string;
    parent_id: number;
    children?: Category[];
}

interface BreadcrumbNavProps {
    categoryId?: number;
}

export const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({ categoryId }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [path, setPath] = useState<Category[]>([]);
    const [categoryTree, setCategoryTree] = useState<Category[]>([]);

    useEffect(() => {
        fetchCategoryTree();
    }, []);

    useEffect(() => {
        if (categoryId && categoryTree.length > 0) {
            const newPath = findPath(categoryTree, categoryId);
            setPath(newPath);
        } else if (!categoryId) {
            setPath([]);
        }
    }, [categoryId, categoryTree]);

    const fetchCategoryTree = async () => {
        try {
            const res = await categoryApi.getCategoryTree();
            if (res.code === 200) {
                setCategoryTree(res.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch category tree:', error);
        }
    };

    const findPath = (tree: Category[], targetId: number): Category[] => {
        for (const node of tree) {
            if (node.id === targetId) return [node];
            if (node.children) {
                const childPath = findPath(node.children, targetId);
                if (childPath.length > 0) return [node, ...childPath];
            }
        }
        return [];
    };

    const getSiblings = (parentId: number | null): Category[] => {
        if (parentId === null || parentId === 0) return categoryTree;

        const findParent = (tree: Category[], pId: number): Category | null => {
            for (const node of tree) {
                if (node.id === pId) return node;
                if (node.children) {
                    const found = findParent(node.children, pId);
                    if (found) return found;
                }
            }
            return null;
        };

        const parent = findParent(categoryTree, parentId);
        return parent?.children || [];
    };

    const getMenuProps = (categories: Category[]) => ({
        items: categories.map(cat => ({
            key: cat.id,
            label: (
                <Link to={`/series?category_id=${cat.id}`}>
                    {t(cat.name)}
                </Link>
            ),
        }))
    });

    const breadcrumbItems = [
        {
            title: <Link to="/">{t('主页')}</Link>,
        },
        {
            title: <Link to="/series">{t('产品')}</Link>,
        },
        ...path.map((cat, index) => ({
            key: cat.id,
            title: (
                <Dropdown
                    menu={getMenuProps(getSiblings(cat.parent_id))}
                    placement="bottomLeft"
                    trigger={['hover']}
                >
                    <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        {index === path.length - 1 ? (
                            <span style={{ fontWeight: 'bold', color: '#333' }}>{t(cat.name)}</span>
                        ) : (
                            <Link to={`/series?category_id=${cat.id}`} style={{ color: 'inherit' }}>{t(cat.name)}</Link>
                        )}
                        <DownOutlined style={{ fontSize: '10px', marginLeft: 4, color: '#999' }} />
                    </span>
                </Dropdown>
            ),
        })),
    ];

    return (
        <Breadcrumb
            style={{ marginBottom: 16, fontSize: '12px' }}
            separator="/"
            items={breadcrumbItems}
        />
    );
};
