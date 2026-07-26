import React, { useState, useEffect } from 'react';
import { trainingApi, articleApi, documentApi, businessApi, API_BASE_URL, getAuthToken } from '../lib/api-client';
import { useTranslation } from 'react-i18next';
import { Calendar, MapPin, Eye, ChevronLeft, ChevronRight, Check, Circle, Search, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sanitizeHtml } from '../lib/sanitize';

// --- Types ---

type Tab = 'sample' | 'training' | 'articles' | 'documents';

interface Document {
  id: number;
  title: string;
  description: string;
  category: string;
  file_path: string;
  file_size: number;
  file_type: string;
  download_count: number;
  create_time: number;
}

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  image: string;
  status: 'registering' | 'closed';
}

interface Article {
  id: string;
  title: string;
  date: string;
  views: number;
  image: string;
  content?: string;
  summary?: string;
}

// --- Mock Data ---

// fallback mocks kept for design preview when API fails
const EVENTS_FALLBACK: Event[] = [
  {
    id: '1',
    title: '2023深圳电子元器件采购展',
    description: '深圳站元器件采购展深圳站元器件采购展深圳站元器件采购展深圳站元器件采购展',
    date: '2023.6.2-7日',
    location: '深圳会展中心',
    image: 'https://placehold.co/600x400/e2e8f0/e2e8f0',
    status: 'registering',
  },
  {
    id: '2',
    title: '天启芯科技电子原件深圳技术年会',
    description: '深圳站元器件采购展深圳站元器件采购展深圳站元器件采购展深圳站元器件采购展',
    date: '2023.6.2-7日',
    location: '深圳会展中心',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800&auto=format&fit=crop',
    status: 'registering',
  },
];

const ARTICLES_FALLBACK: Article[] = [
  { id: '1', title: '负荷开关电路中不可或缺的MOS选择', date: '2024-6-06-01', views: 30, image: 'https://placehold.co/640x480?text=MOS' },
  { id: '2', title: '锂电池保护利器，双芯MOS', date: '2024-6-06-01', views: 30, image: 'https://placehold.co/640x480?text=Battery' },
];

// --- Sub Components ---

