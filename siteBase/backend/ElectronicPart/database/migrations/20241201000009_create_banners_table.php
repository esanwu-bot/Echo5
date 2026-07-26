<?php

use think\migration\Migrator;
use think\migration\db\Column;

class CreateBannersTable extends Migrator
{
    public function change()
    {
        $table = $this->table('banners');
        $table->addColumn('title', 'string', ['limit' => 100, 'comment' => 'Banner标题'])
              ->addColumn('image', 'string', ['limit' => 255, 'comment' => '图片链接'])
              ->addColumn('link', 'string', ['limit' => 255, 'comment' => '跳转链接'])
              ->addColumn('position', 'string', ['limit' => 50, 'comment' => '显示位置: home_top,category_top,product_detail'])
              ->addColumn('status', 'string', ['limit' => 20, 'default' => 'active', 'comment' => '状态: active,inactive'])
              ->addColumn('sort_order', 'integer', ['default' => 0, 'comment' => '排序'])
              ->addColumn('created_at', 'datetime', ['null' => true])
              ->addColumn('updated_at', 'datetime', ['null' => true])
              ->addIndex(['position'])
              ->addIndex(['status'])
              ->addIndex(['sort_order'])
              ->create();
    }
}