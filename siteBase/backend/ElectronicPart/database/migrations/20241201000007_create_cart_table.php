<?php

use think\migration\Migrator;
use think\migration\db\Column;

class CreateCartTable extends Migrator
{
    public function change()
    {
        $table = $this->table('cart');
        $table->addColumn('user_id', 'integer', ['comment' => '用户ID'])
              ->addColumn('product_id', 'integer', ['comment' => '商品ID'])
              ->addColumn('quantity', 'integer', ['comment' => '数量'])
              ->addColumn('created_at', 'datetime', ['null' => true])
              ->addColumn('updated_at', 'datetime', ['null' => true])
              ->addIndex(['user_id'])
              ->addIndex(['product_id'])
              ->addIndex(['user_id', 'product_id'], ['unique' => true])
              ->create();
    }
}