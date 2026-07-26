<?php
/**
 * 业务词条批量翻译命令
 *
 * 用法:
 *   php think business:translate              # 预览待翻译词条
 *   php think business:translate --execute    # 执行翻译
 *   php think business:translate --module=product --limit=10  # 指定模块和数量
 */

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\input\Option;
use think\console\Output;
use think\facade\Db;
use app\service\I18nService;
use app\service\VolcTranslateService;

class BusinessTranslateCommand extends Command
{
    protected function configure()
    {
        $this->setName('business:translate')
            ->setDescription('业务词条批量翻译（商品/分类/品牌/型号）')
            ->addOption('execute', 'x', Option::VALUE_NONE, '执行翻译并入库（默认预览）')
            ->addOption('module', 'm', Option::VALUE_OPTIONAL, '指定模块(product/category/brand/model)', '')
            ->addOption('limit', 'l', Option::VALUE_OPTIONAL, '每次处理数量', 50)
            ->addOption('force', 'f', Option::VALUE_NONE, '强制重新翻译（覆盖已有机器翻译）');
    }

    protected function execute(Input $input, Output $output)
    {
        $execute = $input->getOption('execute');
        $module = $input->getOption('module');
        $limit = (int)$input->getOption('limit');
        $force = $input->getOption('force');

        $output->writeln('╔══════════════════════════════════════════╗');
        $output->writeln('║   业务词条批量翻译                       ║');
        $output->writeln('╚══════════════════════════════════════════╝');
        $output->writeln('');

        // 查询待翻译词条（zh-CN 基准记录）
        $query = Db::table('sk_translation')
            ->where('lang_code', 'zh-CN')
            ->where('business_id', '>', 0);

        if ($module) {
            $query->where('module', $module);
        }

        $allZh = $query->limit($limit * 3)->select();

        // 过滤掉目标语言已全部翻译的记录
        $targetLangs = ['en-US', 'ja-JP', 'ko-KR'];
        $pending = [];
        foreach ($allZh as $item) {
            $hasMissing = false;
            foreach ($targetLangs as $lang) {
                $exists = Db::table('sk_translation')
                    ->where('trans_key', $item['trans_key'])
                    ->where('module', $item['module'])
                    ->where('lang_code', $lang)
                    ->where('trans_value', '<>', '')
                    ->find();
                if (!$exists) {
                    $hasMissing = true;
                    break;
                }
            }
            if ($hasMissing) {
                $pending[] = $item;
            }
            if (count($pending) >= $limit) {
                break;
            }
        }

        if (empty($pending)) {
            $output->writeln('<comment>没有待翻译的业务词条（所有 zh-CN 基准记录的目标语言翻译已齐全）</comment>');
            return;
        }

        $output->writeln("待翻译词条数: <info>" . count($pending) . "</info>");
        if ($module) {
            $output->writeln("模块筛选: <info>{$module}</info>");
        }
        $output->writeln('');

        if (!$execute) {
            $output->writeln('预览模式（加 --execute 执行翻译）:');
            foreach ($pending as $item) {
                $output->writeln("  [{$item['module']}:{$item['field']}:{$item['business_id']}] " . mb_substr($item['trans_value'], 0, 50));
            }
            return;
        }

        $volcService = new VolcTranslateService();
        if (!$volcService->isConfigured()) {
            $output->writeln('<error>火山引擎 API 密钥未配置</error>');
            return;
        }

        $i18nService = new I18nService();
        $targetLangs = I18nService::TARGET_LANGS;
        $volcLangMap = I18nService::VOLC_LANG_MAP;
        $translated = 0;
        $failed = 0;

        foreach ($pending as $item) {
            $defaultValue = $item['trans_value'];
            if (empty($defaultValue)) {
                continue;
            }

            foreach ($targetLangs as $langCode) {
                $volcLang = $volcLangMap[$langCode] ?? 'en';

                // 检查是否已存在且非强制
                if (!$force) {
                    $existing = Db::table('sk_translation')
                        ->where('module', $item['module'])
                        ->where('business_id', $item['business_id'])
                        ->where('field', $item['field'])
                        ->where('lang_code', $langCode)
                        ->find();

                    if ($existing && (int)$existing['is_auto'] === 0) {
                        continue; // 跳过人工翻译
                    }
                    if ($existing && (int)$existing['is_auto'] === 1) {
                        continue; // 跳过已有机器翻译
                    }
                }

                $result = $volcService->translate($defaultValue, $volcLang, 'zh');

                if (isset($result['error'])) {
                    $output->writeln("<error>翻译失败 [{$langCode}]: " . $result['error'] . "</error>");
                    $failed++;
                    continue;
                }

                $text = $result['TranslationList'][0]['Translation'] ?? '';
                if (empty($text)) {
                    $failed++;
                    continue;
                }

                $i18nService->saveTranslation(
                    $item['module'],
                    (int)$item['business_id'],
                    $item['field'],
                    $langCode,
                    $text,
                    true
                );

                $translated++;
                usleep(100000); // 100ms QPS 保护
            }
        }

        $output->writeln('');
        $output->writeln("翻译完成: 成功 <info>{$translated}</info> 条, 失败 <comment>{$failed}</comment> 条");
    }
}
