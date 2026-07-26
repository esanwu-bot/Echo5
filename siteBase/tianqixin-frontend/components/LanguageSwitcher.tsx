import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { systemApi } from '@/lib/api-client'

const languages = [
    { code: 'zh', label: 'CN', name: '中文 (Chinese)' },
    { code: 'en', label: 'US', name: 'English' },
    { code: 'ja', label: 'JP', name: '日本語 (Japanese)' },
    { code: 'ko', label: 'KR', name: '한국어 (Korean)' },
];

export const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleChange = async (langCode: string) => {
        i18n.changeLanguage(langCode);
        // 更新 localStorage 和 cookie（api-client.ts 读取这些值设置 cb-lang 头）
        localStorage.setItem('lang', langCode);
        document.cookie = `lang=${langCode}; path=/; max-age=31536000`; // 1 year
        setIsOpen(false);
        // 2. 清除后端缓存
        try {
            await systemApi.clearCache()
        } catch (error) {
            console.error('清除缓存失败:', error)
        }
        // // 刷新页面以重新加载所有多语言数据（确保 API 请求带上新的 cb-lang）
        window.location.reload();
    };

    const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-auto h-7 gap-2 px-3 text-white bg-white/10 border border-white/30 hover:bg-white/20 hover:text-white focus:ring-0 focus:ring-offset-0 rounded-sm transition-colors flex items-center"
            >
                <Globe className="w-3.5 h-3.5" />
                <span className="text-xs font-medium mr-1">{currentLanguage.name.split(' ')[0]}</span>
                <ChevronDown className="w-4 h-4 opacity-50" />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-1 min-w-[200px] bg-white border border-gray-200 rounded-md shadow-xl z-[9999] overflow-hidden">
                    <div className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-white">
                        Select Language
                    </div>
                    <div className="py-1">
                        {languages.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => handleChange(lang.code)}
                                className="w-full py-2.5 pl-3 pr-8 cursor-pointer hover:bg-gray-50 text-left relative flex items-center"
                            >
                                <span className="flex items-center gap-3 flex-1">
                                    <span className="text-[10px] font-bold text-gray-400 w-6">{lang.label}</span>
                                    <span className="text-sm font-medium text-gray-900">{lang.name}</span>
                                </span>
                                {i18n.language === lang.code && (
                                    <Check className="absolute right-2 w-4 h-4 text-[#e60012]" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
