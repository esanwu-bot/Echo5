<?php

namespace app\controller;

use think\App;
use think\Response;
use think\Validate;
use think\exception\ValidateException;
use think\facade\Db;

class BaseController
{
    /**
     * Request实例
     * @var \think\Request
     */
    protected $request;

    /**
     * 应用实例
     * @var \think\App
     */
    protected $app;

    /**
     * 构造方法
     * @access public
     * @param  App  $app  应用对象
     */
    public function __construct(App $app)
    {
        $this->app     = $app;
        $this->request = $this->app->request;

        // 控制器初始化
        $this->initialize();
    }

    // 初始化
    protected function initialize() {}

    /**
     * 成功响应
     * @param mixed $data 数据
     * @param string $message 消息
     * @param int $code 状态码
     * @return Response
     */
    protected function success($data = [], $message = 'success', $code = 200)
    {
        return json([
            'code' => $code,
            'message' => $this->transMessage($message),
            'data' => $data,
            'timestamp' => time()
        ]);
    }

    /**
     * 失败响应
     * @param string $message 错误消息
     * @param int $code 错误码
     * @param mixed $data 数据
     * @return Response
     */
    protected function error($message = 'error', $code = 400, $data = [])
    {
        return json([
            'code' => $code,
            'message' => $this->transMessage($message),
            'data' => $data,
            'timestamp' => time()
        ]);
    }

    /**
     * 分页响应
     * @param mixed $data 数据
     * @param int $total 总数
     * @param int $page 当前页
     * @param int $limit 每页数量
     * @param string $message 消息
     * @return Response
     */
    protected function paginate($data, $total, $page, $limit, $message = 'success')
    {
        // 处理不同类型的数据输入
        if ($data instanceof \think\Collection) {
            $list = $data->toArray();
        } elseif (is_object($data) && method_exists($data, 'toArray')) {
            $list = $data->toArray();
        } elseif (is_array($data)) {
            $list = $data;
        } else {
            $list = [];
        }

        return json([
            'code' => 200,
            'message' => $this->transMessage($message),
            'data' => [
                'list' => $list,
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'pages' => ceil($total / $limit)
            ],
            'timestamp' => time()
        ]);
    }

    /**
     * 验证数据
     * @param array $data 数据
     * @param string|array $validate 验证器名或者验证规则数组
     * @param array $message 提示信息
     * @param bool $batch 是否批量验证
     * @return array|string|true
     * @throws ValidateException
     */
    protected function validate(array $data, $validate, array $message = [], bool $batch = false)
    {
        if (is_array($validate)) {
            $v = new Validate();
            $v->rule($validate);
        } else {
            if (strpos($validate, '.')) {
                // 支持场景
                [$validate, $scene] = explode('.', $validate);
            }
            $class = false !== strpos($validate, '\\') ? $validate : $this->app->parseClass('validate', $validate);
            $v     = new $class();
            if (!empty($scene)) {
                $v->scene($scene);
            }
        }

        $v->message($message);

        // 是否批量验证
        if ($batch) {
            $v->batch(true);
        }

        return $v->failException(true)->check($data);
    }

    /**
     * 获取网站地址配置
     */
    protected function getWebsiteUrl()
    {
        $config = Db::table('sk_config')
            ->where('config_key', 'website_url')
            ->find();

        if ($config && !empty($config['config_value'])) {
            return rtrim($config['config_value'], '/');
        }

        return $this->request->domain();
    }

    /**
     * 获取完整URL
     */
    protected function getFullUrl($path, $baseUrl = null)
    {
        if (empty($path)) {
            return '';
        }

        if (strpos($path, 'http') === 0) {
            return $path;
        }

        if ($baseUrl === null) {
            $baseUrl = $this->getWebsiteUrl();
        }

        return $baseUrl . '/' . ltrim($path, '/');
    }

    /**
     * 日志记录 - 错误
     */
    protected function logError($message, $context = [], $type = 'app')
    {
        $logData = [
            'message' => $message,
            'context' => $context,
            'type' => $type,
            'timestamp' => date('Y-m-d H:i:s')
        ];

        // 记录到系统日志
        \think\facade\Log::error($message, $context);
    }

    /**
     * 日志记录 - 调试
     */
    protected function logDebug($message, $context = [], $type = 'app')
    {
        $logData = [
            'message' => $message,
            'context' => $context,
            'type' => $type,
            'timestamp' => date('Y-m-d H:i:s')
        ];

        // 记录到系统日志
        \think\facade\Log::debug($message, $context);
    }

