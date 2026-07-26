import React from 'react';

// 支持字符串/数字，或带 label/value 的对象
type OptionItem = string | number | { label: string; value: string | number };

interface CheckboxFilterProps {
    title: string;
    options: OptionItem[];
    selectedValues: (string | number)[];
    onChange: (value: string | number) => void;
    unit?: string;
}

const getLabel = (opt: OptionItem): string => {
    if (typeof opt === 'object' && opt !== null && 'label' in opt) return opt.label;
    return String(opt);
};

const getValue = (opt: OptionItem): string | number => {
    if (typeof opt === 'object' && opt !== null && 'value' in opt) return opt.value;
    return opt as string | number;
};

export const CheckboxFilter: React.FC<CheckboxFilterProps> = ({
    title,
    options,
    selectedValues,
    onChange,
    unit = ''
}) => {
    return (
        <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-700 uppercase mb-2 tracking-wider">{title}</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-2 tech-scrollbar">
                {options.map((option) => {
                    const val = getValue(option);
                    const label = getLabel(option);
                    return (
                        <label key={String(val)} className="flex items-center space-x-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                className="form-checkbox h-4 w-4 text-brand-red rounded border-gray-300 focus:ring-brand-red"
                                checked={selectedValues.includes(val)}
                                onChange={() => onChange(val)}
                            />
                            <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                                {label}{unit}
                            </span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
};
