"use client";

import React, { useState } from 'react';
import { Tabs, Input, Tag } from 'antd';
import RichTextEditor from './RichTextEditor';

const { TextArea } = Input;

type InputType = 'input' | 'textarea' | 'richtext';

interface MultiLangInputProps {
    value?: Record<string, string>; // { base: string, en: string, ja: string, ko: string }
    onChange?: (value: Record<string, string>) => void;
    type?: InputType;
    placeholder?: string;
    height?: number; // For RichTextEditor
}

const LANGUAGES = [
    { key: 'base', label: '中文 (简体)', color: 'blue' },
    { key: 'zh_hant', label: '中文 (繁體)', color: 'cyan' },
    { key: 'en', label: 'English', color: 'green' },
    { key: 'ja', label: 'Japanese', color: 'orange' },
    { key: 'ko', label: 'Korean', color: 'purple' },
];

const MultiLangInput: React.FC<MultiLangInputProps> = ({
    value = { base: '', zh_hant: '', en: '', ja: '', ko: '' },
    onChange,
    type = 'input',
    placeholder = '请输入内容...',
    height = 200,
}) => {
    const [activeTab, setActiveTab] = useState('base');

    const handleFieldChange = (lang: string, newValue: string) => {
        const updatedValue = { ...value, [lang]: newValue };
        if (onChange) {
            onChange(updatedValue);
        }
    };

    const renderInput = (lang: string) => {
        const val = value[lang] || '';

        switch (type) {
            case 'textarea':
                return (
                    <TextArea
                        value={val}
                        onChange={(e) => handleFieldChange(lang, e.target.value)}
                        placeholder={placeholder}
                        rows={4}
                    />
                );
            case 'richtext':
                return (
                    <RichTextEditor
                        value={val}
                        onChange={(content) => handleFieldChange(lang, content)}
                        placeholder={placeholder}
                        height={height}
                    />
                );
            default:
                return (
                    <Input
                        value={val}
                        onChange={(e) => handleFieldChange(lang, e.target.value)}
                        placeholder={placeholder}
                    />
                );
        }
    };

    return (
        <div className="multi-lang-input-container" style={{ border: '1px solid #f0f0f0', borderRadius: '8px', padding: '12px', background: '#fafafa' }}>
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                type="card"
                size="small"
                tabBarGutter={4}
                items={LANGUAGES.map((lang) => ({
                    key: lang.key,
                    label: (
                        <span style={{ whiteSpace: 'nowrap' }}>
                            {lang.label} {value[lang.key] ? <Tag color={lang.color} style={{ marginLeft: 4, height: 16, lineHeight: '14px', fontSize: 10 }}>已录入</Tag> : null}
                        </span>
                    ),
                    children: (
                        <div style={{ marginTop: 8 }}>
                            {renderInput(lang.key)}
                        </div>
                    ),
                }))}
            />
        </div>
    );
};

export default MultiLangInput;
