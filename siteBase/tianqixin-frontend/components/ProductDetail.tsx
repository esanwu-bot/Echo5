import React, { useState, useEffect } from 'react';
import { Check, Search, Download, ChevronDown, FileText, Cpu, Calculator, Box, ArrowUpDown, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Seo } from './Seo';
import { JsonLd, buildProductSchema, buildBreadcrumbSchema } from './JsonLd';
import { cartApi, getAuthToken } from '../lib/api-client';
import { sanitizeHtml } from '../lib/sanitize';

// 产品详情接口定义
interface ProductDetailData {
    // ========== 1. 页面基础信息 ==========
    pageBaseInfo: {
        productId: string;
        productName: string;
        productAlias: string;
        language: string;
        currency: string;
        isPreOrder: boolean;
        viewCount: number;
        createTime: string;
        updateTime: string;
    };

    // ========== 2. 产品参数（参数规格） ==========
    productParameters: Array<{
        paramName: string;
        paramValue: string | number;
        paramUnit: string;
    }>;

    // ========== 3. 技术文档（文档列表） ==========
    technicalDocuments: Array<{
        docId: string;
        docName: string;
        docType: string;
        docSize: string;
        downloadUrl: string;
        uploadTime: string;
        language: string;
        description: string;
    }>;

    // ========== 4. 设计与开发（资源分类 + 资源列表） ==========
    designAndDevelop: {
        hardwareDev: Array<{
            resourceId: string;
            resourceName: string;
            resourceDesc: string;
            downloadUrl: string;
            fileSize: string;
            uploadTime: string;
            actionBtn: string;
        }>;
        softwareDev: Array<{
            resourceId: string;
            resourceName: string;
            resourceDesc: string;
            downloadUrl: string;
            fileSize: string;
            uploadTime: string;
            actionBtn: string;
        }>;
        designTools: Array<{
            resourceId: string;
            resourceName: string;
            resourceDesc: string;
            downloadUrl: string;
            fileSize: string;
            uploadTime: string;
            actionBtn: string;
        }>;
        cadCaemodels: Array<{
            modelId: string;
            modelName: string;
            modelType: string;
            modelFormat: string;
            downloadUrl: string;
            fileSize: string;
            uploadTime: string;
            actionBtn: string;
        }>;
    };

    // ========== 5. 订购和质量（订购信息 + 质量管控） ==========
    orderAndQuality: {
        orderInfo: {
            moq: string;
            packaging: string;
            packagingSpec: string;
            leadTime: string;
            priceRange: {
                [key: string]: string;
            };
            regionSupport: Array<string>;
            purchaseUrl: string;
        };
        qualityInfo: {
            qualityPolicy: string;
            certifications: Array<string>;
            reliabilityReportUrl: string;
        };
    };

    // 额外保留的兼容字段
    id: number;
    images: string[];
    main_image: string;
    package_type: string;
    pin_count: number;
    stock: number;
    is_new: boolean;
    breadcrumbs: Array<{ label: string; link: string }>;
    features: string; // 产品特性
    package_info: {
        package_type: string;
        pin_count: number;
        size: string;
    };
    // 型号数据
    model?: {
        id: number;
        model_code: string;
        model_name: string;
        pin_count?: number;
        stock?: number;
        packaging_spec?: string;
        operating_temperature?: string;
        material_type?: string;
        pin_plating?: string;
        moq?: number;
        lead_time?: number;
    };
}

interface ProductDetailProps {
    productId?: string;
    onNavigate?: (path: string) => void;
}

// 产品特性组件
interface ProductFeaturesProps {
    features?: string;
}

