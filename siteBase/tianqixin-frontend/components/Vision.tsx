import React from 'react';
import { useTranslation } from 'react-i18next';
import type { HomeData } from '../lib/api-client';
import { getImageUrlSecond } from '../lib/api-client';

interface VisionProps {
  data?: HomeData["sections"]["vision"]
}

export const Vision: React.FC<VisionProps> = ({ data }) => {
  const { t } = useTranslation()

  const facilities = data?.facilities && data.facilities.length > 0
    ? data.facilities
    : [
        { type: "image", image: "https://images.unsplash.com/photo-1486325212027-8081e485255e?q=80&w=800&auto=format&fit=crop", alt: "Office" },
        { type: "text", title: t("晶元厂"), subtitle: t("研发设计、知识产权保护中心"), subtitle_en: "Taiwan Wafer Factory\nR&D, Design and Intellectual Property Protection Center" },
        { type: "image", image: "https://images.unsplash.com/photo-1581092335397-9583eb92d232?q=80&w=800&auto=format&fit=crop", alt: "Lab" },
        { type: "text", title: t("测试产线"), subtitle: "Production line\nAssembly and test line" },
        { type: "text", title: t("产线"), subtitle: t("芯片生产线"), subtitle_en: "Production line\nChip Production Line" },
        { type: "image", image: "https://images.unsplash.com/photo-1591261730799-ee604f922c31?q=80&w=800&auto=format&fit=crop", alt: "Factory" },
        { type: "text", title: t("研发中心"), subtitle: "R&D Center" },
        { type: "image", image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=800&auto=format&fit=crop", alt: "Research" }
      ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 md:px-8">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{data?.title || t("我们的愿景")}</h2>
          <p className="text-gray-600 text-sm max-w-4xl" style={{ whiteSpace: 'pre-line' }}>
            {data?.description || t("我们满怀热情，致力于通过半导体技术让电子产品更经济实用，创造一个更美好的世界。\n\n为全球电子制造业提供更加优质、高效、便捷的电子元件供应与贸易服务。我们将不断拓展业务领域，加强与国际知名制造商的合作，提升品牌影响力与竞争力，成为全球电子元件行业的领军企业。")}
          </p>
        </div>

        {/* Grid Layout - Bento Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {facilities.map((facility: any, index: number) => {
            const imageUrl = getImageUrlSecond(facility.image);
            return (
              <div key={index} className="h-64">
                {facility.type === 'image' ? (
                  <img src={imageUrl} className="w-full h-full object-cover" alt={facility.alt || ''} />
                ) : (
                  <div className="bg-brand-red p-8 text-white flex flex-col justify-center h-full">
                    <h3 className="font-bold mb-2 text-lg">{t(facility.title)}</h3>
                    {facility.subtitle && (
                      <p className="text-xs opacity-80 mb-2" style={{ whiteSpace: 'pre-line' }}>{t(facility.subtitle)}</p>
                    )}
                    {facility.subtitle_en && (
                      <p className="text-xs opacity-80" style={{ whiteSpace: 'pre-line' }}>{facility.subtitle_en}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
