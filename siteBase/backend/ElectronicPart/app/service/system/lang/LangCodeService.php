<?php
/**
 * 天启芯科技 - 语言码表服务（核心翻译管理）
 * 对标 CRMEB LangCodeServices
 */
namespace app\service\system\lang;

use app\dao\system\lang\LangCodeDao;
use app\service\VolcTranslateService;
use think\facade\Cache;
use think\facade\Log;

class LangCodeService
{
    protected $dao;

    public function __construct(LangCodeDao $dao)
    {
        $this->dao = $dao;
    }

    public function getDao(): LangCodeDao
    {
        return $this->dao;
    }

    /**
     * 翻译词条列表（分页）
     */
    public function getList(array $where = []): array
    {
        [$page, $limit] = $this->dao->getPageValue();
        $list = $this->dao->selectList($where, '*', $page, $limit, 'id desc', [], true)->toArray();

        /** @var LangTypeService $typeService */
        $typeService = app()->make(LangTypeService::class);
        $typeList = $typeService->getAllActive();
        $typeMap = array_column($typeList, 'language_name', 'id');

        $langType = [
            'isAdmin' => [
                ['title' => '管理后台', 'value' => 1],
                ['title' => '用户前端', 'value' => 2]
            ],
            'langType' => []
        ];
        foreach ($typeList as $v) {
            $langType['langType'][] = ['title' => $v['language_name'] . '(' . $v['file_name'] . ')', 'value' => $v['id']];
        }

        foreach ($list as &$item) {
            $item['language_name'] = ($typeMap[$item['type_id']] ?? '') . (isset($typeList[0]) ? '(' . ($typeList[0]['file_name'] ?? '') . ')' : '');
        }

        $count = $this->dao->count($where);
        return compact('list', 'count', 'langType');
    }

    /**
     * 翻译词条详情（按code查所有语言翻译）
     */
    public function getInfo(string $code): array
    {
        if (!$code) throw new \Exception('数据不存在');

        /** @var LangTypeService $typeService */
        $typeService = app()->make(LangTypeService::class);
        $typeList = $typeService->getAllActive();
        $typeMap = array_column($typeList, 'language_name', 'id');
        $typeIds = array_column($typeList, 'id');

        $list = $this->dao->getModel()
            ->where('code', $code)
            ->whereIn('type_id', $typeIds)
            ->select()
            ->toArray();

        foreach ($list as &$item) {
            $item['language_name'] = $typeMap[$item['type_id']] ?? '';
        }

        $remarks = $list[0]['remarks'] ?? '';
        return compact('list', 'code', 'remarks');
    }

    /**
     * 保存/修改翻译词条
     */
    public function save(array $data): bool
    {
        $isEdit = $data['edit'] ?? 0;
        
        if ($isEdit == 0) {
            // 新增：自动生成 code
            if ($data['is_admin'] == 1) {
                $maxCode = $this->dao->getMax(['is_admin' => 1], 'code');
                $code = $maxCode ? (string)((int)$maxCode + 1) : '100001';
            } else {
                $code = $data['remarks'];
            }
        } else {
            $code = $data['code'];
        }

        $saveData = [];
        foreach ($data['list'] as $key => $item) {
            $saveData[$key] = [
                'code'         => $code,
                'remarks'      => $data['remarks'],
                'lang_explain' => $item['lang_explain'],
                'type_id'      => $item['type_id'],
                'is_admin'     => $data['is_admin'],
            ];
            if (!empty($item['id'])) {
                $saveData[$key]['id'] = $item['id'];
            }
        }

        $this->dao->saveAll($saveData);
        $this->clearLangCache();
        return true;
    }

    /**
     * 删除翻译词条（按code删除所有语言版本）
     */
    public function deleteByCode(string $code): bool
    {
        $this->dao->delete(['code' => $code]);
        $this->clearLangCache();
        return true;
    }

    /**
     * 按ID删除单条
     */
    public function deleteById(int $id): bool
    {
        $code = $this->dao->value(['id' => $id], 'code');
        return $this->deleteByCode($code);
    }