const ProductFeatures: React.FC<ProductFeaturesProps> = ({ features }) => {
    const { t } = useTranslation();
    if (!features || features.trim() === '') {
        return (
            <div className="text-sm text-gray-500 py-4">
                {t('暂无特性信息')}
            </div>
        );
    }

    // 解析特性文本，按行分割
    const lines = features.split('\n').filter(line => line.trim() !== '');
    
    // 解析特性列表，支持缩进表示层级
    const parsedFeatures: Array<{ text: string; level: number }> = [];
    lines.forEach(line => {
        // 计算缩进层级 (根据前导空格或tab)
        const match = line.match(/^(\s*)/);
        const indent = match ? match[0].length : 0;
        const level = Math.floor(indent / 2); // 每2个空格算一级
        
        // 去除前导的 - * • 等列表标记和空格
        let text = line.trim().replace(/^[\s\-\*•]+/, '').trim();
        
        if (text) {
            parsedFeatures.push({ text, level: Math.min(level, 3) });
        }
    });

    if (parsedFeatures.length === 0) {
        // 如果没有解析出列表项，直接显示原文
        return (
            <div className="space-y-4 text-sm text-gray-700">
                <div className="whitespace-pre-line">{features}</div>
            </div>
        );
    }

    return (
        <div className="space-y-4 text-sm text-gray-700">
            <ul className="list-none space-y-3">
                {parsedFeatures.map((feature, index) => (
                    <li 
                        key={index} 
                        className="flex items-start gap-2"
                        style={{ marginLeft: `${feature.level * 24}px` }}
                    >
                        <span 
                            className={`inline-block w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${
                                feature.level === 0 ? 'bg-gray-600' : 'bg-gray-400'
                            }`}
                        ></span>
                        <span>{feature.text}</span>
                    </li>
                ))}
            </ul>
            <div className="mt-6 pt-4 border-t border-gray-200">
                <button className="text-sm text-brand-red hover:underline flex items-center gap-2">
                    <span>{t('显示全部')}</span>
                    <ChevronDown className="w-4 h-4" />
                </button>
            </div>
            <div className="mt-6 text-sm text-brand-red">
                <a href="#" className="hover:underline flex items-center gap-2">
                    <span className="inline-block w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-brand-red"></span>
                    {t('查找其他类似的ADC')}
                </a>
            </div>
        </div>
    );
};

