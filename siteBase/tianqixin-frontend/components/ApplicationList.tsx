import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { applicationCategoryApi, ApplicationCategory } from '../lib/api-client';

const ApplicationRowItem: React.FC<ApplicationCategory> = ({ id, name, name_en, cover_image, description }) => {
  const { t } = useTranslation();
  return (
    <Link to={`/applications/${id}`} className="block group">
      <div className="flex flex-col md:flex-row gap-8 md:gap-16 py-12 border-t border-brand-red/30 first:border-t-0 group-hover:bg-gray-50 transition-colors duration-300">
        {/* Left Column: Title & Image */}
        <div className="w-full md:w-1/3 flex flex-col items-start">
          <h3 className="text-xl md:text-2xl font-bold text-brand-red mb-1 group-hover:text-brand-red/80 transition-colors">{t(name)}</h3>
          <p className="text-brand-red text-sm mb-8 font-medium group-hover:text-brand-red/80 transition-colors">{name_en}</p>
          <div className="w-full flex justify-center md:justify-start">
            <img
              src={cover_image || "https://placehold.co/400x300?text=No+Image"}
              alt={name_en}
              className="h-48 md:h-56 object-contain"
            />
          </div>
        </div>

        {/* Right Column: Description Lists */}
        <div className="w-full md:w-2/3 space-y-8">
          <div>
            <h4 className="font-bold text-gray-900 text-sm mb-2">Product {t('产品')}：</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              {description ? t(description) : t('暂无描述')}
            </p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm mb-2">Application {t('应用')}：</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              {/* Placeholder for application list if needed, or just description */}
              {description ? "..." : t('暂无应用')}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
};

export const ApplicationList: React.FC = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<ApplicationCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const resp = await applicationCategoryApi.getCategories();
      if (resp.code === 200 && Array.isArray(resp.data)) {
        setCategories(resp.data);
      }
    } catch (err) {
      console.error('Failed to load application categories', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <div className="bg-white min-h-screen pb-20">
      {/* Hero Section */}
      <div className="relative w-full h-[300px] md:h-[400px] bg-slate-900 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop"
          alt="Global Network"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-transparent"></div>

        <div className="relative z-10 container mx-auto px-4 md:px-8 h-full flex flex-col justify-center">
          <div className="max-w-2xl">
            <div className="text-xs text-cyan-400 mb-2 font-bold uppercase tracking-wider">{t('应用 / 领域应用')}</div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('领域应用')}</h1>
            <p className="text-gray-300 text-lg mb-8 max-w-xl">
              {t('查找专门用于您的应用的设计资源、交互式方框图和器件')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 md:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-brand-red uppercase mb-2 tracking-wide">PRODUCT APPLICATION FIELDS</h2>
          <h3 className="text-3xl md:text-4xl font-bold text-brand-red tracking-wide">{t('产品应用领域')}</h3>
        </div>

        <div className="max-w-6xl mx-auto">
          {categories.map((cat) => (
            <ApplicationRowItem
              key={cat.id}
              {...cat}
            />
          ))}
          {/* Bottom Red Line */}
          <div className="border-t border-brand-red/30"></div>
        </div>
      </div>
    </div>
  );
};
