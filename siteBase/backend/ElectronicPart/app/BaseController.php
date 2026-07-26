<?php
/**
 * 电子元器件商城 - 控制器基础类
 * 文件说明：提供控制器通用方法（响应封装、日志、校验、本地化等），所有控制器继承自此类。
 * 备注：项目为电子元器件商城（电子组件），请勿误解为酒水项目。
 */
declare (strict_types = 1);

namespace app;

use think\App;
use think\exception\ValidateException;
use think\Validate;
use app\service\LogService;

/**
 * 控制器基础类
 */
abstract class BaseController
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
     * 是否批量验证
     * @var bool
     */
    protected $batchValidate = false;

    /**
     * 控制器中间件
     * @var array
     */
    protected $middleware = [];

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
    protected function initialize()
    {}

    /**
     * 验证数据
     * @access protected
     * @param  array        $data     数据
     * @param  string|array $validate 验证器名或者验证规则数组
     * @param  array        $message  提示信息
     * @param  bool         $batch    是否批量验证
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
        if ($batch || $this->batchValidate) {
            $v->batch(true);
        }

        return $v->failException(true)->check($data);
    }

    /**
     * 记录错误日志
     * @param string $message 错误信息
     * @param array $context 上下文数据
     * @param string $module 模块名
     */
    protected function logError(string $message, array $context = [], string $module = '')
    {
        LogService::error($message, $context, $module);
    }

    /**
     * 记录调试日志
     * @param string $message 调试信息
     * @param array $context 上下文数据
     */
    protected function logDebug(string $message, array $context = [])
    {
        LogService::debug($message, $context);
    }

    /**
     * 记录API请求日志
     * @param mixed $requestData 请求数据
     * @param mixed $responseData 响应数据
     * @param float $time 执行时间
     */
    protected function logApi($requestData, $responseData, $time)
    {
        LogService::api($requestData, $responseData, $time);
    }

    /**
     * 成功响应
     * @param mixed $data 响应数据
     * @param string $message 响应消息
     * @param int $code 响应代码
     * @return \think\Response
     */
    protected function success($data = null, string $message = 'success', int $code = 200)
    {
        $result = [
            'code' => $code,
            'message' => $this->translate($message),
            'data' => $data,
            'timestamp' => time()
        ];

        // 记录成功响应日志
        $this->logDebug('API Response Success', [
            'method' => $this->request->method(),
            'url' => $this->request->url(true),
            'response' => $result
        ]);

        return json($result);
    }

    /**
     * 统一分页返回
     *
     * @param array $list 分页数据数组
     * @param int $total 总数
     * @param int $page 当前页
     * @param int $limit 每页大小
     * @return \think\Response
     */
    protected function paginate(array $list, int $total, int $page = 1, int $limit = 15)
    {
        $payload = [
            'data' => $list,
            'total' => (int)$total,
            'page' => (int)$page,
            'limit' => (int)$limit,
        ];

        return $this->success($payload);
    }

    /**
     * 失败响应
     * @param string $message 错误消息
     * @param int $code 错误代码
     * @param mixed $data 响应数据
     * @return \think\Response
     */
    protected function error(string $message = 'error', int $code = 400, $data = null)
    {
        $result = [
            'code' => $code,
            'message' => $this->translate($message),
            'data' => $data,
            'timestamp' => time()
        ];

        // 记录错误响应日志
        $this->logError('API Response Error', [
            'method' => $this->request->method(),
            'url' => $this->request->url(true),
            'response' => $result
        ]);

        return json($result);
    }

    /**
     * 获取当前请求的语言
     * @return string
     */
    protected function getLang(): string
    {
        // 委托给 LanguageMiddleware 设置的 request->lang，
        // 或从请求头 cb-lang / Accept-Language 获取
        return $this->request->lang ?? (
            $this->request->header('cb-lang')
            ?: explode('-', explode(',', $this->request->header('accept-language') ?? 'zh')[0])[0]
        );
    }

    /**
     * 翻译消息文本（委托给全局 getLang()）
     * @param string $msg 中文标识
     * @param array $replace 变量替换
     * @return string
     */
    protected function translate(string $msg, array $replace = []): string
    {
        if (function_exists('getLang')) {
            return getLang($msg, $replace);
        }
        return $msg;
    }

    /**
     * 本地化数据集合（过渡期：直接返回原始数据）
     * MultiLanguageTrait 已移除，多语言切换由前端 cb-lang + 后端 getLang() 处理
     */
    protected function localizeCollection($collection, array $fields): array
    {
        $result = [];
        foreach ($collection as $item) {
            $table = $this->resolveLocalizedTable($item);
            $data = is_object($item) && method_exists($item, 'toArray') ? $item->toArray() : (array)$item;
            $result[] = $this->applyLocalizedFields($data, $fields, $table);
        }
        return $result;
    }

    /**
     * 本地化单个数据项（过渡期：直接返回原始数据）
     */
    protected function localizeItem($item, array $fields): array
    {
        $table = $this->resolveLocalizedTable($item);
        $data = is_object($item) && method_exists($item, 'toArray') ? $item->toArray() : (array)$item;
        return $this->applyLocalizedFields($data, $fields, $table);
    }

    protected function resolveLocalizedTable($item): string
    {
        if (is_object($item) && method_exists($item, 'getTable')) {
            return (string)$item->getTable();
        }

        return '';
    }

    protected function applyLocalizedFields(array $data, array $fields, string $table = ''): array
    {
        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                $data[$field] = $this->translateLocalizedFieldValue($table, $data, $field);
            }

            foreach (['_en', '_ja', '_ko', '_zh_hans', '_zh_hant', '_jp', '_kr'] as $suffix) {
                unset($data[$field . $suffix]);
            }
        }

        return $data;
    }

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
}
