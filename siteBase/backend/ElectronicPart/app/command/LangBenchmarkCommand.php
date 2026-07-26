<?php
/**
 * 多语言 getLang() 性能压测
 * 用法: php think lang:benchmark [--iterations=1000]
 */
namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\input\Option;
use think\console\Output;

class LangBenchmarkCommand extends Command
{
    protected function configure()
    {
        $this->setName('lang:benchmark')
            ->setDescription('getLang() 性能基准测试')
            ->addOption('iterations', 'i', Option::VALUE_REQUIRED, '迭代次数', 1000);
    }

    protected function execute(Input $input, Output $output)
    {
        $iterations = (int) $input->getOption('iterations');
        
        // 预热缓存
        getLang('保存成功');
        
        $output->writeln("<info>═══ getLang() 性能基准测试 ═══</info>");
        $output->writeln("迭代次数: {$iterations}\n");
        
        $testCases = [
            '保存成功'       => '基础CRUD消息',
            '参数错误'       => '错误消息',
            '不能删除默认语言' => '长消息',
            'nonexistent_key' => '(不存在的key，走回退)',
        ];
        
        $totalTimes = [];
        
        foreach ($testCases as $msg => $desc) {
            $start = microtime(true);
            for ($i = 0; $i < $iterations; $i++) {
                $result = getLang($msg);
            }
            $elapsed = microtime(true) - $start;
            $avgMs = ($elapsed / $iterations) * 1000;
            $totalTimes[$msg] = $avgMs;
            
            $output->writeln(sprintf(
                "  %-20s | %s | avg %0.3f ms",
                $msg, $desc, $avgMs
            ));
        }
        
        $overallAvg = array_sum($totalTimes) / count($totalTimes);
        $output->writeln("\n<info>平均耗时: " . sprintf('%0.3f', $overallAvg) . " ms/次</info>");
        $output->writeln("<info>吞吐量:   " . sprintf('%0.0f', 1000 / max($overallAvg, 0.001)) . " 次/秒</info>");
        
        // 如果有 Redis 缓存
        try {
            $redis = \think\facade\Cache::handler();
            $output->writeln("\n缓存类型: Redis");
        } catch (\Exception $e) {
            $output->writeln("\n缓存类型: File (建议启用 Redis 以提升性能)");
        }
        
        return 0;
    }
}
