<?php
/**
 * 电子元器件商城 - 应用公共文件
 * 文件说明：定义全局通用函数，包括数据字典查询、厂区数据获取等辅助函数。
 */

use think\facade\Db;

/**
 * 根据项目代码获取数据字典项目信息
 *
 * @param string $projectCode 项目代码
 * @return array|null
 */
function get_dictionary_project(string $projectCode): ?array
{
    $project = Db::table('sk_dictionary_project')
        ->where('code', $projectCode)
        ->where('status', 1)
        ->find();

    return $project ?: null;
}

/**
 * 根据项目代码获取数据字典数据列表
 *
 * @param string $projectCode 项目代码
 * @param array $options 可选参数 [sort_field, sort_order, limit]
 * @return array
 */
function get_dictionary_data_list(string $projectCode, array $options = []): array
{
    $project = get_dictionary_project($projectCode);
    if (!$project) {
        return [];
    }

    $sortField = $options['sort_field'] ?? 'sort_order';
    $sortOrder = $options['sort_order'] ?? 'asc';
    $limit = $options['limit'] ?? null;

    $query = Db::table('sk_dictionary_data')
        ->where('project_id', $project['id'])
        ->where('status', 1)
        ->order($sortField, $sortOrder);

    if ($limit) {
        $query->limit($limit);
    }

    $data = $query->select()->toArray();

    // 解析 field_values
    foreach ($data as &$item) {
        if (isset($item['field_values']) && is_string($item['field_values'])) {
            $decoded = json_decode($item['field_values'], true);
            $item['field_values'] = $decoded ?: [];
            // 调试日志
            if ($decoded === null) {
                trace('Failed to decode field_values for item id: ' . ($item['id'] ?? 'unknown'), 'error');
            }
        } elseif (isset($item['field_values']) && is_array($item['field_values'])) {
            // 已经是数组，无需处理
        } else {
            $item['field_values'] = [];
        }
    }

    return $data;
}

/**
 * 根据项目代码获取单条数据字典数据
 *
 * @param string $projectCode 项目代码
 * @return array|null
 */
function get_dictionary_data_single(string $projectCode): ?array
{
    $project = get_dictionary_project($projectCode);
    if (!$project) {
        return null;
    }

    $data = Db::table('sk_dictionary_data')
        ->where('project_id', $project['id'])
        ->where('status', 1)
        ->order('sort_order', 'asc')
        ->find();

    if (!$data) {
        return null;
    }

    if (isset($data['field_values']) && is_string($data['field_values'])) {
        $data['field_values'] = json_decode($data['field_values'], true) ?: [];
    }

    return $data;
}

/**
 * 根据项目代码和字段代码获取特定字段值
 *
 * @param string $projectCode 项目代码
 * @param string $fieldCode 字段代码
 * @param mixed $default 默认值
 * @return mixed
 */
function get_dictionary_field_value(string $projectCode, string $fieldCode, $default = null)
{
    $data = get_dictionary_data_single($projectCode);
    if (!$data || !isset($data['field_values'][$fieldCode])) {
        return $default;
    }

    $value = $data['field_values'][$fieldCode];

    // 自动解析 JSON 字符串
    if (is_string($value) && (str_starts_with($value, '[') || str_starts_with($value, '{'))) {
        $decoded = json_decode($value, true);
        if ($decoded !== null) {
            return $decoded;
        }
    }

    return $value;
}

/**
 * 获取厂区车间数据（工厂流程数据）
 * 专门用于 factory_data 数据字典
 *
 * @return array
 */
