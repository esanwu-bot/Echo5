<?php
namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use app\service\VolcTranslateService;

/**
 * 火山引擎翻译测试命令
 * 
 * 使用方法:
 * php think translate:test              - 运行完整测试
 * php think translate:test "你好世界"   - 翻译指定文本
 * php think translate:test --lang=ja    - 指定目标语言
 */
class TranslateTestCommand extends Command
{
    protected function configure()
    {
        $this->setName('translate:test')
             ->setDescription('测试火山引擎翻译 API 功能')
             ->addArgument('text', \think\console\input\Argument::OPTIONAL, '要翻译的文本')
             ->addOption('lang', 'l', \think\console\input\Option::VALUE_REQUIRED, '目标语言代码', 'en')
             ->addOption('source', 's', \think\console\input\Option::VALUE_REQUIRED, '源语言代码', 'auto')
             ->addOption('batch', 'b', \think\console\input\Option::VALUE_NONE, '批量翻译测试');
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('');
        $output->writeln('╔══════════════════════════════════════════════════════════╗');
        $output->writeln('║       火山引擎翻译 API 测试                              ║');
        $output->writeln('╚══════════════════════════════════════════════════════════╝');
        $output->writeln('');
        
        // 初始化翻译服务
        $translateService = new VolcTranslateService();
        
        // 显示配置信息
        $output->writeln('【配置信息】');
        $output->writeln('Access Key ID: ' . $translateService->getMaskedAccessKey());
        
        if (!$translateService->isConfigured()) {
            $output->writeln('');
            $output->writeln('❌ 错误: 火山引擎 API 密钥未配置');
            $output->writeln('');
            $output->writeln('请按以下步骤配置:');
            $output->writeln('1. 访问 https://console.volcengine.com/iam/keymanage/');
            $output->writeln('2. 创建或复制 Access Key ID 和 Secret Access Key');
            $output->writeln('3. 在 .env 文件中添加:');
            $output->writeln('   VOLC_ACCESS_KEY_ID=你的AccessKeyID');
            $output->writeln('   VOLC_SECRET_ACCESS_KEY=你的SecretKey');
            $output->writeln('');
            return 1;
        }
        
        $output->writeln('状态: ✓ 已配置');
        $output->writeln('');
        
        // 获取参数
        $text = $input->getArgument('text') ?: '你好，世界！这是一个测试。';
        $targetLang = $input->getOption('lang') ?: 'en';
        $sourceLang = $input->getOption('source') ?: 'auto';
        $isBatch = $input->getOption('batch');
        
        // 语言代码映射
        $langNames = [
            'zh' => '中文（简体）',
            'zh-Hant' => '中文（繁体）',
            'en' => '英语',
            'ja' => '日语',
            'ko' => '韩语',
            'fr' => '法语',
            'de' => '德语',
            'es' => '西班牙语',
            'ru' => '俄语',
            'it' => '意大利语',
            'pt' => '葡萄牙语',
            'ar' => '阿拉伯语',
            'th' => '泰语',
            'vi' => '越南语',
            'id' => '印尼语',
            'ms' => '马来语',
            'tr' => '土耳其语',
            'pl' => '波兰语',
            'nl' => '荷兰语',
            'sv' => '瑞典语',
        ];
        
        // 批量翻译测试
        if ($isBatch) {
            $output->writeln('【批量翻译测试】');
            $texts = [
                '你好，世界！',
                '今天天气真好。',
                '欢迎使用火山引擎翻译。',
                '这是一个批量翻译测试。'
            ];
            
            $output->writeln('源文本:');
            foreach ($texts as $i => $t) {
                $output->writeln('  ' . ($i + 1) . '. ' . $t);
            }
            $output->writeln('');
            $output->writeln('目标语言: ' . ($langNames[$targetLang] ?? $targetLang));
            $output->writeln('');
            
            $result = $translateService->translateBatch($texts, $targetLang, $sourceLang);
            
            if (isset($result['error'])) {
                $output->writeln('❌ 翻译失败: ' . $result['error']);
                if (isset($result['code'])) {
                    $output->writeln('错误代码: ' . $result['code']);
                }
                return 1;
            }
            
            $output->writeln('翻译结果:');
            if (isset($result['TranslationList'])) {
                foreach ($result['TranslationList'] as $i => $item) {
                    $translated = $item['Translation'] ?? $item['translation'] ?? 'N/A';
                    $detectedLang = $item['DetectedSourceLanguage'] ?? $item['detected_source_language'] ?? 'auto';
                    $output->writeln('  ' . ($i + 1) . '. ' . $translated);
                    $output->writeln('     检测语言: ' . $detectedLang);
                }
            } else {
                $output->writeln('  ' . json_encode($result, JSON_UNESCAPED_UNICODE));
            }
            $output->writeln('');
            return 0;
        }
        
        // 单条翻译测试
        $output->writeln('【单条翻译测试】');
        $output->writeln('源文本: ' . $text);
        $output->writeln('源语言: ' . ($sourceLang === 'auto' ? '自动检测' : ($langNames[$sourceLang] ?? $sourceLang)));
        $output->writeln('目标语言: ' . ($langNames[$targetLang] ?? $targetLang));
        $output->writeln('');
        
        $result = $translateService->translate($text, $targetLang, $sourceLang);
        
        if (isset($result['error'])) {
            $output->writeln('❌ 翻译失败: ' . $result['error']);
            if (isset($result['code'])) {
                $output->writeln('错误代码: ' . $result['code']);
            }
            return 1;
        }
        
        $output->writeln('✓ 翻译成功!');
        $output->writeln('');
        
        if (isset($result['TranslationList'][0])) {
            $item = $result['TranslationList'][0];
            $translated = $item['Translation'] ?? $item['translation'] ?? 'N/A';
            $detectedLang = $item['DetectedSourceLanguage'] ?? $item['detected_source_language'] ?? 'auto';
            
            $output->writeln('翻译结果: ' . $translated);
            $output->writeln('检测到的源语言: ' . $detectedLang);
        } else {
            $output->writeln('原始响应:');
            $output->writeln(json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }
        
        $output->writeln('');
        return 0;
    }
}
