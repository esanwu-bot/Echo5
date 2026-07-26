"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FilterState, Product, SortConfig } from './types';
import { CheckboxFilter } from './CheckboxFilter';
import { RangeFilter } from './RangeFilter';
import { ResultsTable } from './ResultsTable';
import { ComparisonModal } from './ComparisonModal';
import {
    SlidersHorizontal, RotateCcw, Search, Download, X,
    ChevronDown, ChevronRight, Layers, Loader2, Tag
} from 'lucide-react';
import { parametricSearchApi, categoryApi, ParametricProduct, FilterOptions } from '../../lib/api-client';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// 分类树节点类型
interface CategoryNode {
    id: number;
    name: string;
    name_en?: string;
    level: number;
    parent_id: number;
    sort_order: number;
    children?: CategoryNode[];
}

// 扩展 FilterState 以支持品牌和价格筛选
interface ExtendedFilterState extends FilterState {
    brands: number[];
    price: { min: number | ''; max: number | '' };
}

interface ParametricSearchProps {
    initialCategoryId?: number;
    initialFilters?: Record<number, { attribute_id: number; values?: string[]; min?: number; max?: number; logic: string }>;
}

type DynamicAttributeFilters = Record<number, { attribute_id: number; values?: string[]; min?: number; max?: number; logic: string }>;

