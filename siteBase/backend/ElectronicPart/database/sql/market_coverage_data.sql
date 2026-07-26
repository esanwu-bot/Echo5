-- 添加市场覆盖项目
INSERT INTO `sk_dictionary_project` (`id`, `name`, `code`, `description`, `status`, `sort_order`, `create_time`, `update_time`, `delete_time`) VALUES
(5, '市场覆盖', 'market_coverage', '全球市场覆盖区域和统计数据', 1, 5, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), NULL);

-- 添加市场覆盖字段定义
INSERT INTO `sk_dictionary_field` (`id`, `project_id`, `name`, `code`, `type`, `data_type`, `required`, `options`, `default_value`, `description`, `sort_order`, `status`, `create_time`, `update_time`, `delete_time`) VALUES
(9, 5, '标题', 'title', 'text', 'string', 1, NULL, '市场覆盖广泛', '市场覆盖标题', 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), NULL),
(10, 5, '描述', 'description', 'textarea', 'string', 1, NULL, NULL, '市场覆盖描述文本', 2, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), NULL),
(11, 5, '统计数据', 'stats', 'textarea', 'json', 0, NULL, NULL, '市场覆盖统计数据(JSON数组)', 3, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), NULL),
(12, 5, '区域列表', 'regions', 'textarea', 'json', 1, NULL, NULL, '覆盖区域列表(JSON数组)', 4, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), NULL);

-- 添加市场覆盖数据
INSERT INTO `sk_dictionary_data` (`id`, `project_id`, `field_values`, `status`, `sort_order`, `create_time`, `update_time`, `delete_time`) VALUES
(4, 5, '{\"title\":\"市场覆盖广泛\",\"description\":\"天启芯科技有限公司的产品与服务已覆盖全球多个国家和地区，包括北美、欧洲、亚洲、非洲等。我们与众多国际知名电子制造商建立了长期稳定的合作关系，赢得了客户的高度认可与信赖。\",\"stats\":[{\"label\":\"服务国家\",\"value\":\"50+\"},{\"label\":\"合作伙伴\",\"value\":\"200+\"},{\"label\":\"客户满意度\",\"value\":\"98%\"}],\"regions\":[{\"name\":\"亚洲\",\"position\":\"top-[40%] right-[25%]\"},{\"name\":\"欧洲\",\"position\":\"top-[35%] right-[45%]\"},{\"name\":\"北美\",\"position\":\"top-[38%] left-[25%]\"},{\"name\":\"非洲\",\"position\":\"top-[55%] right-[48%]\"}]}', 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), NULL);
