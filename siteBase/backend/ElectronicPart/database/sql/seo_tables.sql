-- ============================================================
-- SEO 优化相关数据表
-- 用于存储页面 SEO 审计、关键词库、竞品分析等数据
-- ============================================================

-- -----------------------------------------------------------
-- 1. SEO 页面审计表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `seo_pages`;

CREATE TABLE `seo_pages` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `url_path` varchar(255) NOT NULL COMMENT '页面URL路径',
  `page_type` varchar(50) NOT NULL DEFAULT 'page' COMMENT '页面类型: home/product/category/article/news/application/about/contact',
  `business_id` int(10) unsigned DEFAULT 0 COMMENT '关联业务ID',
  `title` varchar(255) DEFAULT NULL COMMENT 'SEO标题',
  `meta_description` varchar(500) DEFAULT NULL COMMENT 'Meta描述',
  `meta_keywords` varchar(500) DEFAULT NULL COMMENT 'Meta关键词',
  `h1` varchar(255) DEFAULT NULL COMMENT 'H1标题',
  `h2_count` smallint(5) unsigned DEFAULT 0 COMMENT 'H2标签数量',
  `h3_count` smallint(5) unsigned DEFAULT 0 COMMENT 'H3标签数量',
  `image_total` smallint(5) unsigned DEFAULT 0 COMMENT '图片总数',
  `image_alt_count` smallint(5) unsigned DEFAULT 0 COMMENT '带ALT的图片数量',
  `internal_links` smallint(5) unsigned DEFAULT 0 COMMENT '内链数量',
  `external_links` smallint(5) unsigned DEFAULT 0 COMMENT '外链数量',
  `has_canonical` tinyint(1) unsigned DEFAULT 0 COMMENT '是否有canonical标签',
  `has_og_tags` tinyint(1) unsigned DEFAULT 0 COMMENT '是否有OG标签',
  `has_schema` tinyint(1) unsigned DEFAULT 0 COMMENT '是否有结构化数据',
  `schema_json` json DEFAULT NULL COMMENT 'Schema结构化数据',
  `seo_score` tinyint(3) unsigned DEFAULT 0 COMMENT 'SEO评分 0-100',
  `load_time_ms` int(10) unsigned DEFAULT 0 COMMENT '页面加载时间(ms)',
  `mobile_score` tinyint(3) unsigned DEFAULT 0 COMMENT '移动端评分 0-100',
  `status` tinyint(1) unsigned DEFAULT 1 COMMENT '状态: 0=禁用 1=启用',
  `last_audit_at` datetime DEFAULT NULL COMMENT '最后审计时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `url_path` (`url_path`),
  KEY `page_type` (`page_type`),
  KEY `business_id` (`business_id`),
  KEY `seo_score` (`seo_score`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SEO页面审计表';

-- -----------------------------------------------------------
-- 2. SEO 审计日志表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `seo_audit_logs`;

CREATE TABLE `seo_audit_logs` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `page_id` int(10) unsigned DEFAULT 0 COMMENT '关联页面ID',
  `url_path` varchar(255) DEFAULT NULL COMMENT '页面URL路径',
  `severity` varchar(20) NOT NULL DEFAULT 'warning' COMMENT '严重级别: critical/warning/info',
  `category` varchar(50) NOT NULL DEFAULT 'meta' COMMENT '问题分类: meta/heading/content/link/schema/speed',
  `title` varchar(255) NOT NULL COMMENT '问题标题',
  `detail` text COMMENT '问题详情',
  `suggestion` text COMMENT '修复建议',
  `is_fixed` tinyint(1) unsigned DEFAULT 0 COMMENT '是否已修复',
  `fixed_at` datetime DEFAULT NULL COMMENT '修复时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `page_id` (`page_id`),
  KEY `severity` (`severity`),
  KEY `is_fixed` (`is_fixed`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SEO审计问题日志表';

-- -----------------------------------------------------------
-- 3. SEO 关键词表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `seo_keywords`;

CREATE TABLE `seo_keywords` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `keyword` varchar(255) NOT NULL COMMENT '关键词',
  `category` varchar(50) NOT NULL DEFAULT 'general' COMMENT '分类: brand/product/industry/longtail/general',
  `is_primary` tinyint(1) unsigned DEFAULT 0 COMMENT '是否主关键词',
  `search_volume` int(10) unsigned DEFAULT 0 COMMENT '月搜索量',
  `competition` varchar(20) DEFAULT 'medium' COMMENT '竞争程度: low/medium/high',
  `difficulty` tinyint(3) unsigned DEFAULT 50 COMMENT '优化难度 0-100',
  `current_rank` int(10) unsigned DEFAULT 0 COMMENT '当前排名',
  `best_rank` int(10) unsigned DEFAULT 0 COMMENT '历史最佳排名',
  `trend` varchar(20) DEFAULT 'stable' COMMENT '趋势: rising/falling/stable',
  `related_pages` json DEFAULT NULL COMMENT '相关页面列表',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `keyword` (`keyword`),
  KEY `category` (`category`),
  KEY `is_primary` (`is_primary`),
  KEY `search_volume` (`search_volume`),
  KEY `current_rank` (`current_rank`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SEO关键词库';

-- -----------------------------------------------------------
-- 4. SEO 竞品分析表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `seo_competitors`;

CREATE TABLE `seo_competitors` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `domain` varchar(255) NOT NULL COMMENT '竞品域名',
  `domain_score` tinyint(3) unsigned DEFAULT 0 COMMENT '域名评分 0-100',
  `backlinks` int(10) unsigned DEFAULT 0 COMMENT '外链总数',
  `referring_domains` int(10) unsigned DEFAULT 0 COMMENT '引荐域名数',
  `organic_keywords` int(10) unsigned DEFAULT 0 COMMENT '有机关键词数',
  `organic_traffic` int(10) unsigned DEFAULT 0 COMMENT '有机流量估算',
  `top_keywords` json DEFAULT NULL COMMENT 'TOP关键词列表',
  `da` tinyint(3) unsigned DEFAULT 0 COMMENT 'Domain Authority',
  `pa` tinyint(3) unsigned DEFAULT 0 COMMENT 'Page Authority',
  `notes` text COMMENT '备注',
  `last_check_at` datetime DEFAULT NULL COMMENT '最后检查时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `domain` (`domain`),
  KEY `domain_score` (`domain_score`),
  KEY `organic_traffic` (`organic_traffic`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SEO竞品分析表';

-- -----------------------------------------------------------
-- 5. SEO Sitemap 生成记录表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `seo_sitemaps`;

CREATE TABLE `seo_sitemaps` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `sitemap_type` varchar(50) NOT NULL DEFAULT 'xml' COMMENT '地图类型: xml/txt/html',
  `url_count` int(10) unsigned DEFAULT 0 COMMENT 'URL数量',
  `file_path` varchar(255) DEFAULT NULL COMMENT '文件路径',
  `file_size` int(10) unsigned DEFAULT 0 COMMENT '文件大小(bytes)',
  `content` longtext COMMENT '内容',
  `last_generated_at` datetime DEFAULT NULL COMMENT '最后生成时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `sitemap_type` (`sitemap_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SEO站点地图记录表';

-- -----------------------------------------------------------
-- 6. SEO 监控任务表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `seo_monitor_tasks`;

CREATE TABLE `seo_monitor_tasks` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `task_name` varchar(100) NOT NULL COMMENT '任务名称',
  `task_type` varchar(50) NOT NULL DEFAULT 'audit' COMMENT '任务类型: audit/sitemap/keywords/schema',
  `target` varchar(255) DEFAULT NULL COMMENT '目标URL或范围',
  `frequency` varchar(20) DEFAULT 'daily' COMMENT '执行频率: daily/weekly/monthly',
  `last_run_at` datetime DEFAULT NULL COMMENT '最后运行时间',
  `next_run_at` datetime DEFAULT NULL COMMENT '下次运行时间',
  `status` tinyint(1) unsigned DEFAULT 1 COMMENT '状态: 0=禁用 1=启用',
  `result_json` json DEFAULT NULL COMMENT '执行结果',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `task_type` (`task_type`),
  KEY `status` (`status`),
  KEY `next_run_at` (`next_run_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SEO监控任务表';

-- -----------------------------------------------------------
-- 初始化一些示例数据
-- -----------------------------------------------------------

-- 插入首页审计数据
INSERT INTO `seo_pages` (`url_path`, `page_type`, `title`, `meta_description`, `h1`, `seo_score`, `last_audit_at`)
VALUES 
('/',
 'home',
 '天启芯科技 - 专业的半导体元器件供应商',
 '天启芯科技是专业的电子元器件供应商，提供TI、ST、Microchip、NXP等品牌的IC芯片、MCU微控制器、功率器件、传感器等。源头供货，正品保障。',
 '天启芯科技',
 75,
 NOW());

-- 插入关键词示例数据
INSERT INTO `seo_keywords` (`keyword`, `category`, `is_primary`, `search_volume`, `competition`, `difficulty`) VALUES
('电子元器件', 'industry', 1, 15000, 'high', 85),
('MCU微控制器', 'product', 1, 8500, 'high', 75),
('STM32单片机', 'product', 1, 12000, 'high', 70),
('TI芯片代理', 'brand', 1, 5000, 'medium', 60),
('原装正品IC', 'general', 0, 3500, 'medium', 55),
('电子元器件批发', 'industry', 0, 8000, 'high', 80),
('IC芯片采购', 'general', 0, 6000, 'medium', 65),
('单片机开发板', 'product', 0, 4000, 'medium', 50),
('意法半导体代理', 'brand', 0, 3000, 'low', 45),
('NXP代理商', 'brand', 0, 2500, 'low', 40);

-- 插入监控任务
INSERT INTO `seo_monitor_tasks` (`task_name`, `task_type`, `target`, `frequency`, `status`) VALUES
('全站SEO健康度扫描', 'audit', 'all', 'weekly', 1),
('产品页SEO检查', 'audit', '/products/*', 'daily', 1),
('站点地图生成', 'sitemap', 'all', 'daily', 1);
