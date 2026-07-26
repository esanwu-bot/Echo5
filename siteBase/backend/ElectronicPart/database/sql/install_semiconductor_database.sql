-- Semiconductor Website Database Schema
-- Execute before starting the project to ensure the database is set up correctly.

-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS `semiconductor_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `semiconductor_db`;

-- 1. User and Permission Tables
CREATE TABLE `sk_admin` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `real_name` VARCHAR(50) DEFAULT '',
  `email` VARCHAR(100) DEFAULT '' UNIQUE,
  `phone` VARCHAR(20) DEFAULT '' UNIQUE,
  `role_id` INT UNSIGNED NOT NULL,
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '0:disabled, 1:enabled',
  `last_login_time` DATETIME,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Admin User Table';

CREATE TABLE `sk_role` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `role_name` VARCHAR(50) NOT NULL UNIQUE,
  `description` VARCHAR(255) DEFAULT '',
  `permissions` JSON,
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '0:disabled, 1:enabled',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Role Table';

CREATE TABLE `sk_user` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `email` VARCHAR(100) DEFAULT '' UNIQUE,
  `phone` VARCHAR(20) DEFAULT '' UNIQUE,
  `company` VARCHAR(100) DEFAULT '',
  `position` VARCHAR(100) DEFAULT '',
  `country` VARCHAR(50) DEFAULT '',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '0:disabled, 1:enabled',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Frontend User Table';

-- 2. Product Related Tables
CREATE TABLE `sk_category` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `parent_id` INT UNSIGNED DEFAULT 0,
  `name` VARCHAR(100) NOT NULL,
  `name_en` VARCHAR(100),
  `name_zh_hant` VARCHAR(100),
  `slug` VARCHAR(100) UNIQUE,
  `icon` VARCHAR(255),
  `sort` INT DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Product Category Table';

CREATE TABLE `sk_product` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT UNSIGNED,
  `product_code` VARCHAR(50) UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `name_en` VARCHAR(255),
  `name_zh_hant` VARCHAR(255),
  `package_type` VARCHAR(50),
  `description` TEXT,
  `description_en` TEXT,
  `specs` JSON,
  `images` JSON,
  `datasheet_url` VARCHAR(255),
  `status` TINYINT NOT NULL DEFAULT 1,
  `views` INT DEFAULT 0,
  `sort` INT DEFAULT 0,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Product Table';

CREATE TABLE `sk_product_series` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `series_name` VARCHAR(100) NOT NULL,
  `series_name_en` VARCHAR(100),
  `description` TEXT,
  `image` VARCHAR(255),
  `status` TINYINT NOT NULL DEFAULT 1,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Product Series Table';

CREATE TABLE `sk_product_spec` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT UNSIGNED NOT NULL,
  `spec_name` VARCHAR(100) NOT NULL,
  `spec_value` VARCHAR(255) NOT NULL,
  `unit` VARCHAR(50),
  `sort` INT DEFAULT 0,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) COMMENT='Product Specification Table';

-- 3. Application Area Tables
CREATE TABLE `sk_application` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `title_en` VARCHAR(255),
  `title_zh_hant` VARCHAR(255),
  `slug` VARCHAR(255) UNIQUE,
  `cover_image` VARCHAR(255),
  `description` TEXT,
  `description_en` TEXT,
  `content` LONGTEXT,
  `content_en` LONGTEXT,
  `sort` INT DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Application Area Table';

CREATE TABLE `sk_application_product` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `application_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) COMMENT='Application-Product Association Table';

-- 4. Content Management Tables
CREATE TABLE `sk_article` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT UNSIGNED,
  `title` VARCHAR(255) NOT NULL,
  `title_en` VARCHAR(255),
  `slug` VARCHAR(255) UNIQUE,
  `author` VARCHAR(100),
  `cover_image` VARCHAR(255),
  `summary` TEXT,
  `content` LONGTEXT,
  `content_en` LONGTEXT,
  `tags` VARCHAR(255),
  `views` INT DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `publish_time` DATETIME,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Article Table';