const ParametricSearch: React.FC<ParametricSearchProps> = ({ initialCategoryId, initialFilters: propInitialFilters }) => {
    const { t, i18n } = useTranslation();
    // --- 分类树状态 ---
    const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
    const [catTreeLoading, setCatTreeLoading] = useState(true);
    const [catTreeError, setCatTreeError] = useState(false);
    const [retryKey, setRetryKey] = useState(0);
    const [activeRootId, setActiveRootId] = useState<number | null>(null);
    const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
    const [activeCategoryName, setActiveCategoryName] = useState<string>('');

    // 面包屑菜单
    const [showRootMenu, setShowRootMenu] = useState(false);
    const [showSubMenu, setShowSubMenu] = useState(false);

    // --- 数据状态 ---
    const [products, setProducts] = useState<Product[]>([]);
    const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [totalProducts, setTotalProducts] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    // --- 筛选 & UI 状态 ---
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);

    // --- 对比状态 ---
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [isComparisonOpen, setIsComparisonOpen] = useState(false);

    const initialFilters: ExtendedFilterState = {
        searchQuery: '',
        inStockOnly: false,
        classification: [],
        packageType: [],
        manufacturer: [],
        channels: [],
        bandwidth: { min: '', max: '' },
        slewRate: { min: '', max: '' },
        supplyVoltage: { min: '', max: '' },
        outputType: [],
        frequency: { min: '', max: '' },
        outputsCount: [],
        isolationRating: { min: '', max: '' },
        dataRate: { min: '', max: '' },
        channelCount: [],
        brands: [],
        price: { min: '', max: '' },
    };

    const [filters, setFilters] = useState<ExtendedFilterState>(initialFilters);
    const [dynamicAttributeFilters, setDynamicAttributeFilters] = useState<DynamicAttributeFilters>({});
    const hasHydratedFromUrl = useRef(false);
    const hasSyncedUrl = useRef(false);
    const lastCategoryIdRef = useRef<number | null>(null);

    const parseArrayNumberParam = (searchParams: URLSearchParams, key: string): number[] =>
        searchParams.getAll(key).map(value => Number(value)).filter(value => !Number.isNaN(value));

    const parseArrayStringParam = (searchParams: URLSearchParams, key: string): string[] =>
        searchParams.getAll(key).filter(Boolean);

    // ============================
    // 加载分类树（带 localStorage 缓存，按语言区分，TTL 24h）
    // ============================
    const getCacheKey = () => `tqx_category_tree_${i18n.language || 'zh'}`;
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 小时

    const getCachedTree = (): CategoryNode[] | null => {
        try {
            const raw = localStorage.getItem(getCacheKey());
            if (!raw) return null;
            const { data, ts } = JSON.parse(raw) as { data: CategoryNode[]; ts: number };
            if (Date.now() - ts > CACHE_TTL) {
                localStorage.removeItem(getCacheKey());
                return null;
            }
            return data;
        } catch {
            return null;
        }
    };

    const setCachedTree = (tree: CategoryNode[]) => {
        try {
            localStorage.setItem(getCacheKey(), JSON.stringify({ data: tree, ts: Date.now() }));
        } catch {
            // localStorage 写入失败（如隐私模式容量不足）时静默忽略
        }
    };

    // 在分类树中查找指定分类ID，返回其根分类和当前分类信息
    const findCategoryInTree = useCallback((tree: CategoryNode[], targetId: number): { rootId: number; categoryId: number; categoryName: string } | null => {
        for (const root of tree) {
            if (root.id === targetId) {
                return { rootId: root.id, categoryId: root.id, categoryName: root.name };
            }
            if (root.children) {
                for (const child of root.children) {
                    if (child.id === targetId) {
                        return { rootId: root.id, categoryId: child.id, categoryName: child.name };
                    }
                    if (child.children) {
                        for (const grandchild of child.children) {
                            if (grandchild.id === targetId) {
                                return { rootId: root.id, categoryId: grandchild.id, categoryName: grandchild.name };
                            }
                        }
                    }
                }
            }
        }
        return null;
    }, []);

    const selectDefaultCategory = useCallback((tree: CategoryNode[]) => {
        const firstRoot = tree[0];
        setActiveRootId(firstRoot.id);
        if (firstRoot.children && firstRoot.children.length > 0) {
            const firstSub = firstRoot.children[0];
            setActiveCategoryId(firstSub.id);
            setActiveCategoryName(firstSub.name);
        } else {
            setActiveCategoryId(firstRoot.id);
            setActiveCategoryName(firstRoot.name);
        }
    }, []);

    useEffect(() => {
        const loadCategoryTree = async () => {
            setCatTreeLoading(true);
            setCatTreeError(false);
            try {
                let tree: CategoryNode[] = [];
                const cached = getCachedTree();
                if (cached && cached.length > 0) {
                    tree = cached;
                } else {
                    const res = await categoryApi.getCategoryTree();
                    if (res.code === 200 && res.data && Array.isArray(res.data) && res.data.length > 0) {
                        tree = res.data;
                        setCachedTree(tree);
                    }
                }

                if (tree.length > 0) {
                    setCategoryTree(tree);
                    if (initialCategoryId) {
                        const found = findCategoryInTree(tree, initialCategoryId);
                        if (found) {
                            setActiveRootId(found.rootId);
                            setActiveCategoryId(found.categoryId);
                            setActiveCategoryName(found.categoryName);
                        } else {
                            selectDefaultCategory(tree);
                        }
                    } else {
                        selectDefaultCategory(tree);
                    }
                } else {
                    setCategoryTree([]);
                    setCatTreeError(true);
                    if (initialCategoryId) {
                        setActiveCategoryId(initialCategoryId);
                    }
                }
            } catch {
                setCategoryTree([]);
                setCatTreeError(true);
                if (initialCategoryId) {
                    setActiveCategoryId(initialCategoryId);
                }
            } finally {
                setCatTreeLoading(false);
            }
        };
        loadCategoryTree();
    }, [retryKey]);

    useEffect(() => {
        if (propInitialFilters && Object.keys(propInitialFilters).length > 0) {
            setDynamicAttributeFilters(prev => ({ ...propInitialFilters, ...prev }));
        }
    }, [propInitialFilters]);

    useEffect(() => {
        if (hasHydratedFromUrl.current) {
            return;
        }

        if (typeof window === 'undefined') {
            return;
        }

        const searchParams = new URLSearchParams(window.location.search);
        if ([...searchParams.keys()].length === 0) {
            hasHydratedFromUrl.current = true;
            return;
        }

        setFilters(prev => ({
            ...prev,
            searchQuery: searchParams.get('q') || '',
            inStockOnly: searchParams.get('stock') === '1',
            classification: parseArrayStringParam(searchParams, 'classification'),
            channels: parseArrayNumberParam(searchParams, 'channels'),
            packageType: parseArrayStringParam(searchParams, 'package_types'),
            brands: parseArrayNumberParam(searchParams, 'brands'),
            bandwidth: {
                min: searchParams.get('bandwidth_min') ? Number(searchParams.get('bandwidth_min')) : '',
                max: searchParams.get('bandwidth_max') ? Number(searchParams.get('bandwidth_max')) : ''
            },
            slewRate: {
                min: searchParams.get('slew_rate_min') ? Number(searchParams.get('slew_rate_min')) : '',
                max: searchParams.get('slew_rate_max') ? Number(searchParams.get('slew_rate_max')) : ''
            },
            supplyVoltage: {
                min: searchParams.get('voltage_min') ? Number(searchParams.get('voltage_min')) : '',
                max: searchParams.get('voltage_max') ? Number(searchParams.get('voltage_max')) : ''
            },
            price: {
                min: searchParams.get('price_min') ? Number(searchParams.get('price_min')) : '',
                max: searchParams.get('price_max') ? Number(searchParams.get('price_max')) : ''
            }
        }));

        const sortField = searchParams.get('sort_field');
        const sortOrder = searchParams.get('sort_order');
        if (sortField && sortOrder && ['asc', 'desc'].includes(sortOrder)) {
            setSortConfig({ key: sortField as keyof Product, direction: sortOrder as 'asc' | 'desc' });
        }

        const page = Number(searchParams.get('page'));
        if (!Number.isNaN(page) && page > 1) {
            setCurrentPage(page);
        }

        const attributeFiltersRaw = searchParams.get('attribute_filters');
        if (attributeFiltersRaw) {
            try {
                const parsed = JSON.parse(attributeFiltersRaw);
                if (parsed && typeof parsed === 'object') {
                    setDynamicAttributeFilters(prev => ({ ...parsed, ...prev }));
                }
            } catch {
                // ignore malformed query payloads
            }
        }

        hasHydratedFromUrl.current = true;
    }, []);

    const currentRootChildren = (): CategoryNode[] => {
        if (!activeRootId) return [];
        const root = categoryTree.find(c => c.id === activeRootId);
        return root?.children || [];
    };

    const activeRootName = (): string => {
        if (!activeRootId) return '';
        const root = categoryTree.find(c => c.id === activeRootId);
        return root?.name || '';
    };

    // ============================
    // 数据转换
    // ============================
    const convertApiProduct = useCallback((apiProduct: ParametricProduct): Product => ({
        id: String(apiProduct.id),
        partNumber: apiProduct.partNumber || apiProduct.name,
        name: apiProduct.name || apiProduct.partNumber || '',
        modelId: apiProduct.modelId ?? null,
        modelCode: apiProduct.modelCode ?? null,
        modelName: apiProduct.modelName ?? null,
        models: apiProduct.models ?? [],
        manufacturer: apiProduct.manufacturer || '',
        rootCategory: activeRootName(),
        subCategory: activeCategoryName,
        classification: apiProduct.classification || t('通用'),
        description: apiProduct.description || '',
        price: apiProduct.price,
        inStock: apiProduct.inStock,
        packageType: apiProduct.packageType || '',
        channels: apiProduct.channels ?? undefined,
        bandwidthMHz: apiProduct.bandwidthMHz ?? undefined,
        slewRate: apiProduct.slewRate ?? undefined,
        supplyVoltageMin: apiProduct.supplyVoltageMin ?? undefined,
        supplyVoltageMax: apiProduct.supplyVoltageMax ?? undefined,
        offsetVoltageVal: apiProduct.offsetVoltageVal ?? undefined
    }), [activeCategoryName, activeRootId]);

    // ============================
    // 获取产品列表
    // ============================
    const SORT_FIELD_MAP: Partial<Record<keyof Product, string>> = {
        partNumber: 'product_code',
        manufacturer: 'name',
        price: 'pricing_unit_price',
        inStock: 'stock',
        packageType: 'package_type',
        channels: 'channels',
    };

    const fetchProducts = useCallback(async (page: number = 1) => {
        if (!activeCategoryId) return;
        setLoading(true);
        try {
            const sortBackendField = sortConfig?.key
                ? (SORT_FIELD_MAP[sortConfig.key] ?? null)
                : null;

            const params: any = {
                category_id: activeCategoryId,
                page,
                page_size: pageSize,
                keyword: filters.searchQuery || undefined,
                in_stock: filters.inStockOnly || undefined,
                sort_field: sortBackendField || 'id',
                sort_order: sortConfig?.direction || 'desc'
            };

            if (filters.classification.length > 0) params.classification = filters.classification;
            if (filters.channels.length > 0) params.channels = filters.channels;
            if (filters.packageType.length > 0) params.package_types = filters.packageType;
            if (filters.brands.length > 0) params.brands = filters.brands;

            if (filters.bandwidth.min !== '') params.bandwidth_min = Number(filters.bandwidth.min);
            if (filters.bandwidth.max !== '') params.bandwidth_max = Number(filters.bandwidth.max);
            if (filters.slewRate.min !== '') params.slew_rate_min = Number(filters.slewRate.min);
            if (filters.slewRate.max !== '') params.slew_rate_max = Number(filters.slewRate.max);
            if (filters.supplyVoltage.min !== '') params.voltage_min = Number(filters.supplyVoltage.min);
            if (filters.supplyVoltage.max !== '') params.voltage_max = Number(filters.supplyVoltage.max);
            if (filters.price.min !== '') params.price_min = Number(filters.price.min);
            if (filters.price.max !== '') params.price_max = Number(filters.price.max);

            if (Object.keys(dynamicAttributeFilters).length > 0) {
                params.attribute_filters = JSON.stringify(dynamicAttributeFilters);
            }

            const response = await parametricSearchApi.getProducts(params);
            if (response.code === 200 && response.data) {
                setProducts(response.data.products.map(convertApiProduct));
                setTotalProducts(response.data.pagination.total);
                setCurrentPage(response.data.pagination.page);
            } else {
                toast.error(response.message || t('获取产品列表失败'));
            }
        } catch {
            toast.error(t('获取产品列表失败，请稍后重试'));
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    }, [activeCategoryId, filters, sortConfig, convertApiProduct, dynamicAttributeFilters]);

    // ============================
    // 获取筛选选项
    // ============================
    const fetchFilterOptions = useCallback(async () => {
        if (!activeCategoryId) return;
        try {
            const response = await parametricSearchApi.getFilterOptions(activeCategoryId);
            if (response.code === 200 && response.data) {
                setFilterOptions(response.data);
            }
        } catch {
            // silent
        }
    }, [activeCategoryId]);

    useEffect(() => {
        if (activeCategoryId) {
            fetchProducts(currentPage);
            fetchFilterOptions();
        }
    }, [activeCategoryId]);

    // 筛选变化防抖
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeCategoryId) fetchProducts(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [
        filters.searchQuery, filters.inStockOnly,
        filters.classification, filters.channels, filters.packageType, filters.brands,
        filters.bandwidth, filters.slewRate, filters.supplyVoltage, filters.price,
        dynamicAttributeFilters, sortConfig
    ]);

    // 切换分类重置筛选
    useEffect(() => {
        if (!activeCategoryId) {
            return;
        }

        if (lastCategoryIdRef.current === null) {
            lastCategoryIdRef.current = activeCategoryId;
            return;
        }

        if (lastCategoryIdRef.current !== activeCategoryId) {
            lastCategoryIdRef.current = activeCategoryId;
            setFilters(prev => ({ ...initialFilters, searchQuery: prev.searchQuery }));
            setDynamicAttributeFilters({});
            setSortConfig(null);
            setCurrentPage(1);
        }
    }, [activeCategoryId]);

    useEffect(() => {
        if (!activeCategoryId || !hasHydratedFromUrl.current) {
            return;
        }

        if (typeof window === 'undefined') {
            return;
        }

        const searchParams = new URLSearchParams();
        if (window.location.search.includes('spec=1')) searchParams.set('spec', '1');
        if (filters.searchQuery) searchParams.set('q', filters.searchQuery);
        if (filters.inStockOnly) searchParams.set('stock', '1');
        if (currentPage > 1) searchParams.set('page', String(currentPage));
        if (sortConfig?.key) {
            searchParams.set('sort_field', String(sortConfig.key));
            searchParams.set('sort_order', sortConfig.direction);
        }

        filters.classification.forEach(value => searchParams.append('classification', value));
        filters.channels.forEach(value => searchParams.append('channels', String(value)));
        filters.packageType.forEach(value => searchParams.append('package_types', value));
        filters.brands.forEach(value => searchParams.append('brands', String(value)));

        if (filters.bandwidth.min !== '') searchParams.set('bandwidth_min', String(filters.bandwidth.min));
        if (filters.bandwidth.max !== '') searchParams.set('bandwidth_max', String(filters.bandwidth.max));
        if (filters.slewRate.min !== '') searchParams.set('slew_rate_min', String(filters.slewRate.min));
        if (filters.slewRate.max !== '') searchParams.set('slew_rate_max', String(filters.slewRate.max));
        if (filters.supplyVoltage.min !== '') searchParams.set('voltage_min', String(filters.supplyVoltage.min));
        if (filters.supplyVoltage.max !== '') searchParams.set('voltage_max', String(filters.supplyVoltage.max));
        if (filters.price.min !== '') searchParams.set('price_min', String(filters.price.min));
        if (filters.price.max !== '') searchParams.set('price_max', String(filters.price.max));
        if (Object.keys(dynamicAttributeFilters).length > 0) {
            searchParams.set('attribute_filters', JSON.stringify(dynamicAttributeFilters));
        }

        const nextSearch = searchParams.toString();
        const currentSearch = window.location.search.startsWith('?') ? window.location.search.slice(1) : window.location.search;
        if (nextSearch !== currentSearch || !hasSyncedUrl.current) {
            hasSyncedUrl.current = true;
            const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`;
            window.history.replaceState(window.history.state, '', nextUrl);
        }
    }, [activeCategoryId, currentPage, dynamicAttributeFilters, filters, sortConfig]);

    // ============================
    // 事件处理
    // ============================
    const switchRoot = (rootId: number, rootName: string) => {
        setActiveRootId(rootId);
        const root = categoryTree.find(c => c.id === rootId);
        if (root?.children && root.children.length > 0) {
            setActiveCategoryId(root.children[0].id);
            setActiveCategoryName(root.children[0].name);
        } else {
            setActiveCategoryId(rootId);
            setActiveCategoryName(rootName);
        }
        setShowRootMenu(false);
        setDynamicAttributeFilters({});
        setFilters(initialFilters);
        setSortConfig(null);
    };

    const switchSub = (sub: CategoryNode) => {
        setActiveCategoryId(sub.id);
        setActiveCategoryName(sub.name);
        setShowSubMenu(false);
        setDynamicAttributeFilters({});
        setFilters(initialFilters);
        setSortConfig(null);
    };

    const handleTextSearch = (e: React.ChangeEvent<HTMLInputElement>) =>
        setFilters(prev => ({ ...prev, searchQuery: e.target.value }));

    const toggleArrayFilter = (key: keyof ExtendedFilterState, value: string | number) => {
        setFilters(prev => {
            const current = prev[key] as (string | number)[];
            const exists = current.includes(value as never);
            return { ...prev, [key]: exists ? current.filter(i => i !== value) : [...current, value] };
        });
    };

    const updateRange = (key: 'bandwidth' | 'slewRate' | 'supplyVoltage' | 'price', type: 'min' | 'max', value: number | '') => {
        setFilters(prev => ({ ...prev, [key]: { ...prev[key], [type]: value } }));
    };

    const resetAllFilters = () => {
        setFilters(initialFilters);
        setDynamicAttributeFilters({});
        setSortConfig(null);
        setCurrentPage(1);
    };

    const handleSort = (key: keyof Product) => {
        setSortConfig(current => {
            if (current?.key === key)
                return current.direction === 'asc' ? { key, direction: 'desc' } : null;
            return { key, direction: 'asc' };
        });
    };

    const handlePageChange = (page: number) => fetchProducts(page);

    const toggleProductSelection = (id: string) =>
        setSelectedProductIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

    const removeDynamicFilter = (attrId: number, value: string) => {
        setDynamicAttributeFilters(prev => {
            const next = { ...prev };
            if (next[attrId]) {
                const values = next[attrId].values || [];
                if (values.length === 0) {
                    delete next[attrId];
                    return next;
                }

                next[attrId] = {
                    ...next[attrId],
                    values: values.filter(v => v !== value)
                };
                if ((next[attrId].values || []).length === 0) {
                    delete next[attrId];
                }
            }
            return next;
        });
    };

    const handleExport = () => {
        if (products.length === 0) {
            toast.error(t('当前没有可导出的产品'));
            return;
        }

        const rows = [
            ['Part Number', 'Manufacturer', 'Classification', 'Stock', 'Price', 'Package Type'],
            ...products.map(product => [
                product.partNumber,
                product.manufacturer,
                product.classification,
                product.inStock ? 'In Stock' : 'Out of Stock',
                String(product.price),
                product.packageType
            ])
        ];

        const csv = rows
            .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${activeCategoryName || 'products'}-parametric-search.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const openComparison = () => { if (selectedProductIds.length > 0) setIsComparisonOpen(true); };
    const removeFromComparison = (id: string) => setSelectedProductIds(prev => prev.filter(p => p !== id));

    // ============================
    // 动态列定义
    // ============================
    const getColumns = () => {
        const baseColumns = [
            { key: 'partNumber' as keyof Product, label: t('零件编号'), width: 'w-48' },
            { key: 'classification' as keyof Product, label: t('分类'), width: 'w-28' },
            { key: 'inStock' as keyof Product, label: t('库存'), width: 'w-20' },
            { key: 'price' as keyof Product, label: `${t('价格')} (USD)`, width: 'w-24' },
        ];
        if (activeCategoryId === 104) {
            return [...baseColumns,
                { key: 'channels' as keyof Product, label: t('通道'), width: 'w-16' },
                { key: 'bandwidthMHz' as keyof Product, label: t('带宽 (MHz)'), width: 'w-28' },
                { key: 'slewRate' as keyof Product, label: t('压摆率'), width: 'w-24' },
                { key: 'supplyVoltageMax' as keyof Product, label: t('Max电压'), width: 'w-24' },
                { key: 'packageType' as keyof Product, label: t('封装'), width: 'w-24' },
            ];
        }
        return [...baseColumns,
            { key: 'manufacturer' as keyof Product, label: t('制造商'), width: 'w-32' },
            { key: 'packageType' as keyof Product, label: t('封装'), width: 'w-28' },
        ];
    };

    // ============================
    // 动态筛选组件
    // ============================
    const getFilterComponents = () => {
        if (!filterOptions) return null;
        const { filters: opts } = filterOptions;
        return (
            <>
                {opts.classification?.options?.length > 0 && (
                    <CheckboxFilter title={opts.classification.label} options={opts.classification.options}
                        selectedValues={filters.classification} onChange={v => toggleArrayFilter('classification', v)} />
                )}
                {opts.channels?.options?.length > 0 && (
                    <CheckboxFilter title={opts.channels.label} options={opts.channels.options}
                        selectedValues={filters.channels} onChange={v => toggleArrayFilter('channels', v)} />
                )}
                {opts.package_types?.options?.length > 0 && (
                    <CheckboxFilter title={opts.package_types.label} options={opts.package_types.options}
                        selectedValues={filters.packageType} onChange={v => toggleArrayFilter('packageType', v)} />
                )}
                {opts.brands?.options?.length > 0 && (
                    <CheckboxFilter
                        title={opts.brands.label}
                        options={opts.brands.options.map((b: any) => ({ label: `${b.name} (${b.product_count})`, value: b.id }))}
                        selectedValues={filters.brands}
                        onChange={v => toggleArrayFilter('brands', v)}
                    />
                )}
                {opts.bandwidth && (
                    <RangeFilter title={opts.bandwidth.label} unit={opts.bandwidth.unit}
                        min={filters.bandwidth.min} max={filters.bandwidth.max}
                        onMinChange={v => updateRange('bandwidth', 'min', v)}
                        onMaxChange={v => updateRange('bandwidth', 'max', v)} />
                )}
                {opts.slew_rate && (
                    <RangeFilter title={opts.slew_rate.label} unit={opts.slew_rate.unit}
                        min={filters.slewRate.min} max={filters.slewRate.max}
                        onMinChange={v => updateRange('slewRate', 'min', v)}
                        onMaxChange={v => updateRange('slewRate', 'max', v)} />
                )}
                {opts.voltage && (
                    <RangeFilter title={opts.voltage.label} unit={opts.voltage.unit}
                        min={filters.supplyVoltage.min} max={filters.supplyVoltage.max}
                        onMinChange={v => updateRange('supplyVoltage', 'min', v)}
                        onMaxChange={v => updateRange('supplyVoltage', 'max', v)} />
                )}
                {opts.price && (
                    <RangeFilter title={opts.price.label} unit={opts.price.unit}
                        min={filters.price.min} max={filters.price.max}
                        onMinChange={v => updateRange('price', 'min', v)}
                        onMaxChange={v => updateRange('price', 'max', v)} />
                )}
            </>
        );
    };

    // ============================
    // 活跃筛选标签
    // ============================
    const getActiveBadges = () => {
        const badges: React.ReactNode[] = [];
        if (filters.inStockOnly)
            badges.push(<span key="stock" className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded border border-gray-300 flex items-center">
                {t('有货')} <button onClick={() => setFilters(p => ({ ...p, inStockOnly: false }))} className="ml-1 hover:text-red-600"><X size={12} /></button>
            </span>);
        filters.classification.forEach(v => badges.push(
            <span key={`c-${v}`} className="bg-blue-50 text-blue-800 text-xs px-2 py-1 rounded border border-blue-200 flex items-center">
                {t('分类:')} {v}<button onClick={() => toggleArrayFilter('classification', v)} className="ml-1"><X size={12} /></button>
            </span>
        ));
        filters.channels.forEach(v => badges.push(
            <span key={`ch-${v}`} className="bg-blue-50 text-blue-800 text-xs px-2 py-1 rounded border border-blue-200 flex items-center">
                {t('通道:')} {v}<button onClick={() => toggleArrayFilter('channels', v)} className="ml-1"><X size={12} /></button>
            </span>
        ));
        filters.packageType.forEach(v => badges.push(
            <span key={`p-${v}`} className="bg-blue-50 text-blue-800 text-xs px-2 py-1 rounded border border-blue-200 flex items-center">
                {t('封装:')} {v}<button onClick={() => toggleArrayFilter('packageType', v)} className="ml-1"><X size={12} /></button>
            </span>
        ));
        filters.brands.forEach(v => {
            const brand = filterOptions?.filters.brands?.options?.find((b: any) => b.id === v);
            badges.push(
                <span key={`b-${v}`} className="bg-purple-50 text-purple-800 text-xs px-2 py-1 rounded border border-purple-200 flex items-center">
                    <Tag size={10} className="mr-1" />{brand ? brand.name : v}
                    <button onClick={() => toggleArrayFilter('brands', v)} className="ml-1"><X size={12} /></button>
                </span>
            );
        });
        Object.entries(dynamicAttributeFilters).forEach(([attrId, filter]) => {
            if (filter.values && filter.values.length > 0) {
                filter.values.forEach(val => {
                    badges.push(
                        <span key={`dyn-${attrId}-${val}`} className="bg-orange-50 text-orange-800 text-xs px-2 py-1 rounded border border-orange-200 flex items-center">
                            {t('规格:')} {val}
                            <button onClick={() => removeDynamicFilter(Number(attrId), val)} className="ml-1 hover:text-red-600"><X size={12} /></button>
                        </span>
                    );
                });
            } else if (filter.min !== undefined || filter.max !== undefined) {
                badges.push(
                    <span key={`dyn-range-${attrId}`} className="bg-orange-50 text-orange-800 text-xs px-2 py-1 rounded border border-orange-200 flex items-center">
                        {t('规格:')} {filter.min ?? '-'} ~ {filter.max ?? '-'}
                        <button onClick={() => removeDynamicFilter(Number(attrId), '')} className="ml-1 hover:text-red-600"><X size={12} /></button>
                    </span>
                );
            }
        });
        return badges;
    };

    // ============================
    // 加载中
    // ============================
    if (catTreeLoading || initialLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-gray-100">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-red" />
                    <span className="text-gray-600">{t('加载中...')}</span>
                </div>
            </div>
        );
    }

    // ============================
    // 分类树加载失败
    // ============================
    if (catTreeError || categoryTree.length === 0) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-gray-100">
                <div className="flex flex-col items-center gap-4 max-w-md text-center px-6">
                    <RotateCcw className="w-12 h-12 text-gray-400" />
                    <div>
                        <h3 className="text-lg font-medium text-gray-800 mb-2">{t('分类数据加载失败')}</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            {t('无法加载产品分类数据，请检查网络连接后重试。')}
                        </p>
                        <button
                            onClick={() => setRetryKey(k => k + 1)}
                            className="px-6 py-2.5 bg-brand-red text-white text-sm rounded-sm hover:bg-red-700 transition-colors font-medium"
                        >
                            {t('重新加载')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const subs = currentRootChildren();

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-100 text-gray-800 font-sans">
            {/* 动态头部 */}
            <header className="bg-[#1a1a1a] text-white shadow-md z-30">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex flex-col justify-center h-full">
                        <div className="flex items-center space-x-2 text-xs text-gray-400 mb-1 select-none">
                            {/* 一级分类 */}
                            <div className="relative" onMouseLeave={() => setShowRootMenu(false)}>
                                <span className="hover:text-white cursor-pointer flex items-center transition-colors"
                                    onMouseEnter={() => setShowRootMenu(true)}>
                                    {activeRootName() || t('产品分类')} <ChevronDown size={10} className="ml-1" />
                                </span>
                                {showRootMenu && categoryTree.length > 0 && (
                                    <div className="absolute top-full left-0 pt-2 w-56 z-50">
                                        <div className="bg-white text-gray-800 shadow-xl rounded-sm border border-gray-200 py-1">
                                            <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase border-b border-gray-100 mb-1 bg-gray-50">{t('选择产品大类')}</div>
                                            {categoryTree.map(cat => (
                                                <div key={cat.id} onClick={() => switchRoot(cat.id, cat.name)}
                                                    className={`px-4 py-2.5 text-sm hover:bg-brand-red hover:text-white cursor-pointer transition-colors flex items-center justify-between ${cat.id === activeRootId ? 'bg-red-50 text-brand-red font-medium' : ''}`}>
                                                    {cat.name}
                                                    {cat.id === activeRootId && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {subs.length > 0 && (
                                <>
                                    <ChevronRight size={10} />
                                    <div className="relative" onMouseLeave={() => setShowSubMenu(false)}>
                                        <span className="hover:text-white cursor-pointer flex items-center transition-colors text-white font-medium"
                                            onMouseEnter={() => setShowSubMenu(true)}>
                                            {activeCategoryName} <ChevronDown size={10} className="ml-1" />
                                        </span>
                                        {showSubMenu && (
                                            <div className="absolute top-full left-0 pt-2 w-64 z-50 max-h-80 overflow-y-auto">
                                                <div className="bg-white text-gray-800 shadow-xl rounded-sm border border-gray-200 py-1">
                                                    <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase border-b border-gray-100 mb-1 bg-gray-50">
                                                        {activeRootName()} {t('子分类')}
                                                    </div>
                                                    {subs.map(sub => (
                                                        <div key={sub.id} onClick={() => switchSub(sub)}
                                                            className={`px-4 py-2.5 text-sm hover:bg-brand-red hover:text-white cursor-pointer transition-colors ${sub.id === activeCategoryId ? 'text-brand-red font-bold' : ''}`}>
                                                            {sub.name}
                                                            {sub.children && sub.children.length > 0 && (
                                                                <span className="ml-1 text-xs text-gray-400">({sub.children.length})</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <h1 className="text-xl font-medium text-white tracking-tight flex items-center">
                            {activeCategoryName}
                            <span className="ml-3 text-xs opacity-50 font-normal border-l border-gray-600 pl-3">Parametric Search</span>
                        </h1>
                    </div>

                    <div className="flex items-center space-x-4">
                        <button onClick={openComparison} disabled={selectedProductIds.length === 0}
                            className="flex items-center space-x-2 text-xs text-gray-300 hover:text-white border border-gray-600 rounded px-3 py-1.5 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            <Layers size={14} />
                            <span>{t('对比工具')} {selectedProductIds.length > 0 && `(${selectedProductIds.length})`}</span>
                        </button>
                        <button onClick={handleExport} className="flex items-center space-x-2 text-sm text-gray-300 hover:text-white transition-colors">
                            <Download size={16} /> <span className="hidden sm:inline">{t('导出数据')}</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* 主内容区 */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* 筛选侧边栏 */}
                <aside className={`bg-white border-r border-gray-200 overflow-y-auto z-20 transition-all duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'w-72' : 'w-0 opacity-0 pointer-events-none'}`}>
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10 shadow-sm">
                        <h2 className="font-bold text-gray-900 flex items-center">
                            <SlidersHorizontal size={16} className="mr-2 text-brand-red" />{t('筛选条件')}
                        </h2>
                        <button onClick={resetAllFilters} className="text-xs text-blue-600 hover:text-blue-800 flex items-center font-medium">
                            <RotateCcw size={12} className="mr-1" /> {t('重置')}
                        </button>
                    </div>
                    <div className="p-4 space-y-6 pb-20">
                        <div className="relative">
                            <input type="text"
                                className="w-full pl-9 pr-2 py-2 text-sm border border-gray-300 rounded focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none shadow-sm"
                                placeholder={t('搜索零件编号...')} value={filters.searchQuery} onChange={handleTextSearch} />
                            <Search size={16} className="absolute left-2.5 top-2.5 text-gray-400" />
                        </div>
                        <div className="bg-gray-50 p-3 rounded border border-gray-100">
                            <label className="flex items-center cursor-pointer select-none">
                                <div className="relative">
                                    <input type="checkbox" className="sr-only peer" checked={filters.inStockOnly}
                                        onChange={e => setFilters(p => ({ ...p, inStockOnly: e.target.checked }))} />
                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-red" />
                                </div>
                                <span className="ml-3 text-sm font-medium text-gray-700">{t('仅显示有货')}</span>
                            </label>
                        </div>
                        <hr className="border-gray-100" />
                        {getFilterComponents()}
                    </div>
                </aside>

                {/* 结果区 */}
                <main className="flex-1 overflow-hidden flex flex-col min-w-0">
                    <div className="bg-white border-b border-gray-200 p-3 flex items-center space-x-3 shadow-sm z-10">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors">
                            <SlidersHorizontal size={14} className="mr-2" />
                            {isSidebarOpen ? t('隐藏筛选') : t('显示筛选')}
                        </button>
                        <div className="flex-1 flex flex-wrap gap-2 overflow-hidden h-8 items-center">
                            {getActiveBadges()}
                        </div>
                        <div className="text-sm font-medium text-gray-600 whitespace-nowrap bg-gray-100 px-3 py-1 rounded-full flex items-center gap-2">
                            {loading && <Loader2 size={14} className="animate-spin" />}
                            {t('{{count}} 个产品', { count: totalProducts })}
                        </div>
                    </div>

                    <div className="flex-1 p-4 overflow-hidden bg-gray-50">
                        <ResultsTable
                            products={products}
                            columns={getColumns()}
                            sortConfig={sortConfig}
                            onSort={handleSort}
                            selectedIds={selectedProductIds}
                            onToggleSelection={toggleProductSelection}
                            loading={loading}
                        />

                        {/* 分页 */}
                        {totalProducts > pageSize && (
                            <div className="mt-4 flex justify-center">
                                <div className="flex items-center space-x-2">
                                    {Array.from({ length: Math.ceil(totalProducts / pageSize) }, (_, i) => i + 1)
                                        .filter(page => {
                                            const total = Math.ceil(totalProducts / pageSize);
                                            return page === 1 || page === total || Math.abs(page - currentPage) <= 2;
                                        })
                                        .map((page, index, arr) => (
                                            <React.Fragment key={page}>
                                                {index > 0 && arr[index - 1] !== page - 1 && (
                                                    <span className="text-gray-400">...</span>
                                                )}
                                                <button onClick={() => handlePageChange(page)}
                                                    className={`px-3 py-1 rounded text-sm ${currentPage === page ? 'bg-brand-red text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'}`}>
                                                    {page}
                                                </button>
                                            </React.Fragment>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* 对比弹窗 */}
            {isComparisonOpen && (
                <ComparisonModal
                    products={products.filter(p => selectedProductIds.includes(p.id))}
                    onClose={() => setIsComparisonOpen(false)}
                    onRemove={removeFromComparison}
                />
            )}
        </div>
    );
};

export default ParametricSearch;
