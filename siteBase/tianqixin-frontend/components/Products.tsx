import type React from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import type { HomeData, MallProduct } from "../lib/api-client"
import { getImageUrl } from "../lib/api-client"

interface ProductCardProps {
  id: number
  title: string
  subtitle: string
  pkg: string
  image: string
  price?: { amount: number; unit: string }
}

const ProductCard: React.FC<ProductCardProps> = ({ id, title, subtitle, pkg, image, price }) => {
  const { t } = useTranslation()
  const imageUrl = getImageUrl(image)
  return (
    <div className="bg-white p-6 flex items-center shadow-sm hover:shadow-md transition-shadow border border-gray-100">
      <div className="flex-1 pr-4">
        <h3 className="font-bold text-gray-800 text-sm mb-1">{t(title)}</h3>
        <p className="text-xs text-gray-500 mb-2">{t('封装')}: {pkg}</p>
        {price && (
          <p className="text-xs text-brand-red mb-2">
            {price.amount} {price.unit}
          </p>
        )}
        <Link to={`/series/${id}`} className="text-brand-red text-xs flex items-center hover:underline mt-4">
          {t('进一步了解')} <ChevronRight className="w-3 h-3 ml-1" />
        </Link>
      </div>
      <div className="w-24 h-24 flex-shrink-0">
        <img src={imageUrl || "/placeholder.svg"} alt={t(title)} className="w-full h-full object-contain" />
      </div>
    </div>
  )
}

interface ProductsProps {
  data?: HomeData["sections"]["products"]
  newProducts?: MallProduct[]
}

export const Products: React.FC<ProductsProps> = ({ data, newProducts }) => {
  const { t } = useTranslation()

  const products = newProducts?.length
    ? newProducts
      .map((item) => {
        let specsObj = item.specs;
        if (typeof specsObj === 'string') {
          try {
            const specsArray = JSON.parse(specsObj);
            specsObj = specsArray.reduce((acc: any, spec: any) => {
              acc[spec.spec_name.toLowerCase()] = spec.spec_value;
              return acc;
            }, {});
          } catch (e) {
            specsObj = {};
          }
        }

        return {
          id: item.id,
          title: item.name,
          subtitle: item.description,
          pkg: (item as any).package_type || (item as any).package || (typeof specsObj === 'object' && specsObj !== null ? (specsObj as any).package || (specsObj as any).package?.toLowerCase() : "") || "",
          image: Array.isArray(item.images) ? item.images[0] : (typeof item.images === 'string' ? JSON.parse(item.images)[0] : undefined),
          price: item.price ? { amount: item.price, unit: "USD" } : undefined,
        };
      })
    : data?.items?.length
      ? data.items.map((item) => ({
        id: item.id,
        title: item.name,
        subtitle: item.description,
        pkg: item.package,
        image: item.image,
        price: item.price,
      }))
      : []

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 md:px-8">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{data?.title || t('新产品')}</h2>
          <p className="text-gray-500 text-sm">
            {data?.subtitle || t('天后芯生产线汇聚了普通整流二极管、快恢复整流管、高效整流管、超快恢复整流管、稳压二极管（双芯片）等产品。')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.length > 0 ? (
            products.slice(0, 5).map((p, i) => (
              <ProductCard key={p.id || p.title + i} id={p.id} title={p.title} subtitle={p.subtitle} pkg={p.pkg} image={p.image} price={p.price} />
            ))
          ) : (
            <div className="col-span-full text-center py-10 text-gray-500">
              {t('暂无新产品数据')}
            </div>
          )}

          {/* More Card */}
          <Link to="/series" className="bg-brand-red p-8 flex flex-col justify-center items-start text-white shadow-sm hover:bg-red-700 transition-colors cursor-pointer">
            <h3 className="text-xl font-bold uppercase">{t('查看更多')}</h3>
            <ChevronRight className="w-6 h-6 mt-4 opacity-80" />
          </Link>
        </div>
      </div>
    </section>
  )
}