CREATE TABLE `sk_article_category` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `parent_id` INT UNSIGNED DEFAULT 0,
  `name` VARCHAR(100) NOT NULL,
  `name_en` VARCHAR(100),
  `slug` VARCHAR(100) UNIQUE,
  `sort` INT DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Article Category Table';

CREATE TABLE `sk_news` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `title_en` VARCHAR(255),
  `cover_image` VARCHAR(255),
  `summary` TEXT,
  `content` LONGTEXT,
  `content_en` LONGTEXT,
  `views` INT DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `publish_time` DATETIME,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='News Table';

CREATE TABLE `sk_training` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `title_en` VARCHAR(255),
  `cover_image` VARCHAR(255),
  `description` TEXT,
  `content` LONGTEXT,
  `start_time` DATETIME,
  `end_time` DATETIME,
  `location` VARCHAR(255),
  `status` TINYINT NOT NULL DEFAULT 1,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Training Event Table';

-- 5. Business Function Tables
CREATE TABLE `sk_quote_request` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED,
  `company` VARCHAR(100),
  `contact_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20),
  `product_info` JSON,
  `quantity` INT,
  `message` TEXT,
  `status` VARCHAR(50) DEFAULT 'pending',
  `reply_content` TEXT,
  `reply_time` DATETIME,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Quote Request Table';

CREATE TABLE `sk_sample_apply` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED,
  `company` VARCHAR(100),
  `contact_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20),
  `address` VARCHAR(255),
  `product_id` INT UNSIGNED,
  `product_name` VARCHAR(255),
  `quantity` INT,
  `purpose` TEXT,
  `status` VARCHAR(50) DEFAULT 'pending',
  `tracking_number` VARCHAR(100),
  `reply_content` TEXT,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Sample Apply Table';

CREATE TABLE `sk_cart` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `quantity` INT NOT NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Shopping Cart Table';

CREATE TABLE `sk_order` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `order_no` VARCHAR(50) UNIQUE NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `contact_name` VARCHAR(100),
  `phone` VARCHAR(20),
  `email` VARCHAR(100),
  `address` VARCHAR(255),
  `products` JSON,
  `total_amount` DECIMAL(10, 2),
  `status` VARCHAR(50) DEFAULT 'pending',
  `payment_status` VARCHAR(50) DEFAULT 'unpaid',
  `shipping_status` VARCHAR(50) DEFAULT 'unshipped',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Order Table';

-- 6. Company Information Tables
CREATE TABLE `sk_about` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `type` VARCHAR(50) NOT NULL COMMENT 'about/vision/history',
  `title` VARCHAR(255),
  `title_en` VARCHAR(255),
  `content` LONGTEXT,
  `content_en` LONGTEXT,
  `images` JSON,
  `sort` INT DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='About Us Table';

CREATE TABLE `sk_certificate` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `cert_name` VARCHAR(255) NOT NULL,
  `cert_name_en` VARCHAR(255),
  `cert_image` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `sort` INT DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Certificate Table';

CREATE TABLE `sk_job` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `job_title` VARCHAR(255) NOT NULL,
  `job_title_en` VARCHAR(255),
  `department` VARCHAR(100),
  `location` VARCHAR(100),
  `job_type` VARCHAR(50),
  `salary_range` VARCHAR(100),
  `requirements` TEXT,
  `responsibilities` TEXT,
  `status` TINYINT NOT NULL DEFAULT 1,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Job Posting Table';

