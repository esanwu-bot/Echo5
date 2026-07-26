<?php
/**
 * 电子元器件商城 - 临时翻译任务控制器
 * 文件说明：用于批量导入和翻译后台/前台 UI 中文词条到 sk_translation 表。
 * 备注：此为临时工具接口，生产环境建议删除或加 IP 白名单。
 */
declare(strict_types=1);

namespace app\controller\api;

use app\controller\BaseController;
use app\service\VolcTranslateService;
use think\facade\Db;
use think\facade\Log;

class TempTranslationController extends BaseController
{
    /**
     * 每次处理数量
     */
    private const BATCH_SIZE = 10;

    /**
     * 目标语言
     */
    private const TARGET_LANGS = ['en-US', 'ja-JP', 'ko-KR'];

    /**
     * 默认模块标识（无法解析时回退）
     */
    private const DEFAULT_MODULE = 'ui';

    /**
     * 默认类型（无法解析时回退）
     * 1=API响应文本, 2=页面UI文本
     */
    private const DEFAULT_TYPE = 2;

    /**
     * textQueue.txt 路径
     */
    private function getQueueFilePath(): string
    {
        return app()->getRuntimePath() . 'textQueue.txt';
    }

    /**
     * textQueueToConfirm.txt 路径（业务数据词条）
     */
    private function getDbQueueFilePath(): string
    {
        return app()->getRuntimePath() . 'textQueueToConfirm.txt';
    }

    /**
     * 清理待录入文本，避免破坏 module|type|text 格式
     */
    private function sanitizeQueueText(string $text): string
    {
        $text = str_replace(["\r", "\n", "\t"], ' ', $text);
        $text = str_replace('|', ' ', $text);
        return trim($text);
    }

    /**
     * 批量检查并录入词条
     * POST /api/v1/temp-translation/import-queue
     * GET  /api/v1/temp-translation/import-queue (支持浏览器直接访问)
     *
     * textQueue.txt 格式: module|type|text（每行一条）
     * 兼容旧格式:
     *   - module|text（无 type 时默认 type=2）
     *   - 纯文本（无 | 分隔符时默认 module=ui, type=2）
     *
     * @access public
     * @return array 录入结果
     */
    public function importQueue()
    {
        $filePath = $this->getQueueFilePath();
        if (!file_exists($filePath)) {
            return $this->error('textQueue.txt 不存在，请先运行 extract_chinese_texts.py', 400);
        }

        $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false || empty($lines)) {
            return $this->error('textQueue.txt 为空', 400);
        }

