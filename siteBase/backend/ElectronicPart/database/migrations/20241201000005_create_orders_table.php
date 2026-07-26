<?php

use think\migration\Migrator;
use think\migration\db\Column;

class CreateOrdersTable extends Migrator
{
    public function change()
    {
        $table = $this->table('orders');
        $table->addColumn('order_no', 'string', ['limit' => 32, 'comment' => '订单号'])
              ->addColumn('user_id', 'integer', ['comment' => '用户ID'])
              ->addColumn('total_price', 'decimal', ['precision' => 10, 'scale' => 2, 'comment' => '订单总金额'])
              ->addColumn('status', 'integer', ['default' => 1, 'comment' => '订单状态 1待付款 2已付款 3已发货 4已完成 5已取消'])
              ->addColumn('address_id', 'integer', ['comment' => '收货地址ID'])
              ->addColumn('address_info', 'text', ['comment' => '收货地址信息快照'])
              ->addColumn('paid_at', 'datetime', ['null' => true, 'comment' => '付款时间'])
              ->addColumn('shipped_at', 'datetime', ['null' => true, 'comment' => '发货时间'])
              ->addColumn('completed_at', 'datetime', ['null' => true, 'comment' => '完成时间'])
              ->addColumn('created_at', 'datetime', ['null' => true])
              ->addColumn('updated_at', 'datetime', ['null' => true])
              ->addIndex(['order_no'], ['unique' => true])
              ->addIndex(['user_id'])
              ->addIndex(['status'])
              ->create();
    }
}