function get_factory_data(): array
{
    $data = get_dictionary_data_list('factory_data', [
        'sort_field' => 'sort_order',
        'sort_order' => 'asc'
    ]);

    $result = [];
    foreach ($data as $item) {
        $fieldValues = $item['field_values'] ?? [];
        
        // 确保 field_values 是数组（双重保险，处理可能的JSON字符串）
        if (is_string($fieldValues)) {
            $fieldValues = json_decode($fieldValues, true) ?: [];
        }
        if (!is_array($fieldValues)) {
            $fieldValues = [];
        }
        
        // 调试：记录实际字段名到日志
        if (!empty($fieldValues)) {
            trace('Factory data field keys: ' . implode(', ', array_keys($fieldValues)), 'info');
        }
        
        // 兼容多种可能的字段名
        $title = '';
        if (!empty($fieldValues['title_cn'])) {
            $title = $fieldValues['title_cn'];
        } elseif (!empty($fieldValues['title'])) {
            $title = $fieldValues['title'];
        } elseif (!empty($fieldValues['中文标题'])) {
            $title = $fieldValues['中文标题'];
        }
        
        $titleEn = '';
        if (!empty($fieldValues['title_en'])) {
            $titleEn = $fieldValues['title_en'];
        } elseif (!empty($fieldValues['subtitle'])) {
            $titleEn = $fieldValues['subtitle'];
        } elseif (!empty($fieldValues['英文标题'])) {
            $titleEn = $fieldValues['英文标题'];
        }
        
        // 兼容多种可能的图片字段名
        $image = '';
        if (!empty($fieldValues['image_url'])) {
            $image = $fieldValues['image_url'];
        } elseif (!empty($fieldValues['image'])) {
            $image = $fieldValues['image'];
        } elseif (!empty($fieldValues['img'])) {
            $image = $fieldValues['img'];
        } elseif (!empty($fieldValues['图片'])) {
            $image = $fieldValues['图片'];
        }
        
        // 将完整URL转换为相对路径，保持一致性
        if ($image && (strpos($image, 'http://') === 0 || strpos($image, 'https://') === 0)) {
            $parsedUrl = parse_url($image);
            $image = $parsedUrl['path'] ?? $image;
        }
        
        $result[] = [
            'id' => $item['id'],
            'title' => $title,
            'title_en' => $titleEn,
            'image' => $image,
            'isLast' => !empty($fieldValues['is_last']) || !empty($fieldValues['是否为最后一步']),
            'sort' => $item['sort_order'] ?? 0,
            // 临时调试字段，用于查看原始数据结构
            '_debug' => $fieldValues
        ];
    }

    return $result;
}

// =================================================================
// 多语言翻译函数（对标 CRMEB getLang）
// =================================================================

