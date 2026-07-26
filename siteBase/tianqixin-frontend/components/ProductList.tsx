import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Image as ImageIcon, SlidersHorizontal, ChevronLeft, ArrowUpDown, Check, Download, List } from 'lucide-react';
import { ProductDetail } from './ProductDetail';
import { useTranslation } from 'react-i18next';
import { categoryApi, productApi } from '../lib/api-client';

interface CategoryItem {
  id: number;
  name: string;
  level: number;
  parent_id: number;
  sort_order: number;
  children?: CategoryItem[];
}

interface CategoryData {
  id: string;
  name: string;
  subcategories: {
    title: string;
    items?: string[];
  }[];
}

// API返回的分类树类型
interface ApiCategoryTree {
  code: number;
  message: string;
  data: CategoryItem[];
}

// 默认分类数据，用于API请求失败时的降级显示
const DEFAULT_CATEGORIES: CategoryData[] = [
  {
    id: 'amp',
    name: '放大器',
    subcategories: [
      { title: '仪表放大器' },
      { title: '全差分放大器' },
      { title: '可编程和可变增益放大器 (PGA 和 VGA)' },
      { 
        title: '射频放大器',
        items: ['射频低噪声放大器 (LNA)', '射频全差分放大器 (FDA)', '射频可变增益放大器 (VGA)', '射频增益块放大器']
      },
      { title: '差分放大器' },
      { title: '比较器' },
      { 
        title: '特殊功能放大器',
        items: ['4-20mA 信号调节器', '变频器', '对数放大器', '线路驱动器', '视频放大器', '跨导放大器和激光驱动器', '跨阻放大器', '采样保持放大器', '隔离式放大器']
      },
      { 
        title: '电流检测放大器',
        items: ['数字功率监控器', '模拟电流检测放大器', '配备集成型电流采样电阻的数字功率监控器', '配备集成型电流采样电阻的模拟电流检测放大器']
      },
      { 
        title: '运算放大器 (op amps)',
        items: ['功率运算放大器', '精密运算放大器 (Vos<1mV)', '通用运算放大器', '音频运算放大器', '高速运算放大器 (GBW ≥ 50MHz)']
      }
    ]
  }
];

// 将API返回的分类树转换为组件需要的格式
const transformCategories = (categories: CategoryItem[]): CategoryData[] => {
  return categories.map(category => {
    // 处理第二级分类
    const subcategories = category.children?.map(sub => {
      // 处理第三级分类
      const items = sub.children?.map(grandchild => grandchild.name) || undefined;
      
      return {
        title: sub.name,
        items
      };
    }) || [];
    
    return {
      id: category.id.toString(),
      name: category.name,
      subcategories
    };
  });
};

interface ProductRow {
  id: string;
  name: string;
  isNew: boolean;
  partNumber: string;
  modelId: string | null;
  modelCode: string;
  modelName: string;
  description: string;
  category: string;
  subcategory: string;
  rating: string;
  tempRange: string;
  packageType: string;
  hasImage: boolean;
  hasDatasheet: boolean;
}

// 分类属性类型
interface CategoryAttribute {
  id: number;
  name: string;
  code: string;
  is_filter: boolean;
  sort_order: number;
}

interface ProductListProps {
  onNavigate?: (page: string) => void;
}

