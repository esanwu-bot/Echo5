<?php

/**
 * 电子元器件商城 - 业务词条多语言服务
 *
 * 统一管理商品/分类/品牌/型号等业务模块的多语言词条：
 * - 词条的创建、更新、删除与缓存
 * - 批量获取翻译并映射到数据数组
 * - 触发异步翻译队列（依赖 think-queue）
 */

namespace app\service;

use think\facade\Cache;
use think\facade\Db;
use think\facade\Log;

class I18nService
{
    /**
     * 缓存前缀
     */
    const CACHE_PREFIX = 'i18n:';

    /**
     * 缓存有效期（7 天）
     */
    const CACHE_TTL = 604800;

    /**
     * 目标语言列表（排除默认语言 zh-CN）
     */
    const TARGET_LANGS = ['en-US', 'ja-JP', 'ko-KR'];

    /**
     * 火山引擎语言代码映射
     */
    const VOLC_LANG_MAP = [
        'en-US' => 'en',
        'ja-JP' => 'ja',
        'ko-KR' => 'ko',
        'zh-CN' => 'zh',
        'zh-Hant' => 'zh-Hant',
    ];

    /**
     * 创建或更新词条，并触发异步翻译
     *
     * @param string $module      模块标识：product/category/brand/model
     * @param int    $businessId  业务ID
     * @param string $field       字段名：name/description/features
     * @param string $defaultValue 默认语言值（中文简体）
     * @return void
     */
    public function saveKey(string $module, int $businessId, string $field, string $defaultValue): void
    {
        $transKey = $this->buildTransKey($module, $businessId, $field);
        $now = date('Y-m-d H:i:s');

        // 1. 更新或插入中文原文（作为基准记录，便于统一查询）
        $exists = Db::table('sk_translation')
            ->where('lang_code', 'zh-CN')
            ->where('trans_key', $transKey)
            ->where('module', $module)
            ->find();

        if ($exists) {
            Db::table('sk_translation')
                ->where('id', $exists['id'])
                ->update([
                    'trans_value' => $defaultValue,
                    'business_id' => $businessId,
                    'field' => $field,
                    'is_auto' => 0,
                    'is_translated' => 0,
                    'source_lang' => 'zh-CN',
                    'update_time' => $now,
                ]);
        } else {
            try {
                Db::table('sk_translation')->insert([
                    'lang_code' => 'zh-CN',
                    'trans_key' => $transKey,
                    'trans_value' => $defaultValue,
                    'module' => $module,
                    'business_id' => $businessId,
                    'field' => $field,
                    'is_auto' => 0,
                    'is_translated' => 0,
                    'source_lang' => 'zh-CN',
                    'create_time' => $now,
                    'update_time' => $now,
                ]);
            } catch (\think\db\exception\PDOException $e) {
                if (strpos($e->getMessage(), '1062') !== false || strpos($e->getMessage(), 'Duplicate') !== false) {
                    Db::table('sk_translation')
                        ->where('lang_code', 'zh-CN')
                        ->where('trans_key', $transKey)
                        ->where('module', $module)
                        ->update([
                            'trans_value' => $defaultValue,
                            'business_id' => $businessId,
                            'field' => $field,
                            'is_translated' => 0,
                            'update_time' => $now,
                        ]);
                } else {
                    throw $e;
                }
            }
        }

        // 2. 清除缓存（所有语言）
        $this->clearCache($module, $businessId, $field);

        // 3. 触发异步翻译队列（如果 think-queue 可用）
        $this->pushTranslateQueue($module, $businessId, $field, $defaultValue);
    }

