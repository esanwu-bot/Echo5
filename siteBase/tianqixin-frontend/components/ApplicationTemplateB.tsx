import React from 'react';
import { useTranslation } from 'react-i18next';
import { ApplicationCategory } from '../lib/api-client';

interface Props {
    category: ApplicationCategory;
}

export const ApplicationTemplateB: React.FC<Props> = ({ category }) => {
    const { t } = useTranslation();
    return (
        <div className="bg-white min-h-screen">
            {/* Top Banner */}
            <div className="w-full h-[200px] bg-gray-100 flex items-center justify-center relative overflow-hidden">
                {/* Placeholder for banner image */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-cyan-800 opacity-90"></div>
                <div className="relative z-10 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                        {t(category.name)} <span className="text-cyan-300">{category.name_en}</span>
                    </h1>
                    <div className="text-white/80 text-lg">PRODUCT APPLICATION FIELDS</div>
                    <div className="text-white/60 text-sm mt-2">{t('产品应用领域')}</div>
                </div>
            </div>

            <div className="container mx-auto px-4 md:px-8 py-16">
                <div className="grid grid-cols-1 gap-12">
                    {/* Example Item 1 */}
                    <div className="flex flex-col md:flex-row gap-8 border-b border-gray-100 pb-12">
                        <div className="w-full md:w-1/4">
                            <h3 className="text-xl font-bold text-cyan-500 mb-1">{t('电源管理')}</h3>
                            <h4 className="text-sm font-bold text-cyan-400 mb-4">POWER MANAGEMENT</h4>
                            <img src="https://placehold.co/300x200?text=Power+Management" alt="Power Management" className="w-full object-contain" />
                        </div>
                        <div className="w-full md:w-3/4 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="font-bold text-gray-900 mb-2">{t('Products产品:')}</h4>
                                <p className="text-sm text-gray-600">Integrated circuit集成电路 Switch diodes 开关二极管 Transistors 三极管</p>
                                <p className="text-sm text-gray-600">Rectifier diodes 整流二极管 Fast recovery rectifiers 快恢复整流管</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 mb-2">{t('Applications应用:')}</h4>
                                <p className="text-sm text-gray-600">UPS equipment不间断电源设备</p>
                                <p className="text-sm text-gray-600">Power control & Management电源控制管理</p>
                            </div>
                        </div>
                    </div>

                    {/* Example Item 2 */}
                    <div className="flex flex-col md:flex-row gap-8 border-b border-gray-100 pb-12">
                        <div className="w-full md:w-1/4">
                            <h3 className="text-xl font-bold text-cyan-500 mb-1">{t('IOT & 智能家居')}</h3>
                            <h4 className="text-sm font-bold text-cyan-400 mb-4">IOT & SMART HOME</h4>
                            <img src="https://placehold.co/300x200?text=IOT" alt="IOT" className="w-full object-contain" />
                        </div>
                        <div className="w-full md:w-3/4 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="font-bold text-gray-900 mb-2">{t('Products产品:')}</h4>
                                <p className="text-sm text-gray-600">Zener diodes 稳压二极管 ESD protection tubes ESD保护管</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 mb-2">{t('Applications应用:')}</h4>
                                <p className="text-sm text-gray-600">Temperature controller温控器 Counter计数器 WLAN设备</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