        $processed = 0;
        $imported  = 0;
        $skipped   = 0;
        $modules   = []; // 按模块统计
        $types     = []; // 按类型统计
        $now = date('Y-m-d H:i:s');

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }

            $processed++;

            // 取前 BATCH_SIZE 条处理，其余留到下次请求
            if ($processed > self::BATCH_SIZE) {
                break;
            }

            // 解析格式，支持以下形式：
            // 1. module|type|text（新格式）
            // 2. module|text（旧格式，默认 type=2）
            // 3. text（纯文本，默认 module=ui, type=2）
            $parts = explode('|', $line, 3);
            $partCount = count($parts);

            if ($partCount >= 3) {
                // 新格式: module|type|text
                $module = trim($parts[0]);
                $type   = intval($parts[1]);
                $text   = trim($parts[2]);
            } elseif ($partCount === 2) {
                // 旧格式: module|text
                $module = trim($parts[0]);
                $type   = self::DEFAULT_TYPE;
                $text   = trim($parts[1]);
            } else {
                // 纯文本格式
                $module = self::DEFAULT_MODULE;
                $type   = self::DEFAULT_TYPE;
                $text   = $line;
            }

            if ($text === '' || $module === '') {
                continue;
            }

            // 检查是否已存在（与唯一键 lang_key_module 一致：zh-CN + trans_key + module）
            $exists = Db::table('sk_translation')
                ->where('lang_code', 'zh-CN')
                ->where('trans_key', $text)
                ->where('module', $module)
                ->find();

            if ($exists) {
                $skipped++;
                continue;
            }

            // 写入 zh-CN 原文
            Db::table('sk_translation')->insert([
                'lang_code'     => 'zh-CN',
                'trans_key'     => $text,
                'trans_value'   => $text,
                'module'        => $module,
                'type'          => $type,
                'business_id'   => 0,
                'field'         => 'text',
                'is_auto'       => 1,
                'is_translated' => 0,
                'source_lang'   => 'zh-CN',
                'create_time'   => $now,
                'update_time'   => $now,
            ]);

            $imported++;
            // 模块统计
            if (!isset($modules[$module])) {
                $modules[$module] = 0;
            }
            $modules[$module]++;
            // 类型统计
            $typeName = ($type === 1) ? 'api' : 'ui';
            if (!isset($types[$typeName])) {
                $types[$typeName] = 0;
            }
            $types[$typeName]++;
        }

        // 将未处理的写回文件（移除已处理的 BATCH_SIZE 条）
        $remaining = array_slice($lines, $processed > self::BATCH_SIZE ? self::BATCH_SIZE : $processed);
        $newContent = implode(PHP_EOL, $remaining) . (empty($remaining) ? '' : PHP_EOL);
        if (file_put_contents($filePath, $newContent) === false) {
            Log::warning("importQueue 写回文件失败: {$filePath}");
        }

        return $this->success([
            'processed'   => min($processed, self::BATCH_SIZE),
            'imported'    => $imported,
            'skipped'     => $skipped,
            'remaining'   => count($remaining),
            'modules'     => $modules,
            'types'       => $types,
        ], '录入完成');
    }

    /**
     * 批量翻译未翻译词条
     * POST /api/v1/temp-translation/translate-pending
     *
     * 逻辑：
     * 1. 每次读取 BATCH_SIZE 条 is_translated=0 且 lang_code=zh-CN 的词条
     * 2. 按词条自身的 module 和 type 字段调用火山引擎翻译为 en/ja/ko
     * 3. 将结果写入 sk_translation（保留原始 module 和 type）
     * 4. 标记 is_translated=1
     *
     * @access public
     * @return array 翻译结果
     */
    public function translatePending()
    {
        /** @var VolcTranslateService $volcService */
        $volcService = app(VolcTranslateService::class);

        if (!$volcService->isConfigured()) {
            return $this->error('火山引擎翻译服务未配置', 500);
        }

        // 读取待翻译的 zh-CN 词条（按 module 分组排序，保证同模块词条一起处理）
        $pendingList = Db::table('sk_translation')
            ->where('lang_code', 'zh-CN')
            ->where('is_translated', 0)
            ->order('module', 'asc')
            ->limit(self::BATCH_SIZE)
            ->select()
            ->toArray();

        if (empty($pendingList)) {
            return $this->success([
                'translated_count' => 0,
                'remaining'        => 0,
                'details'          => [],
            ], '没有待翻译词条');
        }

        $details = [];
        $now = date('Y-m-d H:i:s');

        foreach ($pendingList as $item) {
            $sourceText = $item['trans_value'];
            $transKey   = $item['trans_key'];
            // 使用词条自身的 module 和 type
            $module     = $item['module'] ?? self::DEFAULT_MODULE;
            $type       = isset($item['type']) ? intval($item['type']) : self::DEFAULT_TYPE;
            $businessId = (int)($item['business_id'] ?? 0);
            $field      = $item['field'] ?? 'text';

            $itemResult = [
                'trans_key' => $transKey,
                'module'    => $module,
                'type'      => $type,
                'source'    => $sourceText,
                'status'    => 'success',
                'langs'     => [],
            ];

            try {
                foreach (self::TARGET_LANGS as $langCode) {
                    $volcLang = $this->mapLangCode($langCode);
                    $result = $volcService->translate($sourceText, $volcLang, 'zh');

                    if (isset($result['error'])) {
                        $itemResult['status'] = 'partial_error';
                        $itemResult['langs'][$langCode] = ['status' => 'error', 'msg' => $result['error']];
                        Log::warning("TempTranslation 翻译失败 [{$module}][{$langCode}]: " . $result['error'], ['text' => $sourceText]);
                        continue;
                    }

                    $translatedText = $result['TranslationList'][0]['Translation'] ?? '';
                    if (empty($translatedText)) {
                        $itemResult['status'] = 'partial_empty';
                        $itemResult['langs'][$langCode] = ['status' => 'empty'];
                        continue;
                    }

                    // 写入翻译结果（保留原始 module 和 type）
                    $exists = Db::table('sk_translation')
                        ->where('lang_code', $langCode)
                        ->where('trans_key', $transKey)
                        ->where('module', $module)
                        ->where('type', $type)
                        ->find();

                    if ($exists) {
                        Db::table('sk_translation')
                            ->where('id', $exists['id'])
                            ->update([
                                'trans_value' => $translatedText,
                                'is_auto'     => 1,
                                'update_time' => $now,
                            ]);
                    } else {
                        Db::table('sk_translation')->insert([
                            'lang_code'     => $langCode,
                            'trans_key'     => $transKey,
                            'trans_value'   => $translatedText,
                            'module'        => $module,
                            'type'          => $type,
                            'business_id'   => $businessId,
                            'field'         => $field,
                            'is_auto'       => 1,
                            'is_translated' => 1,
                            'source_lang'   => 'zh-CN',
                            'create_time'   => $now,
                            'update_time'   => $now,
                        ]);
                    }

                    $itemResult['langs'][$langCode] = ['status' => 'success', 'value' => $translatedText];

                    // 火山引擎 QPS 限制，适当延时
                    usleep(50000); // 50ms
                }

                // 标记中文原文为已翻译
                Db::table('sk_translation')
                    ->where('id', $item['id'])
                    ->update(['is_translated' => 1, 'update_time' => $now]);

            } catch (\Throwable $e) {
                $itemResult['status'] = 'error';
                $itemResult['error']  = $e->getMessage();
                Log::error('TempTranslation 翻译异常: ' . $e->getMessage(), ['module' => $module, 'text' => $sourceText]);
            }

            $details[] = $itemResult;
        }

        // 计算剩余未翻译数量
        $remaining = Db::table('sk_translation')
            ->where('lang_code', 'zh-CN')
            ->where('is_translated', 0)
            ->count();

        return $this->success([
            'translated_count' => count($pendingList),
            'remaining'        => (int)$remaining,
            'details'          => $details,
        ], '翻译批次完成');
    }

    /**
     * 批量导入业务数据词条
     * POST /api/v1/temp-translation/import-db-queue
     * GET  /api/v1/temp-translation/import-db-queue (支持浏览器直接访问)
     *
     * textQueueToConfirm.txt 格式: module|type|business_id|field|text
     * 与 importQueue 的区别：此方法处理带 business_id 和 field 的业务数据词条
     *
     * @access public
     * @return array 录入结果
     */
    public function importDbQueue()
    {
        $filePath = $this->getDbQueueFilePath();
        if (!file_exists($filePath)) {
            return $this->error('textQueueToConfirm.txt 不存在，请先运行 extract_db_chinese_texts.py', 400);
        }

        $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false || empty($lines)) {
            return $this->error('textQueueToConfirm.txt 为空', 400);
        }

        $processed = 0;
        $imported  = 0;
        $skipped   = 0;
        $modules   = [];
        $now = date('Y-m-d H:i:s');

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }

            $processed++;

            // 取前 BATCH_SIZE 条处理，其余留到下次请求
            if ($processed > self::BATCH_SIZE) {
                break;
            }

            // 解析格式: module|type|business_id|field|text
            $parts = explode('|', $line, 5);
            if (count($parts) < 5) {
                // 格式不正确，跳过
                continue;
            }

            $module     = trim($parts[0]);
            $type       = intval($parts[1]);
            $businessId = intval($parts[2]);
            $field      = trim($parts[3]);
            $text       = trim($parts[4]);

            if ($text === '' || $module === '' || $field === '') {
                continue;
            }

            // 检查是否已存在（唯一键: lang_code + trans_key + module）
            $exists = Db::table('sk_translation')
                ->where('lang_code', 'zh-CN')
                ->where('trans_key', $text)
                ->where('module', $module)
                ->find();

            if ($exists) {
                $skipped++;
                continue;
            }

            // 写入 zh-CN 原文（带 business_id 和 field）
            Db::table('sk_translation')->insert([
                'lang_code'     => 'zh-CN',
                'trans_key'     => $text,
                'trans_value'   => $text,
                'module'        => $module,
                'type'          => $type,
                'business_id'   => $businessId,
                'field'         => $field,
                'is_auto'       => 1,
                'is_translated' => 0,
                'source_lang'   => 'zh-CN',
                'create_time'   => $now,
                'update_time'   => $now,
            ]);

            $imported++;
            if (!isset($modules[$module])) {
                $modules[$module] = 0;
            }
            $modules[$module]++;
        }

        // 将未处理的写回文件
        $remaining = array_slice($lines, $processed > self::BATCH_SIZE ? self::BATCH_SIZE : $processed);
        $newContent = implode(PHP_EOL, $remaining) . (empty($remaining) ? '' : PHP_EOL);
        if (file_put_contents($filePath, $newContent) === false) {
            Log::warning("importDbQueue 写回文件失败: {$filePath}");
        }

        return $this->success([
            'processed'   => min($processed, self::BATCH_SIZE),
            'imported'    => $imported,
            'skipped'     => $skipped,
            'remaining'   => count($remaining),
            'modules'     => $modules,
        ], '业务数据词条录入完成');
    }

    /**
     * 获取剩余待翻译数量
     * GET /api/v1/temp-translation/pending-count
     *
     * @access public
     * @return array 待翻译数量
     */
    public function pendingCount()
    {
        $count = Db::table('sk_translation')
            ->where('lang_code', 'zh-CN')
            ->where('is_translated', 0)
            ->count();

        return $this->success(['remaining' => (int)$count], 'success');
    }

    /**
     * 语言代码映射
     *
     * @access private
     * @param string $langCode 语言代码
     * @return string 火山引擎语言代码
     */
    private function mapLangCode(string $langCode): string
    {
        $map = [
            'en-US' => 'en',
            'ja-JP' => 'ja',
            'ko-KR' => 'ko',
        ];
        return $map[$langCode] ?? 'en';
    }

    /**
     * 增量导出翻译到前台语言包
     * POST /api/v1/temp-translation/export-to-frontend
     * GET  /api/v1/temp-translation/export-to-frontend
     *
     * 逻辑：
     * 1. 从 sk_translation 查询所有目标语言的翻译
     * 2. 读取现有前台 lang/*.ts 文件，解析已有词条
     * 3. 合并（保留已有 key，追加新 key，更新已有 value）
     * 4. 按 key 排序后写回文件
     *
     * @access public
     * @return array 导出结果
     */
    public function exportToFrontend()
    {
        // 支持环境变量覆盖，默认基于项目根目录推断
        $langDir = getenv('FRONTEND_LANG_DIR') ?: '';
        if (!$langDir) {
            // 推断路径：app/controller/api → 上溯 4 级到项目根目录 (/var/www)
            $root = dirname(dirname(dirname(dirname(__DIR__))));
            $langDir = $root . '/tianqixin-frontend/lang';
        }
        $langMap = [
            'zh-CN' => 'zh-cn',
            'en-US' => 'en-us',
            'ja-JP' => 'ja-jp',
            'ko-KR' => 'ko-kr',
        ];

        if (!is_dir($langDir)) {
            return $this->error("前台 lang 目录不存在: {$langDir}", 400);
        }

        // 查询数据库中所有目标语言的翻译
        $targetLangs = array_keys($langMap);
        $placeholders = implode(',', array_fill(0, count($targetLangs), '?'));

        $sql = "
            SELECT lang_code, trans_key, trans_value
            FROM sk_translation
            WHERE lang_code IN ({$placeholders})
              AND trans_value IS NOT NULL
              AND trans_value != ''
            ORDER BY lang_code, trans_key
        ";

        try {
            $rows = Db::query($sql, $targetLangs);
        } catch (\Throwable $e) {
            Log::error('ExportToFrontend 查询失败: ' . $e->getMessage());
            return $this->error('数据库查询失败: ' . $e->getMessage(), 500);
        }

        // 按语言分组
        $dbData = [];
        foreach ($rows as $row) {
            $langCode = $row['lang_code'];
            if (!isset($dbData[$langCode])) {
                $dbData[$langCode] = [];
            }
            $dbData[$langCode][$row['trans_key']] = $row['trans_value'];
        }

        $result = [];

        foreach ($langMap as $langCode => $fileName) {
            $filePath = $langDir . '/' . $fileName . '.ts';
            $existing = [];

            // 读取并解析现有文件
            if (file_exists($filePath)) {
                $existing = $this->parseLangFile($filePath);
            }

            $newTranslations = $dbData[$langCode] ?? [];

            // 计算增量统计
            $added   = 0;
            $updated = 0;
            $merged  = $existing;

            foreach ($newTranslations as $key => $value) {
                if (!array_key_exists($key, $merged)) {
                    $added++;
                } elseif ($merged[$key] !== $value) {
                    $updated++;
                }
                $merged[$key] = $value;
            }

            // 按 key 排序
            ksort($merged, SORT_STRING);

            // 生成并写入文件
            $content = $this->generateLangFile($merged, $fileName);
            $writeOk = file_put_contents($filePath, $content, LOCK_EX);

            if ($writeOk === false) {
                Log::error("ExportToFrontend 写入失败: {$filePath}");
            }

            $result[$langCode] = [
                'file'     => $fileName . '.ts',
                'existing' => count($existing),
                'added'    => $added,
                'updated'  => $updated,
                'total'    => count($merged),
                'written'  => $writeOk !== false,
            ];
        }

        return $this->success([
            'details' => $result,
        ], '前台语言包增量导出完成');
    }

    /**
     * 导出指定语言的翻译数据（供前台自行生成语言包）
     *
     * GET /api/v1/temp-translation/export-data?lang=en-US
     *
     * @access public
     * @return \think\response\Json
     */
    public function exportData()
    {
        $langCode = $this->request->get('lang', 'en-US');

        // 支持的语言代码
        $supportedLangs = ['zh-CN', 'en-US', 'ja-JP', 'ko-KR'];
        if (!in_array($langCode, $supportedLangs, true)) {
            return $this->error('不支持的语言代码: ' . $langCode, 400);
        }

        $translations = Db::table('sk_translation')
            ->where('lang_code', $langCode)
            ->where('is_translated', 1)
            ->column('trans_value', 'trans_key');

        return $this->success([
            'lang'         => $langCode,
            'count'        => count($translations),
            'translations' => $translations,
        ], '翻译数据导出完成');
    }

    /**
     * 解析现有 TS 语言包文件
     *
     * @access private
     * @param string $filePath 文件路径
     * @return array key => value 的映射
     */
    private function parseLangFile(string $filePath): array
    {
        $content = file_get_contents($filePath);
        if ($content === false) {
            return [];
        }

        // 提取 export default { ... } as const; 中间的内容
        if (!preg_match('/export\s+default\s*\{([\s\S]*?)\}\s*as\s+const\s*;/', $content, $matches)) {
            return [];
        }

        $body = $matches[1];
        $result = [];

        // 匹配 'key': 'value', 格式，支持转义单引号 \'
        // 注意：key 和 value 内部可能有 \' 或 \\
        $pattern = "/\s*'((?:[^'\\\\]|\\\\.)*)'\s*:\s*'((?:[^'\\\\]|\\\\.)*)'\s*,?/";

        if (preg_match_all($pattern, $body, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $m) {
                $key   = $this->unescapeTsString($m[1]);
                $value = $this->unescapeTsString($m[2]);
                $result[$key] = $value;
            }
        }

        return $result;
    }

    /**
     * 反转义 TS 字符串中的转义序列
     *
     * @access private
     * @param string $str 转义后的字符串
     * @return string 原始字符串
     */
    private function unescapeTsString(string $str): string
    {
        // 先处理 \\\\ 转义的反斜杠，再处理 \\' 转义的单引号
        $str = str_replace('\\\\', "\x00", $str);   // 临时占位
        $str = str_replace('\\\'', "'", $str);       // 转义单引号
        $str = str_replace("\x00", '\\', $str);      // 恢复反斜杠
        return $str;
    }

    /**
     * 生成 TS 语言包文件内容
     *
     * @access private
     * @param array  $translations 翻译数据
     * @param string $langName     语言名称
     * @return string 文件内容
     */
    private function generateLangFile(array $translations, string $langName): string
    {
        $lines = [
            '// ============================================================',
            '// 自动生成的语言包 - ' . $langName,
            '// 由 API /api/v1/temp-translation/export-to-frontend 增量导出',
            '// 包含从 sk_translation 表导出的所有翻译',
            '// 前端通过 t("中文key") 直接使用',
            '// ============================================================',
            '',
            'export default {',
        ];

        foreach ($translations as $key => $value) {
            $safeKey   = $this->escapeTsString($key);
            $safeValue = $this->escapeTsString($value);
            $lines[] = "  '{$safeKey}': '{$safeValue}',";
        }

        $lines[] = '} as const;';
        $lines[] = '';

        return implode("\n", $lines);
    }

    /**
     * 转义 TS 字符串中的特殊字符
     *
     * @access private
     * @param string $str 原始字符串
     * @return string 转义后的字符串
     */
    private function escapeTsString(string $str): string
    {
        $str = str_replace('\\', '\\\\', $str);
        $str = str_replace("'", "\\'", $str);
        // 将真实换行符转义为 \n，避免生成跨多行的 TS 字符串导致编译失败
        $str = str_replace("\r\n", '\\n', $str);
        $str = str_replace("\n", '\\n', $str);
        $str = str_replace("\r", '\\n', $str);
        return $str;
    }

    /**
     * 接收前端 i18next missingKey 上报，追加到 textQueue.txt
     * POST /api/v1/temp-translation/report-missing-key
     *
     * 请求体示例：
     * {
     *   "lang": "en",
     *   "namespace": "translation",
     *   "key": "热门职位",
     *   "fallbackValue": "热门职位",
     *   "module": "ui",
     *   "type": 2
     * }
     *
     * @access public
     * @return array 处理结果
     */
    public function reportMissingKey()
    {
        // 兼容 application/json 与 form-urlencoded
        $raw  = $this->request->getContent();
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            $data = $this->request->post();
        }
        if (!is_array($data)) {
            $data = [];
        }

        $lang      = trim($data['lang'] ?? '');
        $namespace = trim($data['namespace'] ?? '');
        $key       = trim($data['key'] ?? '');
        $fallback  = trim($data['fallbackValue'] ?? '');

        // 优先使用 key，key 为空时使用 fallbackValue
        $text = $this->sanitizeQueueText($key !== '' ? $key : $fallback);
        if ($text === '') {
            return $this->error('缺少 key 或 fallbackValue 参数', 400);
        }

        // module / type 允许客户端显式指定，否则使用默认值
        $module = trim($data['module'] ?? '');
        $module = $module !== '' ? $module : self::DEFAULT_MODULE;
        $type   = isset($data['type']) ? intval($data['type']) : self::DEFAULT_TYPE;

        $filePath = $this->getQueueFilePath();

        // 确保文件存在
        if (!file_exists($filePath)) {
            @touch($filePath);
        }

        // 去重：若完全相同行已存在则跳过
        $existingLines = [];
        if (file_exists($filePath) && filesize($filePath) > 0) {
            $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if ($lines !== false) {
                $existingLines = $lines;
            }
        }

        $line = "{$module}|{$type}|{$text}";
        foreach ($existingLines as $existing) {
            if (trim($existing) === $line) {
                return $this->success([
                    'module'    => $module,
                    'type'      => $type,
                    'text'      => $text,
                    'lang'      => $lang,
                    'namespace' => $namespace,
                    'duplicate' => true,
                ], '词条已存在于 textQueue，未重复追加');
            }
        }

        $ok = file_put_contents($filePath, $line . PHP_EOL, FILE_APPEND | LOCK_EX);
        if ($ok === false) {
            return $this->error('写入 textQueue.txt 失败', 500);
        }

        return $this->success([
            'module'    => $module,
            'type'      => $type,
            'text'      => $text,
            'lang'      => $lang,
            'namespace' => $namespace,
            'appended'  => true,
        ], 'missingKey 已追加到 textQueue');
    }
}