    /**
     * 批量获取翻译
     *
     * @param string $module       模块标识
     * @param array  $businessIds  业务ID数组
     * @param string $langCode     目标语言代码
     * @param array  $fields       字段列表，如 ['name', 'description']
     * @return array  [businessId => [field => value]]
     */
    public function getTranslations(string $module, array $businessIds, string $langCode, array $fields = []): array
    {
        // //echo "test";
        if (empty($businessIds)) {
            return [];
        }

        $result = [];
        $missingIds = [];
        $missingFields = [];

        // 1. 尝试从缓存读取
        foreach ($businessIds as $id) {
            foreach ($fields as $field) {
                $cacheKey = $this->buildCacheKey($module, $id, $field, $langCode);
                $cached = Cache::get($cacheKey);
                if ($cached !== null) {
                    $result[$id][$field] = $cached;
                } else {
                    $missingIds[$id][] = $field;
                }
            }
        }

        if (empty($missingIds)) {
            return $result;
        }

        // // 2. 从数据库批量查询缺失的翻译
        // $transKeys = [];
        // foreach ($missingIds as $id => $fs) {
        //     foreach ($fs as $field) {
        //         $transKeys[] = $this->buildTransKey($module, $id, $field);
        //     }
        // }
        // //echo "go1";
        // $row = Db::table('sk_translation')
        //     ->where('module', $module)
        //     ->whereLike('business_id', $transKeys)          // 使用 whereIn 匹配多个 key
        //     ->where('lang_code', $langCode)
        //     ->order('id', 'asc')
        //     ->field('id, trans_value, trans_key')       // 指定需要的字段
        //     ->find();                                   // 获取第一条记录，返回数组或 null

        // // 获取最后执行的 SQL
        // $lastSql = Db::getLastSql();
        // file_put_contents("E:\\workspace\\phpworkspace\\test.txt", $lastSql, FILE_APPEND);

        // // $row 结构示例：['id' => 1, 'trans_value' => '...', 'trans_key' => '...']//echo Db::table('sk_translation')->getLastSql()."<br>";
        // // 3. 回填缓存并组装结果

        // foreach ($missingIds as $id => $fs) {
        //     foreach ($fs as $field) {
        //         $key = $this->buildTransKey($module, $id, $field);
        //         $value = $rows[$key] ?? '';

        //         $cacheKey = $this->buildCacheKey($module, $id, $field, $langCode);
        //         Cache::set($cacheKey, $value, self::CACHE_TTL);

        //         $result[$id][$field] = $value;
        //     }
        // }
        // return $result;
        // 2. 从数据库批量查询缺失的翻译
        $transKeys = [];
        foreach ($missingIds as $id => $fs) {
            foreach ($fs as $field) {
                $transKeys[] = $this->buildTransKey($module, $id, $field);
            }
        }

        $rows = Db::table('sk_translation')
            ->where('module', $module)
            ->whereIn('business_id', array_keys($missingIds))  // ✅ 按整数 ID 查询
            ->where('lang_code', $langCode)
            ->order('id', 'asc')
            ->field('business_id, trans_value, field')  // ✅ 取需要的字段
            ->select()
            ->toArray();  // ✅ 获取全部记录
        // 获取最后执行的 SQL
        //$lastSql = Db::getLastSql();
        //file_put_contents('E:\workspace\phpworkspace\test.txt', $lastSql."\\n", FILE_APPEND);

        // 建立索引：business_id => [field => value]
        $indexed = [];
        foreach ($rows as $row) {
            $indexed[$row['business_id']][$row['field']] = $row['trans_value'];
        }

        // 3. 回填缓存并组装结果
        foreach ($missingIds as $id => $fs) {
            foreach ($fs as $field) {
                $value = $indexed[$id][$field] ?? '';

                $cacheKey = $this->buildCacheKey($module, $id, $field, $langCode);
                Cache::set($cacheKey, $value, self::CACHE_TTL);

                $result[$id][$field] = $value;
            }
        }
        return $result;
    }

