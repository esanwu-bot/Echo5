<?php

use think\migration\Migrator;
use think\migration\db\Column;

class CreateSkProductTable extends Migrator
{
    public function change()
    {
        // 创建电子元器件产品主表
        $table = $this->table('sk_product', ['comment' => '电子元器件产品表']);
        $table->addColumn('product_id', 'string', ['limit' => 100, 'comment' => '产品唯一标识符'])
              ->addColumn('model_number', 'string', ['limit' => 100, 'comment' => '制造商型号'])
              ->addColumn('brand', 'string', ['limit' => 100, 'comment' => '品牌/制造商'])
              ->addColumn('category', 'string', ['limit' => 50, 'comment' => '产品主类别'])
              ->addColumn('sub_category', 'string', ['limit' => 50, 'null' => true, 'comment' => '产品子类别'])
              ->addColumn('name', 'string', ['limit' => 200, 'comment' => '产品名称'])
              ->addColumn('description', 'text', ['null' => true, 'comment' => '产品描述'])
              ->addColumn('image_url', 'string', ['limit' => 500, 'null' => true, 'comment' => '产品图片URL'])
              ->addColumn('status', 'string', ['limit' => 20, 'default' => 'Active', 'comment' => '产品状态'])
              ->addColumn('package_type', 'string', ['limit' => 50, 'null' => true, 'comment' => '封装类型'])
              ->addColumn('package_packaging', 'string', ['limit' => 50, 'null' => true, 'comment' => '包装方式'])
              ->addColumn('inventory_stock', 'integer', ['default' => 0, 'comment' => '库存数量'])
              ->addColumn('inventory_min_order_quantity', 'integer', ['default' => 1, 'comment' => '最小起订量'])
              ->addColumn('inventory_lead_time', 'string', ['limit' => 50, 'null' => true, 'comment' => '供货周期'])
              ->addColumn('pricing_unit_price', 'decimal', ['precision' => 10, 'scale' => 2, 'comment' => '单价'])
              ->addColumn('pricing_currency', 'string', ['limit' => 10, 'default' => 'USD', 'comment' => '货币'])
              ->addColumn('compliance_rohs', 'string', ['limit' => 20, 'default' => 'Unknown', 'comment' => 'RoHS合规'])
              ->addColumn('compliance_reach', 'string', ['limit' => 20, 'default' => 'Unknown', 'comment' => 'REACH合规'])
              ->addColumn('compliance_eccn', 'string', ['limit' => 20, 'null' => true, 'comment' => '出口管制分类编码'])
              ->addColumn('links_datasheet_url', 'string', ['limit' => 500, 'null' => true, 'comment' => '数据手册链接'])
              ->addColumn('links_product_page_url', 'string', ['limit' => 500, 'null' => true, 'comment' => '产品页面链接'])
              ->addColumn('links_simulation_model_url', 'string', ['limit' => 500, 'null' => true, 'comment' => '仿真模型链接'])
              ->addColumn('updated_at', 'datetime', ['null' => true, 'comment' => '更新时间'])
              ->addColumn('created_at', 'datetime', ['null' => true, 'comment' => '创建时间'])
              ->addIndex(['product_id'], ['unique' => true])
              ->addIndex(['model_number'])
              ->addIndex(['brand'])
              ->addIndex(['category'])
              ->addIndex(['status'])
              ->create();
        
        // 创建产品规格参数表
        $table = $this->table('sk_product_specification', ['comment' => '产品规格参数表']);
        $table->addColumn('product_id', 'string', ['limit' => 100, 'comment' => '产品ID'])
              ->addColumn('name', 'string', ['limit' => 100, 'comment' => '参数名称'])
              ->addColumn('value', 'string', ['limit' => 100, 'comment' => '参数值'])
              ->addColumn('unit', 'string', ['limit' => 20, 'null' => true, 'comment' => '参数单位'])
              ->addColumn('sort_order', 'integer', ['default' => 0, 'comment' => '排序'])
              ->addIndex(['product_id'])
              ->create();
        
        // 创建产品价格区间表
        $table = $this->table('sk_product_price_break', ['comment' => '产品价格区间表']);
        $table->addColumn('product_id', 'string', ['limit' => 100, 'comment' => '产品ID'])
              ->addColumn('quantity', 'integer', ['comment' => '数量分界点'])
              ->addColumn('price', 'decimal', ['precision' => 10, 'scale' => 2, 'comment' => '对应单价'])
              ->addIndex(['product_id'])
              ->addIndex(['quantity'])
              ->create();
    }
}