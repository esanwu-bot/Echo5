-- ============================================================
-- 后台全模块多语言字段迁移脚本
-- 日期：2026-06-19
-- 说明：将所有业务表的 DEPRECATED 多语言字段迁移至 sk_translation，
--       并删除原字段。支持异步翻译队列自动补翻缺失语言。
-- ============================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------
-- 1. sk_application (应用管理)
-- DEPRECATED: title_en, title_zh_hant, description_en, content_en
-- ---------------------------------------------------------
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('application:', id, ':title'), title_en, 'application', id, 'title', 1, 'zh-CN', NOW(), NOW()
FROM sk_application WHERE title_en IS NOT NULL AND title_en != '';

INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('application:', id, ':description'), description_en, 'application', id, 'description', 1, 'zh-CN', NOW(), NOW()
FROM sk_application WHERE description_en IS NOT NULL AND description_en != '';

INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('application:', id, ':content'), content_en, 'application', id, 'content', 1, 'zh-CN', NOW(), NOW()
FROM sk_application WHERE content_en IS NOT NULL AND content_en != '';

ALTER TABLE sk_application
  DROP COLUMN title_en,
  DROP COLUMN title_zh_hant,
  DROP COLUMN description_en,
  DROP COLUMN content_en;

-- ---------------------------------------------------------
-- 2. sk_application_category (应用分类)
-- DEPRECATED: name_en
-- ---------------------------------------------------------
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('application_category:', id, ':name'), name_en, 'application_category', id, 'name', 1, 'zh-CN', NOW(), NOW()
FROM sk_application_category WHERE name_en IS NOT NULL AND name_en != '';

ALTER TABLE sk_application_category DROP COLUMN name_en;

-- ---------------------------------------------------------
-- 3. sk_article (文章管理)
-- DEPRECATED: title_en, title_ja, title_ko, summary_en, summary_ja, summary_ko, content_en, content_ja, content_ko
-- ---------------------------------------------------------
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('article:', id, ':title'), title_en, 'article', id, 'title', 1, 'zh-CN', NOW(), NOW() FROM sk_article WHERE title_en IS NOT NULL AND title_en != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ja-JP', CONCAT('article:', id, ':title'), title_ja, 'article', id, 'title', 1, 'zh-CN', NOW(), NOW() FROM sk_article WHERE title_ja IS NOT NULL AND title_ja != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ko-KR', CONCAT('article:', id, ':title'), title_ko, 'article', id, 'title', 1, 'zh-CN', NOW(), NOW() FROM sk_article WHERE title_ko IS NOT NULL AND title_ko != '';

INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('article:', id, ':summary'), summary_en, 'article', id, 'summary', 1, 'zh-CN', NOW(), NOW() FROM sk_article WHERE summary_en IS NOT NULL AND summary_en != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ja-JP', CONCAT('article:', id, ':summary'), summary_ja, 'article', id, 'summary', 1, 'zh-CN', NOW(), NOW() FROM sk_article WHERE summary_ja IS NOT NULL AND summary_ja != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ko-KR', CONCAT('article:', id, ':summary'), summary_ko, 'article', id, 'summary', 1, 'zh-CN', NOW(), NOW() FROM sk_article WHERE summary_ko IS NOT NULL AND summary_ko != '';

INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('article:', id, ':content'), content_en, 'article', id, 'content', 1, 'zh-CN', NOW(), NOW() FROM sk_article WHERE content_en IS NOT NULL AND content_en != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ja-JP', CONCAT('article:', id, ':content'), content_ja, 'article', id, 'content', 1, 'zh-CN', NOW(), NOW() FROM sk_article WHERE content_ja IS NOT NULL AND content_ja != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ko-KR', CONCAT('article:', id, ':content'), content_ko, 'article', id, 'content', 1, 'zh-CN', NOW(), NOW() FROM sk_article WHERE content_ko IS NOT NULL AND content_ko != '';

ALTER TABLE sk_article
  DROP COLUMN title_en, DROP COLUMN title_ja, DROP COLUMN title_ko,
  DROP COLUMN summary_en, DROP COLUMN summary_ja, DROP COLUMN summary_ko,
  DROP COLUMN content_en, DROP COLUMN content_ja, DROP COLUMN content_ko;