    /**
     * 将翻译映射到数据数组
     *
     * @param array  $data      原始数据数组（每项需含 id）
     * @param string $module    模块标识
     * @param string $langCode  目标语言代码
     * @param array  $fields    需要本地化的字段列表
     * @return array
     */
    public function mapData(array $data, string $module, string $langCode, array $fields = []): array
    {
        if (empty($data) || empty($fields)) {
            return $data;
        }
        $ids = array_column($data, 'id');
        $ids = array_filter($ids, 'is_numeric');
        $translations = $this->getTranslations($module, $ids, $langCode, $fields);

        foreach ($data as &$item) {
            $id = $item['id'] ?? null;
            if (!$id || !isset($translations[$id])) {
                continue;
            }
            foreach ($fields as $field) {
                if (!empty($translations[$id][$field])) {
                    $item[$field] = $translations[$id][$field];
                }
            }
        }

        return $data;
    }

    /**
     * 单条数据映射（用于详情接口）
     *
     * @param array  $item      单条数据
     * @param string $module    模块标识
     * @param string $langCode  目标语言代码
     * @param array  $fields    需要本地化的字段列表
     * @return array
     */
    public function mapItem(array $item, string $module, string $langCode, array $fields = []): array
    {
        if (empty($item) || empty($fields)) {
            return $item;
        }

        $id = $item['id'] ?? null;
        if (!$id) {
            return $item;
        }

        $translations = $this->getTranslations($module, [(int) $id], $langCode, $fields);
        if (isset($translations[$id])) {
            foreach ($fields as $field) {
                if (!empty($translations[$id][$field])) {
                    $item[$field] = $translations[$id][$field];
                }
            }
        }

        return $item;
    }

    /**
     * 按中文原文批量翻译（适用于 UI 标签等无固定 business_id/field 的场景）
     *
     * 查找逻辑：先通过 zh-CN 行的 trans_value 匹配原文，取得 trans_key + field，
     * 再用 (trans_key, field) 组合在目标语言中查找译文。
     *
     * @param string $module      模块标识（如 'ui'）
     * @param int    $businessId  业务ID（UI 标签通常为 0）
     * @param array  $sourceTexts 中文原文数组
     * @param string $langCode    目标语言代码
     * @return array [原文 => 译文]（无翻译时返回原文）
     */
    public function translateSourceTexts(string $module, int $businessId, array $sourceTexts, string $langCode): array
    {
        if (empty($sourceTexts)) {
            return [];
        }

        $sourceTexts = array_values(array_unique($sourceTexts));
        $map = array_combine($sourceTexts, $sourceTexts);

        if ($langCode === 'zh-CN') {
            return $map;
        }

        try {
            $zhRows = Db::table('sk_translation')
                ->where('module', $module)
                ->where('business_id', $businessId)
                ->where('lang_code', 'zh-CN')
                ->whereIn('trans_value', $sourceTexts)
                ->field('trans_value, trans_key, field')
                ->select()
                ->toArray();

            if (empty($zhRows)) {
                return $map;
            }

            $transKeys = array_values(array_unique(array_column($zhRows, 'trans_key')));

            $targetRows = Db::table('sk_translation')
                ->where('module', $module)
                ->where('business_id', $businessId)
                ->where('lang_code', $langCode)
                ->whereIn('trans_key', $transKeys)
                ->field('trans_key, field, trans_value')
                ->select()
                ->toArray();

            $targetIndex = [];
            foreach ($targetRows as $row) {
                $targetIndex[$row['trans_key'] . '|' . $row['field']] = $row['trans_value'];
            }

            foreach ($zhRows as $zhRow) {
                $source = $zhRow['trans_value'];
                $lookupKey = $zhRow['trans_key'] . '|' . $zhRow['field'];
                if (isset($targetIndex[$lookupKey]) && $targetIndex[$lookupKey] !== '') {
                    $map[$source] = $targetIndex[$lookupKey];
                }
            }
        } catch (\Exception $e) {
            Log::warning('translateSourceTexts 失败: ' . $e->getMessage());
        }

        return $map;
    }

