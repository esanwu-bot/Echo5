<?php

/**
 * Migration: Add order and quality fields to sk_product_models table
 * Date: 2025-02-09
 */

require_once __DIR__ . '/../MigrationBase.php';

class AddModelOrderFields extends MigrationBase
{
    public function up()
    {
        $this->db->startTrans();
        try {
            // Check if columns exist before adding
            $columns = $this->db->query("SHOW COLUMNS FROM `sk_product_models`");
            $columnNames = array_column($columns, 'Field');
            
            $fieldsToAdd = [
                'pin_count' => "ALTER TABLE `sk_product_models` ADD COLUMN `pin_count` int(11) DEFAULT 0 COMMENT '引脚数量'",
                'stock' => "ALTER TABLE `sk_product_models` ADD COLUMN `stock` int(11) DEFAULT 0 COMMENT '库存数量'",
                'packaging_spec' => "ALTER TABLE `sk_product_models` ADD COLUMN `packaging_spec` varchar(100) DEFAULT NULL COMMENT '包装规格'",
                'operating_temperature' => "ALTER TABLE `sk_product_models` ADD COLUMN `operating_temperature` varchar(50) DEFAULT NULL COMMENT '工作温度范围'",
                'material_type' => "ALTER TABLE `sk_product_models` ADD COLUMN `material_type` varchar(50) DEFAULT NULL COMMENT '材料类型'",
                'pin_plating' => "ALTER TABLE `sk_product_models` ADD COLUMN `pin_plating` varchar(50) DEFAULT NULL COMMENT '引脚镀层'",
                'moq' => "ALTER TABLE `sk_product_models` ADD COLUMN `moq` int(11) DEFAULT 1 COMMENT '最小起订量'",
                'lead_time' => "ALTER TABLE `sk_product_models` ADD COLUMN `lead_time` int(11) DEFAULT 0 COMMENT '交期(天)'",
            ];
            
            foreach ($fieldsToAdd as $fieldName => $sql) {
                if (!in_array($fieldName, $columnNames)) {
                    $this->executeSql($sql, "添加字段: {$fieldName}");
                } else {
                    echo "字段 {$fieldName} 已存在，跳过\n";
                }
            }
            
            $this->db->commit();
            echo "迁移成功: 添加型号订购相关字段\n";
        } catch (\Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }
    
    public function down()
    {
        $this->db->startTrans();
        try {
            $columns = ['pin_count', 'stock', 'packaging_spec', 'operating_temperature', 
                       'material_type', 'pin_plating', 'moq', 'lead_time'];
            
            foreach ($columns as $column) {
                try {
                    $sql = "ALTER TABLE `sk_product_models` DROP COLUMN IF EXISTS `{$column}`";
                    $this->db->execute($sql);
                    echo "已删除字段: {$column}\n";
                } catch (\Exception $e) {
                    echo "删除字段 {$column} 失败: " . $e->getMessage() . "\n";
                }
            }
            
            $this->db->commit();
            echo "回滚成功\n";
        } catch (\Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }
}

// Run migration
$migration = new AddModelOrderFields();
$migration->up();
