<?php
/**
 * 天启芯科技 - 多语言数据迁移命令
 * 将分散的 {field}_{lang} 后缀字段迁移到集中式 sk_lang_code 表
 * 
 * 用法:
 *   php think lang:migrate                          # 迁移所有表（dry-run）
 *   php think lang:migrate --execute                 # 执行真实迁移
 *   php think lang:migrate --table=sk_product        # 只迁移指定表
 *   php think lang:migrate --rollback                # 回滚（清除迁移数据）
 *   php think lang:migrate --with-translate           # 迁移后自动触发火山翻译补全
 */
namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\input\Option;
use think\console\Output;
use think\facade\Db;

class LangMigrateCommand extends Command
{
    /**
     * 语言后缀 → type_id 映射
     */
    protected $langMap = [
        'en'       => 2,  // English
        'ja'       => 3,  // 日本語
        'jp'       => 3,  // 日本語 (jp aliased)
        'ko'       => 4,  // 한국어
        'kr'       => 4,  // 한국어 (kr aliased)
        'zh_hant'  => 1,  // 繁体中文 → 暂归中文
    ];

    /**
     * 迁移表配置: [表名, 基础字段→后缀列表, remarks模板]
     */
    protected $tableConfig = [];

    protected function configure()
    {
        $this->setName('lang:migrate')
            ->setDescription('多语言数据迁移：分散字段 → 集中式 sk_lang_code')
            ->addOption('execute', 'x', Option::VALUE_NONE, '执行真实迁移（默认 dry-run）')
            ->addOption('table', 't', Option::VALUE_OPTIONAL, '指定表名（逗号分隔），默认全部')
            ->addOption('rollback', 'r', Option::VALUE_NONE, '回滚迁移数据')
            ->addOption('batch', 'b', Option::VALUE_REQUIRED, '每批处理行数(默认500)', 500);
    }

    protected function execute(Input $input, Output $output)
    {
        $isDryRun = !$input->getOption('execute');
        $isRollback = $input->getOption('rollback');
        $batchSize = (int)$input->getOption('batch') ?: 500;
        
        $this->initTableConfig();

        // 过滤指定表
        $tableFilter = $input->hasOption('table') && $input->getOption('table') 
            ? explode(',', $input->getOption('table')) 
            : [];

        if ($isRollback) {
            return $this->executeRollback($input, $output);
        }

        if ($isDryRun) {
            $output->writeln("<info>═══ DRY-RUN 模式（不会写入数据） ═══</info>\n");
        } else {
            $output->writeln("<warning>═══ 真实迁移模式 ═══</warning>\n");
        }

        $stats = [
            'tables'      => 0,
            'rows'        => 0,
            'entries'     => 0,
            'skipped'     => 0,
            'errors'      => [],
        ];

        foreach ($this->tableConfig as $config) {
            [$table, $fields, $remarksTpl] = $config;

            // 过滤表
            if (!empty($tableFilter) && !in_array($table, $tableFilter)) {
                continue;
            }

            $output->writeln("<comment>▶ 迁移表: {$table}</comment>");
            $stats['tables']++;

            // 检查表是否存在
            try {
                $count = Db::table($table)->count();
            } catch (\Exception $e) {
                $output->writeln("<error>  表 {$table} 不存在或无法访问: {$e->getMessage()}</error>");
                $stats['errors'][] = "{$table}: 表不存在";
                continue;
            }

            if ($count === 0) {
                $output->writeln("  无数据，跳过");
                continue;
            }

            // 分批处理
            $pages = ceil($count / $batchSize);
            $tableRows = 0;
            $tableEntries = 0;

            for ($page = 1; $page <= $pages; $page++) {
                $rows = Db::table($table)
                    ->limit(($page - 1) * $batchSize, $batchSize)
                    ->select()
                    ->toArray();

                foreach ($rows as $row) {
                    $tableRows++;
                    $rowEntries = $this->migrateRow($table, $row, $fields, $remarksTpl, $isDryRun);
                    if ($rowEntries > 0) {
                        $tableEntries += $rowEntries;
                    } else {
                        $stats['skipped']++;
                    }
                }

                $output->writeln("  处理进度: " . min($page * $batchSize, $count) . "/{$count}");
            }

            $output->writeln("<info>  ✓ {$table}: {$tableRows} 行 → {$tableEntries} 条翻译词条</info>");
            $stats['rows'] += $tableRows;
            $stats['entries'] += $tableEntries;
        }

        // 汇总
        $output->writeln("\n<info>═══════════════════════════════════</info>");
        $output->writeln("<info>  迁移汇总</info>");
        $output->writeln("  表数:     {$stats['tables']}");
        $output->writeln("  行数:     {$stats['rows']}");
        $output->writeln("  词条数:   {$stats['entries']}");
        $output->writeln("  跳过:     {$stats['skipped']}");

        if (!empty($stats['errors'])) {
            $output->writeln("<error>  错误: " . count($stats['errors']) . "</error>");
        }

        if ($isDryRun) {
            $output->writeln("\n<warning>这是 DRY-RUN，未实际写入数据。</warning>");
            $output->writeln("确认无误后执行: <info>php think lang:migrate --execute</info>");
        } else {
            // 清除语言缓存
            \think\facade\Cache::delete('sys_lang_source_map');
            \think\facade\Cache::delete('lang_type_data');
            $output->writeln("\n<info>✅ 迁移完成！语言缓存已清除。</info>");
        }

        return 0;
    }

