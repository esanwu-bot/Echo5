<?php
/**
 * 电子元器件商城 - 导购Agent控制器
 * 文件说明：提供导购Agent相关的API接口，包括对话、会话管理、快捷搜索等功能。
 * 路由：/api/v1/guide
 */
namespace app\controller\agent;

use app\controller\BaseController;
use app\agent\ShoppingGuideAgent;
use app\agent\tools\GuideFallbackHandler;
use app\model\agent\AgentSession;
use think\facade\Request;
use think\facade\Log;
use think\facade\Db;

/**
 * 导购Agent控制器
 * 处理导购助手相关的API请求
 *
 * @package app\controller\agent
 */
class ShoppingGuideController extends BaseController
{
    /**
     * 会话类型标识
     */
    const SESSION_TYPE = 'guide';

    /**
     * 同步对话
     * POST /api/v1/guide/chat
     *
     * @access public
     * @return \think\response\Json
     */
    public function chat()
    {
        $params = Request::post();
        $message = $params['message'] ?? '';
        $sessionId = $params['session_id'] ?? '';
        $model = $params['model'] ?? '';
        $lang = $params['lang'] ?? $this->getLang();

        if (empty($message)) {
            return $this->error('消息不能为空');
        }

        try {
            // 获取或创建会话
            $session = $this->getOrCreateSession($sessionId);
            $history = $session->messages ?: [];

            // 运行导购Agent
            $agent = new ShoppingGuideAgent($model ?: null, $lang);
            $result = $agent->run($message, $history);

            // LLM不可用时降级为规则匹配
            if (!$result['success']) {
                Log::warning('导购Agent LLM不可用，启用降级处理: ' . ($result['error'] ?? ''));
                $fallback = new GuideFallbackHandler($lang);
                $result = $fallback->handle($message);
            }

            // 保存对话记录
            $session->addMessage('user', $message);
            $session->addMessage('assistant', $result['content'] ?? '', [
                'tool_calls' => $result['tool_calls'] ?? [],
            ]);

            // 自动更新标题（首次对话）
            if (count($history) <= 1 && $session->title === '新对话') {
                $session->updateTitle(mb_substr($message, 0, 20));
            }

            return $this->success([
                'content'    => $result['content'] ?? '',
                'tool_calls' => $result['tool_calls'] ?? [],
                'session_id' => $session->session_id,
            ]);

        } catch (\Exception $e) {
            Log::error('导购Agent chat error: ' . $e->getMessage());
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 流式对话（SSE）
     * POST /api/v1/guide/chat/stream
     *
     * @access public
     */
    public function chatStream()
    {
        $params = Request::post();
        $message = $params['message'] ?? '';
        $sessionId = $params['session_id'] ?? '';
        $model = $params['model'] ?? '';
        $lang = $params['lang'] ?? $this->getLang();

        if (empty($message)) {
            return json(['code' => 400, 'message' => '消息不能为空']);
        }

        try {
            $session = $this->getOrCreateSession($sessionId);
            $history = $session->messages ?: [];

            // 关闭ThinkPHP框架的所有output buffer，确保SSE数据实时推送
            while (ob_get_level() > 0) {
                ob_end_clean();
            }

            // 设置 SSE 头和 CORS 头
            $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
            $allowedOrigins = config('cors.allowed_origins', [
                'http://localhost:3000',
                'http://localhost:3001',
                'http://localhost:3002',
                'http://127.0.0.1:3000',
                'http://127.0.0.1:3001',
                'http://127.0.0.1:3002',
            ]);
            if (in_array($origin, $allowedOrigins)) {
                header('Access-Control-Allow-Origin: ' . $origin);
                header('Access-Control-Allow-Credentials: true');
                header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Visitor-Id');
                header('Access-Control-Allow-Methods: POST, OPTIONS');
            }
            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            header('Connection: keep-alive');
            header('X-Accel-Buffering: no');

            // SSE辅助函数
            $sendSSE = function($data) {
                echo "data: " . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n\n";
                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();
            };

            $fullText = '';
            $toolCalls = [];
            $agent = new ShoppingGuideAgent($model ?: null, $lang);
            $result = $agent->runStream($message, $history, function ($token) use (&$fullText, $sendSSE) {
                $fullText .= $token;
                $sendSSE(['type' => 'token', 'text' => $token]);
            });

            // LLM不可用时降级为规则匹配
            if (!$result['success']) {
                $errorMsg = $result['error'] ?? '';
                Log::warning('导购Agent Stream LLM不可用，启用降级处理: ' . $errorMsg);

                // 额度用尽类错误：向前端发送明确提示，不走降级
                $quotaKeywords = ['quota', 'limit', 'exceeded', '额度', '用量', 'billing cycle'];
                $isQuotaError = false;
                foreach ($quotaKeywords as $kw) {
                    if (stripos($errorMsg, $kw) !== false) {
                        $isQuotaError = true;
                        break;
                    }
                }

                if ($isQuotaError) {
                    $sendSSE([
                        'type' => 'error',
                        'message' => '当前模型额度已用尽，请切换到其他模型继续使用。',
                        'error_code' => 'QUOTA_EXCEEDED',
                    ]);
                    exit;
                }

                $fallback = new GuideFallbackHandler($lang);
                $fallbackResult = $fallback->handle($message);
                $fullText = $fallbackResult['content'] ?? '';
                $toolCalls = [];
                // 降级回复逐token模拟输出
                $chars = mb_str_split($fullText);
                foreach ($chars as $char) {
                    $sendSSE(['type' => 'token', 'text' => $char]);
                    usleep(10000); // 10ms延迟，模拟打字效果
                }
            } else {
                $toolCalls = $result['tool_calls'] ?? [];
            }

            // 保存对话
            $session->addMessage('user', $message);
            $session->addMessage('assistant', $fullText, [
                'tool_calls' => $toolCalls,
            ]);

            if (count($history) <= 1 && $session->title === '新对话') {
                $session->updateTitle(mb_substr($message, 0, 20));
            }

            $sendSSE([
                'type' => 'done',
                'session_id' => $session->session_id,
                'tool_calls' => $toolCalls,
            ]);
            exit;

        } catch (\Exception $e) {
            Log::error('导购Agent stream error: ' . $e->getMessage());
            // 确保错误时也能发送SSE事件
            echo "data: " . json_encode(['type' => 'error', 'message' => '服务器内部错误'], JSON_UNESCAPED_UNICODE) . "\n\n";
            if (ob_get_level() > 0) {
                ob_flush();
            }
            flush();
            exit;
        }
    }

    /**
     * 获取可用模型列表
     * GET /api/v1/guide/models
     *
     * @access public
     * @return \think\response\Json
     */
    public function models()
    {
        $models = \app\agent\provider\OpenAICompatibleProvider::getAvailableModels();
        return $this->success($models);
    }

    /**
     * 获取会话详情
     * GET /api/v1/guide/session
     *
     * @access public
     * @return \think\response\Json
     */
    public function session()
    {
        $sessionId = Request::get('session_id', '');
        if (empty($sessionId)) {
            return $this->error('session_id 不能为空');
        }

        $session = AgentSession::where('session_id', $sessionId)
            ->where('type', self::SESSION_TYPE)
            ->find();

        if (!$session) {
            return $this->error('会话不存在', 404);
        }

        return $this->success([
            'session_id' => $session->session_id,
            'title'      => $session->title,
            'messages'   => $session->messages ?: [],
            'created_at' => $session->created_at,
            'updated_at' => $session->updated_at,
        ]);
    }

    /**
     * 获取会话列表
     * GET /api/v1/guide/sessions
     *
     * @access public
     * @return \think\response\Json
     */
    public function sessions()
    {
        $page = (int) Request::get('page', 1);
        $limit = (int) Request::get('limit', 20);

        $query = AgentSession::where('type', self::SESSION_TYPE)
            ->order('updated_at', 'desc');

        $total = $query->count();
        $list = $query->page($page, $limit)
            ->field('session_id, title, created_at, updated_at')
            ->select();

        return $this->paginate($list, $total, $page, $limit);
    }

    /**
     * 删除会话
     * POST /api/v1/guide/session/delete
     *
     * @access public
     * @return \think\response\Json
     */
    public function deleteSession()
    {
        $sessionId = Request::post('session_id', '');
        if (empty($sessionId)) {
            return $this->error('session_id 不能为空');
        }

        $session = AgentSession::where('session_id', $sessionId)
            ->where('type', self::SESSION_TYPE)
            ->find();

        if (!$session) {
            return $this->error('会话不存在', 404);
        }

        $session->delete();
        return $this->success([], '会话已删除');
    }

    /**
     * 快捷搜索
     * GET /api/v1/guide/quick-search
     * 用于侧边栏搜索框实时搜索产品
     *
     * @access public
     * @return \think\response\Json
     */
    public function quickSearch()
    {
        $keyword = Request::get('keyword', '');
        $limit = (int) Request::get('limit', 10);

        if (empty($keyword)) {
            return $this->success(['products' => [], 'total' => 0]);
        }

        try {
            $products = Db::name('product')
                ->alias('p')
                ->where('p.is_on_sale', 1)
                ->where(function($q) use ($keyword) {
                    $q->where('p.product_code', 'like', "%{$keyword}%")
                      ->whereOr('p.model_number', 'like', "%{$keyword}%")
                      ->whereOr('p.name', 'like', "%{$keyword}%");
                })
                ->field('p.id, p.product_code, p.name, p.model_number, p.brand, 
                         p.price, p.stock, p.package_type, p.image_url')
                ->limit($limit)
                ->select()
                ->toArray();

            return $this->success([
                'products' => $products,
                'total' => count($products),
                'keyword' => $keyword,
            ]);

        } catch (\Exception $e) {
            Log::error('导购快捷搜索 error: ' . $e->getMessage());
            return $this->error('搜索失败', 500);
        }
    }

    /**
     * 获取导购分类菜单
     * GET /api/v1/guide/categories
     * 返回侧边栏导航菜单数据
     *
     * @access public
     * @return \think\response\Json
     */
    public function categories()
    {
        // 导购菜单结构
        $menu = [
            [
                'id' => 'chip_products',
                'name' => '芯片产品',
                'icon' => 'cpu',
                'children' => [
                    ['id' => 'mcu', 'name' => 'MCU/单片机', 'prompt' => '推荐一些常用的MCU单片机'],
                    ['id' => 'power_management', 'name' => '电源管理', 'prompt' => '推荐电源管理芯片'],
                    ['id' => 'sensors', 'name' => '传感器', 'prompt' => '推荐常用的传感器'],
                    ['id' => 'communication', 'name' => '通信芯片', 'prompt' => '推荐通信芯片'],
                ],
            ],
            [
                'id' => 'inventory',
                'name' => '库存查询',
                'icon' => 'package',
                'children' => [
                    ['id' => 'check_stock', 'name' => '查型号库存', 'prompt' => '帮我查询库存'],
                    ['id' => 'batch_check', 'name' => '批量查询', 'prompt' => '我需要批量查询多个型号的库存'],
                    ['id' => 'stock_alert', 'name' => '库存预警', 'prompt' => '查询库存不足的产品'],
                ],
            ],
            [
                'id' => 'quotation',
                'name' => '询价报价',
                'icon' => 'dollar-sign',
                'children' => [
                    ['id' => 'price_inquiry', 'name' => '型号报价', 'prompt' => '帮我查询价格'],
                    ['id' => 'batch_quote', 'name' => '批量询价', 'prompt' => '我需要批量询价'],
                    ['id' => 'sample_apply', 'name' => '申请样品', 'prompt' => '我想申请样品'],
                ],
            ],
            [
                'id' => 'documents',
                'name' => '技术文档',
                'icon' => 'file-text',
                'children' => [
                    ['id' => 'datasheet', 'name' => '数据手册', 'prompt' => '帮我查找数据手册'],
                    ['id' => 'app_note', 'name' => '应用笔记', 'prompt' => '推荐一些应用笔记'],
                    ['id' => 'dev_tools', 'name' => '开发工具', 'prompt' => '推荐开发工具'],
                ],
            ],
            [
                'id' => 'quick_actions',
                'name' => '快捷操作',
                'icon' => 'zap',
                'children' => [
                    ['id' => 'stock_query', 'name' => '库存查询', 'prompt' => '库存查询'],
                    ['id' => 'batch_inquiry', 'name' => '批量询价', 'prompt' => '批量询价'],
                    ['id' => 'sample_request', 'name' => '样品申请', 'prompt' => '样品申请'],
                    ['id' => 'alt_recommend', 'name' => '替代推荐', 'prompt' => '推荐替代料'],
                ],
            ],
        ];

        return $this->success([
            'menu' => $menu,
        ]);
    }

    /**
     * 提交询价请求
     * POST /api/v1/guide/quote
     *
     * @access public
     * @return \think\response\Json
     */
    public function quote()
    {
        $params = Request::post();
        $products = $params['products'] ?? [];
        $contactName = $params['contact_name'] ?? '';
        $contactPhone = $params['contact_phone'] ?? '';
        $contactEmail = $params['contact_email'] ?? '';
        $company = $params['company'] ?? '';
        $remark = $params['remark'] ?? '';

        if (empty($products)) {
            return $this->error('产品清单不能为空');
        }

        if (empty($contactName) || empty($contactPhone)) {
            return $this->error('联系人和电话为必填项');
        }

        try {
            $quoteId = Db::name('quote_request')->insertGetId([
                'contact_name' => $contactName,
                'contact_phone' => $contactPhone,
                'contact_email' => $contactEmail,
                'company' => $company,
                'products' => json_encode($products, JSON_UNESCAPED_UNICODE),
                'remark' => $remark,
                'status' => 'pending',
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            return $this->success([
                'quote_id' => $quoteId,
                'message' => '询价请求已提交，我们会尽快与您联系',
            ], '提交成功');

        } catch (\Exception $e) {
            Log::error('导购询价提交 error: ' . $e->getMessage());
            return $this->error('提交失败，请稍后重试', 500);
        }
    }

    /**
     * 提交样品申请
     * POST /api/v1/guide/sample
     *
     * @access public
     * @return \think\response\Json
     */
    public function sample()
    {
        $params = Request::post();
        $productId = $params['product_id'] ?? 0;
        $quantity = $params['quantity'] ?? 1;
        $contactName = $params['contact_name'] ?? '';
        $contactPhone = $params['contact_phone'] ?? '';
        $contactEmail = $params['contact_email'] ?? '';
        $company = $params['company'] ?? '';
        $purpose = $params['purpose'] ?? '';

        if ($productId <= 0) {
            return $this->error('产品ID无效');
        }

        if (empty($contactName) || empty($contactPhone)) {
            return $this->error('联系人和电话为必填项');
        }

        try {
            // 检查产品是否存在
            $product = Db::name('product')->where('id', $productId)->find();
            if (!$product) {
                return $this->error('产品不存在');
            }

            $sampleId = Db::name('sample_apply')->insertGetId([
                'product_id' => $productId,
                'quantity' => $quantity,
                'contact_name' => $contactName,
                'contact_phone' => $contactPhone,
                'contact_email' => $contactEmail,
                'company' => $company,
                'purpose' => $purpose,
                'status' => 'pending',
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            return $this->success([
                'sample_id' => $sampleId,
                'message' => '样品申请已提交，我们会尽快审核并联系您',
            ], '提交成功');

        } catch (\Exception $e) {
            Log::error('导购样品申请 error: ' . $e->getMessage());
            return $this->error('提交失败，请稍后重试', 500);
        }
    }

    /**
     * 获取或创建会话
     *
     * @access protected
     * @param string $sessionId 会话ID
     * @return AgentSession
     */
    protected function getOrCreateSession(string $sessionId): AgentSession
    {
        if (!empty($sessionId)) {
            $session = AgentSession::where('session_id', $sessionId)
                ->where('type', self::SESSION_TYPE)
                ->find();
            if ($session) {
                return $session;
            }
        }
        return AgentSession::createSession(self::SESSION_TYPE);
    }
}
