import React from 'react';
import { useTranslation } from 'react-i18next';

interface RangeFilterProps {
    title: string;
    min: number | '';
    max: number | '';
    onMinChange: (val: number | '') => void;
    onMaxChange: (val: number | '') => void;
    unit?: string;
}

export const RangeFilter: React.FC<RangeFilterProps> = ({
    title,
    min,
    max,
    onMinChange,
    onMaxChange,
    unit = ''
}) => {
    const { t } = useTranslation();
    return (
        <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-700 uppercase mb-2 tracking-wider">
                {title} {unit && <span className="text-gray-400 normal-case">({unit})</span>}
            </h3>
            <div className="flex items-center space-x-2">
                <input
                    type="number"
                    placeholder={t('最小')}
                    value={min}
                    onChange={(e) => onMinChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition-all"
                />
                <span className="text-gray-400">-</span>
                <input
                    type="number"
                    placeholder={t('最大')}
                    value={max}
                    onChange={(e) => onMaxChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition-all"
                />
            </div>
        </div>
    );
};
