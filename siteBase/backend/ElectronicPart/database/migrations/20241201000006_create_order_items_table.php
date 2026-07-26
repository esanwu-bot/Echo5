<?php

use think\migration\Migrator;
use think\migration\db\Column;

class CreateOrderItemsTable extends Migrator
{
    public function change()
    {
        $table = $this->table('order_items');
        $table->addColumn('order_id', 'integer', ['comment' => '订单ID'])
              ->addColumn('product_id', 'integer', ['comment' => '商品ID'])
              ->addColumn('product_name', 'string', ['limit' => 200, 'comment' => '商品名称'])
              ->addColumn('product_image', 'string', ['limit' => 500, 'null' => true, 'comment' => '商品图片'])
              ->addColumn('price', 'decimal', ['precision' => 10, 'scale' => 2, 'comment' => '商品单价'])
              ->addColumn('quantity', 'integer', ['comment' => '购买数量'])
              ->addColumn('total_price', 'decimal', ['precision' => 10, 'scale' => 2, 'comment' => '小计'])
              ->addColumn('created_at', 'datetime', ['null' => true])
              ->addColumn('updated_at', 'datetime', ['null' => true])
              ->addIndex(['order_id'])
              ->addIndex(['product_id'])
              ->create();
    }
}