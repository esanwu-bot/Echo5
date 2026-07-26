<?php
/**
 * 数据分析智能体控制器
 */
namespace app\controller\agent;

use app\controller\BaseController;
use app\agent\AnalyticsAgent;
use app\model\agent\AgentSession;
use think\facade\Request;
use think\facade\Log;

class AnalyticsController extends BaseController
{
    /**
     * 自然语言对话（同步）
     * POST /api/v1/agent/chat
     */
    public function chat()
    {
        $params = Request::post();
        $message = $params['message'] ?? '';
        $sessionId = $params['session_id'] ?? '';
        $model = $params['model'] ?? '';

        if (empty($message)) {
            return $this->error('消息不能为空');
        }

        try {
            // 获取或创建会话
            $session = $this->getOrCreateSession($sessionId);
            $history = $session->messages ?: [];

            // 运行 Agent
            $agent = new AnalyticsAgent($model ?: null);
            $result = $agent->run($message, $history);

            if (!$result['success']) {
                return $this->error($result['error'] ?? 'AI 处理失败');
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
            Log::error('Agent chat error: ' . $e->getMessage());
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 流式对话（SSE）
     * POST /api/v1/agent/chat/stream
     */
    public function chatStream()
    {
        $params = Request::post();
        $message = $params['message'] ?? '';
        $sessionId = $params['session_id'] ?? '';
        $model = $params['model'] ?? '';

        if (empty($message)) {
            return json(['code' => 400, 'message' => '消息不能为空']);
        }

        try {
            $session = $this->getOrCreateSession($sessionId);
            $history = $session->messages ?: [];

            // 设置 SSE 头和 CORS 头
            $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
            $allowedOrigins = config('cors.allowed_origins', [
                'http://localhost:3000',
                'http://localhost:3001',
            ]);
            if (in_array($origin, $allowedOrigins)) {
                header('Access-Control-Allow-Origin: ' . $origin);
                header('Access-Control-Allow-Credentials: true');
            }
            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            header('Connection: keep-alive');
            header('X-Accel-Buffering: no');

            $fullText = '';
            $agent = new AnalyticsAgent($model ?: null);
            $result = $agent->runStream($message, $history, function ($token) use (&$fullText) {
                $fullText .= $token;
                echo "data: " . json_encode(['type' => 'token', 'text' => $token], JSON_UNESCAPED_UNICODE) . "\n\n";
                ob_flush();
                flush();
            });

            // 保存对话
            $session->addMessage('user', $message);
            $session->addMessage('assistant', $fullText, [
                'tool_calls' => $result['tool_calls'] ?? [],
            ]);

            if (count($history) <= 1 && $session->title === '新对话') {
                $session->updateTitle(mb_substr($message, 0, 20));
            }

            echo "data: " . json_encode([
                'type' => 'done',
                'session_id' => $session->session_id,
            ], JSON_UNESCAPED_UNICODE) . "\n\n";
            exit;

        } catch (\Exception $e) {
            Log::error('Agent stream error: ' . $e->getMessage());
            echo "data: " . json_encode(['type' => 'error', 'message' => '服务器内部错误'], JSON_UNESCAPED_UNICODE) . "\n\n";
            exit;
        }
    }

    /**
     * 获取可用模型列表
     * GET /api/v1/agent/models
     */
    public function models()
    {
        $models = \app\agent\provider\OpenAICompatibleProvider::getAvailableModels();
        return $this->success($models);
    }

    /**
     * 仪表盘实时数据
     * GET /api/v1/agent/dashboard
     */
    public function dashboard()
    {
        $period = Request::get('period', '7d');

        try {
            $tools = new \app\agent\tools\AnalyticsTools();

            $data = [
                'products'    => $tools->searchProducts(['limit' => 5, 'order_by' => 'views']),
                'sales'       => $tools->analyzeSales(['period' => $period, 'metric' => 'trend']),
                'customers'   => $tools->analyzeCustomers(['period' => $period, 'metric' => 'growth']),
                'inventory'   => $tools->analyzeInventory(['threshold' => 10]),
                'translation' => $tools->analyzeTranslation(['metric' => 'pending']),
            ];

            return $this->success($data);

        } catch (\Exception $e) {
            Log::error('Agent dashboard error: ' . $e->getMessage());
            return $this->error('服务器内部错误', 500);
        }
    }

    /**
     * 获取报告列表
     * GET /api/v1/agent/report
     */
    public function reportList()
    {
        $type = Request::get('type', '');
        $page = (int) Request::get('page', 1);
        $limit = (int) Request::get('limit', 10);

        $query = \app\model\agent\AgentReport::order('created_at', 'desc');
        if ($type) {
            $query->where('report_type', $type);
        }

        $total = $query->count();
        $list = $query->page($page, $limit)->select();

        return $this->paginate($list, $total, $page, $limit);
    }

    /**
     * 生成新报告
     * POST /api/v1/agent/report
     */
    public function generateReport()
    {
        $params = Request::post();
        $reportType = $params['type'] ?? 'daily';
        $period = $params['period'] ?? '7d';

        try {
            $tools = new \app\agent\tools\AnalyticsTools();
            $reportData = $tools->generateReport([
                'report_type' => $reportType,
                'period'      => $period,
            ]);

            $report = new \app\model\agent\AgentReport();
            $report->report_type = $reportType;
            $report->title = $this->getReportTitle($reportType, $period);
            $report->data_json = $reportData;
            $report->created_by = 0; // TODO: 获取当前用户ID
            $report->save();

            return $this->success([
                'report_id' => $report->id,
                'data'      => $reportData,
            ], '报告生成成功');

        } catch (\Exception $e) {
            Log::error('Agent generate report error: ' . $e->getMessage());
            return $this->error('报告生成失败', 500);
        }
    }

    /**
     * 获取会话历史
     * GET /api/v1/agent/session
     */
    public function session()
    {
        $sessionId = Request::get('session_id', '');
        if (empty($sessionId)) {
            return $this->error('session_id 不能为空');
        }

        $session = AgentSession::where('session_id', $sessionId)->find();
        if (!$session) {
            return $this->error('会话不存在', 404);
        }

        return $this->success([
            'session_id' => $session->session_id,
            'title'      => $session->title,
            'messages'   => $session->messages ?: [],
            'created_at' => $session->created_at,
        ]);
    }

    /**
     * 会话列表
     * GET /api/v1/agent/sessions
     */
    public function sessionList()
    {
        $page = (int) Request::get('page', 1);
        $limit = (int) Request::get('limit', 20);

        $query = AgentSession::order('updated_at', 'desc');
        $total = $query->count();
        $list = $query->page($page, $limit)->field('session_id, title, created_at, updated_at')->select();

        return $this->paginate($list, $total, $page, $limit);
    }

    /**
     * 删除会话
     * POST /api/v1/agent/session/delete
     */
    public function deleteSession()
    {
        $sessionId = Request::post('session_id', '');
        if (empty($sessionId)) {
            return $this->error('session_id 不能为空');
        }

        $session = AgentSession::where('session_id', $sessionId)->find();
        if (!$session) {
            return $this->error('会话不存在', 404);
        }

        $session->delete();
        return $this->success([], '会话已删除');
    }

    /**
     * 获取或创建会话
     */
    protected function getOrCreateSession(string $sessionId): AgentSession
    {
        if (!empty($sessionId)) {
            $session = AgentSession::where('session_id', $sessionId)->find();
            if ($session) {
                return $session;
            }
        }
        return AgentSession::createSession();
    }

    /**
     * 获取报告标题
     */
    protected function getReportTitle(string $type, string $period): string
    {
        $typeMap = [
            'daily'       => '日报',
            'weekly'      => '周报',
            'product'     => '产品分析报告',
            'translation' => '翻译分析报告',
        ];
        $typeName = $typeMap[$type] ?? '分析报告';
        return $typeName . ' (' . date('Y-m-d') . ')';
    }
}
