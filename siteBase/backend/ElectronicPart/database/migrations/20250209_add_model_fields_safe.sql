-- Migration: Add order and quality fields to sk_product_models table (Safe version)
-- Date: 2025-02-09
-- 自动检查字段是否存在，避免报错

DELIMITER $$

DROP PROCEDURE IF EXISTS AddColumnIfNotExists$$

CREATE PROCEDURE AddColumnIfNotExists(
    IN tableName VARCHAR(64),
    IN columnName VARCHAR(64),
    IN columnDef VARCHAR(255)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = DATABASE()
        AND table_name = tableName 
        AND column_name = columnName
    ) THEN
        SET @sql = CONCAT('ALTER TABLE ', tableName, ' ADD COLUMN ', columnName, ' ', columnDef);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        SELECT CONCAT('Added column: ', columnName) AS result;
    ELSE
        SELECT CONCAT('Column already exists: ', columnName) AS result;
    END IF;
END$$

DROP PROCEDURE IF EXISTS AddIndexIfNotExists$$

CREATE PROCEDURE AddIndexIfNotExists(
    IN tableName VARCHAR(64),
    IN indexName VARCHAR(64),
    IN columnName VARCHAR(64)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics 
        WHERE table_schema = DATABASE()
        AND table_name = tableName 
        AND index_name = indexName
    ) THEN
        SET @sql = CONCAT('CREATE INDEX ', indexName, ' ON ', tableName, '(', columnName, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        SELECT CONCAT('Added index: ', indexName) AS result;
    ELSE
        SELECT CONcat('Index already exists: ', indexName) AS result;
    END IF;
END$$

-- 添加字段
CALL AddColumnIfNotExists('sk_product_models', 'pin_count', 'int(11) DEFAULT 0 COMMENT "引脚数量"')$$
CALL AddColumnIfNotExists('sk_product_models', 'stock', 'int(11) DEFAULT 0 COMMENT "库存数量"')$$
CALL AddColumnIfNotExists('sk_product_models', 'packaging_spec', 'varchar(100) DEFAULT NULL COMMENT "包装规格"')$$
CALL AddColumnIfNotExists('sk_product_models', 'operating_temperature', 'varchar(50) DEFAULT NULL COMMENT "工作温度范围"')$$
CALL AddColumnIfNotExists('sk_product_models', 'material_type', 'varchar(50) DEFAULT NULL COMMENT "材料类型"')$$
CALL AddColumnIfNotExists('sk_product_models', 'pin_plating', 'varchar(50) DEFAULT NULL COMMENT "引脚镀层"')$$
CALL AddColumnIfNotExists('sk_product_models', 'moq', 'int(11) DEFAULT 1 COMMENT "最小起订量"')$$
CALL AddColumnIfNotExists('sk_product_models', 'lead_time', 'int(11) DEFAULT 0 COMMENT "交期(天)"')$$

-- 添加索引
CALL AddIndexIfNotExists('sk_product_models', 'idx_model_status', 'status')$$
CALL AddIndexIfNotExists('sk_product_models', 'idx_model_stock', 'stock')$$

-- 清理存储过程
DROP PROCEDURE IF EXISTS AddColumnIfNotExists$$
DROP PROCEDURE IF EXISTS AddIndexIfNotExists$$

DELIMITER ;

-- 查看更新后的表结构
DESCRIBE `sk_product_models`;
