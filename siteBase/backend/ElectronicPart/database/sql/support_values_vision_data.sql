-- ========================================
-- 技术支持 (Support) 数据字典
-- ========================================

-- 添加技术支持项目
INSERT INTO `sk_dictionary_project` (`id`, `name`, `code`, `description`, `status`, `sort_order`, `create_time`, `update_time`, `delete_time`) VALUES
(6, '技术支持', 'technical_support', '技术支持服务内容配置', 1, 6, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), NULL);

-- 添加技术支持字段定义
INSERT INTO `sk_dictionary_field` (`id`, `project_id`, `name`, `code`, `type`, `data_type`, `required`, `options`, `default_value`, `description`, `sort_order`, `status`, `create_time`, `update_time`, `delete_time`) VALUES
(13, 6, '标题', 'title', 'text', 'string', 1, NULL, '技术支持', '技术支持标题', 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), NULL),
(14, 6, '描述', 'description', 'textarea', 'string', 0, NULL, NULL, '技术支持描述文本', 2, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), NULL),
(15, 6, '服务列表', 'services', 'textarea', 'json', 1, NULL, NULL, '技术支持服务列表(JSON数组)', 3, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), NULL);

-- 添加技术支持数据
INSERT INTO `sk_dictionary_data` (`id`, `project_id`, `field_values`, `status`, `sort_order`, `create_time`, `update_time`, `delete_time`) VALUES
(5, 6, '{"title":"技术支持","description":"我们拥有一支专业的技术团队，为客户提供电子元件选型、电路设计、故障排查等技术支持，帮助客户解决技术难题。","services":[{"title":"电子元件选型","description":"专业的技术团队为您提供产品选型和应用建议","icon":"consultation"},{"title":"电路设计","description":"系统的产品使用培训和技术指导","icon":"training"},{"title":"故障排查","description":"7x24小时的技术支持和维护服务","icon":"support"}]}', 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), NULL);


-- ========================================
-- 核心价值观 (Values) 数据字典
-- ========================================

-- 添加核心价值观项目
INSERT INTO `sk_dictionary_project` (`id`, `name`, `code`, `description`, `status`, `sort_order`, `create_time`, `update_time`, `delete_time`) VALUES
(7, '核心价值观', 'core_values', '公司核心价值观配置', 1, 7, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), NULL);

-- 添加核心价值观字段定义
INSERT INTO `sk_dictionary_field` (`id`, `project_id`, `name`, `code`, `type`, `data_type`, `required`, `options`, `default_value`, `description`, `sort_order`, `status`, `create_time`, `update_time`, `delete_time`) VALUES
(16, 7, '价值观列表', 'values', 'textarea', 'json', 1, NULL, NULL, '核心价值观列表(JSON数组)', 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), NULL);

-- 添加核心价值观数据
INSERT INTO `sk_dictionary_data` (`id`, `project_id`, `field_values`, `status`, `sort_order`, `create_time`, `update_time`, `delete_time`) VALUES
(6, 7, '{"values":[{"title":"诚信经营","description":"我们秉持诚信原则，与合作伙伴建立互信、互利、共赢的合作关系。"},{"title":"创新驱动","description":"持续创新，引领行业发展"},{"title":"客户至上","description":"以客户需求为导向，提供优质服务"}]}', 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), NULL);


-- ========================================
-- 企业愿景 (Vision) 数据字典
-- ========================================

-- 添加企业愿景项目
INSERT INTO `sk_dictionary_project` (`id`, `name`, `code`, `description`, `status`, `sort_order`, `create_time`, `update_time`, `delete_time`) VALUES
(8, '企业愿景', 'company_vision', '企业愿景和设施展示配置', 1, 8, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), NULL);

-- 添加企业愿景字段定义
INSERT INTO `sk_dictionary_field` (`id`, `project_id`, `name`, `code`, `type`, `data_type`, `required`, `options`, `default_value`, `description`, `sort_order`, `status`, `create_time`, `update_time`, `delete_time`) VALUES
(17, 8, '标题', 'title', 'text', 'string', 1, NULL, '我们的愿景', '愿景标题', 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), NULL),
(18, 8, '描述', 'description', 'textarea', 'string', 1, NULL, NULL, '愿景描述文本', 2, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), NULL),
(19, 8, '设施展示', 'facilities', 'textarea', 'json', 0, NULL, NULL, '设施展示网格(JSON数组)', 3, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), NULL);

-- 添加企业愿景数据
INSERT INTO `sk_dictionary_data` (`id`, `project_id`, `field_values`, `status`, `sort_order`, `create_time`, `update_time`, `delete_time`) VALUES
(7, 8, '{"title":"我们的愿景","description":"我们满怀热情，致力于通过半导体技术让电子产品更经济实用，创造一个更美好的世界。\\n\\n为全球电子制造业提供更加优质、高效、便捷的电子元件供应与贸易服务。我们将不断拓展业务领域，加强与国际知名制造商的合作，提升品牌影响力与竞争力，成为全球电子元件行业的领军企业。","facilities":[{"type":"image","image":"https://images.unsplash.com/photo-1486325212027-8081e485255e?q=80&w=800&auto=format&fit=crop","alt":"Office"},{"type":"text","title":"晶元厂","subtitle":"研发设计、知识产权保护中心","subtitle_en":"Taiwan Wafer Factory\\nR&D, Design and Intellectual Property Protection Center"},{"type":"image","image":"https://images.unsplash.com/photo-1581092335397-9583eb92d232?q=80&w=800&auto=format&fit=crop","alt":"Lab"},{"type":"text","title":"测试产线","subtitle":"Production line\\nAssembly and test line"},{"type":"text","title":"产线","subtitle":"芯片生产线","subtitle_en":"Production line\\nChip Production Line"},{"type":"image","image":"https://images.unsplash.com/photo-1591261730799-ee604f922c31?q=80&w=800&auto=format&fit=crop","alt":"Factory"},{"type":"text","title":"研发中心","subtitle":"R&D Center"},{"type":"image","image":"https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=800&auto=format&fit=crop","alt":"Research"}]}', 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), NULL);