    /**
     * 保存单条翻译结果（通常由异步翻译任务调用）
     *
     * @param string $module
     * @param int    $businessId
     * @param string $field
     * @param string $langCode
     * @param string $value
     * @param bool   $isAuto
     * @return void
     */
    public function saveTranslation(string $module, int $businessId, string $field, string $langCode, string $value, bool $isAuto = true): void
    {
        $transKey = $this->buildTransKey($module, $businessId, $field);
        $now = date('Y-m-d H:i:s');

        $exists = Db::table('sk_translation')
            ->where('lang_code', $langCode)
            ->where('trans_key', $transKey)
            ->where('module', $module)
            ->find();

        if ($exists) {
            // 人工翻译不覆盖
            if ((int) $exists['is_auto'] === 0 && $isAuto) {
                return;
            }
            Db::table('sk_translation')
                ->where('id', $exists['id'])
                ->update([
                    'trans_value' => $value,
                    'business_id' => $businessId,
                    'field' => $field,
                    'is_auto' => $isAuto ? 1 : 0,
                    'is_translated' => 1,
                    'update_time' => $now,
                ]);
        } else {
            try {
                Db::table('sk_translation')->insert([
                    'lang_code' => $langCode,
                    'trans_key' => $transKey,
                    'trans_value' => $value,
                    'module' => $module,
                    'business_id' => $businessId,
                    'field' => $field,
                    'is_auto' => $isAuto ? 1 : 0,
                    'is_translated' => 1,
                    'source_lang' => 'zh-CN',
                    'create_time' => $now,
                    'update_time' => $now,
                ]);
            } catch (\think\db\exception\PDOException $e) {
                // 唯一键冲突（并发/重复）→ 降级为更新
                if (strpos($e->getMessage(), '1062') !== false || strpos($e->getMessage(), 'Duplicate') !== false) {
                    Db::table('sk_translation')
                        ->where('lang_code', $langCode)
                        ->where('trans_key', $transKey)
                        ->where('module', $module)
                        ->update([
                            'trans_value' => $value,
                            'business_id' => $businessId,
                            'field' => $field,
                            'is_auto' => $isAuto ? 1 : 0,
                            'is_translated' => 1,
                            'update_time' => $now,
                        ]);
                } else {
                    throw $e;
                }
            }
        }

        // 同步更新 zh-CN 原文的 is_translated 状态
        if ($langCode !== 'zh-CN') {
            Db::table('sk_translation')
                ->where('lang_code', 'zh-CN')
                ->where('trans_key', $transKey)
                ->where('module', $module)
                ->update(['is_translated' => 1, 'update_time' => $now]);
        }

        // 清除该词条缓存
        $this->clearCache($module, $businessId, $field, $langCode);
    }

    /**
     * 删除业务相关的所有词条
     *
     * @param string $module
     * @param int    $businessId
     * @return void
     */
    public function deleteByBusiness(string $module, int $businessId): void
    {
        $keys = Db::table('sk_translation')
            ->where('module', $module)
            ->where('business_id', $businessId)
            ->column('field', 'id');

        if (empty($keys)) {
            return;
        }

        // 先清除缓存
        foreach ($keys as $field) {
            $this->clearCache($module, $businessId, $field);
        }

        // 再删除数据库记录
        Db::table('sk_translation')
            ->where('module', $module)
            ->where('business_id', $businessId)
            ->delete();
    }

    /**
     * 清除缓存
     *
     * @param string      $module
     * @param int         $businessId
     * @param string|null $field
     * @param string|null $langCode
     * @return void
     */
    public function clearCache(string $module, int $businessId, ?string $field = null, ?string $langCode = null): void
    {
        if ($field && $langCode) {
            Cache::delete($this->buildCacheKey($module, $businessId, $field, $langCode));
            return;
        }

        $langs = array_merge(['zh-CN'], self::TARGET_LANGS);
        foreach ($langs as $lang) {
            if ($field) {
                Cache::delete($this->buildCacheKey($module, $businessId, $field, $lang));
            } else {
                // 清除该业务所有字段的缓存（需要知道字段列表，这里简化处理）
                // 实际可通过缓存标签或前缀扫描实现，ThinkPHP File/Redis 驱动支持 tag 前缀
                Cache::tag('i18n_' . $module . '_' . $businessId)->clear();
            }
        }
    }

