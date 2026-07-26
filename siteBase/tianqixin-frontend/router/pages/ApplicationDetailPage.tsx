import { useParams, useNavigate } from "react-router-dom"
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { applicationApi, Application, MallProduct, getImageUrl } from '../../lib/api-client';
import { sanitizeHtml } from '../../lib/sanitize';
import { Seo } from '../../components/Seo';
import { JsonLd, buildArticleSchema, buildBreadcrumbSchema } from '../../components/JsonLd';
import { Spin } from 'antd';

/** 过滤HTML标签，用于纯文本渲染（防御后端返回带标签的description） */
function stripHtmlTags(html: string): string {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function ProductCard({ product }: { product: MallProduct }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const image = product.images && product.images.length > 0 ? getImageUrl(product.images[0]) : '';

    const handleClick = () => {
        navigate(`/mall/product/${product.id}`);
    };

    return (
        <div
            className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        >
            <div className="aspect-video bg-gray-100 overflow-hidden">
                {image ? (
                    <img src={image} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        {t('暂无图片')}
                    </div>
                )}
            </div>
            <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{product.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{product.product_code}</p>
                <p className="text-sm text-gray-600 line-clamp-2">{stripHtmlTags(product.description || '')}</p>
            </div>
        </div>
    );
}

function ProductsSection({ products }: { products: MallProduct[] }) {
    const { t } = useTranslation();

    if (!products || products.length === 0) {
        return null;
    }

    return (
        <section className="bg-gray-50 py-12">
            <div className="container mx-auto px-4 md:px-8">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('相关产品')}</h2>
                    <p className="text-gray-600">{t('该应用领域下的推荐产品')}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </section>
    );
}

export function ApplicationDetailPage() {
    const { id } = useParams();
    const { t } = useTranslation();
    const [application, setApplication] = useState<Application | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchApplication = async () => {
            if (!id) return;
            try {
                const resp = await applicationApi.getApplication(Number(id));
                if (resp.code === 200) {
                    setApplication(resp.data);
                }
            } catch (error) {
                console.error('Failed to fetch application:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchApplication();
    }, [id]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center pt-20"><Spin size="large" /></div>;
    }

    if (!application) {
        return <div className="min-h-screen flex items-center justify-center pt-20">{t('应用未找到')}</div>;
    }

    const products = application.products || [];
    const appUrl = `/applications/${application.id}`;
    const appDescription = stripHtmlTags(application.description || '').substring(0, 160);
    const coverImage = application.cover_image ? getImageUrl(application.cover_image) : undefined;

    return (
        <div className="pt-20">
            <Seo
                title={application.title}
                description={appDescription || application.title}
                url={appUrl}
                image={coverImage}
                type="article"
            />
            <JsonLd data={[
                buildArticleSchema({
                    id: application.id,
                    title: application.title,
                    summary: appDescription,
                    image: coverImage,
                    url: appUrl,
                }),
                buildBreadcrumbSchema([
                    { name: t('首页'), url: '/' },
                    { name: t('应用领域'), url: '/applications' },
                    { name: application.title, url: appUrl },
                ]),
            ]} />
            {/* Hero Banner */}
            <div className="relative h-[300px] md:h-[400px] bg-gray-900 overflow-hidden">
                {application.cover_image ? (
                    <img
                        src={getImageUrl(application.cover_image)}
                        alt={application.title}
                        className="w-full h-full object-cover opacity-60"
                    />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent flex items-center">
                    <div className="container mx-auto px-4 md:px-8">
                        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">{application.title}</h1>
                        <p className="text-white/80 text-lg max-w-2xl">{stripHtmlTags(application.description || '')}</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <section className="py-12 bg-white">
                <div className="container mx-auto px-4 md:px-8">
                    <div
                        className="prose prose-lg max-w-none"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(application.content || '') }}
                    />
                </div>
            </section>

            <ProductsSection products={products} />
        </div>
    );
}
