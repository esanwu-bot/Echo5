Product schema migration README

目的
----
将现有简单的产品表结构（`sk_product`,`sk_product_specification`,`sk_product_price_break`）迁移到更规范的实体关系（Brand, Category, Subcategory, SpecificationDefinition, ProductSpec），以便支持：
- 统一品牌与类别管理
- 规格名称规范化（便于搜索与筛选）
- 更清晰的价格区间结构

关键文件（已拆分为三步）
---------
- `product_migration_step1_create_tables.sql` : 创建字典表、产品规格关联表，并在 `sk_product` / `sk_product_price_break` 上新增列（不添加外键），用于手工逐步执行的第一步。
- `product_migration_step2_migrate_data.sql` : 将现有数据迁移到字典表并填充 `sk_product` 的 FK 列，同时把 `sk_product_specification` 的数据迁移到 `sk_product_spec`。
- `product_migration_step3_constraints_indexes.sql` : 在确认列类型和 engine 一致后，添加外键约束与性能索引（分步执行以避免无法添加外键的问题）。

执行步骤（推荐在测试库先执行）
-----------------
1. 在目标 MySQL 实例上备份当前数据库：
   - 使用 mysqldump 或其他 DBA 工具备份整库
2. 在测试库执行脚本（推荐分步运行）：
   - Step 1: 在测试库执行 `product_migration_step1_create_tables.sql`（创建表和新增列，无 FK）。
   - Step 2: 执行 `product_migration_step2_migrate_data.sql`（执行数据迁移与映射）。
   - 验证列类型、engine、行数是否一致（见下方验证建议）。
   - Step 3: 在确认后执行 `product_migration_step3_constraints_indexes.sql`（添加 FK 与索引）。
3. 验证点：
   - sk_product.brand_id, category_fk_id, subcategory_fk_id 已被填充
   - `sk_specification_definition` 包含原有的规格名称
   - `sk_product_spec` 中的记录数与 `sk_product_specification` 相同
   - 价格区间 `sk_product_price_break` 保留原有行并添加了 `currency` 字段
4. 如果一切正常，计划在维护窗口内对生产数据库执行同样脚本

回滚策略
--------
- 如果出现严重问题：
  1) 使用备份进行整库恢复（最保险）。
  2) 若无法恢复整库，可手动删除迁移插入的数据表（`brand`, `category`, `subcategory`, `specification_definition`, `sk_product_spec`），并将 `sk_product` 中新增列设为 NULL/删除（谨慎）。

后续工作建议
-----------
- 将 `sk_product_specification` 标记为废弃或重命名为备份表（保留至少一份备份）。
- 为 `brand`, `category`, `specification_definition` 提供后台 CRUD 管理页面（便于维护）。
- 在后端 API 层实现：
  - 产品增删改查（含 brand/category/subcategory 引用）
  - 规格定义的增删改查
  - 产品规格（`sk_product_spec`）的管理接口
  - 价格区间管理接口（`sk_product_price_break`）

快速验证 SQL 示例
-----------------
-- 验证规格迁移行数一致
SELECT COUNT(*) AS old_cnt FROM sk_product_specification;
SELECT COUNT(*) AS new_cnt FROM sk_product_spec;

-- 验证 product 的 brand_id 已填充
SELECT product_id, brand, brand_id FROM sk_product WHERE brand_id IS NULL LIMIT 10;

-- 验证某一产品的规格
SELECT sd.name, s.value, s.sort_order
FROM sk_product_spec s
JOIN sk_specification_definition sd ON sd.id = s.spec_id
WHERE s.product_id = 'SKU-1001' ORDER BY s.sort_order;

联系方式
-------
如需我替您继续：
- 生成示例的 PHP CRUD 控制器/路由
- 在项目中加入数据库迁移管理（例如使用 Phinx / Laravel migrations / Flyway）
- 在后端实现分页、过滤和规格搜索优化

请告知下一步您希望我直接去做哪一项（例如：生成 PHP CRUD 样例并提交到 `backend/ElectronicPart`）。