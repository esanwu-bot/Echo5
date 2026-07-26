import React from 'react';
import { useTranslation } from 'react-i18next';
import { ApplicationCategory } from '../lib/api-client';

interface Props {
    category: ApplicationCategory;
}

export const ApplicationTemplateA: React.FC<Props> = ({ category }) => {
    const { t } = useTranslation();
    return (
        <div className="bg-white min-h-screen">
            {/* Header Section */}
            <div className="container mx-auto px-4 md:px-8 py-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {t(category.name)} <span className="text-blue-500">{category.name_en}</span>
                </h1>
                <div className="text-sm text-gray-600 leading-relaxed max-w-4xl">
                    {category.description ? t(category.description) : t('暂无描述')}
                </div>
            </div>

            <div className="bg-gray-50 py-8">
                <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row gap-8">
                    {/* Left Sidebar */}
                    <div className="w-full md:w-1/4">
                        <div className="bg-white p-4 rounded shadow-sm sticky top-4">
                            <h3 className="font-bold text-lg mb-4">{t('极限制参数')}</h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li>{t('(1) 允许功耗Pm')}</li>
                                <li>{t('(2) 最大正向直流电流IFm')}</li>
                                <li>{t('(3) 最大反向电压VRm')}</li>
                                <li>{t('(4) 工作环境topm')}</li>
                            </ul>

                            <h3 className="font-bold text-lg mt-6 mb-4">{t('独特优势')}</h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li>{t('(一) 节约能源')}</li>
                                <li>{t('(二) 安全环保')}</li>
                                <li>{t('(三) 使用寿命长')}</li>
                                <li>{t('(四) 响应速度快')}</li>
                            </ul>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="w-full md:w-3/4">
                        <div className="bg-white p-8 rounded shadow-sm mb-8">
                            <h2 className="text-xl font-bold mb-4">{t('极限制参数')}</h2>
                            <div className="text-sm text-gray-600 space-y-2">
                                <p>{t('(1) 允许功耗Pm:允许加于LED两端正向直流电压与流过它的电流之积的最大值。超过此值，LED发热、损坏。')}</p>
                                <p>{t('(2) 最大正向直流电流IFm:允许加的最大的正向直流电流。超过此值可损坏二极管。')}</p>
                                <p>{t('(3) 最大反向电压VRm:所允许加的最大反向电压。超过此值，发光二极管可能被击穿损坏。')}</p>
                                <p>{t('(4) 工作环境topm:发光二极管可正常工作的环境温度范围。低于或高于此温度范围，发光二极管将不能正常工作，效率大大降低。')}</p>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded shadow-sm">
                            <h2 className="text-xl font-bold mb-4">{t('独特优势')}</h2>
                            <div className="text-sm text-gray-600 space-y-4">
                                <p>{t('(一)节约能源: LED的光谱几乎全部集中于可见光频段，其发光效率可达80-90%。')}</p>
                                <p>{t('(二)安全环保: LED的工作电压低，多为1.4-3V; 普通LED工作电流仅为10mA，超高亮度的也不过1A。')}</p>
                                <p>{t('(三)使用寿命长: LED体积小、重量轻，外壳为环氧树脂封装，不仅可以保护内部芯片，还具有透光聚光的能力。')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
