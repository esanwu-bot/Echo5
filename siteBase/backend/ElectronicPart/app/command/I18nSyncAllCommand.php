<?php
/**
 * i18n 词条批量同步命令
 *
 * 将已有业务数据强制写入 sk_translation（zh-CN 基准记录），
 * 解决历史数据未触发 syncModel 导致翻译词条缺失的问题。
 *
 * 用法:
 *   php think i18n:sync-all                    # 预览所有模块待同步数量
 *   php think i18n:sync-all --execute          # 执行同步
 *   php think i18n:sync-all --module=product   # 只同步 product 模块
 *   php think i18n:sync-all --execute --module=application
 */

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\input\Option;
use think\console\Output;
use think\facade\Db;
use app\service\I18nService;

class I18nSyncAllCommand extends Command
{
    /**
     * 模块 → [表名, i18n字段列表]
     */
    protected array $moduleMap = [
        'product'      => ['sk_product', ['name', 'description', 'features']],
        'application'  => ['sk_application', ['title', 'description', 'content']],
        'brand'        => ['sk_brands', ['brand_name']],
        'category'     => ['sk_category', ['name']],
        'model'        => ['sk_product_models', ['model_name', 'description']],
        'attribute'    => ['sk_attribute', ['name']],
        'application_category' => ['sk_application_category', ['title', 'description']],
        'article'      => ['sk_article', ['title', 'description', 'content']],
        'banner'       => ['sk_banner', ['title', 'description']],
        'faq'          => ['sk_faq', ['question', 'answer']],
        'news'         => ['sk_news', ['title', 'description', 'content']],
    ];

    protected function configure()
    {
        $this->setName('i18n:sync-all')
            ->setDescription('强制同步所有业务数据到 sk_translation（补全历史缺失词条）')
            ->addOption('execute', 'x', Option::VALUE_NONE, '执行同步（默认预览）')
            ->addOption('module', 'm', Option::VALUE_OPTIONAL, '指定模块（product/application/brand等）', '');
    }

    protected function execute(Input $input, Output $output)
    {
        $execute = $input->getOption('execute');
        $moduleFilter = $input->getOption('module');

        $output->writeln('╔══════════════════════════════════════════╗');
        $output->writeln('║   i18n 词条批量同步                      ║');
        $output->writeln('╚══════════════════════════════════════════╝');
        $output->writeln('');

        $modules = $moduleFilter
            ? [$moduleFilter => $this->moduleMap[$moduleFilter] ?? null]
            : $this->moduleMap;

        if ($moduleFilter && !isset($this->moduleMap[$moduleFilter])) {
            $output->writeln("<error>未知模块: {$moduleFilter}</error>");
            $output->writeln('可用模块: ' . implode(', ', array_keys($this->moduleMap)));
            return;
        }

        $i18nService = app(I18nService::class);
        $totalSynced = 0;
        $totalSkipped = 0;

        foreach ($modules as $module => $config) {
            if (!$config) continue;
            [$table, $fields] = $config;

            // 检查表是否存在
            try {
                $count = Db::table($table)->count();
            } catch (\Exception $e) {
                $output->writeln("<comment>跳过 {$module}: 表 {$table} 不存在</comment>");
                continue;
            }

            if ($count === 0) {
                continue;
            }

            // 统计缺失词条数
            $missing = 0;
            $existing = 0;
            $records = Db::table($table)->select()->toArray();

            foreach ($records as $record) {
                $id = (int)($record['id'] ?? 0);
                if (!$id) continue;

                foreach ($fields as $field) {
                    $value = $record[$field] ?? '';
                    if ($value === '' || $value === null) continue;

                    $transKey = "{$module}:{$field}:{$id}";
                    $exists = Db::table('sk_translation')
                        ->where('lang_code', 'zh-CN')
                        ->where('trans_key', $transKey)
                        ->where('module', $module)
                        ->find();

                    if ($exists) {
                        $existing++;
                    } else {
                        $missing++;
                    }
                }
            }

            if ($missing === 0) {
                $output->writeln("  {$module}: <info>{$existing}</info> 条已存在, 无需同步");
                continue;
            }

            $output->writeln("  {$module}: 已有 <info>{$existing}</info> 条, 缺失 <comment>{$missing}</comment> 条");

            if (!$execute) {
                continue;
            }

            // 执行同步
            $synced = 0;
            foreach ($records as $record) {
                $id = (int)($record['id'] ?? 0);
                if (!$id) continue;

                foreach ($fields as $field) {
                    $value = $record[$field] ?? '';
                    if ($value === '' || $value === null) continue;

                    $transKey = "{$module}:{$field}:{$id}";
                    $exists = Db::table('sk_translation')
                        ->where('lang_code', 'zh-CN')
                        ->where('trans_key', $transKey)
                        ->where('module', $module)
                        ->find();

                    if (!$exists) {
                        $i18nService->saveKey($module, $id, $field, (string)$value);
                        $synced++;
                    }
                }
            }

            $totalSynced += $synced;
            $output->writeln("    → 已同步 <info>{$synced}</info> 条");
        }

        $output->writeln('');
        if (!$execute) {
            $output->writeln('<comment>预览模式，加 --execute 执行同步</comment>');
            $output->writeln('同步后执行: php think business:translate --execute --limit=200');
        } else {
            $output->writeln("同步完成: 新增 <info>{$totalSynced}</info> 条 zh-CN 基准记录");
            $output->writeln('下一步: php think business:translate --execute --limit=200');
        }
    }
}