-- ---------------------------------------------------------
-- 4. sk_article_category (文章分类)
-- DEPRECATED: name_en
-- ---------------------------------------------------------
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('article_category:', id, ':name'), name_en, 'article_category', id, 'name', 1, 'zh-CN', NOW(), NOW()
FROM sk_article_category WHERE name_en IS NOT NULL AND name_en != '';

ALTER TABLE sk_article_category DROP COLUMN name_en;

-- ---------------------------------------------------------
-- 5. sk_attribute (属性管理)
-- DEPRECATED: name_en, name_ja, name_ko
-- ---------------------------------------------------------
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('attribute:', id, ':name'), name_en, 'attribute', id, 'name', 1, 'zh-CN', NOW(), NOW() FROM sk_attribute WHERE name_en IS NOT NULL AND name_en != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ja-JP', CONCAT('attribute:', id, ':name'), name_ja, 'attribute', id, 'name', 1, 'zh-CN', NOW(), NOW() FROM sk_attribute WHERE name_ja IS NOT NULL AND name_ja != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ko-KR', CONCAT('attribute:', id, ':name'), name_ko, 'attribute', id, 'name', 1, 'zh-CN', NOW(), NOW() FROM sk_attribute WHERE name_ko IS NOT NULL AND name_ko != '';

ALTER TABLE sk_attribute DROP COLUMN name_en, DROP COLUMN name_ja, DROP COLUMN name_ko;

-- ---------------------------------------------------------
-- 6. sk_banner (横幅管理)
-- DEPRECATED: title_en, title_ja, title_ko, subtitle_en, subtitle_ja, subtitle_ko, description_en, description_ja, description_ko
-- ---------------------------------------------------------
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('banner:', id, ':title'), title_en, 'banner', id, 'title', 1, 'zh-CN', NOW(), NOW() FROM sk_banner WHERE title_en IS NOT NULL AND title_en != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ja-JP', CONCAT('banner:', id, ':title'), title_ja, 'banner', id, 'title', 1, 'zh-CN', NOW(), NOW() FROM sk_banner WHERE title_ja IS NOT NULL AND title_ja != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ko-KR', CONCAT('banner:', id, ':title'), title_ko, 'banner', id, 'title', 1, 'zh-CN', NOW(), NOW() FROM sk_banner WHERE title_ko IS NOT NULL AND title_ko != '';

INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('banner:', id, ':subtitle'), subtitle_en, 'banner', id, 'subtitle', 1, 'zh-CN', NOW(), NOW() FROM sk_banner WHERE subtitle_en IS NOT NULL AND subtitle_en != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ja-JP', CONCAT('banner:', id, ':subtitle'), subtitle_ja, 'banner', id, 'subtitle', 1, 'zh-CN', NOW(), NOW() FROM sk_banner WHERE subtitle_ja IS NOT NULL AND subtitle_ja != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ko-KR', CONCAT('banner:', id, ':subtitle'), subtitle_ko, 'banner', id, 'subtitle', 1, 'zh-CN', NOW(), NOW() FROM sk_banner WHERE subtitle_ko IS NOT NULL AND subtitle_ko != '';

INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('banner:', id, ':description'), description_en, 'banner', id, 'description', 1, 'zh-CN', NOW(), NOW() FROM sk_banner WHERE description_en IS NOT NULL AND description_en != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ja-JP', CONCAT('banner:', id, ':description'), description_ja, 'banner', id, 'description', 1, 'zh-CN', NOW(), NOW() FROM sk_banner WHERE description_ja IS NOT NULL AND description_ja != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ko-KR', CONCAT('banner:', id, ':description'), description_ko, 'banner', id, 'description', 1, 'zh-CN', NOW(), NOW() FROM sk_banner WHERE description_ko IS NOT NULL AND description_ko != '';

ALTER TABLE sk_banner
  DROP COLUMN title_en, DROP COLUMN title_ja, DROP COLUMN title_ko,
  DROP COLUMN subtitle_en, DROP COLUMN subtitle_ja, DROP COLUMN subtitle_ko,
  DROP COLUMN description_en, DROP COLUMN description_ja, DROP COLUMN description_ko;

