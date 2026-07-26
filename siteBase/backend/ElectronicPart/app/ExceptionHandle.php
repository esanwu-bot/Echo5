<?php
/**
 * 电子元器件商城 - 应用异常处理类
 * 文件说明：统一处理应用异常，记录日志并返回格式化的错误响应。
 */

namespace app;

use think\db\exception\DataNotFoundException;
use think\db\exception\ModelNotFoundException;
use think\exception\Handle;
use think\exception\HttpException;
use think\exception\HttpResponseException;
use think\exception\ValidateException;
use think\exception\ErrorException;
use think\Response;
use Throwable;
use app\service\LogService;

class ExceptionHandle extends Handle
{
    /**
     * 不需要记录信息（日志）的异常类列表
     * @var array
     */
    protected $ignoreReport = [
        HttpException::class,
        HttpResponseException::class,
        ModelNotFoundException::class,
        DataNotFoundException::class,
        ValidateException::class,
    ];

    /**
     * 记录异常信息（包括日志或者其它方式记录）
     *
     * @access public
     * @param  Throwable $exception
     * @return void
     */
    public function report(Throwable $exception): void
    {
        // 确保错误日志被记录
        $this->logException($exception);
        parent::report($exception);
    }

    /**
     * 将异常渲染为 HTTP 响应
     *
     * @access public
     * @param \think\Request   $request
     * @param Throwable $e
     * @return Response
     */
    public function render($request, Throwable $e): Response
    {
        // 记录异常日志
        $this->logException($e);

        // 获取响应对象
        if ($e instanceof ValidateException) {
            $response = json(['code' => 400, 'msg' => $e->getMessage(), 'data' => null]);
        } elseif ($e instanceof HttpException) {
            $response = response($e->getMessage(), $e->getStatusCode());
        } elseif (!env('app_debug', false)) {
            $response = json(['code' => 500, 'msg' => '系统错误，请稍后重试', 'data' => null]);
        } else {
            $response = parent::render($request, $e);
        }
        
        // 添加CORS头部
        $origin = $request->header('origin');
        // 如果有 origin，则返回该 origin，否则使用 * (当 credentials 为 true 时不能使用 *)
        $allowOrigin = $origin ?: '*';
        
        $response->header([
            'Access-Control-Allow-Origin'      => $allowOrigin,
            'Access-Control-Allow-Methods'     => 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
            'Access-Control-Allow-Headers'     => 'Origin, Content-Type, Cookie, X-CSRF-TOKEN, Accept, Authorization, Token, X-Requested-With',
            'Access-Control-Allow-Credentials' => 'true',
            'Access-Control-Max-Age'           => 1728000,
        ]);
        
        return $response;
    }

    /**
     * 记录异常日志
     */
    protected function logException(Throwable $e)
    {
        $logData = [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString(),
            'request' => [
                'method' => request()->method(),
                'url' => request()->url(true),
                'ip' => request()->ip(),
                'params' => $this->filterSensitiveData(request()->param())
            ]
        ];

        // 根据异常类型记录不同级别的日志
        if ($e instanceof ErrorException) {
            LogService::error('PHP Error: ' . $e->getMessage(), $logData, 'system');
        } else {
            LogService::error('Exception: ' . get_class($e), $logData, 'system');
        }
    }

    /**
     * 过滤敏感数据
     */
    protected function filterSensitiveData($data)
    {
        $sensitiveFields = ['password', 'token', 'secret', 'key', 'pwd'];
        
        foreach ($sensitiveFields as $field) {
            if (isset($data[$field])) {
                $data[$field] = '***FILTERED***';
            }
        }
        
        return $data;
    }
}