CREATE TABLE `sk_job_apply` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `job_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20),
  `resume_url` VARCHAR(255),
  `cover_letter` TEXT,
  `status` VARCHAR(50) DEFAULT 'pending',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Job Application Table';

CREATE TABLE `sk_customer` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `company_name` VARCHAR(100) NOT NULL,
  `logo` VARCHAR(255),
  `contact_person` VARCHAR(100),
  `position` VARCHAR(100),
  `content` TEXT,
  `content_en` TEXT,
  `sort` INT DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Customer Testimonial Table';

-- 7. System Configuration Tables
CREATE TABLE `sk_banner` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `position` VARCHAR(50) NOT NULL COMMENT 'home/product/about',
  `title` VARCHAR(255),
  `title_en` VARCHAR(255),
  `image` VARCHAR(255) NOT NULL,
  `link` VARCHAR(255),
  `sort` INT DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Banner Table';

CREATE TABLE `sk_config` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `config_key` VARCHAR(100) NOT NULL UNIQUE,
  `config_value` TEXT,
  `description` VARCHAR(255),
  `group` VARCHAR(50),
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='System Config Table';

CREATE TABLE `sk_language` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `lang_code` VARCHAR(10) NOT NULL UNIQUE,
  `lang_name` VARCHAR(50) NOT NULL,
  `is_default` TINYINT DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Language Config Table';

CREATE TABLE `sk_translation` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `lang_code` VARCHAR(10) NOT NULL,
  `trans_key` VARCHAR(255) NOT NULL,
  `trans_value` TEXT,
  `module` VARCHAR(50),
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `lang_key_module` (`lang_code`, `trans_key`, `module`)
) COMMENT='Translation Table';

CREATE TABLE `sk_seo` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `page_type` VARCHAR(50),
  `page_id` INT UNSIGNED,
  `title` VARCHAR(255),
  `keywords` VARCHAR(255),
  `description` TEXT,
  `lang_code` VARCHAR(10),
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='SEO Config Table';

-- 8. Log and Statistics Tables
CREATE TABLE `sk_admin_log` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `admin_id` INT UNSIGNED,
  `action` VARCHAR(255),
  `module` VARCHAR(100),
  `ip` VARCHAR(45),
  `user_agent` TEXT,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) COMMENT='Admin Action Log';

CREATE TABLE `sk_visit_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED,
  `page_url` VARCHAR(255),
  `ip` VARCHAR(45),
  `country` VARCHAR(100),
  `device` VARCHAR(100),
  `browser` VARCHAR(100),
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) COMMENT='Visit Log Table';

CREATE TABLE `sk_statistics` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `date` DATE NOT NULL UNIQUE,
  `page_views` INT DEFAULT 0,
  `unique_visitors` INT DEFAULT 0,
  `product_views` INT DEFAULT 0,
  `quote_requests` INT DEFAULT 0,
  `sample_applies` INT DEFAULT 0,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) COMMENT='Statistics Table';

-- Insert sample data for languages
INSERT INTO `sk_language` (`lang_code`, `lang_name`, `is_default`, `status`) VALUES
('zh', '中文', 1, 1),
('en', 'English', 0, 1),
('ja', '日本語', 0, 1),
('ko', '한국어', 0, 1);

-- 9. Sample Data for Homepage (banners, categories, products, applications, news, articles)

-- Sample categories (sk_category)
INSERT INTO `sk_category` (`parent_id`, `name`, `name_en`, `name_zh_hant`, `slug`, `icon`, `sort`, `status`) VALUES
(0, '电源管理', 'Power Management', '電源管理', 'power-management', NULL, 10, 1),
(0, '保护芯片', 'Protection IC', '保護晶片', 'protection-ic', NULL, 20, 1),
(0, '充电管理', 'Charging Management', '充電管理', 'charging-management', NULL, 30, 1);

-- Sample products (sk_product)
INSERT INTO `sk_product` (`category_id`, `product_code`, `name`, `name_en`, `name_zh_hant`, `package_type`, `description`, `description_en`, `specs`, `images`, `datasheet_url`, `status`, `views`, `sort`) VALUES
((SELECT id FROM sk_category WHERE slug='power-management'), 'PMU101', '电源管理芯片 PMU101', 'Power IC PMU101', '電源管理晶片 PMU101', 'SOP-8', '高效能电源管理芯片，支持多路输出。', 'High efficiency power management IC with multiple outputs.', '{"efficiency":"95%","channels":2}', '["/images/products/pmu101.png"]', NULL, 1, 12, 90),
((SELECT id FROM sk_category WHERE slug='protection-ic'), 'OVP205', '过压保护 OVP205', 'Over-Voltage Protection OVP205', '過壓保護 OVP205', 'SOT-23', '用于输入过压保护的IC。', 'IC for input over-voltage protection.', '{"ovp_threshold":"28V"}', '["/images/products/ovp205.png"]', NULL, 1, 34, 80),
((SELECT id FROM sk_category WHERE slug='charging-management'), 'CHG310', '充电管理 CHG310', 'Charger IC CHG310', '充電管理 CHG310', 'QFN-16', '高集成度锂电池充电管理芯片。', 'Highly integrated Li-ion charger IC.', '{"battery":"Li-ion","max_current":"2A"}', '["/images/products/chg310.png"]', NULL, 1, 7, 70);

