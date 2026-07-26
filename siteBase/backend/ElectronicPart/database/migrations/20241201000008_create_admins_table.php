<?php

use think\migration\Migrator;
use think\migration\db\Column;

class CreateAdminsTable extends Migrator
{
    public function change()
    {
        $table = $this->table('admins');
        $table->addColumn('username', 'string', ['limit' => 50, 'comment' => '管理员用户名'])
              ->addColumn('password', 'string', ['limit' => 255, 'comment' => '密码'])
              ->addColumn('nickname', 'string', ['limit' => 50, 'null' => true, 'comment' => '昵称'])
              ->addColumn('avatar', 'string', ['limit' => 500, 'null' => true, 'comment' => '头像'])
              ->addColumn('status', 'integer', ['default' => 1, 'comment' => '状态 1正常 0禁用'])
              ->addColumn('last_login_at', 'datetime', ['null' => true, 'comment' => '最后登录时间'])
              ->addColumn('created_at', 'datetime', ['null' => true])
              ->addColumn('updated_at', 'datetime', ['null' => true])
              ->addIndex(['username'], ['unique' => true])
              ->addIndex(['status'])
              ->create();
    }
}