    /**
     * 获取待翻译的词条列表（供 CLI 或队列使用）
     *
     * @param string $module
     * @param int    $limit
     * @return array
     */
    public function getPendingTranslations(string $module = '', int $limit = 50): array
    {
        $query = Db::table('sk_translation')
            ->where('lang_code', 'zh-CN')
            ->where('is_auto', 0);

        if ($module) {
            $query->where('module', $module);
        }

        return $query->limit($limit)->select()->toArray();
    }

    /**
     * 生成词条唯一标识
     *
     * @param string $module
     * @param int    $businessId
     * @param string $field
     * @return string
     */
    public function buildTransKey(string $module, int $businessId, string $field): string
    {
        // return sprintf('%d', $businessId);
        return sprintf('%s:%s:%d', $module, $field, $businessId);
    }

    /**
     * 生成缓存键
     *
     * @param string $module
     * @param int    $businessId
     * @param string $field
     * @param string $langCode
     * @return string
     */
    protected function buildCacheKey(string $module, int $businessId, string $field, string $langCode): string
    {
        return self::CACHE_PREFIX . $module . ':' . $businessId . ':' . $field . ':' . $langCode;
    }

    /**
     * 推送异步翻译队列任务
     *
     * @param string $module
     * @param int    $businessId
     * @param string $field
     * @param string $defaultValue
     * @return void
     */

    /**
     * 静态辅助：从模型实例同步多语言词条（供模型事件调用）
     *
     * 注意：TP6 的 __get 会拦截 $model->i18nFields 返回 null，
     *       因此必须使用 ReflectionClass 读取 protected 属性。
     */
    public static function syncModel($model): void
    {
        $ref = new \ReflectionClass($model);

        $fieldsProp = $ref->getProperty('i18nFields');
        $fieldsProp->setAccessible(true);
        $fields = $fieldsProp->getValue($model);
        if (!is_array($fields) || empty($fields)) {
            return;
        }

        $moduleProp = $ref->getProperty('i18nModule');
        $moduleProp->setAccessible(true);
        $module = $moduleProp->getValue($model);
        if (empty($module)) {
            return;
        }

        $i18nService = app(self::class);
        foreach ($fields as $field) {
            if ($model->isDirty($field)) {
                $value = $model->getData($field) ?? '';
                if ($value !== '' && $value !== null) {
                    $i18nService->saveKey($module, (int) $model->id, $field, (string) $value);
                }
            }
        }
    }

    /**
     * 静态辅助：从模型实例删除多语言词条（供模型事件调用）
     */
    public static function deleteModel($model): void
    {
        $ref = new \ReflectionClass($model);
        $moduleProp = $ref->getProperty('i18nModule');
        $moduleProp->setAccessible(true);
        $module = $moduleProp->getValue($model);
        if (empty($module)) {
            return;
        }
        app(self::class)->deleteByBusiness($module, (int) $model->id);
    }

    protected function pushTranslateQueue(string $module, int $businessId, string $field, string $defaultValue): void
    {
        try {
            \think\facade\Queue::push('app\jobs\BusinessTranslateJob', [
                'module' => $module,
                'business_id' => $businessId,
                'field' => $field,
                'default_value' => $defaultValue,
            ]);
            Log::info('翻译队列已推送', [
                'module' => $module,
                'business_id' => $businessId,
                'field' => $field,
            ]);
        } catch (\Throwable $e) {
            Log::error('队列推送失败: ' . $e->getMessage(), [
                'module' => $module,
                'business_id' => $businessId,
                'field' => $field,
            ]);
        }
    }
}