    /**
     * 处理图片URL，将相对路径转换为完整URL
     * @param mixed $data 数据（数组或对象）
     * @param array $imageFields 需要处理的图片字段名数组
     * @return mixed
     */
    protected function processImageUrls($data, array $imageFields = ['image', 'icon', 'cover'])
    {
        if (empty($data)) {
            return $data;
        }

        // 使用环境变量配置的URL（图片实际存储位置）
        $domain = env('APP_URL', $this->request->domain());

        // 处理ThinkPHP集合对象
        if (is_object($data) && method_exists($data, 'toArray')) {
            $items = $data->toArray();
            foreach ($items as $key => $item) {
                $items[$key] = $this->processImageUrls($item, $imageFields);
            }
            return $items;
        }

        // 处理单个对象或数组
        if (is_object($data) || is_array($data)) {
            foreach ($imageFields as $field) {
                $value = is_object($data) ? ($data->$field ?? null) : ($data[$field] ?? null);
                if (!empty($value) && is_string($value) && strpos($value, 'http') !== 0) {
                    $fullUrl = $domain . $value;
                    if (is_object($data)) {
                        $data->$field = $fullUrl;
                    } else {
                        $data[$field] = $fullUrl;
                    }
                }
            }
            return $data;
        }

        return $data;
    }

    /**
     * 获取当前请求的语言
     * @return string
     */
    protected function getLang(): string
    {
        return $this->request->lang ?? 'zh';
    }

    /**
     * 过滤HTML标签（含机器翻译产生的畸形标签 "< p >"）
     * strip_tags 无法识别带空格的畸形标签，需先还原再过滤
     * @param string|null $text 含HTML的文本
     * @return string 纯文本
     */
    protected function stripHtmlTags(?string $text): string
    {
        if (empty($text)) {
            return '';
        }
        // 先修复畸形标签: "< p >" → "<p>", "< /p >" → "</p>"
        $text = preg_replace('/<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)((?:[^>"]*|"[^"]*")*?)\s*>/', '<$1$2$3>', $text);
        // 再过滤所有HTML标签
        return trim(strip_tags($text));
    }

    /**
     * 本地化数据集合
     * @param mixed $collection 数据集合
     * @param array $fields 需要本地化的字段列表
     * @return array
     */
    protected function localizeCollection($collection, array $fields, string $tableName = ''): array
    {
        $result = [];

        foreach ($collection as $item) {
            $table = $tableName ?: $this->resolveLocalizedTable($item);
            $data = is_object($item) && method_exists($item, 'toArray') ? $item->toArray() : (array)$item;
            $result[] = $this->applyLocalizedFields($data, $fields, $table);
        }

        return $result;
    }

    /**
     * 本地化单个数据项
     * @param mixed $item 数据项
     * @param array $fields 需要本地化的字段列表
     * @return array
     */
    protected function localizeItem($item, array $fields, string $tableName = ''): array
    {
        $table = $tableName ?: $this->resolveLocalizedTable($item);
        $data = is_object($item) && method_exists($item, 'toArray') ? $item->toArray() : (array)$item;
        return $this->applyLocalizedFields($data, $fields, $table);
    }
    protected function resolveLocalizedTable($item): string
    {
        if (!is_object($item)) {
            return '';
        }

        // 优先使用公共方法
        if (method_exists($item, 'getTable')) {
            return $item->getTable();
        }

        // 反射获取 protected 属性 $table
        try {
            $reflection = new \ReflectionClass($item);
            $property = $reflection->getProperty('table');
            $property->setAccessible(true);
            return (string) $property->getValue($item);
        } catch (\ReflectionException $e) {
            return '';
        }
    }
    // protected function resolveLocalizedTable($item): string
    // {
    //     //var_dump($item);
    //     // if (is_object($item) && method_exists($item, 'getTable')) {
    //     //     return (string)$item->getTable();
    //     // }
    //     if (is_object($item)) {
    //         return (string)$item->table;
    //     }
    //     return '';
    // }

    protected function applyLocalizedFields(array $data, array $fields, string $table = ''): array
    {
        $id = (int)($data['id'] ?? 0);
        $name = $data['name'] ?? ($data['brand_name'] ?? '');
        //file_put_contents('E:\workspace\phpworkspace\debug_i18n.txt', "applyLocalizedFields: table=$table, id=$id, name=$name, lang=" . $this->getLangCode() . "\n", FILE_APPEND);
        if (!$table || !$id) {
            //file_put_contents('E:\workspace\phpworkspace\debug_i18n.txt', "  SKIP: table=$table, id=$id\n", FILE_APPEND);
            return $data;
        }
        $module = $this->tableToModule($table);
        if (!$module) {
            //file_put_contents('E:\workspace\phpworkspace\debug_i18n.txt', "  SKIP: module empty for table=$table\n", FILE_APPEND);
            return $data;
        }
        $lang = $this->getLangCode();
        $i18nService = app(\app\service\I18nService::class);
        $data = $i18nService->mapItem($data, $module, $lang, $fields);
        return $data;
    }

