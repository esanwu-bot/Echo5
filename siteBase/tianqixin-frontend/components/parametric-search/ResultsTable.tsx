import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Product, SortConfig, ColumnDef } from './types';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, ArrowUp, ArrowDown, Check, X, Loader2, ChevronDown, ChevronRight } from 'lucide-react';

interface ResultsTableProps {
    products: Product[];
    columns: ColumnDef[];
    sortConfig: SortConfig;
    onSort: (key: keyof Product) => void;
    selectedIds?: string[];
    onToggleSelection?: (id: string) => void;
    loading?: boolean;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
    products,
    columns,
    sortConfig,
    onSort,
    selectedIds = [],
    onToggleSelection,
    loading
}) => {
    const { t } = useTranslation();
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const renderSortIcon = (columnKey: keyof Product) => {
        if (sortConfig?.key !== columnKey) return <ArrowUpDown size={14} className="text-gray-300 ml-1" />;
        return sortConfig.direction === 'asc' ?
            <ArrowUp size={14} className="text-brand-red ml-1" /> :
            <ArrowDown size={14} className="text-brand-red ml-1" />;
    };

    return (
        <div className="overflow-auto border border-gray-200 rounded-sm shadow-sm bg-white h-full flex flex-col relative">
            {loading && (
                <div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin text-brand-red" />
                </div>
            )}
            <div className="flex-1 overflow-auto tech-scrollbar relative">
                <table className="min-w-full divide-y divide-gray-200 border-collapse">
                    <thead>
                        <tr>
                            {/* Checkbox Column Header */}
                            <th className="px-4 py-3 bg-gray-50 border-b border-r border-gray-200 sticky top-0 z-10 w-12 text-center">
                                <span className="sr-only">Select</span>
                            </th>

                            {/* Expand Column Header */}
                            <th className="px-2 py-3 bg-gray-50 border-b border-r border-gray-200 sticky top-0 z-10 w-10 text-center">
                                <span className="sr-only">Expand</span>
                            </th>

                            {/* 产品名称 Column */}
                            <th className="px-4 py-3 bg-gray-50 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-r border-gray-200 sticky top-0 z-10 w-48">
                                {t('产品名称')}
                            </th>

                            {columns.map(col => (
                                <th
                                    key={col.key as string}
                                    className={`px-4 py-3 bg-gray-50 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer border-b border-r border-gray-200 hover:bg-gray-100 select-none sticky top-0 z-10 ${col.width || 'w-auto'}`}
                                    onClick={() => onSort(col.key)}
                                >
                                    <div className="flex items-center">
                                        {col.label}
                                        {renderSortIcon(col.key)}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {products.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + 3} className="px-6 py-12 text-center text-gray-500 text-sm">
                                    {t('没有符合筛选条件的产品。')}
                                </td>
                            </tr>
                        ) : (
                            products.map((product) => {
                                const isSelected = selectedIds.includes(product.id);
                                const isExpanded = expandedIds.has(product.id);
                                const hasModels = product.models.length > 0;
                                return (
                                    <React.Fragment key={product.id}>
                                        {/* 产品行 */}
                                        <tr className={`hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>

                                            {/* Checkbox Cell */}
                                            <td className="px-4 py-2 border-r border-gray-100 text-center relative">
                                                <input
                                                    type="checkbox"
                                                    className="cursor-pointer w-4 h-4 text-brand-red rounded focus:ring-brand-red border-gray-300"
                                                    checked={isSelected}
                                                    onChange={() => onToggleSelection?.(product.id)}
                                                />
                                            </td>

                                            {/* Expand/Collapse Cell */}
                                            <td className="px-2 py-2 border-r border-gray-100 text-center">
                                                {hasModels && (
                                                    <button
                                                        onClick={() => toggleExpand(product.id)}
                                                        className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 transition-colors"
                                                        title={isExpanded ? t('折叠型号') : t('展开型号')}
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown size={16} className="text-gray-500" />
                                                        ) : (
                                                            <ChevronRight size={16} className="text-gray-400" />
                                                        )}
                                                    </button>
                                                )}
                                            </td>

                                            {/* 产品名称 Cell */}
                                            <td className="px-4 py-2 whitespace-nowrap text-sm font-semibold text-brand-red border-r border-gray-100">
                                                <a
                                                    href={`/series/${product.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="hover:underline"
                                                >
                                                    {product.name || product.partNumber}
                                                </a>
                                            </td>

                                            {columns.map(col => {
                                                const val = product[col.key];
                                                if (col.key === 'partNumber') {
                                                    return (
                                                        <td key={col.key as string} className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 border-r border-gray-100">
                                                            {product.modelId ? (
                                                                <a
                                                                    href={`/models/${product.modelId}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-brand-red hover:underline"
                                                                >
                                                                    {val}
                                                                </a>
                                                            ) : (
                                                                val
                                                            )}
                                                        </td>
                                                    );
                                                }
                                                if (col.key === 'inStock') {
                                                    return (
                                                        <td key={col.key as string} className="px-4 py-2 whitespace-nowrap text-sm border-r border-gray-100">
                                                            {val ? (
                                                                <span className="flex items-center text-green-700 font-medium">
                                                                    <Check size={14} className="mr-1" /> {t('有货')}
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center text-red-600">
                                                                    <X size={14} className="mr-1" /> {t('无货')}
                                                                </span>
                                                            )}
                                                        </td>
                                                    );
                                                }
                                                if (col.key === 'price') {
                                                    return (
                                                        <td key={col.key as string} className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 border-r border-gray-100">
                                                            ${(val as number).toFixed(2)} USD
                                                        </td>
                                                    );
                                                }
                                                return (
                                                    <td key={col.key as string} className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 border-r border-gray-100">
                                                        {val}
                                                    </td>
                                                );
                                            })}
                                        </tr>

                                        {/* 型号展开子行 */}
                                        {isExpanded && hasModels && (
                                            <tr className="bg-blue-50/40 border-b border-gray-200">
                                                <td className="px-4 py-2 border-r border-gray-100"></td>
                                                <td className="px-2 py-2 border-r border-gray-100"></td>
                                                <td className="px-4 py-2 border-r border-gray-100" colSpan={columns.length + 1}>
                                                    <div className="pl-8 py-1 text-sm">
                                                        <span className="text-gray-500 mr-2">{t('关联型号')}:</span>
                                                        <div className="inline-flex flex-wrap gap-x-4 gap-y-1">
                                                            {product.models.map((model, idx) => (
                                                                <span key={model.id} className="inline-flex items-center">
                                                                    <a
                                                                        href={`/models/${model.id}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-brand-red font-medium hover:underline"
                                                                    >
                                                                        {model.code}
                                                                    </a>
                                                                    {model.name && (
                                                                        <span className="text-gray-500 ml-1">({model.name})</span>
                                                                    )}
                                                                    {idx < product.models.length - 1 && (
                                                                        <span className="text-gray-300 ml-4">|</span>
                                                                    )}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        {isExpanded && !hasModels && (
                                            <tr className="bg-blue-50/40 border-b border-gray-200">
                                                <td className="px-4 py-2 border-r border-gray-100"></td>
                                                <td className="px-2 py-2 border-r border-gray-100"></td>
                                                <td className="px-4 py-2 border-r border-gray-100" colSpan={columns.length + 1}>
                                                    <div className="pl-8 py-1 text-sm text-gray-400">
                                                        {t('暂无关联型号')}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-xs text-gray-500 flex justify-between items-center">
                <span>{t('显示 {{count}} 个结果', { count: products.length })}</span>
                <span className="text-gray-400">Selected: {selectedIds.length}</span>
            </div>
        </div>
    );
};
