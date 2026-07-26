<?php

use think\migration\Migrator;
use think\migration\db\Column;

class CreateUsersTable extends Migrator
{
    public function change()
    {
        $table = $this->table('users');
        $table->addColumn('openid', 'string', ['limit' => 100, 'null' => true, 'comment' => '微信openid'])
              ->addColumn('nickname', 'string', ['limit' => 100, 'null' => true, 'comment' => '昵称'])
              ->addColumn('avatar', 'string', ['limit' => 500, 'null' => true, 'comment' => '头像'])
              ->addColumn('phone', 'string', ['limit' => 20, 'null' => true, 'comment' => '手机号'])
              ->addColumn('status', 'integer', ['default' => 1, 'comment' => '状态 1正常 0禁用'])
              ->addColumn('created_at', 'datetime', ['null' => true])
              ->addColumn('updated_at', 'datetime', ['null' => true])
              ->addIndex(['openid'], ['unique' => true])
              ->addIndex(['phone'])
              ->addIndex(['status'])
              ->create();
    }
}