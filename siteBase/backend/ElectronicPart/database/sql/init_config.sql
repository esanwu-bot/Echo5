-- 初始化系统配置数据
USE `semiconductor_db`;

-- 清空原有配置数据
DELETE FROM `sk_config`;

-- 基本信息配置
INSERT INTO `sk_config` (`config_key`, `config_value`, `description`, `group`) VALUES
('site_name', '天启芯科技', '网站名称', 'basic'),
('site_logo', '', '网站LOGO', 'basic'),
('site_description', '专业的半导体元件供应商', '网站描述', 'basic'),
('site_keywords', '半导体,电子元件,MOS管,二极管,三极管', '网站关键词', 'basic'),
('site_icp', '', 'ICP备案号', 'basic'),
('site_copyright', '© 2024 天启芯科技 版权所有', '版权信息', 'basic');

-- 联系信息配置
INSERT INTO `sk_config` (`config_key`, `config_value`, `description`, `group`) VALUES
('contact_phone', '0755-12345678', '联系电话', 'contact'),
('contact_email', 'info@tqx.com', '联系邮箱', 'contact'),
('contact_address', '深圳市南山区科技园南区', '联系地址', 'contact'),
('contact_qq', '123456789', 'QQ号', 'contact'),
('contact_wechat', 'tqxtech', '微信号', 'contact'),
('service_time', '9:00-18:00', '服务时间', 'contact');

-- SEO设置
INSERT INTO `sk_config` (`config_key`, `config_value`, `description`, `group`) VALUES
('meta_title', '天启芯科技 - 专业的半导体元件供应商', 'SEO标题', 'seo'),
('meta_description', '天启芯科技专注于半导体元件的研发、生产和销售，提供高品质的MOS管、二极管、三极管等电子元件', 'SEO描述', 'seo'),
('meta_keywords', '半导体,电子元件,MOS管,二极管,三极管', 'SEO关键词', 'seo'),
('og_image', '', '社交分享图片', 'seo'),
('google_analytics', '', 'Google Analytics代码', 'seo'),
('baidu_analytics', '', '百度统计代码', 'seo'),
('baidu_verification', '', '百度站长验证代码', 'seo');

-- 第三方服务
INSERT INTO `sk_config` (`config_key`, `config_value`, `description`, `group`) VALUES
('map_api_key', '', '地图API Key', 'third_party'),
('map_provider', 'baidu', '地图服务商', 'third_party'),
('google_site_verification', '', 'Google站点验证', 'third_party'),
('customer_service_code', '', '客服代码', 'third_party');

-- 公司信息
INSERT INTO `sk_config` (`config_key`, `config_value`, `description`, `group`) VALUES
('company_name', '天启芯科技有限公司', '公司全称', 'company'),
('company_short_name', '天启芯', '公司简称', 'company'),
('company_english_name', 'TianQiXin Technology', '公司英文名称', 'company'),
('company_address', '深圳市南山区科技园南区', '公司地址', 'company'),
('company_phone', '0755-12345678', '公司电话', 'company'),
('company_email', 'info@tqx.com', '公司邮箱', 'company'),
('company_fax', '0755-12345679', '公司传真', 'company'),
('company_postcode', '518057', '邮政编码', 'company'),
('company_website', 'https://www.tqx.com', '公司网站', 'company'),
('business_license', '44030112345678901X', '营业执照号', 'company'),
('tax_number', '91440300MA5DCXXXXX', '税号', 'company'),
('bank_account', '62220240000XXXXXXXXXX', '银行账号', 'company'),
('bank_name', '中国工商银行深圳科技园支行', '开户银行', 'company');

-- 订单设置
INSERT INTO `sk_config` (`config_key`, `config_value`, `description`, `group`) VALUES
('order_auto_cancel_minutes', '30', '订单自动取消时间(分钟)', 'order'),
('order_auto_confirm_days', '7', '订单自动确认天数', 'order'),
('order_prefix', 'TQX', '订单前缀', 'order'),
('allow_guest_order', '0', '允许游客下单', 'order'),
('min_order_amount', '0', '最小订单金额', 'order');

-- 库存设置
INSERT INTO `sk_config` (`config_key`, `config_value`, `description`, `group`) VALUES
('low_stock_threshold', '10', '低库存预警阈值', 'inventory'),
('out_of_stock_threshold', '0', '缺货阈值', 'inventory'),
('stock_deduction_time', 'order', '库存扣减时间', 'inventory'),
('allow_oversell', '0', '允许超卖', 'inventory');

-- 上传设置
INSERT INTO `sk_config` (`config_key`, `config_value`, `description`, `group`) VALUES
('upload_max_size', '10485760', '上传文件最大大小', 'upload'),
('upload_allowed_ext', 'jpg,jpeg,png,gif,webp,pdf,doc,docx,xls,xlsx', '允许上传的文件扩展名', 'upload'),
('upload_path', '/uploads', '文件上传路径', 'upload'),
('image_quality', '80', '图片质量', 'upload'),
('create_thumbnail', '1', '创建缩略图', 'upload'),
('thumbnail_size', '300x300', '缩略图尺寸', 'upload');