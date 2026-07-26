'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Product, CategoryConfig, ColumnDef } from './types';
import { X, Check, Image as ImageIcon } from 'lucide-react';

interface ComparisonModalProps {
  products: Product[];
  config?: CategoryConfig;
  onClose: () => void;
  onRemove: (id: string) => void;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({ 
  products, 
  config, 
  onClose, 
  onRemove 
}) => {
  const { t } = useTranslation();

  // Define standard rows that should always appear at the top
  const standardFields: { key: keyof Product; label: string }[] = [
    { key: 'manufacturer', label: t('厂商') },
    { key: 'description', label: t('描述') },
    { key: 'price', label: `${t('价格')} (USD)` },
    { key: 'inStock', label: t('库存状态') },
    { key: 'packageType', label: t('封装') },
  ];

  // Get technical specification fields from config if available
  const techFields: { key: keyof Product; label: string }[] = config?.columns
    ? config.columns
        .filter(col => 
          !standardFields.some(std => std.key === col.key) && col.key !== 'partNumber'
        )
        .map(col => ({ key: col.key, label: col.label }))
    : [];

  const allRows = [...standardFields, ...techFields];

  const renderValue = (val: any, key: keyof Product) => {
    if (typeof val === 'boolean') {
      return val ? 
        <div className="flex items-center text-green-700">
          <Check size={16} className="mr-1"/> {t('有货')}
        </div> : 
        <div className="flex items-center text-red-600">
          <X size={16} className="mr-1"/> {t('无货')}
        </div>;
    }
    if (key === 'price') return typeof val === 'number' ? `$${val.toFixed(2)} USD` : val;
    return val || '-';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{t('对比产品')}</h2>
            <p className="text-sm text-gray-500">{t('正在对比 {{count}} 个产品', { count: products.length })}</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-800"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Table Content */}
        <div className="overflow-auto flex-1 tech-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {/* Feature Name Column */}
                <th className="p-3 text-left bg-gray-100 border-b border-r border-gray-200 min-w-[180px] sticky left-0 top-0 z-20 font-semibold text-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <span className="sr-only">{t('参数')}</span>
                </th>
                
                {/* Product Headers */}
                {products.map(p => (
                  <th key={p.id} className="p-4 text-left bg-white border-b border-r border-gray-200 min-w-[220px] sticky top-0 z-10 align-top group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 pr-2">
                        <div className="text-ti-red font-bold text-lg leading-tight break-words">{p.partNumber}</div>
                        <div className="text-xs text-gray-500 mt-1">{p.manufacturer}</div>
                      </div>
                      <button 
                        onClick={() => onRemove(p.id)}
                        className="text-gray-300 hover:text-red-600 transition-colors p-1"
                        title={t('从对比中移除')}
                      >
                        <X size={18} />
                      </button>
                    </div>
                    
                    {/* Placeholder Image */}
                    <div className="w-full h-24 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-400 mb-2">
                      <ImageIcon size={32} />
                    </div>

                    <a href="#" className="text-xs text-blue-600 hover:underline block mt-2">{t('查看数据手册')}</a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allRows.map((row) => (
                <tr key={row.key as string} className="hover:bg-blue-50/50 transition-colors">
                  {/* Row Label */}
                  <td className="p-3 border-b border-r border-gray-200 bg-gray-50 font-medium text-gray-600 text-sm sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    {row.label || row.key}
                  </td>
                  
                  {/* Row Values */}
                  {products.map(p => (
                    <td key={`${p.id}-${row.key}`} className="p-3 border-b border-r border-gray-200 text-sm text-gray-800">
                      {renderValue(p[row.key], row.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-white transition-colors"
          >
            {t('关闭')}
          </button>
        </div>
      </div>
    </div>
  );
};