-- ---------------------------------------------------------
-- 7. sk_certificate (证书管理)
-- DEPRECATED: cert_name_en, cert_name_ja, cert_name_ko, description_en, description_ja, description_ko
-- ---------------------------------------------------------
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('certificate:', id, ':cert_name'), cert_name_en, 'certificate', id, 'cert_name', 1, 'zh-CN', NOW(), NOW() FROM sk_certificate WHERE cert_name_en IS NOT NULL AND cert_name_en != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ja-JP', CONCAT('certificate:', id, ':cert_name'), cert_name_ja, 'certificate', id, 'cert_name', 1, 'zh-CN', NOW(), NOW() FROM sk_certificate WHERE cert_name_ja IS NOT NULL AND cert_name_ja != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ko-KR', CONCAT('certificate:', id, ':cert_name'), cert_name_ko, 'certificate', id, 'cert_name', 1, 'zh-CN', NOW(), NOW() FROM sk_certificate WHERE cert_name_ko IS NOT NULL AND cert_name_ko != '';

INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('certificate:', id, ':description'), description_en, 'certificate', id, 'description', 1, 'zh-CN', NOW(), NOW() FROM sk_certificate WHERE description_en IS NOT NULL AND description_en != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ja-JP', CONCAT('certificate:', id, ':description'), description_ja, 'certificate', id, 'description', 1, 'zh-CN', NOW(), NOW() FROM sk_certificate WHERE description_ja IS NOT NULL AND description_ja != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ko-KR', CONCAT('certificate:', id, ':description'), description_ko, 'certificate', id, 'description', 1, 'zh-CN', NOW(), NOW() FROM sk_certificate WHERE description_ko IS NOT NULL AND description_ko != '';

ALTER TABLE sk_certificate
  DROP COLUMN cert_name_en, DROP COLUMN cert_name_ja, DROP COLUMN cert_name_ko,
  DROP COLUMN description_en, DROP COLUMN description_ja, DROP COLUMN description_ko;

-- ---------------------------------------------------------
-- 8. sk_document (文档管理)
-- DEPRECATED: title_en, title_ja, title_ko, content_en, content_ja, content_ko
-- ---------------------------------------------------------
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('document:', id, ':title'), title_en, 'document', id, 'title', 1, 'zh-CN', NOW(), NOW() FROM sk_document WHERE title_en IS NOT NULL AND title_en != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ja-JP', CONCAT('document:', id, ':title'), title_ja, 'document', id, 'title', 1, 'zh-CN', NOW(), NOW() FROM sk_document WHERE title_ja IS NOT NULL AND title_ja != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ko-KR', CONCAT('document:', id, ':title'), title_ko, 'document', id, 'title', 1, 'zh-CN', NOW(), NOW() FROM sk_document WHERE title_ko IS NOT NULL AND title_ko != '';

INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('document:', id, ':content'), content_en, 'document', id, 'content', 1, 'zh-CN', NOW(), NOW() FROM sk_document WHERE content_en IS NOT NULL AND content_en != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ja-JP', CONCAT('document:', id, ':content'), content_ja, 'document', id, 'content', 1, 'zh-CN', NOW(), NOW() FROM sk_document WHERE content_ja IS NOT NULL AND content_ja != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ko-KR', CONCAT('document:', id, ':content'), content_ko, 'document', id, 'content', 1, 'zh-CN', NOW(), NOW() FROM sk_document WHERE content_ko IS NOT NULL AND content_ko != '';

ALTER TABLE sk_document
  DROP COLUMN title_en, DROP COLUMN title_ja, DROP COLUMN title_ko,
  DROP COLUMN content_en, DROP COLUMN content_ja, DROP COLUMN content_ko;

-- ---------------------------------------------------------
-- 9. sk_faq (FAQ管理)
-- DEPRECATED: question_en, question_ja, question_ko, answer_en, answer_ja, answer_ko
-- ---------------------------------------------------------
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('faq:', id, ':question'), question_en, 'faq', id, 'question', 1, 'zh-CN', NOW(), NOW() FROM sk_faq WHERE question_en IS NOT NULL AND question_en != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ja-JP', CONCAT('faq:', id, ':question'), question_ja, 'faq', id, 'question', 1, 'zh-CN', NOW(), NOW() FROM sk_faq WHERE question_ja IS NOT NULL AND question_ja != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ko-KR', CONCAT('faq:', id, ':question'), question_ko, 'faq', id, 'question', 1, 'zh-CN', NOW(), NOW() FROM sk_faq WHERE question_ko IS NOT NULL AND question_ko != '';

INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('faq:', id, ':answer'), answer_en, 'faq', id, 'answer', 1, 'zh-CN', NOW(), NOW() FROM sk_faq WHERE answer_en IS NOT NULL AND answer_en != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ja-JP', CONCAT('faq:', id, ':answer'), answer_ja, 'faq', id, 'answer', 1, 'zh-CN', NOW(), NOW() FROM sk_faq WHERE answer_ja IS NOT NULL AND answer_ja != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ko-KR', CONCAT('faq:', id, ':answer'), answer_ko, 'faq', id, 'answer', 1, 'zh-CN', NOW(), NOW() FROM sk_faq WHERE answer_ko IS NOT NULL AND answer_ko != '';

ALTER TABLE sk_faq
  DROP COLUMN question_en, DROP COLUMN question_ja, DROP COLUMN question_ko,
  DROP COLUMN answer_en, DROP COLUMN answer_ja, DROP COLUMN answer_ko;

-- ---------------------------------------------------------
-- 10. sk_news (新闻管理)
-- DEPRECATED: title_en, title_ja, title_ko, summary_en, summary_ja, summary_ko, content_en, content_ja, content_ko
-- ---------------------------------------------------------
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('news:', id, ':title'), title_en, 'news', id, 'title', 1, 'zh-CN', NOW(), NOW() FROM sk_news WHERE title_en IS NOT NULL AND title_en != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ja-JP', CONCAT('news:', id, ':title'), title_ja, 'news', id, 'title', 1, 'zh-CN', NOW(), NOW() FROM sk_news WHERE title_ja IS NOT NULL AND title_ja != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ko-KR', CONCAT('news:', id, ':title'), title_ko, 'news', id, 'title', 1, 'zh-CN', NOW(), NOW() FROM sk_news WHERE title_ko IS NOT NULL AND title_ko != '';

INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('news:', id, ':summary'), summary_en, 'news', id, 'summary', 1, 'zh-CN', NOW(), NOW() FROM sk_news WHERE summary_en IS NOT NULL AND summary_en != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ja-JP', CONCAT('news:', id, ':summary'), summary_ja, 'news', id, 'summary', 1, 'zh-CN', NOW(), NOW() FROM sk_news WHERE summary_ja IS NOT NULL AND summary_ja != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ko-KR', CONCAT('news:', id, ':summary'), summary_ko, 'news', id, 'summary', 1, 'zh-CN', NOW(), NOW() FROM sk_news WHERE summary_ko IS NOT NULL AND summary_ko != '';

INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('news:', id, ':content'), content_en, 'news', id, 'content', 1, 'zh-CN', NOW(), NOW() FROM sk_news WHERE content_en IS NOT NULL AND content_en != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ja-JP', CONCAT('news:', id, ':content'), content_ja, 'news', id, 'content', 1, 'zh-CN', NOW(), NOW() FROM sk_news WHERE content_ja IS NOT NULL AND content_ja != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ko-KR', CONCAT('news:', id, ':content'), content_ko, 'news', id, 'content', 1, 'zh-CN', NOW(), NOW() FROM sk_news WHERE content_ko IS NOT NULL AND content_ko != '';

ALTER TABLE sk_news
  DROP COLUMN title_en, DROP COLUMN title_ja, DROP COLUMN title_ko,
  DROP COLUMN summary_en, DROP COLUMN summary_ja, DROP COLUMN summary_ko,
  DROP COLUMN content_en, DROP COLUMN content_ja, DROP COLUMN content_ko;

-- ---------------------------------------------------------
-- 11. sk_training (培训管理)
-- DEPRECATED: title_en, title_ja, title_ko, description_en, description_ja, description_ko, content_en, content_ja, content_ko
-- ---------------------------------------------------------
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('training:', id, ':title'), title_en, 'training', id, 'title', 1, 'zh-CN', NOW(), NOW() FROM sk_training WHERE title_en IS NOT NULL AND title_en != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ja-JP', CONCAT('training:', id, ':title'), title_ja, 'training', id, 'title', 1, 'zh-CN', NOW(), NOW() FROM sk_training WHERE title_ja IS NOT NULL AND title_ja != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ko-KR', CONCAT('training:', id, ':title'), title_ko, 'training', id, 'title', 1, 'zh-CN', NOW(), NOW() FROM sk_training WHERE title_ko IS NOT NULL AND title_ko != '';

INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('training:', id, ':description'), description_en, 'training', id, 'description', 1, 'zh-CN', NOW(), NOW() FROM sk_training WHERE description_en IS NOT NULL AND description_en != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ja-JP', CONCAT('training:', id, ':description'), description_ja, 'training', id, 'description', 1, 'zh-CN', NOW(), NOW() FROM sk_training WHERE description_ja IS NOT NULL AND description_ja != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ko-KR', CONCAT('training:', id, ':description'), description_ko, 'training', id, 'description', 1, 'zh-CN', NOW(), NOW() FROM sk_training WHERE description_ko IS NOT NULL AND description_ko != '';

INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('training:', id, ':content'), content_en, 'training', id, 'content', 1, 'zh-CN', NOW(), NOW() FROM sk_training WHERE content_en IS NOT NULL AND content_en != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ja-JP', CONCAT('training:', id, ':content'), content_ja, 'training', id, 'content', 1, 'zh-CN', NOW(), NOW() FROM sk_training WHERE content_ja IS NOT NULL AND content_ja != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ko-KR', CONCAT('training:', id, ':content'), content_ko, 'training', id, 'content', 1, 'zh-CN', NOW(), NOW() FROM sk_training WHERE content_ko IS NOT NULL AND content_ko != '';

ALTER TABLE sk_training
  DROP COLUMN title_en, DROP COLUMN title_ja, DROP COLUMN title_ko,
  DROP COLUMN description_en, DROP COLUMN description_ja, DROP COLUMN description_ko,
  DROP COLUMN content_en, DROP COLUMN content_ja, DROP COLUMN content_ko;

-- ---------------------------------------------------------
-- 12. sk_about (关于我们)
-- DEPRECATED: title_en, title_ja, title_ko, content_en, content_ja, content_ko
-- ---------------------------------------------------------
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('about:', id, ':title'), title_en, 'about', id, 'title', 1, 'zh-CN', NOW(), NOW() FROM sk_about WHERE title_en IS NOT NULL AND title_en != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ja-JP', CONCAT('about:', id, ':title'), title_ja, 'about', id, 'title', 1, 'zh-CN', NOW(), NOW() FROM sk_about WHERE title_ja IS NOT NULL AND title_ja != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ko-KR', CONCAT('about:', id, ':title'), title_ko, 'about', id, 'title', 1, 'zh-CN', NOW(), NOW() FROM sk_about WHERE title_ko IS NOT NULL AND title_ko != '';

INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('about:', id, ':content'), content_en, 'about', id, 'content', 1, 'zh-CN', NOW(), NOW() FROM sk_about WHERE content_en IS NOT NULL AND content_en != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ja-JP', CONCAT('about:', id, ':content'), content_ja, 'about', id, 'content', 1, 'zh-CN', NOW(), NOW() FROM sk_about WHERE content_ja IS NOT NULL AND content_ja != '';
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'ko-KR', CONCAT('about:', id, ':content'), content_ko, 'about', id, 'content', 1, 'zh-CN', NOW(), NOW() FROM sk_about WHERE content_ko IS NOT NULL AND content_ko != '';

ALTER TABLE sk_about
  DROP COLUMN title_en, DROP COLUMN title_ja, DROP COLUMN title_ko,
  DROP COLUMN content_en, DROP COLUMN content_ja, DROP COLUMN content_ko;

-- ---------------------------------------------------------
-- 13. sk_seo (SEO配置) - 已有 lang_code 字段，无需删除字段
-- 但需将不同 lang_code 的数据合并到 sk_translation 统一格式
-- ---------------------------------------------------------
-- 13. sk_job (职位管理)
-- DEPRECATED: job_title_en
-- ---------------------------------------------------------
INSERT INTO sk_translation (lang_code, trans_key, trans_value, module, business_id, field, is_auto, source_lang, create_time, update_time)
SELECT 'en-US', CONCAT('job:', id, ':job_title'), job_title_en, 'job', id, 'job_title', 1, 'zh-CN', NOW(), NOW()
FROM sk_job WHERE job_title_en IS NOT NULL AND job_title_en != '';

ALTER TABLE sk_job DROP COLUMN job_title_en;

-- sk_seo 表本身是按 lang_code 分行的，不需要删除字段。
-- 如果需要统一使用 I18nService，可以保留现有结构或后续扩展。
-- 本次暂不做迁移，因为结构不同（page_type/page_id/lang_code）。

-- ============================================================
-- 迁移完成。建议执行以下命令批量补翻缺失语言：
-- php think business:translate --execute
-- ============================================================
