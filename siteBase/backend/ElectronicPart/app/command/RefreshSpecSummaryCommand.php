<?php
/**
 * 电子元器件商城 - 刷新系列规格摘要缓存命令
 * 文件说明：批量计算并更新所有系列的 spec_summary 字段，提升API响应性能。
 * 使用方法：php think refresh:spec-summary
 */

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use app\model\SkProduct;
use app\model\SkProductModel;
use think\facade\Db;
use think\facade\Log;

class RefreshSpecSummaryCommand extends Command
{
    protected function configure()
    {
        $this->setName('refresh:spec-summary')
             ->setDescription('批量刷新所有产品系列的 spec_summary 缓存');
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('开始刷新 spec_summary 缓存...');
        $startTime = microtime(true);

        $total = SkProduct::count();
        $output->writeln("总系列数: {$total}");

        $pageSize = 50;
        $page = 1;
        $successCount = 0;
        $failCount = 0;

        while (true) {
            $list = SkProduct::order('id', 'asc')
                ->page($page, $pageSize)
                ->select();

            if ($list->isEmpty()) {
                break;
            }

            foreach ($list as $series) {
                try {
                    $specSummary = $this->buildSpecSummary((int)$series->id);
                    $series->spec_summary = $specSummary;
                    $series->save();
                    $successCount++;
                    $output->writeln("[{$successCount}/{$total}] 系列ID:{$series->id} {$series->name} - 完成");
                } catch (\Exception $e) {
                    $failCount++;
                    $output->writeln("<error>系列ID:{$series->id} 失败: {$e->getMessage()}</error>");
                    Log::error('刷新spec_summary失败 series_id=' . $series->id . ': ' . $e->getMessage());
                }
            }

            $page++;
        }

        $endTime = microtime(true);
        $duration = round($endTime - $startTime, 2);

        $output->writeln('');
        $output->writeln("========== 完成 ==========");
        $output->writeln("成功: {$successCount}");
        $output->writeln("失败: {$failCount}");
        $output->writeln("耗时: {$duration} 秒");

        return 0;
    }

    /**
     * 构建系列规格摘要 (聚合型号参数范围)
     */
    protected function buildSpecSummary(int $seriesId): array
    {
        $codeToField = [
            'package_type'      => 'packageRange',
            'resistance_value'  => 'resistanceRange',
            'tolerance'         => 'toleranceRange',
            'power_rating'      => 'powerRange',
        ];

        $summary = [
            'packageRange'     => '—',
            'resistanceRange'  => '—',
            'toleranceRange'   => '—',
            'powerRange'       => '—',
        ];

        $modelIds = SkProductModel::where('series_id', $seriesId)
            ->whereIn('status', [0, 1, 'Active', 'active'])
            ->column('id');

        if (!empty($modelIds)) {
            $rows = Db::name('sk_model_param_val')
                ->alias('mpv')
                ->join('sk_attribute attr', 'mpv.param_id = attr.id', 'LEFT')
                ->whereIn('mpv.model_id', $modelIds)
                ->whereIn('attr.code', array_keys($codeToField))
                ->field([
                    'attr.code as code',
                    'mpv.value',
                    'mpv.value_numeric',
                ])
                ->select()
                ->toArray();

            $grouped = [];
            foreach ($rows as $r) {
                $code = $r['code'] ?? '';
                if (!$code) continue;
                $val = $r['value'] ?? '';
                if ($val === '' || $val === null) continue;
                $grouped[$code][$val] = $r['value_numeric'] ?? null;
            }

            foreach ($codeToField as $code => $field) {
                if (!empty($grouped[$code])) {
                    $summary[$field] = $this->formatRange($grouped[$code], $code);
                }
            }
        }

        return $summary;
    }

    /**
     * 将参数值集合格式化为范围字符串
     */
    protected function formatRange(array $values, string $code): string
    {
        if (empty($values)) {
            return '—';
        }

        // 数值型参数：取 value_numeric 的 min ~ max，用规范单位展示
        $numericVals = array_filter($values, fn($v) => $v !== null && $v !== '');
        if (!empty($numericVals)) {
            $numericList = array_map('floatval', $numericVals);
            $min = min($numericList);
            $max = max($numericList);
            if ($code === 'resistance_value') {
                $minLabel = $this->formatResistanceLabel($min);
                $maxLabel = $this->formatResistanceLabel($max);
                return count($numericList) > 1 ? "{$minLabel} ~ {$maxLabel}" : $minLabel;
            }
            if ($min != $max) {
                return count($numericList) > 1 ? "{$min} ~ {$max}" : (string)$min;
            }
        }

        $uniqueVals = array_keys($values);
        sort($uniqueVals);
        if (count($uniqueVals) === 1) {
            return $uniqueVals[0];
        }
        if (count($uniqueVals) <= 5) {
            return implode(' / ', $uniqueVals);
        }
        return $uniqueVals[0] . ' ~ ' . end($uniqueVals);
    }

    protected function formatResistanceLabel(float $ohm): string
    {
        if ($ohm < 1000) {
            return rtrim(rtrim(sprintf('%.2f', $ohm), '0'), '.') . 'Ω';
        }
        if ($ohm < 1000000) {
            return rtrim(rtrim(sprintf('%.2f', $ohm / 1000), '0'), '.') . 'kΩ';
        }
        return rtrim(rtrim(sprintf('%.2f', $ohm / 1000000), '0'), '.') . 'MΩ';
    }
}
