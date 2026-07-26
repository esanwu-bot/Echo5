<?php

use think\migration\Migrator;
use think\migration\db\Column;

class ElectronicComponentsExtension extends Migrator
{
    public function up()
    {
        // 读取SQL文件内容
        $sqlFile = __DIR__ . '/electronic_components_extension.sql';
        if (file_exists($sqlFile)) {
            $sql = file_get_contents($sqlFile);
            // 执行SQL语句
            $this->execute($sql);
        }
    }

    public function down()
    {
        // 删除外键约束
        $this->execute("ALTER TABLE `sk_product` DROP FOREIGN KEY IF EXISTS `fk_product_model`");
        $this->execute("ALTER TABLE `sk_product_suppliers` DROP FOREIGN KEY IF EXISTS `fk_product_supplier_product`");
        $this->execute("ALTER TABLE `sk_product_suppliers` DROP FOREIGN KEY IF EXISTS `fk_product_supplier_supplier`");
        $this->execute("ALTER TABLE `sk_inventory` DROP FOREIGN KEY IF EXISTS `fk_inventory_storage_location`");
        $this->execute("ALTER TABLE `sk_product_models` DROP FOREIGN KEY IF EXISTS `fk_model_category`");
        $this->execute("ALTER TABLE `sk_product_models` DROP FOREIGN KEY IF EXISTS `fk_model_brand`");
        $this->execute("ALTER TABLE `sk_model_specifications` DROP FOREIGN KEY IF EXISTS `fk_spec_model`");
        
        // 删除新增的表
        $this->execute("DROP TABLE IF EXISTS `sk_model_specifications`");
        $this->execute("DROP TABLE IF EXISTS `sk_categories`");
        $this->execute("DROP TABLE IF EXISTS `sk_brands`");
        $this->execute("DROP TABLE IF EXISTS `sk_storage_locations`");
        $this->execute("DROP TABLE IF EXISTS `sk_product_suppliers`");
        $this->execute("DROP TABLE IF EXISTS `sk_suppliers`");
        $this->execute("DROP TABLE IF EXISTS `sk_product_models`");
        
        // 删除扩展的字段
        $this->execute("ALTER TABLE `sk_inventory` DROP COLUMN IF EXISTS `in_transit_stock`");
        $this->execute("ALTER TABLE `sk_inventory` DROP COLUMN IF EXISTS `safety_stock`");
        $this->execute("ALTER TABLE `sk_inventory` DROP COLUMN IF EXISTS `storage_location_id`");
        $this->execute("ALTER TABLE `sk_product` DROP COLUMN IF EXISTS `model_id`");
    }
}