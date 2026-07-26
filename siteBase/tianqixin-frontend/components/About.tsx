import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check, Upload, ChevronRight, MapPin, Users, Target, Award, Briefcase, Smile, CheckCircle2, Lightbulb, ShieldCheck, Microscope, Globe, Package, Headset } from 'lucide-react';
import { uploadApi, jobApi } from '../lib/api-client';

type Tab = 'intro' | 'values' | 'team' | 'careers';

export const About: React.FC = () => {
   const { t } = useTranslation();
   console.log('[About Component] Rendering');
   const [activeTab, setActiveTab] = useState<Tab>('intro');
   const location = useLocation();

   useEffect(() => {
      const hash = location.hash.replace('#', '');
      if (hash === 'intro' || hash === 'profile') {
         setActiveTab('intro');
      } else if (hash === 'values') {
         setActiveTab('values');
      } else if (hash === 'team') {
         setActiveTab('team');
      } else if (hash === 'careers') {
         setActiveTab('careers');
      }
   }, [location.hash]);

   // --- Sub-components ---

   const IntroTab = () => (
      <div className="space-y-20">
         {/* Enterprise Profile */}
         <section id="profile" className="container mx-auto px-4 md:px-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-8 border-l-4 border-brand-red pl-4">{t('企业简介')}</h2>
            <div className="flex flex-col md:flex-row gap-12 items-start">
               <div className="w-full md:w-1/2 text-gray-600 text-sm leading-loose space-y-6">
                  <p>
                     {t('天启芯科技有限公司是一家专注于全球电子元件供应与贸易的综合性企业。我们致力于为全球电子制造企业提供高质量、多品种、性价比优越的电子元件，帮助客户满足产品的卓越性能与高效生产。')}
                  </p>
                  <p>
                     {t('我们始终将客户需求放在首位，以客户满意度为衡量工作成效的重要标准。通过不断优化供应链管理，我们确保每一颗芯片、每一个电阻都能准时、准确地送达客户手中。')}
                  </p>
               </div>
               <div className="w-full md:w-1/2">
                  <div className="relative h-80 w-full overflow-hidden rounded-sm shadow-lg">
                     <img
                        src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
                        alt="Skyscrapers"
                        className="w-full h-full object-cover"
                     />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                  </div>
               </div>
            </div>
         </section>

         {/* Values Footer */}
         <div className="bg-brand-red text-white py-16 text-center">
            <div className="container mx-auto px-4">
               <h3 className="text-2xl font-bold mb-4">{t('我们的价值观')}</h3>
               <p className="text-lg font-medium opacity-90">{t('秉承 "客户至上、质量为本、创新驱动、诚信经营" 的企业理念')}</p>
            </div>
         </div>
      </div>
   );

   const CareersTab = () => {
      const [jobs, setJobs] = useState<any[]>([]);
      const [loading, setLoading] = useState(false);
      const [selectedJob, setSelectedJob] = useState<string | null>(null);
      const [jobDetail, setJobDetail] = useState<any>(null);
      const [showApplyForm, setShowApplyForm] = useState(false);
      const [formData, setFormData] = useState({
         name: '',
         phone: '',
         email: '',
         job_title: ''
      });
      const [file, setFile] = useState<File | null>(null);
      const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
      const [statusMessage, setStatusMessage] = useState('');

      // Fetch jobs on mount
      React.useEffect(() => {
         const fetchJobs = async () => {
            setLoading(true);
            try {
               const res = await jobApi.getJobs();
               if (res.code === 200) {
                  if (Array.isArray(res.data)) {
                     setJobs(res.data);
                  } else if (res.data && Array.isArray(res.data.list)) {
                     setJobs(res.data.list);
                  }
               }
            } catch (error) {
               console.error('Failed to fetch jobs:', error);
            } finally {
               setLoading(false);
            }
         };
         fetchJobs();
      }, []);

      // Fetch job detail when selected
      React.useEffect(() => {
         const fetchJobDetail = async () => {
            if (!selectedJob) {
               setJobDetail(null);
               return;
            }
            try {
               const res = await jobApi.getJob(parseInt(selectedJob));
               if (res.code === 200 && res.data) {
                  setJobDetail(res.data);
               }
            } catch (error) {
               console.error('Failed to fetch job detail:', error);
            }
         };
         fetchJobDetail();
      }, [selectedJob]);

      const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
         const selectedFile = e.target.files?.[0];
         if (selectedFile) {
            if (selectedFile.size > 50 * 1024 * 1024) {
               alert('文件大小不能超过50MB');
               return;
            }
            setFile(selectedFile);
         }
      };

      const handleSubmit = async (e: React.FormEvent) => {
         e.preventDefault();
         if (!file) {
            alert('请选择简历文件');
            return;
         }

         setUploadStatus('uploading');
         setStatusMessage('正在上传简历...');

         try {
            // 1. 上传简历
            const uploadRes = await uploadApi.uploadFile(file);
            if (uploadRes.code !== 200) {
               throw new Error(uploadRes.message || '上传失败');
            }

            const resume_url = uploadRes.data.url;
            setStatusMessage('简历上传成功，正在提交申请...');

            // 2. 提交职位申请
            const applyRes = await jobApi.applyJob(parseInt(selectedJob!), {
               ...formData,
               resume: resume_url
            });

            if (applyRes.code === 200) {
               setUploadStatus('success');
               setStatusMessage('申请提交成功！');
               setTimeout(() => {
                  setShowApplyForm(false);
                  setUploadStatus('idle');
                  setFile(null);
                  setFormData({ name: '', phone: '', email: '', job_title: '' });
               }, 2000);
            } else {
               throw new Error(applyRes.message || '提交申请失败');
            }
         } catch (error: any) {
            setUploadStatus('error');
            setStatusMessage(error.message || '操作失败，请重试');
         }
      };

      if (showApplyForm) {
         return (
            <div className="container mx-auto px-4 max-w-3xl py-8 animate-in fade-in zoom-in duration-300">
               <button onClick={() => setShowApplyForm(false)} className="text-gray-500 hover:text-brand-red flex items-center gap-1 mb-8">
                  <ChevronDown className="w-4 h-4 rotate-90" /> {t('返回')}
               </button>

               <div className="flex items-center gap-3 mb-8">
                  <h2 className="text-2xl font-bold text-gray-800">{t('简历申请')}</h2>
                  <span className="text-brand-red uppercase text-sm font-normal tracking-wider">RESUME APPLICATION</span>
               </div>

               <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="space-y-4">
                     <input
                        type="text"
                        placeholder={t('* 姓名 :')}
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full border border-gray-300 p-3 rounded-sm focus:outline-none focus:border-brand-red text-sm"
                     />
                     <input
                        type="text"
                        placeholder={t('* 联系电话 :')}
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full border border-gray-300 p-3 rounded-sm focus:outline-none focus:border-brand-red text-sm"
                     />
                     <input
                        type="email"
                        placeholder={t('* 邮箱 :')}
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full border border-gray-300 p-3 rounded-sm focus:outline-none focus:border-brand-red text-sm"
                     />
                     <input
                        type="text"
                        placeholder={t('* 投递岗位 :')}
                        required
                        value={formData.job_title}
                        onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                        className="w-full border border-gray-300 p-3 rounded-sm focus:outline-none focus:border-brand-red text-sm"
                     />
                  </div>

                  <div
                     className="border-2 border-dashed border-gray-300 rounded-sm p-8 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors cursor-pointer h-48 relative"
                     onClick={() => document.getElementById('resume-upload')?.click()}
                  >
                     <div className="w-12 h-12 border-2 border-gray-300 rounded flex items-center justify-center mb-2">
                        <Briefcase className="w-6 h-6" />
                     </div>
                     <span className="text-xs">{file ? file.name : t('上传简历 : 50M')}</span>
                     <input
                        id="resume-upload"
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                     />
                  </div>

                  {uploadStatus !== 'idle' && (
                     <div className={`text-sm text-center ${uploadStatus === 'error' ? 'text-red-500' : 'text-brand-red'}`}>
                        {statusMessage}
                     </div>
                  )}

                  <button
                     type="submit"
                     disabled={uploadStatus === 'uploading'}
                     className={`w-full bg-brand-red text-white py-3 font-bold rounded-sm hover:bg-red-700 transition-colors ${uploadStatus === 'uploading' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                     {uploadStatus === 'uploading' ? t('提交中...') : t('提交')}
                  </button>
               </form>
            </div>
         )
      }

      return (
         <div className="container mx-auto px-4 md:px-8 py-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 mb-8">
               <h2 className="text-2xl font-bold text-gray-800">{t('人才招聘')}</h2>
               <span className="text-brand-red uppercase text-sm font-normal tracking-wider">TALENT RECRUITMENT</span>
            </div>

            {loading ? (
               <div className="text-center py-12 text-gray-500">{t('加载中...')}</div>
            ) : jobs.length === 0 ? (
               <div className="text-center py-12 text-gray-500">{t('暂无招聘职位')}</div>
            ) : (
               <div className="space-y-6">
                  {jobs.map((job) => (
                     <div key={job.id} className="border border-gray-200 hover:shadow-md transition-shadow bg-white">
                        {/* Header - Always Visible */}
                        <div className="flex flex-col md:flex-row items-start md:items-center p-6 gap-4">
                           <div className="w-32 h-24 bg-gray-100 flex-shrink-0 overflow-hidden relative">
                              <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=800&auto=format&fit=crop" alt="Job" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/10"></div>
                           </div>

                           <div className="flex-1">
                              <h3 className="text-lg font-bold text-gray-800 mb-1">{t(job.job_title)}</h3>
                              <div className="flex flex-wrap gap-y-2 gap-x-6 text-xs text-gray-500 mt-2">
                                 <span>{t('工作地点')} : {job.location ? t(job.location) : t('深圳')}</span>
                                 <span className="hidden md:inline">|</span>
                                 <span>{t('部门')} : {job.department ? t(job.department) : t('技术部')}</span>
                                 <span className="hidden md:inline">|</span>
                                 <span>{t('发布日期')} : {job.create_time?.substring(0, 10) || '2024.01.01'}</span>
                              </div>
                           </div>

                           <div className="flex-shrink-0">
                              {selectedJob === String(job.id) ? (
                                 <button onClick={() => setSelectedJob(null)} className="text-gray-400 hover:text-gray-600">
                                    <ChevronDown className="w-6 h-6 rotate-180" />
                                 </button>
                              ) : (
                                 <button
                                    onClick={() => setSelectedJob(String(job.id))}
                                    className="bg-brand-red text-white px-6 py-2 text-sm font-medium rounded-sm hover:bg-red-700"
                                 >
                                    {t('查看详情')}
                                 </button>
                              )}
                           </div>
                        </div>

                        {/* Expanded Details */}
                        {selectedJob === String(job.id) && (
                           <div className="border-t border-gray-100 p-6 bg-gray-50 animate-in slide-in-from-top-2">
                              {jobDetail ? (
                                 <div className="text-sm text-gray-600 space-y-4 mb-6">
                                    <p className="font-bold text-gray-800">{t('薪资范围')} : <span className="text-brand-red">{jobDetail.salary_range ? t(jobDetail.salary_range) : t('面议')}</span></p>

                                    <div>
                                       <p className="font-bold text-gray-800 mb-2">{t('岗位职责')} :</p>
                                       <div className="text-xs text-gray-500 whitespace-pre-line leading-relaxed">
                                          {jobDetail.responsibilities ? t(jobDetail.responsibilities) : t('暂无描述')}
                                       </div>
                                    </div>

                                    <div>
                                       <p className="font-bold text-gray-800 mb-2">{t('任职资格')} :</p>
                                       <div className="text-xs text-gray-500 whitespace-pre-line leading-relaxed">
                                          {jobDetail.requirements ? t(jobDetail.requirements) : t('暂无描述')}
                                       </div>
                                    </div>
                                 </div>
                              ) : (
                                 <div className="py-8 text-center text-gray-500">{t('加载详情中...')}</div>
                              )}

                                  <button
                                 onClick={() => {
                                    setFormData(prev => ({ ...prev, job_title: t(job.job_title) }));
                                    setShowApplyForm(true);
                                 }}
                                 className="bg-brand-red text-white px-8 py-2 text-sm font-bold rounded-sm hover:bg-red-700"
                              >
                                 {t('申请职位')}
                              </button>
                           </div>
                        )}
                     </div>
                  ))}
               </div>
            )}
         </div>
      );
   };

   // --- Main Render ---

   return (
      <div className="bg-white min-h-screen pb-20 font-sans">
         {/* Hero Section */}
         <div className="relative h-[400px] bg-slate-900 w-full overflow-hidden">
            <img
               src="https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=2074&auto=format&fit=crop"
               alt="Meeting"
               className="absolute inset-0 w-full h-full object-cover opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent"></div>

            <div className="relative z-10 container mx-auto px-4 md:px-8 h-full flex flex-col justify-center">
               <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">{t('关于天启芯')}</h1>
               <p className="text-gray-200 text-sm md:text-base max-w-xl leading-relaxed opacity-90">
                  {t('我们满怀热情,致力于通过半导体技术让电子产品更经济实用,创造一个更美好的世界')}
               </p>
            </div>
         </div>

         {/* Tab Navigation */}
         <div className="border-b border-gray-200 bg-white sticky top-[72px] z-30">
            <div className="container mx-auto px-4 md:px-8">
               <div className="flex justify-end space-x-8 text-sm">
                  {[
                     { id: 'intro', label: t('企业简介') },
                     { id: 'values', label: t('企业价值观') },
                     { id: 'team', label: t('团队介绍') },
                     { id: 'careers', label: t('人才招聘') }
                  ].map((tab) => (
                     <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={`py-4 relative transition-colors ${activeTab === tab.id ? 'text-brand-red font-bold' : 'text-gray-600 hover:text-brand-red'}`}
                     >
                        {tab.label}
                        {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red"></div>}
                     </button>
                  ))}
               </div>
            </div>
         </div>

         {/* Content Content */}
         <div className="pt-12">
            {activeTab === 'intro' && <IntroTab />}
            {activeTab === 'values' && (
               <div className="bg-gray-50/50 py-20">
                  <div className="container mx-auto px-4">
                     <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('我们的价值观')}</h2>
                        <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
                           {t('秉承"客户至上、质量为本、创新驱动、诚信经营"的企业理念，我们致力于成为全球领先的电子元件供应商。')}
                        </p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                           {
                              id: '01',
                              title: t('客户至上'),
                              desc: t('我们将客户需求放在首位，以客户满意度为衡量工作成效的重要标准。每一颗芯片都能准时送达。'),
                              icon: <Smile className="w-6 h-6 text-blue-500" />,
                              bgColor: 'bg-blue-50',
                              badgeColor: 'bg-blue-100 text-blue-600'
                           },
                           {
                              id: '02',
                              title: t('质量为本'),
                              desc: t('严格把控供应链每一个环节，确保提供高质量、多品种、性价比优越的电子元件产品。'),
                              icon: <CheckCircle2 className="w-6 h-6 text-green-500" />,
                              bgColor: 'bg-green-50',
                              badgeColor: 'bg-green-100 text-green-600'
                           },
                           {
                              id: '03',
                              title: t('创新驱动'),
                              desc: t('持续投入研发，探索前沿技术，为客户提供更具竞争力的半导体解决方案。'),
                              icon: <Lightbulb className="w-6 h-6 text-purple-500" />,
                              bgColor: 'bg-purple-50',
                              badgeColor: 'bg-purple-100 text-purple-600'
                           },
                           {
                              id: '04',
                              title: t('诚信经营'),
                              desc: t('坚持诚实守信，建立透明、可靠的合作伙伴关系，实现共赢发展。'),
                              icon: <ShieldCheck className="w-6 h-6 text-orange-500" />,
                              bgColor: 'bg-orange-50',
                              badgeColor: 'bg-orange-100 text-orange-600'
                           }
                        ].map((item) => (
                           <div key={item.id} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative group">
                              <div className={`absolute top-6 right-6 px-2 py-0.5 rounded text-xs font-bold ${item.badgeColor}`}>
                                 {item.id}
                              </div>
                              <div className={`w-14 h-14 ${item.bgColor} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                 {item.icon}
                              </div>
                              <h3 className="text-xl font-bold text-gray-900 mb-4">{item.title}</h3>
                              <p className="text-gray-500 text-sm leading-relaxed text-left">
                                 {item.desc}
                              </p>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            )}
            {activeTab === 'team' && (
               <div className="bg-white py-20">
                  <div className="container mx-auto px-4">
                     <div className="mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-12">{t('职能部门')}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                           {[
                              { title: t('研发中心'), sub: t('创新驱动未来'), icon: <Microscope className="w-6 h-6 text-red-500" />, bgColor: 'bg-red-50' },
                              { title: t('全球销售'), sub: t('连接世界需求'), icon: <Globe className="w-6 h-6 text-blue-500" />, bgColor: 'bg-blue-50' },
                              { title: t('供应链管理'), sub: t('高效精准交付'), icon: <Package className="w-6 h-6 text-green-500" />, bgColor: 'bg-green-50' },
                              { title: t('客户服务'), sub: t('全天候支持'), icon: <Headset className="w-6 h-6 text-orange-500" />, bgColor: 'bg-orange-50' }
                           ].map((dept, i) => (
                              <div key={i} className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-center">
                                 <div className={`w-16 h-16 ${dept.bgColor} rounded-full flex items-center justify-center mx-auto mb-6`}>
                                    {dept.icon}
                                 </div>
                                 <h3 className="text-lg font-bold text-gray-900 mb-2">{dept.title}</h3>
                                 <p className="text-gray-400 text-sm">{dept.sub}</p>
                              </div>
                           ))}
                        </div>
                     </div>

                     <div className="relative h-[400px] rounded-3xl overflow-hidden group">
                        <img
                           src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop"
                           alt="Team Spirit"
                           className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-12">
                           <h2 className="text-3xl font-bold text-white mb-4">{t('团队精神')}</h2>
                           <p className="text-gray-200 text-lg opacity-90">{t('我们相信合作的力量，共同创造非凡价值。')}</p>
                        </div>
                     </div>
                  </div>
               </div>
            )}
            {activeTab === 'careers' && <CareersTab />}
         </div>
      </div>
   );
};