import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import ParametricSearch from '../../components/parametric-search/ParametricSearch';

export default function ProductListPage() {
    const { categoryId } = useParams<{ categoryId: string }>();
    const location = useLocation();
    const initialFilters = location.state?.initialFilters;

    return (
        <ParametricSearch
            initialCategoryId={categoryId ? Number(categoryId) : undefined}
            initialFilters={initialFilters}
        />
    );
}