    /**
     * 将数据表名映射到模块标识
     */
    protected function tableToModule(string $table): string
    {
        $map = [
            'sk_product' => 'product',
            'sk_brands' => 'brand',
            'sk_category' => 'category',
            'sk_product_models' => 'model',
            'sk_application' => 'application',
            'sk_application_category' => 'application_category',
            'sk_article' => 'article',
            'sk_article_category' => 'article_category',
            'sk_attribute' => 'attribute',
            'sk_banner' => 'banner',
            'sk_certificate' => 'certificate',
            'sk_document' => 'document',
            'sk_faq' => 'faq',
            'sk_news' => 'news',
            'sk_training' => 'training',
            'sk_about' => 'about',
            'sk_job' => 'job',
            'sk_dictionary_data' => 'dictionary_data',
        ];
        return $map[$table] ?? '';
    }

    /**
     * 获取当前请求语言代码（支持 X-Language / cb-lang / Accept-Language）
     */
    protected function getLangCode(): string
    {
        $request = $this->request;

        // 优先读取 X-Language 请求头
        $lang = $request->header('X-Language');
        if ($lang) {
            return $this->normalizeLangCode($lang);
        }

        // 其次读取 cb-lang（本系统前端使用）
        $lang = $request->header('cb-lang');
        if ($lang) {
            return $this->normalizeLangCode($lang);
        }

        // 最后读取 Accept-Language
        $acceptLang = $request->header('accept-language');
        if ($acceptLang) {
            $parts = explode(',', $acceptLang);
            return $this->normalizeLangCode(trim($parts[0]));
        }

        return 'zh-CN';
    }

    /**
     * 标准化语言代码
     */
    protected function normalizeLangCode(string $lang): string
    {
        $lang = strtolower(str_replace('_', '-', $lang));
        $map = [
            'zh' => 'zh-CN',
            'zh-cn' => 'zh-CN',
            'zh-hans' => 'zh-CN',
            'en' => 'en-US',
            'en-us' => 'en-US',
            'en-gb' => 'en-US',
            'ja' => 'ja-JP',
            'jp' => 'ja-JP',
            'ko' => 'ko-KR',
            'kr' => 'ko-KR',
        ];
        return $map[$lang] ?? $lang;
    }

    /**
     * 过滤已废弃的多语言字段（防止前端仍提交 DEPRECATED 字段导致 500）
     */
    protected function filterDeprecatedLangFields(array $data): array
    {
        $deprecated = [
            'name_en',
            'name_ja',
            'name_ko',
            'name_zh_hant',
            'description_en',
            'description_ja',
            'description_ko',
            'features_en',
            'features_zh_hant',
            'features_jp',
            'features_kr',
            'title_en',
            'title_ja',
            'title_ko',
            'title_zh_hant',
            'subtitle_en',
            'subtitle_ja',
            'subtitle_ko',
            'content_en',
            'content_ja',
            'content_ko',
            'summary_en',
            'summary_ja',
            'summary_ko',
            'question_en',
            'question_ja',
            'question_ko',
            'answer_en',
            'answer_ja',
            'answer_ko',
            'cert_name_en',
            'cert_name_ja',
            'cert_name_ko',
            'job_title_en',
        ];
        foreach ($deprecated as $field) {
            unset($data[$field]);
        }
        return $data;
    }

    /**
     * @deprecated 旧版字段后缀翻译，已废弃。新版本使用 I18nService::mapData
     */
    protected function translateLocalizedFieldValue(string $table, array $data, string $field)
    {
        $fallback = $data[$field] ?? '';
        $id = (int)($data['id'] ?? 0);

        if (!$table || !$id) {
            return $fallback;
        }

        if (function_exists('getLangValueByTableField')) {
            return getLangValueByTableField($table, $field, $id, $fallback);
        }

        return $fallback;
    }

    /**
     * 翻译 API 提示词（根据请求语言头自动翻译）
     *
     * @access protected
     * @param string $message 中文提示词
     * @param string $module  模块标识（可选，如 'product', 'order'）
     * @return string 翻译后的文本
     */
    protected function transMessage(string $message, string $module = ''): string
    {
        /** @var \app\service\ApiMessageTranslator $translator */
        $translator = app(\app\service\ApiMessageTranslator::class);
        return $translator->trans($message, $this->request, $module);
    }

    /**
     * 返回带翻译的成功响应
     *
     * @access protected
     * @param mixed  $data    响应数据
     * @param string $message 中文提示词（自动翻译）
     * @param string $module  模块标识（可选）
     * @return \think\Response
     */
    protected function successTrans($data, string $message = 'success', string $module = '')
    {
        $translatedMessage = $this->transMessage($message, $module);
        return $this->success($data, $translatedMessage);
    }

    /**
     * 返回带翻译的错误响应
     *
     * @access protected
     * @param string $message 中文提示词（自动翻译）
     * @param int    $code    错误码
     * @param string $module  模块标识（可选）
     * @return \think\Response
     */
    protected function errorTrans(string $message, int $code = 400, string $module = '')
    {
        $translatedMessage = $this->transMessage($message, $module);
        return $this->error($translatedMessage, $code);
    }
}
