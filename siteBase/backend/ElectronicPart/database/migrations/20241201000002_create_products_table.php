<?php

use think\migration\Migrator;
use think\migration\db\Column;

class CreateProductsTable extends Migrator
{
    public function change()
    {
        $table = $this->table('products');
        $table->addColumn('name', 'string', ['limit' => 200, 'comment' => '商品名称'])
              ->addColumn('description', 'text', ['comment' => '商品描述'])
              ->addColumn('price', 'decimal', ['precision' => 10, 'scale' => 2, 'comment' => '价格'])
              ->addColumn('stock', 'integer', ['default' => 0, 'comment' => '库存'])
              ->addColumn('category_id', 'integer', ['comment' => '分类ID'])
              ->addColumn('main_image', 'string', ['limit' => 500, 'null' => true, 'comment' => '主图'])
              ->addColumn('images', 'text', ['null' => true, 'comment' => '商品图片JSON'])
              ->addColumn('status', 'integer', ['default' => 1, 'comment' => '状态 1上架 0下架'])
              ->addColumn('sales_count', 'integer', ['default' => 0, 'comment' => '销量'])
              ->addColumn('created_at', 'datetime', ['null' => true])
              ->addColumn('updated_at', 'datetime', ['null' => true])
              ->addIndex(['category_id'])
              ->addIndex(['status'])
              ->addIndex(['sales_count'])
              ->create();
    }
}