export const ProductDetail: React.FC<ProductDetailProps> = ({ productId, onNavigate }) => {
    const { t } = useTranslation();
    const [activeSection, setActiveSection] = useState('details');
    const [activeDetailTab, setActiveDetailTab] = useState(t('参数')); // 新增：详情页子标签状态
    const [productData, setProductData] = useState<ProductDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [addingToCart, setAddingToCart] = useState(false);

    const scrollToSection = (id: string) => {
        setActiveSection(id);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // 获取产品详情数据
    useEffect(() => {
        if (!productId) {
            setLoading(false);
            setError(t('产品ID无效'));
            return;
        }

        const fetchProductDetail = async () => {
            setLoading(true);
            setError(null);
            try {
                const { productApi } = await import('../lib/api-client');
                const data = await productApi.getProduct(Number(productId));
                if (data.code === 200 && data.data) {
                    setProductData(data.data);
                } else {
                    throw new Error(data.message || t('获取产品详情失败'));
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : t('获取产品详情失败'));
            } finally {
                setLoading(false);
            }
        };

        fetchProductDetail();
    }, [productId]);

    const handleOrderNow = async () => {
        if (!productData) return;

        const token = getAuthToken();
        if (!token) {
            const returnUrl = encodeURIComponent(`/product/${productId}`);
            if (onNavigate) {
                onNavigate(`/login?redirect=${returnUrl}`);
            } else {
                window.location.href = `/login?redirect=${returnUrl}`;
            }
            return;
        }

        // 获取产品ID，优先使用 productData.id，如果不存在则使用 pageBaseInfo.productId
        const pid = productData.id || parseInt(productData.pageBaseInfo?.productId) || parseInt(productId || '0');
        
        if (!pid || isNaN(pid)) {
        alert(t('产品ID无效，无法添加到购物车'));
        return;
    }

    try {
        setAddingToCart(true);
        console.log('Adding to cart, product_id:', pid);
        
        const res = await cartApi.addToCart({
            product_id: pid,
            quantity: 1
        });

        console.log('Add to cart response:', res);

        if (res.code === 200) {
            if (onNavigate) {
                onNavigate('/mall/added-success');
            } else {
                window.location.href = '/mall/added-success';
            }
        } else {
            alert(res.message || t('添加到购物车失败：') + JSON.stringify(res));
        }
    } catch (err: any) {
        console.error('Order now failed', err);
        if (err.message && err.message.includes('Failed to fetch')) {
            alert(t('添加到购物车失败：无法连接到服务器，请检查网络连接'));
        } else {
            alert(t('添加到购物车失败：') + (err.message || t('请稍后重试')));
        }
    } finally {
        setAddingToCart(false);
    }
    };

    // 加载状态
    if (loading) {
        return <div className="flex justify-center items-center h-screen">{t('加载中...')}</div>;
    }

    // 错误状态
    if (error || !productData) {
        return <div className="flex justify-center items-center h-screen text-red-600">{error || t('产品不存在')}</div>;
    }

    const productName = productData.pageBaseInfo.productName;
    const productAlias = productData.pageBaseInfo.productAlias || '';
    const productUrl = `/product/${productData.pageBaseInfo.productId || productId}`;
    const productImage = productData.main_image || (productData.images && productData.images.length > 0 ? productData.images[0] : undefined);
    const breadcrumbs = productData.breadcrumbs?.length
        ? productData.breadcrumbs.map((crumb) => ({ name: crumb.label, url: crumb.link || '/' }))
        : [
            { name: t('首页'), url: '/' },
            { name: t('产品中心'), url: '/products' },
            { name: productName, url: productUrl },
        ];

    return (
        <div className="bg-white min-h-screen font-sans text-gray-800 pb-20">
            <Seo
                title={productName}
                description={productAlias ? sanitizeHtml(productAlias).replace(/<[^>]*>/g, '').substring(0, 160) : `天启芯科技提供 ${productName} 的详细参数、技术文档、库存与价格信息。`}
                url={productUrl}
                image={productImage}
                type="product"
            />
            <JsonLd data={[
                buildProductSchema({
                    id: productData.id || parseInt(productData.pageBaseInfo.productId) || 0,
                    name: productName,
                    alias: productAlias,
                    image: productImage,
                    stock: productData.stock ?? productData.model?.stock,
                    url: productUrl,
                }),
                buildBreadcrumbSchema(breadcrumbs),
            ]} />
            {/* Breadcrumb */}
            <div className="container mx-auto px-4 py-4 text-xs text-gray-500">
                {productData.breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={index}>
                        <span className={index === productData.breadcrumbs.length - 1 ? 'text-gray-900' : ''}>{t(crumb.label)}</span>
                        {index < productData.breadcrumbs.length - 1 && (
                            <span className="mx-2">/</span>
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Header Section */}
            <div className="container mx-auto px-4 mb-8">
                <span className={`text-xs font-bold uppercase mb-2 block ${productData.is_new ? 'text-brand-red' : 'text-gray-500'}`}>
                    {productData.is_new ? t('全新') : t('现货')}
                </span>
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900">{productData.pageBaseInfo.productName}</h1>
                    <div className="flex items-center text-green-700 bg-green-50 px-2 py-1 rounded text-xs font-medium">
                        <Check className="w-3 h-3 mr-1" />
                        {productData.stock > 0 ? t('正在供货') : t('缺货')}
                    </div>
                    <div className="flex-1 text-right hidden md:block">
                        <div className="flex items-center justify-end gap-2 text-xs text-gray-500">
                            <span className="text-brand-red font-bold"><span className="inline-block w-2 h-2 rounded-full bg-brand-red mr-1"></span>{t('通知')}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                    <h2 className="text-xl text-gray-700 mb-4 md:mb-0" dangerouslySetInnerHTML={{ __html: sanitizeHtml(productData.pageBaseInfo.productAlias || '') }} />
                    <button
                        onClick={handleOrderNow}
                        disabled={addingToCart}
                        className="bg-brand-red text-white px-6 py-2 text-sm font-bold rounded-sm hover:bg-red-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {addingToCart && <Loader2 className="animate-spin w-4 h-4" />}
                        {productData.pageBaseInfo.isPreOrder ? t('立即预订') : t('立即订购')}
                    </button>
                </div>

                <div className="mt-6 text-xs text-gray-600 space-y-1">
                    <div className="flex gap-2">
                        <span className="font-bold text-gray-800">{t('数据表')}</span>
                        {productData.technicalDocuments.length > 0 && (
                            <>
                                <a href={productData.technicalDocuments[0].downloadUrl || '#'} className="text-brand-red hover:underline">{productData.technicalDocuments[0].docName}</a>
                                <a href={productData.technicalDocuments[0].downloadUrl || '#'} className="text-brand-red hover:underline">PDF</a>
                            </>
                        )}
                    </div>
                    <div className="flex gap-2 pl-12">
                        <a href="#" className="text-brand-red hover:underline">{t('英语版')}</a>
                        <a href="#" className="text-brand-red hover:underline">PDF</a>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="sticky top-[116px] z-40 bg-gray-100 border-y border-gray-200">
                <div className="container mx-auto px-4">
                    <div className="flex space-x-8 text-sm font-bold overflow-x-auto">
                        {[t('产品详情'), t('技术文档'), t('订购和质量')].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => scrollToSection(tab)}
                                className={`py-4 border-b-2 whitespace-nowrap transition-colors ${activeSection === tab
                                    ? 'border-brand-red text-brand-red'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 space-y-16">
                {/* Product Details Section */}
                <section id={t('产品详情')} className="scroll-mt-40">
                    <h3 className="text-2xl font-bold mb-6">{t('产品详情')}</h3>

                    {/* Tab Navigation */}
                    <div className="flex space-x-6 text-sm font-medium mb-6 border-b border-gray-200">
                        {[t('参数'), t('封装 | 引脚 | 尺寸'), t('特性'), t('说明')].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveDetailTab(tab)}
                                className={`pb-2 cursor-pointer transition-colors ${activeDetailTab === tab
                                    ? 'text-brand-red border-b-2 border-brand-red'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col lg:flex-row gap-12">
                        {/* Left Content Area - Changes based on active tab */}
                        <div className="flex-1">
                            {/* 参数 Tab */}
                            {activeDetailTab === t('参数') && (
                                <div>
                                    <table className="w-full text-sm text-gray-700">
                                        <tbody>
                                            {productData.productParameters.map((param, idx) => (
                                                <tr key={idx} className="border-b border-gray-200">
                                                    <td className="py-3 pr-4 font-medium text-gray-600 w-1/3">{param.paramName}</td>
                                                    <td className="py-3">{param.paramValue} {param.paramUnit}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* 封装 | 引脚 | 尺寸 Tab */}
                            {activeDetailTab === t('封装 | 引脚 | 尺寸') && (
                                <div>
                                    <table className="w-full text-sm text-gray-700">
                                        <thead>
                                            <tr className="border-b border-gray-200 bg-gray-50">
                                                <th className="py-3 pr-4 font-medium text-gray-600 w-1/3 text-left">{t('封装类型')}</th>
                                                <th className="py-3 font-medium text-gray-600 text-left">{t('引脚数量')}</th>
                                                <th className="py-3 font-medium text-gray-600 text-left">{t('尺寸')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b border-gray-200">
                                                <td className="py-3 pr-4">{productData.package_info?.package_type || productData.package_type || '-'}</td>
                                                <td className="py-3">{productData.package_info?.pin_count || productData.pin_count || '-'}</td>
                                                <td className="py-3">{productData.package_info?.size || '-'}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <div className="mt-6 text-sm text-brand-red">
                                    <a href="#" className="hover:underline flex items-center gap-2">
                                        <span className="inline-block w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-brand-red"></span>
                                        {t('查找其他类似的ADC')}
                                    </a>
                                    </div>
                                </div>
                            )}

                            {/* 特性 Tab */}
                            {activeDetailTab === t('特性') && (
                                <ProductFeatures features={productData.features} />
                            )}

                            {/* 说明 Tab */}
                            {activeDetailTab === t('说明') && (
                                <div
                                    className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(productData.pageBaseInfo.productAlias || '') }}
                                />
                            )}
                        </div>

                        {/* Right Side - Product Images */}
                        <div className="w-full lg:w-1/3 flex flex-col gap-4">
                            <div className="border border-gray-200 p-8 flex items-center justify-center bg-white rounded-sm">
                                <img
                                    src={productData.main_image || "https://placehold.co/640x480?text=No+Image"}
                                    alt={productData.pageBaseInfo.productName}
                                    className="w-48 h-auto mix-blend-multiply contrast-125"
                                />
                            </div>
                            <div className="border border-gray-200 p-4 flex items-center justify-center bg-white rounded-sm w-24 h-24">
                                <img
                                    src={productData.main_image || "https://placehold.co/400x300?text=Footprint"}
                                    alt="Footprint"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Technical Documents Section */}
                <section id={t('技术文档')} className="scroll-mt-40 pt-8 border-t border-gray-200">
                    <h3 className="text-2xl font-bold mb-2">{t('技术文档')}</h3>
                    <div className="flex items-center gap-2 text-brand-red text-xs font-bold mb-6 cursor-pointer hover:underline">
                        <span className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-brand-red"></span>
                        {t('有关此产品的精选热门文档')}
                    </div>

                    {/* Filters */}
                    <div className="flex gap-4 mb-6 bg-gray-50 p-4 rounded-sm">
                        <div className="relative w-48">
                            <select className="w-full appearance-none bg-white border border-gray-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-brand-red">
                                <option>{t('类型: 全部')}</option>
                                <option>{t('数据表')}</option>
                                <option>{t('应用简报')}</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        <div className="relative flex-1">
                            <input type="text" placeholder={t('按关键字筛选标题')} className="w-full border border-gray-300 pl-3 pr-10 py-2 text-sm rounded-sm focus:outline-none focus:border-brand-red" />
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        </div>
                    </div>

                    {/* Docs Table */}
                    <table className="w-full text-left text-xs md:text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-gray-900 font-bold border-b border-gray-200">
                                <th className="py-3 pl-4">{t('类型')} <ChevronDown className="inline w-3 h-3 ml-1" /></th>
                                <th className="py-3">{t('标题')}</th>
                                <th className="py-3">{t('下载最新的英语版本')}</th>
                                <th className="py-3 text-right pr-4">{t('日期')} <ArrowUpDown className="inline w-3 h-3 ml-1" /></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {productData.technicalDocuments.map((doc, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                    <td className="py-4 pl-4 align-top font-medium">
                                        <span className="w-0 h-0 inline-block border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-gray-600 mr-2"></span>
                                        {doc.docType}
                                    </td>
                                    <td className="py-4 align-top text-brand-red hover:underline cursor-pointer">
                                        {doc.docName}
                                    </td>
                                    <td className="py-4 align-top">
                                        <div className="flex gap-2">
                                            <a href={doc.downloadUrl} className="text-brand-red hover:underline">PDF</a>
                                            <span className="mx-2 text-gray-400">{t('最新英语版本(Rev.A)')}</span>
                                            <a href={doc.downloadUrl} className="text-brand-red hover:underline">PDF</a>
                                        </div>
                                    </td>
                                    <td className="py-4 align-top text-right pr-4 text-gray-500">{new Date(doc.uploadTime).toLocaleDateString('zh-CN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                {/* Ordering Section */}
                <section id={t('订购和质量')} className="scroll-mt-40 pt-8 border-t border-gray-200">
                    <h3 className="text-3xl text-center font-medium mb-8">{t('订购和质量')}</h3>

                    <div className="overflow-x-auto border border-gray-200 shadow-sm">
                        <table className="w-full text-left text-xs min-w-[1000px]">
                            <thead className="bg-gray-50 text-gray-800 font-bold border-b border-gray-200">
                                <tr>
                                    <th className="p-3 border-r border-gray-200">{t('器件型号')} <ChevronDown className="inline w-3 h-3" /></th>
                                    <th className="p-3 border-r border-gray-200">{t('购买')}</th>
                                    <th className="p-3 border-r border-gray-200">{t('库存')} <ChevronDown className="inline w-3 h-3" /></th>
                                    <th className="p-3 border-r border-gray-200">{t('数量 | 价格')} ({productData.pageBaseInfo.currency}) <ChevronDown className="inline w-3 h-3" /></th>
                                    <th className="p-3 border-r border-gray-200 w-40">{t('包装数量 | 包装')} <div className="relative inline-block ml-1 border border-gray-300 bg-white px-1 rounded text-[10px] font-normal text-gray-500">{t('选择')} <ChevronDown className="inline w-2 h-2" /></div></th>
                                    <th className="p-3 border-r border-gray-200 w-40">{t('封装 | 引脚')} <div className="relative inline-block ml-1 border border-gray-300 bg-white px-1 rounded text-[10px] font-normal text-gray-500">{t('选择')} <ChevronDown className="inline w-2 h-2" /></div></th>
                                    <th className="p-3 border-r border-gray-200">{t('样片')} <ChevronDown className="inline w-3 h-3" /></th>
                                    <th className="p-3 border-r border-gray-200">{t('材料类型')} <ChevronDown className="inline w-3 h-3" /></th>
                                    <th className="p-3 border-r border-gray-200">{t('工作温度范围 (°C)')}</th>
                                    <th className="p-3">{t('引脚镀层')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                <tr>
                                    <td className="p-3 border-r border-gray-100 align-top">
                                        <div 
                                            className="text-brand-red font-bold hover:underline cursor-pointer mb-1"
                                            onClick={() => {
                                                console.log('点击了器件型号，当前 productData:', productData);
                                                const targetId = productData.model?.id || productData.id || parseInt(productId || '0');
                                                if (targetId) {
                                                    const url = `/models/${targetId}`;
                                                    console.log('即将跳转:', url);
                                                    if (onNavigate) {
                                                        onNavigate(url);
                                                    } else {
                                                        window.location.href = url;
                                                    }
                                                } else {
                                                    console.warn('无法跳转：未找到有效的型号ID');
                                                }
                                            }}
                                        >
                                            {productData.model?.model_code || productData.pageBaseInfo.productId}
                                        </div>
                                        <div className="flex items-center text-green-600 mb-1">
                                            <Check className="w-3 h-3 mr-1" /> 
                                            {(productData.model?.stock ?? productData.stock) > 0 ? t('正在供货') : t('缺货')}
                                        </div>
                                        <div className="text-gray-400">{productData.model?.material_type === '定制' ? t('定制') : t('现货')}</div>
                                    </td>
                                    <td className="p-3 border-r border-gray-100 align-top">
                                        <button
                                            onClick={handleOrderNow}
                                            disabled={addingToCart}
                                            className="bg-brand-red text-white text-xs font-bold px-4 py-2 rounded-sm whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {addingToCart && <Loader2 className="animate-spin w-3 h-3" />}
                                            {t('登录以订购')}
                                        </button>
                                    </td>
                                    <td className="p-3 border-r border-gray-100 align-top">
                                        <span 
                                            className="text-brand-red flex items-center gap-1 font-bold cursor-pointer hover:underline"
                                            onClick={handleOrderNow}
                                        >
                                            <span className="text-[10px]">🔒</span> {t('登录查看库存')}
                                        </span>
                                    </td>
                                    <td className="p-3 border-r border-gray-100 align-top text-brand-red font-medium">
                                        {productData.model?.moq || 1}ku | {Object.entries(productData.orderAndQuality.orderInfo.priceRange)[0][1]} <ChevronDown className="inline w-3 h-3" />
                                    </td>
                                    <td className="p-3 border-r border-gray-100 align-top text-brand-red">
                                        {productData.model?.packaging_spec || productData.orderAndQuality.orderInfo.packagingSpec}
                                    </td>
                                    <td className="p-3 border-r border-gray-100 align-top text-brand-red">
                                        {productData.model?.package_type || productData.package_type} | {productData.model?.pin_count || productData.pin_count}
                                    </td>
                                    <td className="p-3 border-r border-gray-100 align-top text-brand-red hover:underline cursor-pointer"
                                        onClick={() => onNavigate ? onNavigate('/support?tab=sample') : window.location.href = '/support?tab=sample'}>
                                        {t('申请样片')}
                                    </td>
                                    <td className="p-3 border-r border-gray-100 align-top">
                                        {productData.model?.material_type || t('量产')}
                                    </td>
                                    <td className="p-3 border-r border-gray-100 align-top">
                                        {productData.model?.operating_temperature || '-40 to 125'}
                                    </td>
                                    <td className="p-3 align-top">
                                        {productData.model?.pin_plating || 'NIPDAU'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

            </div>
        </div>
    );
};
