-- 订单处理失败记录表
CREATE TABLE `order_process_failures` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `order_id` bigint(20) unsigned NOT NULL COMMENT '订单ID',
  `order_no` varchar(50) NOT NULL COMMENT '订单号',
  `failure_type` varchar(50) NOT NULL COMMENT '失败类型',
  `error_message` text COMMENT '错误信息',
  `error_trace` longtext COMMENT '错误堆栈',
  `retry_count` int(11) NOT NULL DEFAULT '0' COMMENT '重试次数',
  `status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '状态：pending-待处理，processing-处理中，resolved-已解决，failed-处理失败',
  `resolved_at` datetime DEFAULT NULL COMMENT '解决时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_order_no` (`order_no`),
  KEY `idx_failure_type` (`failure_type`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单处理失败记录表';