<?php
declare(strict_types=1);

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use app\service\outer\SyncService;
use think\facade\Log;

/**
 * 数据同步命令
 */
class SyncCommand extends Command
{
    protected function configure()
    {
        $this->setName('sync')
            ->addArgument('type', null, '同步类型: inventory|products|orders|all')
            ->setDescription('执行数据同步任务');
    }

    protected function execute(Input $input, Output $output)
    {
        $type = $input->getArgument('type') ?: 'all';
        $syncService = new SyncService();
        
        $output->writeln("开始执行数据同步任务: {$type}");
        
        try {
            switch ($type) {
                case 'inventory':
                    $this->syncInventory($syncService, $output);
                    break;
                    
                case 'products':
                    $this->syncProducts($syncService, $output);
                    break;
                    
                case 'orders':
                    $this->syncOrders($syncService, $output);
                    break;
                    
                case 'all':
                    $this->syncInventory($syncService, $output);
                    $this->syncProducts($syncService, $output);
                    $this->syncOrders($syncService, $output);
                    break;
                    
                default:
                    $output->writeln("<error>不支持的同步类型: {$type}</error>");
                    return 1;
            }
            
            $output->writeln("<info>数据同步任务完成</info>");
            return 0;
            
        } catch (\Exception $e) {
            $output->writeln("<error>数据同步失败: {$e->getMessage()}</error>");
            Log::error('数据同步命令执行失败', [
                'type' => $type,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return 1;
        }
    }
    
    /**
     * 同步库存
     */
    protected function syncInventory(SyncService $syncService, Output $output)
    {
        $output->writeln("正在同步库存数据...");
        
        try {
            $result = $syncService->realTimeInventorySync();
            $output->writeln("库存同步完成: " . $result['message']);
            
            if (isset($result['updated_records'])) {
                $output->writeln("更新记录数: " . $result['updated_records']);
            }
            
        } catch (\Exception $e) {
            $output->writeln("<error>库存同步失败: {$e->getMessage()}</error>");
            throw $e;
        }
    }
    
    /**
     * 同步商品
     */
    protected function syncProducts(SyncService $syncService, Output $output)
    {
        $output->writeln("正在同步商品数据...");
        
        try {
            // 获取最近更新的商品
            $products = $syncService->getProducts([
                'updated_since' => date('Y-m-d H:i:s', time() - 3600), // 最近1小时
                'limit' => 100
            ]);
            
            if (empty($products['list'])) {
                $output->writeln("没有需要同步的商品");
                return;
            }
            
            // 批量同步到WMS
            $result = $syncService->batchSyncProductsToWMS($products['list']);
            $output->writeln("商品同步完成，同步数量: " . count($products['list']));
            
        } catch (\Exception $e) {
            $output->writeln("<error>商品同步失败: {$e->getMessage()}</error>");
            throw $e;
        }
    }
    
    /**
     * 同步订单
     */
    protected function syncOrders(SyncService $syncService, Output $output)
    {
        $output->writeln("正在同步订单状态...");
        
        try {
            // 获取需要同步状态的订单
            $orders = \think\facade\Db::name('outbound_orders')
                ->whereIn('status', ['pending', 'picking', 'packed', 'shipped'])
                ->where('updated_at', '>=', date('Y-m-d H:i:s', time() - 3600))
                ->limit(50)
                ->select()
                ->toArray();
            
            if (empty($orders)) {
                $output->writeln("没有需要同步的订单");
                return;
            }
            
            $syncCount = 0;
            foreach ($orders as $order) {
                try {
                    $wmsStatus = $syncService->getOrderStatusFromWMS($order['order_no']);
                    
                    // 更新本地订单状态
                    if (isset($wmsStatus['status']) && $wmsStatus['status'] !== $order['status']) {
                        \think\facade\Db::name('outbound_orders')
                            ->where('id', $order['id'])
                            ->update([
                                'status' => $wmsStatus['status'],
                                'tracking_number' => $wmsStatus['tracking_number'] ?? $order['tracking_number'],
                                'carrier' => $wmsStatus['carrier'] ?? $order['carrier'],
                                'updated_at' => date('Y-m-d H:i:s')
                            ]);
                        
                        $syncCount++;
                    }
                    
                } catch (\Exception $e) {
                    $output->writeln("<comment>订单 {$order['order_no']} 同步失败: {$e->getMessage()}</comment>");
                    continue;
                }
            }
            
            $output->writeln("订单状态同步完成，更新数量: {$syncCount}");
            
        } catch (\Exception $e) {
            $output->writeln("<error>订单同步失败: {$e->getMessage()}</error>");
            throw $e;
        }
    }
}