const SuccessModal: React.FC<{ title: string; onClose: () => void }> = ({ title, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
    <div className="bg-white w-[400px] h-[300px] rounded-lg shadow-2xl flex flex-col items-center justify-center p-8 relative animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
      <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-200">
        <Check className="w-12 h-12 text-white stroke-[4]" />
      </div>
      <h3 className="text-2xl font-medium text-gray-800">{title}</h3>
    </div>
  </div>
);

// --- Main Component ---

export const TechnicalSupport: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('training');

  // 读取 URL 参数，如果有 tab=sample 则切换到样品申请标签
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'sample') {
      setActiveTab('sample');
    }
  }, []);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [articleDetail, setArticleDetail] = useState<Article | null>(null);
  const [articleDetailLoading, setArticleDetailLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsTotal, setDocumentsTotal] = useState<number | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [documentsLoading, setDocumentsLoading] = useState(false);
  // training & articles state
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsTotal, setEventsTotal] = useState<number | null>(null);
  const [eventsPage, setEventsPage] = useState<number>(1);

  const [articles, setArticles] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articlesTotal, setArticlesTotal] = useState<number | null>(null);
  const [articlesPage, setArticlesPage] = useState<number>(1);

  // localStorage keys
  const SAMPLE_FORM_KEY = 'sample_form_data';
  const EVENT_FORM_KEY = 'event_form_data';

  // 从 localStorage 读取初始表单数据
  const getInitialSampleForm = () => {
    if (typeof window === 'undefined') {
      return {
        contactName: '',
        phone: '',
        email: '',
        company: '',
        applicationField: '',
        occupation: '',
        sampleInfo: '',
      };
    }
    const saved = localStorage.getItem(SAMPLE_FORM_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse sample form data:', e);
      }
    }
    return {
      contactName: '',
      phone: '',
      email: '',
      company: '',
      applicationField: '',
      occupation: '',
      sampleInfo: '',
    };
  };

  const getInitialEventForm = () => {
    if (typeof window === 'undefined') {
      return {
        name: '',
        gender: 'male',
        contact: '',
        location: '',
        attendees: '',
        transport: '',
      };
    }
    const saved = localStorage.getItem(EVENT_FORM_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse event form data:', e);
      }
    }
    return {
      name: '',
      gender: 'male',
      contact: '',
      location: '',
      attendees: '',
      transport: '',
    };
  };

  // 样品申请表单状态 - 使用 localStorage 中的数据作为初始值
  const [sampleForm, setSampleForm] = useState(getInitialSampleForm);

  // 培训活动报名表单状态 - 使用 localStorage 中的数据作为初始值
  const [eventForm, setEventForm] = useState(getInitialEventForm);

  // 标记是否已初始化，用于控制是否保存到 localStorage
  const [isInitialized, setIsInitialized] = useState(false);

  // 页面加载完成后标记初始化完成
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // 样品表单变化时保存到 localStorage（仅在初始化完成后）
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(SAMPLE_FORM_KEY, JSON.stringify(sampleForm));
    }
  }, [sampleForm, isInitialized]);

  // 活动表单变化时保存到 localStorage（仅在初始化完成后）
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(EVENT_FORM_KEY, JSON.stringify(eventForm));
    }
  }, [eventForm, isInitialized]);

  // 清空样品表单
  const clearSampleForm = () => {
    const emptyForm = {
      contactName: '',
      phone: '',
      email: '',
      company: '',
      applicationField: '',
      occupation: '',
      sampleInfo: '',
    };
    setSampleForm(emptyForm);
    localStorage.removeItem(SAMPLE_FORM_KEY);
  };

  // 清空活动报名表单
  const clearEventForm = () => {
    const emptyForm = {
      name: '',
      gender: 'male',
      contact: '',
      location: '',
      attendees: '',
      transport: '',
    };
    setEventForm(emptyForm);
    localStorage.removeItem(EVENT_FORM_KEY);
  };

  // 检查登录状态，未登录则跳转登录页
  const checkLoginAndRedirect = () => {
    const token = getAuthToken();
    if (!token) {
      // 保存当前路径和状态到 localStorage，登录成功后返回
      const currentPath = window.location.pathname + window.location.search;
      localStorage.setItem('redirect_after_login', currentPath);
      navigate('/login');
      return false;
    }
    return true;
  };

  const handleEventRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    // 检查登录状态
    if (!checkLoginAndRedirect()) {
      return;
    }

    // 获取当前选中的活动ID
    if (!selectedEventId) {
      alert(t('请选择要报名的活动'));
      return;
    }

    setFormSubmitting(true);
    try {
      // 调用活动报名 API
      const response = await trainingApi.registerTraining(parseInt(selectedEventId), {
        name: eventForm.name,
        gender: eventForm.gender,
        contact: eventForm.contact,
        location: eventForm.location,
        attendees: parseInt(eventForm.attendees) || 1,
        transport: eventForm.transport,
      });

      if (response.code === 200) {
        setShowSuccess(true);
        // 提交成功后清空表单数据和 localStorage
        clearEventForm();
      } else {
        alert(response.message || t('报名提交失败，请重试'));
      }
    } catch (error: any) {
      console.error('活动报名提交失败:', error);
      alert(error.message || t('报名提交失败，请重试'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleSampleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 检查登录状态
    if (!checkLoginAndRedirect()) {
      return;
    }
    setFormSubmitting(true);
    try {
      // 调用样品申请 API
      const response = await businessApi.applySample({
        company: sampleForm.company,
        contact_name: sampleForm.contactName,
        email: sampleForm.email,
        phone: sampleForm.phone,
        product_info: `应用领域: ${sampleForm.applicationField}, 职业: ${sampleForm.occupation}, 样品信息: ${sampleForm.sampleInfo}`,
        quantity: 1, // 默认数量为1
      });

      if (response.code === 200) {
        setShowSuccess(true);
        // 提交成功后清空表单数据和 localStorage
        clearSampleForm();
      } else {
        alert(response.message || t('申请提交失败，请重试'));
      }
    } catch (error: any) {
      console.error('样品申请提交失败:', error);
      alert(error.message || t('申请提交失败，请重试'));
    } finally {
      setFormSubmitting(false);
    }
  };

  // 获取文档列表
  const fetchDocuments = async (category?: string, keyword?: string) => {
    setDocumentsLoading(true);
    try {
      const params: any = {};
      if (category) params.category = category;
      if (keyword) params.keyword = keyword;
      params.page = 1;
      params.limit = 20;

      const resp: any = await documentApi.getDocuments(params);
      if (resp && resp.code === 200) {
        const list = resp.data?.list || [];
        setDocuments(list);
        setDocumentsTotal(resp.data?.total ?? list.length);
      } else {
        console.error('获取文档列表失败:', resp && resp.message);
        setDocuments([]);
        setDocumentsTotal(0);
      }
    } catch (error) {
      console.error('获取文档列表失败:', error);
      setDocuments([]);
      setDocumentsTotal(0);
    } finally {
      setDocumentsLoading(false);
    }
  };

  // 获取文档分类
  const fetchCategories = async () => {
    try {
      const resp: any = await documentApi.getCategories();
      if (resp && resp.code === 200) {
        setCategories(resp.data?.list || []);
      } else {
        console.error('获取文档分类失败:', resp && resp.message);
      }
    } catch (error) {
      console.error('获取文档分类失败:', error);
    }
  };

  // 下载文档
  const downloadDocument = async (id: number, title: string) => {
    try {
      // 使用统一的 API_BASE_URL 构造下载链接，直接打开新窗口下载
      const url = `${API_BASE_URL}/documents/${id}/download`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('下载文档失败:', error);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化时间
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('zh-CN');
  };

  // 当组件加载或切换到文档标签页时获取数据
  React.useEffect(() => {
    if (activeTab === 'documents') {
      fetchDocuments();
      fetchCategories();
    }
  }, [activeTab]);

  // Fetch training events when tab active or page changes
  useEffect(() => {
    const loadEvents = async () => {
      if (activeTab !== 'training') return;
      setEventsLoading(true);
      try {
        const resp = await trainingApi.getTraining();
        const data: any = resp.data;
        let list: any[] = [];
        if (Array.isArray(data)) list = data;
        else if (data.list) list = data.list;
        else if (data.events) list = data.events;

        setEvents(list.map((it: any) => ({
          id: String(it.id),
          title: it.title || it.name || '',
          description: it.description || '',
          date: it.date || it.start_date || '',
          location: it.location || it.venue || '',
          image: it.image || it.cover_image || '',
          status: (it.status as any) || 'registering',
        })));

        // total if provided
        setEventsTotal((data.total as number) ?? (list ? list.length : null));
      } catch (err) {
        console.error('Failed to load training events', err);
        setEvents(EVENTS_FALLBACK);
        setEventsTotal(EVENTS_FALLBACK.length);
      } finally {
        setEventsLoading(false);
      }
    };

    loadEvents();
  }, [activeTab, eventsPage]);

  // Fetch articles when tab active or page changes
  useEffect(() => {
    const loadArticles = async () => {
      if (activeTab !== 'articles') return;
      setArticlesLoading(true);
      try {
        const resp = await articleApi.getArticles({ page: articlesPage, limit: 10 });
        const data: any = resp.data;
        let list: any[] = [];
        if (Array.isArray(data)) list = data;
        else if (data.list) list = data.list;
        else if (data.articles) list = data.articles;

        setArticles(list.map((it: any) => ({
          id: String(it.id),
          title: it.title || it.name || '',
          date: it.publish_time || it.create_time || it.date || '',
          views: it.views || it.view_count || 0,
          image: it.image || it.cover_image || '',
        })));

        setArticlesTotal((data.total as number) ?? (list ? list.length : null));
      } catch (err) {
        console.error('Failed to load articles', err);
        setArticles(ARTICLES_FALLBACK);
        setArticlesTotal(ARTICLES_FALLBACK.length);
      } finally {
        setArticlesLoading(false);
      }
    };

    loadArticles();
  }, [activeTab, articlesPage]);

  // 当 selectedArticleId 变化时，加载文章详情
  useEffect(() => {
    if (!selectedArticleId) {
      setArticleDetail(null);
      return;
    }
    const loadDetail = async () => {
      setArticleDetailLoading(true);
      try {
        const numericId = parseInt(selectedArticleId, 10);
        const resp = await articleApi.getArticle(numericId);
        if (resp.code === 200 && resp.data) {
          setArticleDetail({
            id: String(resp.data.id),
            title: resp.data.title || '',
            date: resp.data.publish_time || resp.data.create_time || '',
            views: resp.data.views || 0,
            image: resp.data.image || resp.data.cover_image || '',
            content: resp.data.content || resp.data.body || '',
            summary: resp.data.summary || resp.data.description || '',
          });
        }
      } catch (error) {
        console.error('获取文章详情失败:', error);
      } finally {
        setArticleDetailLoading(false);
      }
    };
    loadDetail();
  }, [selectedArticleId]);

  // 当分类或关键词变化时重新获取文档
  React.useEffect(() => {
    if (activeTab === 'documents') {
      fetchDocuments(selectedCategory, searchKeyword);
    }
  }, [selectedCategory, searchKeyword, activeTab]);

  const renderSampleApplication = () => (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2">
        {t('样品申请')} <span className="text-brand-red uppercase font-normal text-sm tracking-wider">SAMPLE APPLICATION</span>
      </h2>

      <form onSubmit={handleSampleSubmit} className="bg-gray-50 p-8 border border-gray-200 mt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center">
            <label className="w-24 text-xs text-gray-700 font-bold">{t('联 系 人 :')}</label>
            <input
              required
              type="text"
              value={sampleForm.contactName}
              onChange={(e) => setSampleForm({ ...sampleForm, contactName: e.target.value })}
              className="flex-1 border border-gray-300 p-2 text-sm rounded-sm focus:border-brand-red focus:outline-none"
            />
          </div>
          <div className="flex items-center">
            <label className="w-24 text-xs text-gray-700 font-bold">{t('联系电话 :')}</label>
            <input
              required
              type="text"
              value={sampleForm.phone}
              onChange={(e) => setSampleForm({ ...sampleForm, phone: e.target.value })}
              className="flex-1 border border-gray-300 p-2 text-sm rounded-sm focus:border-brand-red focus:outline-none"
            />
          </div>
          <div className="flex items-center">
            <label className="w-24 text-xs text-gray-700 font-bold">{t('邮寄地址 :')}</label>
            <input
              required
              type="email"
              value={sampleForm.email}
              onChange={(e) => setSampleForm({ ...sampleForm, email: e.target.value })}
              className="flex-1 border border-gray-300 p-2 text-sm rounded-sm focus:border-brand-red focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center">
            <label className="w-24 text-xs text-gray-700 font-bold">{t('公司名称 :')}</label>
            <input
              required
              type="text"
              value={sampleForm.company}
              onChange={(e) => setSampleForm({ ...sampleForm, company: e.target.value })}
              className="flex-1 border border-gray-300 p-2 text-sm rounded-sm focus:border-brand-red focus:outline-none"
            />
          </div>
          <div className="flex items-center">
            <label className="w-24 text-xs text-gray-700 font-bold">{t('应用领域 :')}</label>
            <input
              required
              type="text"
              value={sampleForm.applicationField}
              onChange={(e) => setSampleForm({ ...sampleForm, applicationField: e.target.value })}
              className="flex-1 border border-gray-300 p-2 text-sm rounded-sm focus:border-brand-red focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center">
          <label className="w-24 text-xs text-gray-700 font-bold">{t('职业 :')}</label>
          <input
            type="text"
            value={sampleForm.occupation}
            onChange={(e) => setSampleForm({ ...sampleForm, occupation: e.target.value })}
            className="flex-1 border border-gray-300 p-2 text-sm rounded-sm focus:border-brand-red focus:outline-none"
          />
        </div>

        <div className="flex items-start">
          <label className="w-24 text-xs text-gray-700 font-bold pt-2">{t('样品信息 :')}</label>
          <textarea
            required
            rows={6}
            value={sampleForm.sampleInfo}
            onChange={(e) => setSampleForm({ ...sampleForm, sampleInfo: e.target.value })}
            className="flex-1 border border-gray-300 p-2 text-sm rounded-sm focus:border-brand-red focus:outline-none text-gray-600 leading-relaxed"
          />
        </div>

        <div className="flex justify-center mt-8">
          <button type="submit" disabled={formSubmitting} className="bg-brand-red text-white px-12 py-3 font-bold text-sm rounded-sm hover:bg-red-700 transition-colors shadow-lg">
            {formSubmitting ? t('提交中...') : t('免费申请样片')}
          </button>
        </div>
      </form>

      {showSuccess && <SuccessModal title={t('申请成功')} onClose={() => setShowSuccess(false)} />}
    </div>
  );

  const renderEventDetail = () => (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      <button onClick={() => setSelectedEventId(null)} className="mb-6 text-sm text-gray-500 hover:text-brand-red flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> {t('返回活动列表')}
      </button>

      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-white mb-2">2023深圳电子元器件采购展</h2>
        <p className="text-gray-400 text-sm">深圳电子元器件采购展深圳电子元器件采购展深圳电子元器件采购展...</p>
      </div>

      {/* Note: Using a dark wrapper to simulate the modal look from the design but inline for the page */}
      <div className="bg-[#0F172A] p-8 rounded-xl shadow-2xl border border-slate-700 relative overflow-hidden">
        <h2 className="text-xl font-bold text-white text-center mb-2">2023深圳电子元器件采购展</h2>
        <p className="text-xs text-gray-400 text-center mb-8 max-w-3xl mx-auto">
          深圳电子元器件采购展深圳电子元器件采购展深圳电子元器件采购展深圳电子元器件采购展深圳电子元器件采购展深圳电子元器件采购展深圳电子元器件采购展深圳电子元器件采购展
        </p>

        <form onSubmit={handleEventRegister} className="space-y-6 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-white text-xs font-bold mb-2"><span className="text-red-500">*</span> {t('姓 名 :')}</label>
              <input
                required
                type="text"
                value={eventForm.name}
                onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                className="w-full bg-white text-gray-900 border-none h-10 px-3 rounded-sm"
              />
            </div>
            <div>
              <label className="block text-white text-xs font-bold mb-2"><span className="text-red-500">*</span> {t('性 别 :')}</label>
              <div className="flex items-center space-x-6 h-10 bg-white px-3 rounded-sm">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={eventForm.gender === 'male'}
                    onChange={(e) => setEventForm({ ...eventForm, gender: e.target.value })}
                    className="w-4 h-4 text-green-500 focus:ring-green-500"
                  />
                  <span className="ml-2 text-xs text-gray-700">{t('男')}</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={eventForm.gender === 'female'}
                    onChange={(e) => setEventForm({ ...eventForm, gender: e.target.value })}
                    className="w-4 h-4 text-gray-300 focus:ring-gray-500"
                  />
                  <span className="ml-2 text-xs text-gray-700">{t('女')}</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-white text-xs font-bold mb-2"><span className="text-red-500">*</span> {t('联系方式 :')}</label>
              <input
                required
                type="text"
                value={eventForm.contact}
                onChange={(e) => setEventForm({ ...eventForm, contact: e.target.value })}
                className="w-full bg-white text-gray-900 border-none h-10 px-3 rounded-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-white text-xs font-bold mb-2"><span className="text-red-500">*</span> {t('来自哪里 :')}</label>
              <input
                required
                type="text"
                value={eventForm.location}
                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                className="w-full bg-white text-gray-900 border-none h-10 px-3 rounded-sm"
              />
            </div>
            <div>
              <label className="block text-white text-xs font-bold mb-2"><span className="text-red-500">*</span> {t('出行人数 :')}</label>
              <input
                required
                type="number"
                value={eventForm.attendees}
                onChange={(e) => setEventForm({ ...eventForm, attendees: e.target.value })}
                className="w-full bg-white text-gray-900 border-none h-10 px-3 rounded-sm"
              />
            </div>
            <div>
              <label className="block text-white text-xs font-bold mb-2"><span className="text-red-500">*</span> {t('交通方式 :')}</label>
              <input
                required
                type="text"
                value={eventForm.transport}
                onChange={(e) => setEventForm({ ...eventForm, transport: e.target.value })}
                className="w-full bg-white text-gray-900 border-none h-10 px-3 rounded-sm"
              />
            </div>
          </div>

          <div className="pt-8 pb-4">
            <h3 className="text-xl text-white font-bold text-center mb-8">{t('会议议题')}</h3>
            <div className="text-gray-300 text-sm space-y-4 text-center">
              <p>{t('LED电机驱动方案无感方波')}</p>
              <p>{t('无感正弦控制技术')}</p>
              <p>{t('电动工具锂电方案锂电池和锂电池充电器方案')}</p>
              <p>{t('电动工具锂电保护方案')}</p>
              <p>{t('无刷电机控制器评测与发展')}</p>
              <p>{t('磷酸铁锂动力电池技术与工艺介绍')}</p>
            </div>
          </div>

          <button type="submit" disabled={formSubmitting} className="w-full bg-brand-red text-white font-bold py-3 rounded-sm hover:bg-red-700 transition-colors mt-8">
            {formSubmitting ? t('提交中...') : t('我要报名')}
          </button>
        </form>
      </div>

      {showSuccess && <SuccessModal title={t('报名成功')} onClose={() => setShowSuccess(false)} />}
    </div>
  );

  const renderTrainingActivities = () => (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{t('培训活动')}</h2>
        <span className="text-brand-red uppercase text-sm font-normal tracking-wider">SAMPLE APPLICATION</span>
      </div>

      {/* Featured Banner */}
      <div className="relative w-full h-64 md:h-80 overflow-hidden mb-8 group cursor-pointer">
        <img src="https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=2070&auto=format&fit=crop" alt="Training" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute bottom-0 left-0 right-0 bg-brand-red text-white py-3 px-6 font-bold text-center md:text-left">
          {t('2023年深圳电子元器件及物料采购展览会 （ “ES SHOW” ）')}
        </div>
      </div>

      <div className="space-y-6">
        {eventsLoading && (
          <div className="flex justify-center items-center h-36">
            <div className="text-gray-500">{t('加载中...')}</div>
          </div>
        )}

        {!eventsLoading && events.length === 0 && (
          <div className="bg-gray-50 p-8 text-center">
            <div className="text-gray-500">{t('暂无培训活动')}</div>
          </div>
        )}

        {!eventsLoading && events.map(event => (
          <div key={event.id} className="bg-white border border-gray-100 hover:shadow-lg transition-shadow p-6 flex flex-col md:flex-row gap-6 items-start">
            <div className="w-full md:w-1/3 h-48 bg-gray-200 flex-shrink-0">
              {(!event.image || event.image.includes('placehold')) ? (
                <div className="w-full h-full bg-gray-300 animate-pulse"></div>
              ) : (
                <img src={event.image} alt={t(event.title)} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 py-2">
              <h3 className="text-lg font-bold text-gray-900 mb-2">{t(event.title)}</h3>
              <p className="text-xs text-gray-500 mb-6 leading-relaxed line-clamp-2">{event.description ? t(event.description) : ''}</p>

              <button
                onClick={() => setSelectedEventId(event.id)}
                className="bg-brand-red text-white px-8 py-2 text-sm font-medium rounded-sm hover:bg-red-700 transition-colors"
              >
                {t('我要报名')}
              </button>

              <div className="mt-6 text-xs text-gray-500 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-700">{t('时间:')}</span> {event.date}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-700">{t('地点:')}</span> {event.location}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination: only show when more than 10 */}
      {((eventsTotal ?? events.length) ?? 0) > 10 && (
        <div className="flex justify-end items-center gap-4 mt-10 text-xs text-gray-500">
          <button onClick={() => setEventsPage(p => Math.max(1, p - 1))}>{t('上一页')}</button>
          <span className="text-gray-900">{eventsPage}</span>
          <button className="bg-brand-red text-white w-8 h-6 flex items-center justify-center rounded-sm" onClick={() => setEventsPage(p => p + 1)}>下一页</button>
        </div>
      )}
    </div>
  );

  const renderArticleDetail = (article: Article) => {
    const detail = articleDetail || article;
    return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      <button onClick={() => setSelectedArticleId(null)} className="mb-6 text-sm text-gray-500 hover:text-brand-red flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> {t('返回文章列表')}
      </button>

      {articleDetailLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-12">{t(detail.title)}</h1>

          {detail.content ? (
            <div
              className="prose max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(detail.content) }}
            />
          ) : (
            <div className="text-center text-gray-500 py-12">
              {t('暂无文章内容')}
            </div>
          )}
        </>
      )}
    </div>
    );
  };

  const renderDocumentDownloads = () => (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{t('文档下载')}</h2>
        <span className="text-brand-red uppercase text-sm font-normal tracking-wider">DOCUMENT DOWNLOAD</span>
      </div>

      {/* 筛选区域 */}
      <div className="bg-gray-50 p-6 mb-8 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700 font-bold w-20">{t('分类:')}</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex-1 border border-gray-300 p-2 text-sm rounded-sm focus:border-brand-red focus:outline-none"
            >
              <option value="">{t('全部')}</option>
              {categories.map((category, index) => (
                <option key={index} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700 font-bold w-20">{t('搜索:')}</span>
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder={t('搜索文档标题或描述')}
                className="w-full border border-gray-300 p-2 text-sm rounded-sm focus:border-brand-red focus:outline-none pr-10"
              />
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 文档列表 */}
      {documentsLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">{t('加载中...')}</div>
        </div>
      ) : (
        <div className="space-y-6">
          {documents.length === 0 ? (
            <div className="bg-gray-50 p-8 text-center">
              <div className="text-gray-500">{t('暂无文档')}</div>
            </div>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="bg-white border border-gray-100 hover:shadow-lg transition-shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{t(doc.title)}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{doc.description ? t(doc.description) : ''}</p>
                    <div className="flex items-center gap-6 text-xs text-gray-500">
                      <span>{t('分类:')} {doc.category ? t(doc.category) : ''}</span>
                      <span>{t('大小:')} {formatFileSize(doc.file_size)}</span>
                      <span>{t('下载次数:')} {doc.download_count}</span>
                      <span>{t('发布时间:')} {formatDate(doc.create_time)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadDocument(doc.id, doc.title)}
                    className="bg-brand-red text-white px-6 py-2 text-sm font-medium rounded-sm hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    {t('下载文档')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  const renderDesignArticles = () => (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{t('设计技术文章')}</h2>
        <span className="text-brand-red uppercase text-sm font-normal tracking-wider">DESIGN TECHNOLOGY ARTICLE</span>
      </div>

      {/* Carousel Banner */}
      <div className="relative w-full h-64 overflow-hidden mb-12 group">
        <img src="https://images.unsplash.com/photo-1555664424-778a1e5e1b48?q=80&w=2070&auto=format&fit=crop" alt="Chips" className="w-full h-full object-cover" />
        <div className="absolute bottom-0 left-0 right-0 bg-brand-red text-white py-3 px-4 font-bold text-center">
          {t('什么是三端稳压管')}
        </div>
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2">
          <div className="w-2 h-2 bg-brand-red rounded-full"></div>
          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {articlesLoading && (
          <div className="col-span-1 md:col-span-2 flex justify-center items-center h-36">
            <div className="text-gray-500">{t('加载中...')}</div>
          </div>
        )}

        {!articlesLoading && articles.length === 0 && (
          <div className="bg-gray-50 p-8 text-center col-span-1 md:col-span-2">
            <div className="text-gray-500">暂无文章</div>
          </div>
        )}

        {!articlesLoading && articles.map(article => (
          <div key={article.id} onClick={() => setSelectedArticleId(article.id)} className="bg-white p-6 flex items-start gap-6 cursor-pointer group hover:shadow-md transition-shadow border border-transparent hover:border-gray-100">
            <div className="w-32 h-32 bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 p-2">
              {article.image ? (
                <img src={article.image} alt={t(article.title)} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full bg-gray-100" />
              )}
            </div>
            <div className="flex-1 py-2">
              <h3 className="font-bold text-gray-800 mb-auto group-hover:text-brand-red transition-colors">{t(article.title)}</h3>
              <div className="mt-12 flex items-center justify-between text-xs text-gray-400">
                <span>{article.date}</span>
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {article.views}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination: only show when more than 10 */}
      {((articlesTotal ?? articles.length) ?? 0) > 10 && (
        <div className="flex justify-end items-center gap-4 mt-10 text-xs text-gray-500">
          <button onClick={() => setArticlesPage(p => Math.max(1, p - 1))}>{t('上一页')}</button>
          <span className="text-gray-900">{articlesPage}</span>
          <button className="bg-brand-red text-white w-8 h-6 flex items-center justify-center rounded-sm" onClick={() => setArticlesPage(p => p + 1)}>下一页</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white min-h-screen pb-20 font-sans">
      {/* Hero Section */}
      <div className="relative h-[400px] md:h-[500px] bg-slate-900 w-full overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=2069&auto=format&fit=crop"
          alt="Tech Support Team"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-transparent"></div>

        <div className="relative z-10 container mx-auto px-4 md:px-8 h-full flex flex-col justify-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">{t('技术支持')}</h1>
          <p className="text-gray-200 text-sm md:text-base max-w-xl leading-relaxed opacity-90">
            {t('我们拥有一支专业的技术团队，为客户提供电子元件选型、电路设计、故障排查等技术支持，帮助客户解决技术难题')}
          </p>
        </div>
      </div>

      {/* Content Navigation */}
      <div className="border-b border-gray-200 sticky top-[72px] z-30 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex justify-end space-x-8 text-sm">
            <button
              onClick={() => { setActiveTab('sample'); setSelectedEventId(null); setSelectedArticleId(null); }}
              className={`py-4 relative transition-colors ${activeTab === 'sample' ? 'text-brand-red font-bold' : 'text-gray-600 hover:text-brand-red'}`}
            >
              {t('样品申请')}
              {activeTab === 'sample' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red"></div>}
            </button>
            <button
              onClick={() => { setActiveTab('training'); setSelectedEventId(null); setSelectedArticleId(null); }}
              className={`py-4 relative transition-colors ${activeTab === 'training' ? 'text-brand-red font-bold' : 'text-gray-600 hover:text-brand-red'}`}
            >
              {t('培训活动')}
              {activeTab === 'training' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red"></div>}
            </button>
            <button
              onClick={() => { setActiveTab('articles'); setSelectedEventId(null); setSelectedArticleId(null); }}
              className={`py-4 relative transition-colors ${activeTab === 'articles' ? 'text-brand-red font-bold' : 'text-gray-600 hover:text-brand-red'}`}
            >
              {t('设计技术文章')}
              {activeTab === 'articles' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red"></div>}
            </button>
            <button
              onClick={() => { setActiveTab('documents'); setSelectedEventId(null); setSelectedArticleId(null); }}
              className={`py-4 relative transition-colors ${activeTab === 'documents' ? 'text-brand-red font-bold' : 'text-gray-600 hover:text-brand-red'}`}
            >
              {t('文档下载')}
              {activeTab === 'documents' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red"></div>}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 md:px-8 py-12">
        {activeTab === 'sample' && renderSampleApplication()}

        {activeTab === 'training' && (
          selectedEventId ? renderEventDetail() : renderTrainingActivities()
        )}

        {activeTab === 'articles' && (
          selectedArticleId ? renderArticleDetail(articles.find(a => a.id === selectedArticleId)!) : renderDesignArticles()
        )}

        {activeTab === 'documents' && renderDocumentDownloads()}
      </div>
    </div>
  );
};
