<?php
/**
 * 电子元器件商城 - 消息/留言接口
 * 文件说明：处理前台用户留言/联系表单的创建与管理，属于前台 API 模块。
 */

namespace app\controller\api;

use app\controller\BaseController;
use app\model\SkMessage;
use think\exception\ValidateException;
use think\facade\Log;

class MessageController extends BaseController
{
    /**
     * 创建新留言（联系表单）
     */
    public function save()
    {
        try {
            $data = $this->request->param();

            if (empty($data['name']) || empty($data['email']) || empty($data['subject']) || empty($data['content'])) {
                return $this->error('姓名、邮箱、主题和内容不能为空');
            }

            $data['status'] = 'pending';
            $data['is_read'] = 0;
            $data['message_type'] = 'contact'; // Default type

            $message = SkMessage::create($data);
            return $this->success($message, '消息发送成功');

        } catch (ValidateException $e) {
            return $this->error($e->getMessage());
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试');
        }
    }
}