    /**
     * 迁移单行数据
     */
    protected function migrateRow(string $table, array $row, array $fields, string $remarksTpl, bool $isDryRun): int
    {
        $entries = 0;
        $id = $row['id'];

        foreach ($fields as $baseField => $suffixes) {
            // 获取中文源值（基础字段）
            $zhValue = $row[$baseField] ?? '';
            if (empty($zhValue)) continue;

            // 生成唯一 code
            $code = $this->generateCode($table, $baseField, $id);

            // 生成 remarks
            $remarks = str_replace('{id}', (string)$id, $remarksTpl);
            // 将字段名映射为中文标识
            if ($baseField === 'name') $remarks = '产品名称#' . $id;
            elseif ($baseField === 'title') $remarks = '标题#' . $id;
            elseif ($baseField === 'description') $remarks = '描述#' . $id;

            // 生成各语言翻译条目
            $langEntries = [];
            
            // type_id=1: 中文
            $langEntries[] = [
                'type_id'      => 1,
                'code'         => $code,
                'remarks'      => $remarks,
                'lang_explain' => $zhValue,
                'is_admin'     => 2, // 前端内容
            ];

            // 各语言版本
            foreach ($suffixes as $suffix) {
                $langValue = $row[$baseField . '_' . $suffix] ?? '';
                if (empty($langValue)) continue;

                $typeId = $this->langMap[$suffix] ?? null;
                if (!$typeId) continue;

                $langEntries[] = [
                    'type_id'      => $typeId,
                    'code'         => $code,
                    'remarks'      => $remarks,
                    'lang_explain' => $langValue,
                    'is_admin'     => 2,
                ];
            }

            if (count($langEntries) > 1) { // 至少有一个非中文版本
                if (!$isDryRun) {
                    // 先删除旧的同 code 条目
                    Db::table('sk_lang_code')->where('code', $code)->delete();
                    // 批量插入
                    Db::table('sk_lang_code')->insertAll($langEntries);
                }
                $entries += count($langEntries);
            }
        }

        return $entries;
    }

    /**
     * 生成唯一 code
     */
    protected function generateCode(string $table, string $field, int $id): string
    {
        return 'MIG_' . strtoupper($table) . '_' . strtoupper($field) . '_' . $id;
    }

    /**
     * 回滚迁移数据
     */
    protected function executeRollback(Input $input, Output $output): int
    {
        $output->writeln("<warning>回滚迁移数据...</warning>");
        
        $tableFilter = $input->hasOption('table') 
            ? explode(',', $input->getOption('table')) 
            : [];

        $this->initTableConfig();
        $codes = [];

        foreach ($this->tableConfig as $config) {
            [$table] = $config;
            if (!empty($tableFilter) && !in_array($table, $tableFilter)) continue;
            $codes[] = 'MIG_' . strtoupper($table) . '_%';
        }

        if (empty($codes)) {
            $output->writeln("无匹配表，回滚所有迁移数据");
            $deleted = Db::table('sk_lang_code')->where('code', 'like', 'MIG_%')->delete();
        } else {
            $deleted = Db::table('sk_lang_code')
                ->where(function ($query) use ($codes) {
                    foreach ($codes as $i => $code) {
                        $query->whereOr('code', 'like', $code);
                    }
                })->delete();
        }

        \think\facade\Cache::delete('sys_lang_source_map');
        \think\facade\Cache::delete('lang_type_data');

        $output->writeln("<info>✅ 回滚完成，删除了 {$deleted} 条迁移数据。</info>");
        return 0;
    }

    /**
     * 初始化表配置
     */
    protected function initTableConfig(): void
    {
        $this->tableConfig = [
            // [表名, [基础字段 => [后缀列表]], remarks模板]
            ['sk_product', [
                'name'        => ['en', 'ja', 'ko', 'zh_hant'],
                'description' => ['en', 'ja', 'ko'],
                'features'    => ['en', 'jp', 'kr'],
            ], '产品#{id}'],

            ['sk_category', [
                'name'        => ['en', 'ja', 'ko'],
                'description' => ['en', 'ja', 'ko'],
            ], '分类#{id}'],

            ['sk_brands', [
                'brand_name'  => ['en', 'ja', 'ko'],
                'description' => ['en', 'ja', 'ko'],
            ], '品牌#{id}'],

            ['sk_article', [
                'title'       => ['en', 'ja', 'ko'],
                'summary'     => ['en', 'ja', 'ko'],
                'content'     => ['en', 'ja', 'ko'],
            ], '文章#{id}'],

            ['sk_news', [
                'title'       => ['en', 'ja', 'ko'],
                'summary'     => ['en', 'ja', 'ko'],
                'content'     => ['en', 'ja', 'ko'],
            ], '新闻#{id}'],

            ['sk_faq', [
                'question'    => ['en', 'ja', 'ko'],
                'answer'      => ['en', 'ja', 'ko'],
            ], 'FAQ#{id}'],

            ['sk_banner', [
                'title'       => ['en', 'ja', 'ko'],
                'subtitle'    => ['en', 'ja', 'ko'],
                'description' => ['en', 'ja', 'ko'],
            ], '横幅#{id}'],

            ['sk_document', [
                'title'       => ['en', 'ja', 'ko'],
                'content'     => ['en', 'ja', 'ko'],
            ], '文档#{id}'],

            ['sk_training', [
                'title'       => ['en', 'ja', 'ko'],
                'description' => ['en', 'ja', 'ko'],
            ], '培训#{id}'],

            ['sk_about', [
                'title'       => ['en', 'ja', 'ko'],
                'content'     => ['en', 'ja', 'ko'],
            ], '关于我们#{id}'],

            ['sk_attribute', [
                'name'        => ['en', 'ja', 'ko'],
            ], '属性#{id}'],

            ['sk_certificate', [
                'cert_name'   => ['en', 'ja', 'ko'],
                'description' => ['en', 'ja', 'ko'],
            ], '证书#{id}'],
        ];
    }
}
