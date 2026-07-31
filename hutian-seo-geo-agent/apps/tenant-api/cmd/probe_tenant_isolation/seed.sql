-- T6.3 串数据探针 seed 数据
-- 插入两租户 A(id=1)/B(id=2)，各一个 workspace，验证隔离
-- 跑法：mysql -u root -proot hutian < cmd/probe_tenant_isolation/seed.sql
-- 幂等：先 DELETE 再 INSERT，可重复跑

USE hutian;

-- 清理探针数据（只删探针用的，不动其他）
DELETE FROM workspaces WHERE id IN (10, 20);
DELETE FROM cms_instances WHERE id IN (100, 200);
DELETE FROM tenants WHERE id IN (1, 2);

-- 两个 CMS 实例（T8.0 起 sitebase_instances → cms_instances，标 cms_type=sitebase）
-- 模拟每 workspace 一套实例隔离
INSERT INTO cms_instances (id, cms_type, base_url, provision_kind, capacity, health) VALUES
  (100, 'sitebase', 'http://localhost:8001/api/v1', 'preset', 1, 'healthy'),
  (200, 'sitebase', 'http://localhost:8002/api/v1', 'preset', 1, 'healthy');

-- 租户 A（id=1）
INSERT INTO tenants (id, slug, display_name, status, owner_seat_id) VALUES
  (1, 'tenant-a', 'Tenant A Co.', 'active', NULL);

-- 租户 B（id=2）
INSERT INTO tenants (id, slug, display_name, status, owner_seat_id) VALUES
  (2, 'tenant-b', 'Tenant B Co.', 'active', NULL);

-- workspace 10 归 tenant A，路由到 siteBase 实例 100
INSERT INTO workspaces (id, tenant_id, slug, brand_name, industry, sitebase_instance_id, fallback_copy_json, status) VALUES
  (10, 1, 'ws-a', 'Brand A', 'trike', 100, '{}', 'active');

-- workspace 20 归 tenant B，路由到 siteBase 实例 200
INSERT INTO workspaces (id, tenant_id, slug, brand_name, industry, sitebase_instance_id, fallback_copy_json, status) VALUES
  (20, 2, 'ws-b', 'Brand B', 'trike', 200, '{}', 'active');

-- 重置 AUTO_INCREMENT 避免冲突（探针用固定 id）
ALTER TABLE cms_instances AUTO_INCREMENT = 1000;
ALTER TABLE tenants AUTO_INCREMENT = 1000;
ALTER TABLE workspaces AUTO_INCREMENT = 1000;

SELECT '[seed] tenant A(id=1, ws=10, instance=100), tenant B(id=2, ws=20, instance=200)' AS status;
