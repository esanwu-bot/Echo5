"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { applicationCategoryApi, ApplicationCategory } from '../../lib/api-client';
import { ApplicationTemplateA } from '../../components/ApplicationTemplateA';
import { ApplicationTemplateB } from '../../components/ApplicationTemplateB';
import { Spin } from 'antd';

export default function ApplicationCategoryPage() {
    const params = useParams();
    const [category, setCategory] = useState<ApplicationCategory | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategory = async () => {
            if (!params.id) return;
            try {
                const resp = await applicationCategoryApi.getCategory(Number(params.id));
                if (resp.code === 200) {
                    setCategory(resp.data);
                }
            } catch (error) {
                console.error('Failed to fetch category:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCategory();
    }, [params.id]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><Spin size="large" /></div>;
    }

    if (!category) {
        return <div className="min-h-screen flex items-center justify-center">Category not found</div>;
    }

    // Render based on template_type
    if (category.template_type === 'B') {
        return <ApplicationTemplateB category={category} />;
    }

    // Default to Template A
    return <ApplicationTemplateA category={category} />;
}