export const ProductList: React.FC<ProductListProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'directory' | 'list'>('directory');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('1');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [attributes, setAttributes] = useState<CategoryAttribute[]>([]);
  const [attributesLoading, setAttributesLoading] = useState<boolean>(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productsLoading, setProductsLoading] = useState<boolean>(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // 添加调试日志，追踪状态变化
  console.log('Component render - viewMode:', viewMode, 'activeCategoryId:', activeCategoryId, 'attributes:', attributes.length);

  // 从API获取分类数据
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        // 调用分类API获取三级分类结构
        const response = await categoryApi.getCategoryTree();
        
        if (response.code === 200 && response.data) {
          // 将API返回的分类树转换为组件需要的格式
          const transformed = transformCategories(response.data);
          setCategories(transformed);
          
          // 如果有分类数据，将第一个分类设置为默认激活分类
          if (transformed.length > 0) {
            setActiveCategoryId(transformed[0].id);
          }
        } else {
          // API请求失败，使用默认分类数据
          setCategories(DEFAULT_CATEGORIES);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        // 请求失败，使用默认分类数据
        setCategories(DEFAULT_CATEGORIES);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);
  
  // 从API获取分类属性数据 - 仅在列表视图下获取
  useEffect(() => {
    // 只有在列表视图下才获取属性
    if (viewMode !== 'list') {
      // 如果不是列表视图，清空属性
      setAttributes([]);
      return;
    }
    
    const fetchAttributes = async () => {
      setAttributesLoading(true);
      try {
        const categoryId = parseInt(activeCategoryId, 10);
        console.log('Fetching attributes for category:', categoryId);
        const response = await categoryApi.getCategoryAttributes(categoryId);
        
        console.log('API response:', response);
        
        if (response.code === 200 && response.data) {
          // 添加调试信息
          console.log('Fetched attributes data:', response.data);
          console.log('Attributes data type:', typeof response.data);
          console.log('Attributes data length:', Array.isArray(response.data) ? response.data.length : 'Not an array');
          
          // 确保 response.data 是数组
          const attributesData = Array.isArray(response.data) ? response.data : [];
          console.log('Processed attributes data:', attributesData);
          
          setAttributes(attributesData);
        } else {
          console.log('No attributes data returned:', response);
          setAttributes([]);
        }
      } catch (error) {
        console.error('Failed to fetch category attributes:', error);
        setAttributes([]);
      } finally {
        setAttributesLoading(false);
      }
    };

    fetchAttributes();
  }, [activeCategoryId, viewMode]); // 依赖项：activeCategoryId 和 viewMode

  // 从API获取产品列表数据（列表视图下）
  useEffect(() => {
    if (viewMode !== 'list') return;

    const fetchProducts = async () => {
      setProductsLoading(true);
      try {
        const categoryId = parseInt(activeCategoryId, 10);
        const response = await productApi.getProducts({
          category_id: isNaN(categoryId) ? undefined : categoryId,
          limit: 50,
        });
        if (response.code === 200) {
          const list = response.data?.list || response.data?.data || response.data || [];
          const rows: ProductRow[] = (Array.isArray(list) ? list : []).map((item: any, idx: number) => ({
            id: String(item.id || idx),
            name: item.name || item.product_name || item.partNumber || item.product_number || '',
            isNew: item.is_new || item.isNew || false,
            partNumber: item.part_number || item.partNumber || item.product_code || item.product_number || '',
            modelId: item.model_id ? String(item.model_id) : null,
            modelCode: item.model_code || '',
            modelName: item.model_name || '',
            description: item.description || '',
            category: item.category_name || item.category || '',
            subcategory: item.subcategory || '',
            rating: item.rating || '',
            tempRange: item.temp_range || item.tempRange || '',
            packageType: item.package_type || item.packageType || '',
            hasImage: !!item.image || !!item.main_image,
            hasDatasheet: !!item.datasheet_url || item.hasDatasheet || false,
          }));
          setProducts(rows);
        }
      } catch (error) {
        console.error('获取产品列表失败:', error);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, [activeCategoryId, viewMode]);

  // 获取当前激活的分类
  const activeCategory = categories.find(c => c.id === activeCategoryId) || categories[0] || DEFAULT_CATEGORIES[0];

  // 展开/折叠切换
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (selectedProductId) {
    return (
      <div>
        <button 
          onClick={() => setSelectedProductId(null)}
          className="mb-4 flex items-center text-sm text-gray-600 hover:text-brand-red px-4 pt-4"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> {t('返回列表')}
        </button>
        <ProductDetail />
      </div>
    );
  }

  // --- Directory View Mode ---
  if (viewMode === 'directory') {
    return (
      <div className="bg-[#F5F5F5] min-h-screen font-sans">
        <div className="container mx-auto flex">
          
          {/* Left Sidebar */}
          <div className="w-80 bg-white min-h-screen border-r border-gray-200">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
               <span className="text-sm font-bold text-gray-500">{t('所有产品')}</span>
               <ChevronDown className="w-4 h-4 text-gray-400 rotate-180" />
            </div>
            <nav className="py-2">
              {isLoading ? (
                // 加载状态显示
                <div className="px-6 py-3.5">
                  <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : categories.length > 0 ? (
                // 使用从API获取的分类数据渲染
                categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategoryId(cat.id)}
                    className={`w-full flex items-center justify-between px-6 py-3.5 text-sm transition-colors border-l-4 ${
                      activeCategoryId === cat.id 
                        ? 'border-brand-red text-brand-red bg-white font-bold' 
                        : 'border-transparent text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex-1 text-left">{t(cat.name)}</span>
                    <ChevronRight className={`w-4 h-4 ${activeCategoryId === cat.id ? 'opacity-100' : 'opacity-0'}`} />
                  </button>
                ))
              ) : (
                // 没有分类数据时显示
                <div className="px-6 py-3.5 text-sm text-gray-500">
                  {t('暂无分类数据')}
                </div>
              )}
            </nav>
          </div>

          {/* Right Content Panel */}
          <div className="flex-1 bg-white p-8 md:p-12">
             <div className="flex items-center gap-4 mb-8">
                <SlidersHorizontal className="w-5 h-5 text-brand-red" />
                <h2 className="text-2xl font-bold text-brand-red">{t(activeCategory.name)}</h2>
                <ChevronRight className="w-6 h-6 text-brand-red" />
             </div>

             <div className="border-t border-gray-200 pt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-12 gap-x-12">
                   {activeCategory.subcategories.map((sub, idx) => (
                     <div key={idx} className="space-y-4">
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setViewMode('list')}>
                           <SlidersHorizontal className="w-4 h-4 text-gray-400 group-hover:text-brand-red" />
                           <h3 className="font-bold text-gray-800 text-lg group-hover:text-brand-red transition-colors">
                             {t(sub.title)}
                           </h3>
                        </div>
                        {sub.items && (
                          <ul className="space-y-3 pl-6">
                            {sub.items.map((item, i) => (
                              <li key={i}>
                                <a 
                                  href="#" 
                                  onClick={(e) => { e.preventDefault(); setViewMode('list'); }}
                                  className="text-sm text-gray-600 hover:text-brand-red leading-tight block"
                                >
                                  {t(item)}
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                     </div>
                   ))}
                </div>
             </div>
          </div>

        </div>
      </div>
    );
  }

  // --- List View Mode ---
  return (
    <div className="bg-white min-h-screen pb-20">
       <div className="bg-gray-100 border-b border-gray-200 px-4 py-3">
          <div className="container mx-auto flex items-center text-xs text-gray-500">
             <span className="cursor-pointer hover:text-brand-red" onClick={() => setViewMode('directory')}>1{t('所有产品')}</span>
             <ChevronRight className="w-3 h-3 mx-2" />
             <span className="text-gray-900 font-bold">{t(activeCategory.name)}</span>
          </div>
       </div>

       <div className="container mx-auto px-4 py-6">
           <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{t(activeCategory.name)}</h1>
              <button 
                onClick={() => setViewMode('directory')}
                className="flex items-center gap-2 text-sm text-brand-red font-bold hover:underline"
              >
                <List className="w-4 h-4" /> {t('返回分类目录')}
              </button>
           </div>
           
           <div className="flex flex-col lg:flex-row gap-6">
               <div className="w-full lg:w-64 flex-shrink-0 space-y-4">
                   <div className="bg-gray-50 p-4 border border-gray-200 rounded-sm">
                       <div className="flex items-center justify-between mb-4">
                           <h3 className="font-bold text-gray-800 flex items-center gap-2">
                               <SlidersHorizontal className="w-4 h-4" /> {t('筛选器')}
                           </h3>
                           <span className="text-xs text-brand-red cursor-pointer hover:underline">{t('清除全部')}</span>
                       </div>
                       {/* 添加调试信息 */}
                       <div className="mb-2 text-xs text-gray-500">
                           {t('调试信息: 属性数量 = {{count}}, 加载状态 = {{status}}', { count: attributes.length, status: attributesLoading ? t('加载中') : t('已加载') })}
                       </div>
                       
                       {attributesLoading ? (
                           <div className="space-y-3">
                               {[1, 2, 3].map((i) => (
                                   <div key={i} className="h-8 bg-gray-200 rounded animate-pulse"></div>
                               ))}
                           </div>
                       ) : attributes.length > 0 ? (
                           attributes.map((attribute) => (
                               <div key={attribute.id} className="mb-4 border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                                   <div className="flex items-center justify-between cursor-pointer mb-2">
                                       <span className="text-sm font-medium text-gray-700">{t(attribute.name)}</span>
                                       <ChevronDown className="w-4 h-4 text-gray-500" />
                                   </div>
                               </div>
                           ))
                       ) : (
                           <div className="text-sm text-gray-500">{t('暂无筛选条件')}</div>
                       )}
                   </div>
               </div>

               <div className="flex-1 overflow-hidden">
                   <div className="overflow-x-auto border border-gray-200 shadow-sm rounded-sm">
                       <table className="w-full text-left border-collapse">
                           <thead className="bg-gray-100 text-gray-800 text-xs uppercase font-bold">
                               <tr>
                                   <th className="p-3 border-b border-gray-200 min-w-[240px]">{t('产品名称')}</th>
                                   <th className="p-3 border-b border-gray-200 min-w-[250px]">{t('描述')}</th>
                                   <th className="p-3 border-b border-gray-200">{t('数据表')}</th>
                                   <th className="p-3 border-b border-gray-200">{t('状态')}</th>
                                   <th className="p-3 border-b border-gray-200">{t('封装 | 引脚')}</th>
                               </tr>
                           </thead>
                           <tbody className="text-sm text-gray-700 divide-y divide-gray-200 bg-white">
                               {productsLoading ? (
                                   <tr>
                                       <td colSpan={5} className="p-12 text-center text-gray-400">
                                           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red mx-auto mb-2"></div>
                                           {t('加载中...')}
                                       </td>
                                   </tr>
                               ) : products.length === 0 ? (
                                   <tr>
                                       <td colSpan={5} className="p-12 text-center text-gray-400">
                                           {t('暂无产品数据')}
                                       </td>
                                   </tr>
                               ) : (
                                   products.map((product) => {
                                     const isExpanded = expandedIds.has(product.id);
                                     return (
                                       <React.Fragment key={product.id}>
                                         {/* 产品主行 */}
                                         <tr className="hover:bg-red-50 transition-colors group">
                                           <td className="p-3">
                                             <div className="flex items-center gap-2">
                                               <button
                                                 onClick={() => toggleExpand(product.id)}
                                                 className="text-gray-400 hover:text-brand-red focus:outline-none"
                                                 title={isExpanded ? t('收起') : t('展开')}
                                               >
                                                 {isExpanded ? (
                                                   <ChevronDown className="w-4 h-4" />
                                                 ) : (
                                                   <ChevronRight className="w-4 h-4" />
                                                 )}
                                               </button>
                                               <div className="flex-1">
                                                <a
                                                  href={`/series/${product.id}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-brand-red font-bold hover:underline block"
                                                >
                                                  {product.name || product.partNumber}
                                                </a>
                                                 {product.isNew && (
                                                   <span className="text-[10px] bg-brand-red text-white px-1.5 py-0.5 rounded-sm font-bold uppercase">New</span>
                                                 )}
                                               </div>
                                             </div>
                                           </td>
                                           <td className="p-3 text-xs md:text-sm">{product.description ? t(product.description) : ''}</td>
                                           <td className="p-3">
                                               {product.hasDatasheet && <Download className="w-4 h-4 text-gray-500 hover:text-brand-red cursor-pointer" />}
                                           </td>
                                           <td className="p-3">
                                               <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-100">
                                                   <Check className="w-3 h-3" /> Active
                                               </span>
                                           </td>
                                           <td className="p-3 text-xs whitespace-nowrap">{product.packageType}</td>
                                         </tr>
                                         
                                         {/* 展开的型号子行 */}
                                         {isExpanded && product.modelId && (
                                           <tr className="bg-gray-50 hover:bg-gray-100 transition-colors">
                                             <td className="p-3 pl-10" colSpan={5}>
                                               <div className="flex items-center gap-2">
                                                 <span className="text-xs text-gray-400">{t('型号编码')}:</span>
                                                 <a
                                                   href={`/models/${product.modelId}`}
                                                   target="_blank"
                                                   rel="noopener noreferrer"
                                                   className="text-brand-red font-bold text-sm hover:underline"
                                                   title={product.modelName || product.modelCode}
                                                 >
                                                   {product.modelCode || product.partNumber}
                                                 </a>
                                               </div>
                                             </td>
                                           </tr>
                                         )}
                                         
                                         {/* 展开后无型号提示 */}
                                         {isExpanded && !product.modelId && (
                                           <tr className="bg-gray-50">
                                             <td className="p-3 pl-10 text-xs text-gray-400" colSpan={5}>
                                               {t('暂无关联型号')}
                                             </td>
                                           </tr>
                                         )}
                                       </React.Fragment>
                                     );
                                   })
                               )}
                           </tbody>
                       </table>
                   </div>
               </div>
           </div>
       </div>
    </div>
  );
};
