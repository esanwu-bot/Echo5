-- 1. 备份冗余表数据
CREATE TABLE sk_brand_backup SELECT * FROM sk_brand;
CREATE TABLE sk_categories_backup SELECT * FROM sk_categories;
CREATE TABLE sk_subcategory_backup SELECT * FROM sk_subcategory;

-- 2. 删除引用sk_categories的外键约束
ALTER TABLE sk_product_models DROP FOREIGN KEY fk_model_category;

-- 3. 删除冗余表
DROP TABLE IF EXISTS sk_brand;
DROP TABLE IF EXISTS sk_categories;
DROP TABLE IF EXISTS sk_subcategory;