if (!function_exists('getLang')) {
    /**
     * 多语言翻译函数
     * 根据当前语言环境将传入的中文标识翻译成对应语言文本
     *
     * @param string $msg      中文语言标识（remarks），如 "保存成功"
     * @param array  $replace  可选变量映射，如 ['name' => '手机号']
     * @return string          翻译后的文本，找不到翻译时返回原标识
     */
    function getLang($msg, array $replace = [])
    {
        try {
            /** @var \app\service\system\lang\LangCountryService $countryService */
            $countryService = app()->make(\app\service\system\lang\LangCountryService::class);
            /** @var \app\service\system\lang\LangTypeService $typeService */
            $typeService = app()->make(\app\service\system\lang\LangTypeService::class);
            /** @var \app\service\system\lang\LangCodeService $codeService */
            $codeService = app()->make(\app\service\system\lang\LangCodeService::class);

            // ① 检测语言范围
            $request = app()->request;
            $range = $request->header('cb-lang');
            if (!$range) {
                $range = $typeService->getDefaultFileName();
                if (!$range) {
                    $range = explode(',', $request->header('accept-language') ?? 'zh-CN')[0];
                }
            }

            // ② 读取映射缓存
            $langZhCn = \think\facade\Cache::remember('sys_lang_source_map', function () use ($codeService) {
                return $codeService->getDao()->getColumn(['type_id' => 1], 'code', 'remarks');
            }, 3600);

            $typeId = \think\facade\Cache::remember('type_id_' . $range, function () use ($countryService, $range) {
                return $countryService->getTypeIdByCode($range);
            }, 3600);

            $langData = \think\facade\Cache::remember('lang_type_data', function () use ($typeService) {
                $list = $typeService->getAllActive();
                $result = [];
                foreach ($list as $v) {
                    $result[$v['id']] = $v['file_name'];
                }
                return $result;
            }, 3600);

            if (!isset($langData[$typeId])) {
                return $msg;
            }

            // ③ 获取翻译
            $langStr = 'lang_' . str_replace('-', '_', $langData[$typeId]);
            $lang = \think\facade\Cache::remember($langStr, function () use ($typeId, $codeService) {
                return $codeService->getDao()->getColumn(['type_id' => $typeId], 'lang_explain', 'code');
            }, 3600);

            // ④ 翻译
            if (isset($langZhCn[$msg]) && isset($lang[$langZhCn[$msg]])) {
                $message = (string)$lang[$langZhCn[$msg]];
            } else {
                $message = $msg;
            }
            //echo $message."||".$msg;
            // ⑤ 旧系统未命中，尝试 sk_translation 表（type=2 页面 UI / type=1 API 响应）
            if ($message === $msg) {
                try {
                    $rangeNorm = strtolower(str_replace('_', '-', $range));
                    $rangeMap = [
                        'zh' => 'zh-CN', 'zh-cn' => 'zh-CN', 'zh-hans' => 'zh-CN',
                        'en' => 'en-US', 'en-us' => 'en-US', 'en-gb' => 'en-US',
                        'ja' => 'ja-JP', 'jp' => 'ja-JP',
                        'ko' => 'ko-KR', 'kr' => 'ko-KR',
                    ];
                    $rangeNorm = $rangeMap[$rangeNorm] ?? $rangeNorm;
                    //$rangeNorm = 'en-US';
                    //echo $rangeNorm."<br>";
                    $transValue = \think\facade\Db::table('sk_translation')
                        ->where('trans_key', $msg)
                        ->where('lang_code', $rangeNorm)
                        ->whereIn('type', [1, 2])
                        ->value('trans_value');
                   // echo $transValue."<br>";
                    if ($transValue) {
                        $message = $transValue;
                    }
                } catch (\Throwable $e) {
                    // 静默忽略
                }
            }

            // ⑥ 变量替换 {:var} 语法
            if (!empty($replace) && is_array($replace)) {
                $keys = array_map(function ($v) { return "{:{$v}}"; }, array_keys($replace));
                $message = str_replace($keys, array_values($replace), $message);
            }

            return $message;
        } catch (\Throwable $e) {
            $errMsg = $e->getMessage();
            // 缓存文件损坏导致 unserialize 失败，自动清除语言相关缓存
            if (strpos($errMsg, 'unserialize()') !== false || strpos($errMsg, 'Error at offset') !== false) {
                $cacheKeys = ['sys_lang_source_map', 'lang_type_data', 'lang_zh_CN', 'lang_en_US', 'lang_ja_JP', 'lang_ko_KR'];
                foreach ($cacheKeys as $key) {
                    \think\facade\Cache::delete($key);
                }
                // 尝试清除带前缀的 type_id 缓存
                try {
                    $cachePath = root_path() . 'runtime' . DIRECTORY_SEPARATOR . 'cache' . DIRECTORY_SEPARATOR;
                    if (is_dir($cachePath)) {
                        foreach (glob($cachePath . '*') as $file) {
                            if (is_file($file) && filesize($file) <= 2) {
                                @unlink($file);
                            }
                        }
                    }
                } catch (\Throwable $cleanErr) {
                    // ignore
                }
            }
            \think\facade\Log::error('getLang error [msg=' . $msg . ']: ' . $errMsg);
            return $msg;
        }
    }
}

