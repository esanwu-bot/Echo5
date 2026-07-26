<?php
/**
 * 电子元器件商城 - 代理佣金服务
 * 文件说明：为代理完成的订单分配间接/直接佣金逻辑，包含幂等检查。
 * 注意：本项目为电子元器件商城（电子组件），非酒水类商品。
 */

namespace app\service\agent;

use app\model\agent\AgentOrder;
use app\model\agent\CommissionRecord;
use app\model\agent\Agent;
use think\facade\Config;

class CommissionService
{
    /**
     * 为完成的订单分配上级代理的间接佣金（幂等）
     * 返回创建的间接佣金记录数量
     */
    public function distributeIndirect(AgentOrder $order): int
    {
        // 配置检查
        $enable = (bool) Config::get('agent.enable_indirect', true);
        if (!$enable) return 0;

        // 确保已加载关联代理商
        $agent = $order->agent ?: Agent::find($order->agent_id);
        if (!$agent) {
            return 0;
        }

        $rates = (array) Config::get('agent.indirect_rates', []);
        $maxLevels = (int) Config::get('agent.max_levels', 2);
        if (empty($rates) || $maxLevels <= 0) return 0;

        // 获取层级路径 [顶级, ..., 父级, 自身]
        $path = $agent->getHierarchyPath();
        $selfId = $agent->id;
        $selfIndex = array_search($selfId, $path, true);
        if ($selfIndex === false) return 0;

        $created = 0;
        // 从父级开始向上发放
        for ($distance = 1; $distance <= $maxLevels; $distance++) {
            $idx = $selfIndex - $distance;
            if ($idx < 0) break; // 没有更多上级
            $ancestorId = (int) $path[$idx];
            if ($ancestorId <= 0) continue;

            // 取当前层级的间接佣金比例
            $rate = isset($rates[$distance]) ? (float)$rates[$distance] : 0.0;
            if ($rate <= 0) continue;

            // 幂等：若已存在该订单与该上级的间接佣金记录，则跳过
            $exists = CommissionRecord::where('order_id', $order->id)
                ->where('agent_id', $ancestorId)
                ->where('commission_type', 'indirect')
                ->find();
            if ($exists) continue;

            $amount = round($order->final_amount * $rate / 100, 2);
            if ($amount <= 0) continue;

            CommissionRecord::create([
                'agent_id' => $ancestorId,
                'order_id' => $order->id,
                'commission_type' => 'indirect',
                'commission_amount' => $amount,
                'commission_rate' => $rate,
                'order_amount' => $order->final_amount,
                'status' => 0, // 待结算
            ]);
            $created++;
        }

        return $created;
    }
}
