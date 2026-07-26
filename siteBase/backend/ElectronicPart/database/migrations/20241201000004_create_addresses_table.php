<?php

use think\migration\Migrator;
use think\migration\db\Column;

class CreateAddressesTable extends Migrator
{
    public function change()
    {
        $table = $this->table('addresses');
        $table->addColumn('user_id', 'integer', ['comment' => '用户ID'])
              ->addColumn('name', 'string', ['limit' => 50, 'comment' => '收货人姓名'])
              ->addColumn('phone', 'string', ['limit' => 20, 'comment' => '收货人电话'])
              ->addColumn('province', 'string', ['limit' => 50, 'comment' => '省份'])
              ->addColumn('city', 'string', ['limit' => 50, 'comment' => '城市'])
              ->addColumn('district', 'string', ['limit' => 50, 'comment' => '区县'])
              ->addColumn('detail', 'string', ['limit' => 200, 'comment' => '详细地址'])
              ->addColumn('is_default', 'integer', ['default' => 0, 'comment' => '是否默认地址 1是 0否'])
              ->addColumn('created_at', 'datetime', ['null' => true])
              ->addColumn('updated_at', 'datetime', ['null' => true])
              ->addIndex(['user_id'])
              ->addIndex(['is_default'])
              ->create();
    }
}