import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const NotFoundPage: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-20 text-center">
            <div className="relative mb-8">
                {/* 404 Illustration placeholder - using SVG for a clean look */}
                <div className="w-64 h-64 md:w-80 md:h-80 relative flex items-center justify-center">
                    <svg
                        viewBox="0 0 200 200"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full"
                    >
                        <circle cx="100" cy="100" r="40" fill="#E0E7FF" />
                        <path
                            d="M60 100C60 77.9086 77.9086 60 100 60C122.091 60 140 77.9086 140 100C140 122.091 122.091 140 100 140C77.9086 140 60 122.091 60 100Z"
                            fill="#BFDBFE"
                        />
                        <path
                            d="M145 85C145 85 130 70 100 70C70 70 55 85 55 85"
                            stroke="#60A5FA"
                            strokeWidth="4"
                            strokeLinecap="round"
                        />
                        <path
                            d="M140 115C140 115 125 130 100 130C75 130 60 115 60 115"
                            stroke="#60A5FA"
                            strokeWidth="4"
                            strokeLinecap="round"
                        />
                        <path
                            d="M40 60C40 60 50 55 60 60"
                            stroke="#DBEAFE"
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                        <path
                            d="M140 140C140 140 150 135 160 140"
                            stroke="#DBEAFE"
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                        <path
                            d="M160 60L140 70L150 80L160 60Z"
                            fill="#93C5FD"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-8xl md:text-9xl font-bold text-blue-500/20 select-none">404</span>
                    </div>
                </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('页面未找到')}</h1>
            <p className="text-gray-600 text-lg mb-8 max-w-md">
                {t('您访问的页面不存在')}
            </p>

            <Link
                to="/"
                className="px-8 py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors duration-300 shadow-lg hover:shadow-xl"
            >
                {t('返回首页')}
            </Link>
        </div>
    );
};