if (!function_exists('getLangFieldRemarkCandidates')) {
    /**
     * Build candidate translation remarks for migrated dynamic content.
     */
    function getLangFieldRemarkCandidates(string $table, string $field, int $id): array
    {
        $table = strtolower($table);

        $fieldMap = [
            'sk_product' => [
                'name' => ['产品名称'],
                'description' => ['描述', '产品描述'],
                'features' => ['产品', '特性'],
            ],
            'sk_category' => [
                'name' => ['分类', '产品名称'],
                'description' => ['描述', '分类'],
            ],
            'sk_brands' => [
                'brand_name' => ['品牌'],
                'name' => ['品牌', '产品名称'],
                'description' => ['描述', '品牌'],
            ],
            'sk_article' => [
                'title' => ['标题', '文章'],
                'summary' => ['文章', '摘要'],
                'content' => ['文章', '内容'],
            ],
            'sk_news' => [
                'title' => ['标题', '新闻'],
                'summary' => ['新闻', '摘要'],
                'content' => ['新闻', '内容'],
            ],
            'sk_faq' => [
                'question' => ['FAQ', '问题'],
                'answer' => ['FAQ', '答案'],
            ],
            'sk_banner' => [
                'title' => ['标题', '横幅'],
                'subtitle' => ['横幅', '副标题'],
                'description' => ['描述', '横幅'],
            ],
            'sk_document' => [
                'title' => ['标题', '文档'],
                'content' => ['文档', '内容'],
            ],
            'sk_training' => [
                'title' => ['标题', '培训'],
                'description' => ['描述', '培训'],
                'content' => ['培训', '内容'],
            ],
            'sk_about' => [
                'title' => ['标题', '关于我们'],
                'content' => ['关于我们', '内容'],
                'description' => ['描述', '关于我们'],
            ],
            'sk_attribute' => [
                'name' => ['属性', '产品名称'],
            ],
            'sk_certificate' => [
                'cert_name' => ['证书'],
                'description' => ['描述', '证书'],
            ],
        ];

        $genericFieldMap = [
            'name' => ['产品名称'],
            'title' => ['标题'],
            'description' => ['描述'],
            'content' => ['内容'],
            'summary' => ['摘要'],
        ];

        $prefixes = $fieldMap[$table][$field] ?? [];
        if (isset($genericFieldMap[$field])) {
            $prefixes = array_merge($prefixes, $genericFieldMap[$field]);
        }

        $remarks = [];
        foreach ($prefixes as $prefix) {
            $remarks[] = $prefix . '#' . $id;
        }

        return array_values(array_unique(array_filter($remarks)));
    }
}

if (!function_exists('getLangValueByTableField')) {
    /**
     * Translate migrated business content by table/field/id, fallback to original value.
     *
     * @param mixed $fallback
     * @return mixed
     */
    function getLangValueByTableField(string $table, string $field, int $id, $fallback = '')
    {
        if (!$table || !$field || !$id) {
            return $fallback;
        }

        if (!is_scalar($fallback) && $fallback !== null) {
            return $fallback;
        }

        // 1. 尝试旧系统翻译
        foreach (getLangFieldRemarkCandidates($table, $field, $id) as $remark) {
            $translated = getLang($remark);
            if ($translated !== $remark) {
                return $translated;
            }
        }

        // 2. 旧系统未命中，尝试 sk_translation 业务数据查询（通过 I18nService）
        static $moduleMap = [
            'sk_banner' => 'banner',
            'sk_product' => 'product',
            'sk_category' => 'category',
            'sk_brands' => 'brand',
            'sk_news' => 'news',
            'sk_faq' => 'faq',
            'sk_document' => 'document',
            'sk_training' => 'training',
            'sk_about' => 'about',
            'sk_certificate' => 'certificate',
            'sk_attribute' => 'attribute',
            'sk_article' => 'article',
            'sk_article_category' => 'article_category',
            'sk_application' => 'application',
            'sk_application_category' => 'application_category',
            'sk_product_models' => 'model',
            'sk_job' => 'job',
        ];

        $module = $moduleMap[strtolower($table)] ?? '';
        if ($module) {
            try {
                $request = app()->request;
                $langCode = $request->header('cb-lang') ?? $request->header('accept-language') ?? 'zh-CN';
                $langCode = strtolower(str_replace('_', '-', $langCode));
                $langMap = [
                    'zh' => 'zh-CN', 'zh-cn' => 'zh-CN', 'zh-hans' => 'zh-CN',
                    'en' => 'en-US', 'en-us' => 'en-US', 'en-gb' => 'en-US',
                    'ja' => 'ja-JP', 'jp' => 'ja-JP',
                    'ko' => 'ko-KR', 'kr' => 'ko-KR',
                ];
                $langCode = $langMap[$langCode] ?? $langCode;

                $i18nService = app(\app\service\I18nService::class);
                $translations = $i18nService->getTranslations($module, [$id], $langCode, [$field]);

                if (!empty($translations[$id][$field])) {
                    return $translations[$id][$field];
                }
            } catch (\Throwable $e) {
                // 静默忽略
            }
        }

        // 3. 尝试直接用 fallback 中文作为 trans_key 查 sk_translation
        if (is_string($fallback) && $fallback !== '') {
            $translated = getLang($fallback);
            if ($translated !== $fallback) {
                return $translated;
            }
        }

        return $fallback;
    }
}