-- Sample application areas (sk_application)
INSERT INTO `sk_application` (`title`, `title_en`, `title_zh_hant`, `slug`, `cover_image`, `description`, `description_en`, `content`, `content_en`, `sort`, `status`) VALUES
('智慧城市', 'Smart City', '智慧城市', 'smart-city', '/images/applications/smart-city.jpg', '用于智慧城市基础设施的高可靠芯片解决方案。', 'High-reliability chip solutions for smart city infrastructure.', '智慧城市解决方案内容...', 'Smart city solutions content...', 10, 1),
('物联网', 'IoT', '物聯網', 'iot', '/images/applications/iot.jpg', '面向 IoT 设备的低功耗芯片方案。', 'Low-power chip solutions for IoT devices.', '物联网解决方案内容...', 'IoT solutions content...', 20, 1),
('工业控制', 'Industrial Control', '工業控制', 'industrial-control', '/images/applications/industrial.jpg', '稳定可靠的工业控制芯片。', 'Stable and reliable industrial control chips.', '工业控制解决方案内容...', 'Industrial control solutions content...', 30, 1);

-- Sample banners (sk_banner)
INSERT INTO `sk_banner` (`position`, `title`, `title_en`, `image`, `link`, `sort`, `status`) VALUES
('home', '引领芯片创新', 'Leading Chip Innovation', '/images/banners/home-1.jpg', '/products', 10, 1),
('home', '面向工业与消费领域', 'For Industrial and Consumer Fields', '/images/banners/home-2.jpg', '/applications', 20, 1),
('home', '专业技术支持', 'Professional Technical Support', '/images/banners/home-3.jpg', '/support', 30, 1);

-- Sample news (sk_news)
INSERT INTO `sk_news` (`title`, `title_en`, `cover_image`, `summary`, `content`, `content_en`, `views`, `status`, `publish_time`) VALUES
('新品发布：PMU101', 'New Release: PMU101', '/images/news/pmu101.jpg', '我们发布了新一代电源管理芯片 PMU101。', '详细新闻内容...', 'Detailed news content...', 0, 1, NOW()),
('技术白皮书上线', 'Technical Whitepaper Available', '/images/news/whitepaper.jpg', '发布最新技术白皮书，解读电源管理趋势。', '详细新闻内容...', 'Detailed news content...', 0, 1, NOW()-INTERVAL 3 DAY),
('参加国际电子展', 'Join Global Electronics Expo', '/images/news/expo.jpg', '我们将参加本年度全球电子展，欢迎莅临。', '详细新闻内容...', 'Detailed news content...', 0, 1, NOW()-INTERVAL 7 DAY);

-- Sample articles (sk_article)  category_id can be NULL
INSERT INTO `sk_article` (`category_id`, `title`, `title_en`, `slug`, `author`, `cover_image`, `summary`, `content`, `content_en`, `tags`, `views`, `status`, `publish_time`) VALUES
(NULL, '电源效率优化指南', 'Guide to Power Efficiency', 'power-efficiency-guide', 'Admin', '/images/articles/power-efficiency.jpg', '介绍提高电源效率的常用方法。', '文章内容...', 'Article content...', 'power,efficiency', 0, 1, NOW()),
(NULL, '保护芯片选型要点', 'Key Points for Protection IC Selection', 'protection-ic-selection', 'Editor', '/images/articles/protection-selection.jpg', '如何选择合适的保护芯片。', '文章内容...', 'Article content...', 'protection,selection', 0, 1, NOW()-INTERVAL 5 DAY),
(NULL, '充电管理最佳实践', 'Best Practices for Charging Management', 'charging-best-practices', 'Tech Team', '/images/articles/charging-best.jpg', '充电管理设计中的最佳实践。', '文章内容...', 'Article content...', 'charging,battery', 0, 1, NOW()-INTERVAL 10 DAY);