    /**
     * 机器翻译（火山引擎）
     */
    public function translateText(string $text): array
    {
        $translateService = new VolcTranslateService();
        
        if (!$translateService->isConfigured()) {
            throw new \Exception('请先配置火山翻译key');
        }

        /** @var LangTypeService $typeService */
        $typeService = app()->make(LangTypeService::class);
        $typeList = $typeService->getAllActive();

        $result = [];
        foreach ($typeList as $item) {
            $file = $item['file_name'];
            // 跳过中文（不需要翻译）
            if ($file === 'zh-CN') {
                $result[$item['file_name']] = $text;
                continue;
            }
            
            // 火山引擎语言代码映射
            $targetLang = $this->mapFileToVolcLang($file);
            if (!$targetLang) continue;

            try {
                $resp = $translateService->translate($text, $targetLang, 'zh');
                if (isset($resp['TranslationList'][0]['Translation'])) {
                    $result[$item['file_name']] = $resp['TranslationList'][0]['Translation'];
                } else {
                    $result[$item['file_name']] = $text; // fallback
                }
            } catch (\Exception $e) {
                Log::error('翻译失败: ' . $e->getMessage());
                $result[$item['file_name']] = $text;
            }
        }

        return $result;
    }

    /**
     * 批量翻译（队列方式 — 直接同步执行简化版）
     */
    public function batchTranslate(int $typeId, string $targetFile): bool
    {
        $list = $this->dao->getModel()
            ->where('type_id', 1) // 以中文为源
            ->field('id, remarks')
            ->select()
            ->toArray();

        if (empty($list)) return false;

        $targetLang = $this->mapFileToVolcLang($targetFile);
        if (!$targetLang) return false;

        $translateService = new VolcTranslateService();
        if (!$translateService->isConfigured()) {
            throw new \Exception('请先配置火山翻译key');
        }

        // 分批处理，每批最多 8 条（火山翻译 API 限制）
        $chunks = array_chunk($list, 8);
        
        foreach ($chunks as $chunk) {
            $texts = array_column($chunk, 'remarks');
            try {
                $resp = $translateService->translateBatch($texts, $targetLang, 'zh');
                if (isset($resp['TranslationList'])) {
                    foreach ($resp['TranslationList'] as $idx => $trans) {
                        $saveData = [
                            'type_id'      => $typeId,
                            'code'         => $this->getCodeByRemarks($chunk[$idx]['remarks'], 1),
                            'remarks'      => $chunk[$idx]['remarks'],
                            'lang_explain' => $trans['Translation'] ?? $chunk[$idx]['remarks'],
                            'is_admin'     => 1,
                        ];
                        // 检查是否存在，存在则更新
                        $exist = $this->dao->getModel()
                            ->where('type_id', $typeId)
                            ->where('code', $saveData['code'])
                            ->find();
                        if ($exist) {
                            $exist->save(['lang_explain' => $saveData['lang_explain']]);
                        } else {
                            $this->dao->save($saveData);
                        }
                    }
                }
            } catch (\Exception $e) {
                Log::error('批量翻译失败: ' . $e->getMessage());
            }
        }

        $this->clearLangCache();
        return true;
    }

    /**
     * 根据 remarks 获取 code（从中文词条查找）
     */
    public function getCodeByRemarks(string $remarks, int $typeId = 1): string
    {
        return $this->dao->value(['remarks' => $remarks, 'type_id' => $typeId], 'code') ?: '';
    }

    /**
     * 清除语言缓存
     */
    public function clearLangCache(): void
    {
        /** @var LangTypeService $typeService */
        $typeService = app()->make(LangTypeService::class);
        $typeList = $typeService->getAllActive();
        
        foreach ($typeList as $v) {
            $langStr = 'lang_' . str_replace('-', '_', $v['file_name']);
            Cache::delete($langStr);
        }
        
        Cache::delete('sys_lang_source_map');
        Cache::delete('lang_type_data');
    }

    /**
     * 获取语言版本号（用于前端缓存管控）
     */
    public function getLangVersion(): array
    {
        return Cache::remember('lang_version', function () {
            return ['version' => uniqid()];
        }, 3600);
    }

    /**
     * file_name → 火山引擎语言代码映射
     */
    protected function mapFileToVolcLang(string $file): string
    {
        $map = [
            'en-US' => 'en',
            'ja-JP' => 'ja',
            'ko-KR' => 'ko',
            'zh-CN' => 'zh',
            'zh-Hant' => 'zh-Hant',
        ];
        return $map[$file] ?? substr($file, 0, 2);
    }
}
