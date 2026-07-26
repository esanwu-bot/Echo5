<?php

use think\migration\Migrator;
use think\migration\db\Column;

class CreateCategoriesTable extends Migrator
{
    public function change()
    {
    $table = $this->table('product_category');
        $table->addColumn('name', 'string', ['limit' => 100, 'comment' => '分类名称'])
              ->addColumn('parent_id', 'integer', ['default' => 0, 'comment' => '父级分类ID'])
              ->addColumn('sort_order', 'integer', ['default' => 0, 'comment' => '排序'])
              ->addColumn('status', 'integer', ['default' => 1, 'comment' => '状态 1启用 0禁用'])
              ->addColumn('created_at', 'datetime', ['null' => true])
              ->addColumn('updated_at', 'datetime', ['null' => true])
              ->addIndex(['parent_id'])
              ->addIndex(['status'])
              ->create();
    }
}