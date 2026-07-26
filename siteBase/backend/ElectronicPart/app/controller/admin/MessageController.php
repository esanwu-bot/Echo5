<?php

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkMessage;
use think\exception\ValidateException;
use think\facade\Log;

class MessageController extends BaseController
{
    /**
     * 获取留言列表
     */
    public function index()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 10;
        
        $query = SkMessage::where([]);

        if (!empty($params['keyword'])) {
            $keyword = $params['keyword'];
            $query->where('name|email|subject|content', 'like', '%' . $keyword . '%');
        }

        if (!empty($params['message_type'])) {
            $query->where('message_type', $params['message_type']);
        }

        if (isset($params['is_read']) && $params['is_read'] !== '') {
            $query->where('is_read', $params['is_read']);
        }

        if (isset($params['status']) && $params['status'] !== '') {
            $query->where('status', $params['status']);
        }

        $total = $query->count();
        $list = $query->order('is_read', 'asc')
                     ->order('created_at', 'desc')
                     ->page($page, $limit)
                     ->select();

        return $this->paginate($list, $total, $page, $limit);
    }

    /**
     * 获取留言详情
     */
    public function read($id)
    {
        $message = SkMessage::find($id);
        if (!$message) {
            return $this->error('Message not found');
        }
        // 标记为已读
        if ($message->is_read == 0) {
            $message->save(['is_read' => 1]);
        }
        return $this->success($message);
    }

    /**
     * 创建新留言（前台表单使用）
     */
    public function save()
    {
        try {
            $data = $this->request->param();

            if (empty($data['name']) || empty($data['email']) || empty($data['subject'])) {
                return $this->error('Name, email and subject are required');
            }

            $message = SkMessage::create($data);
            return $this->success($message, 'Message created successfully');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 更新留言（用于管理员回复和状态变更）
     */
    public function update($id)
    {
        try {
            $message = SkMessage::find($id);
            if (!$message) {
                return $this->error('Message not found');
            }

            $data = $this->request->param();
            
            // 处理管理员回复
            if (!empty($data['reply_content'])) {
                $data['replied_at'] = date('Y-m-d H:i:s');
                $data['is_read'] = 1;
                if (!empty($data['reply_by'])) {
                    // 管理员ID可从认证上下文中提取
                    $data['reply_by'] = $data['reply_by'];
                }
            }

            $message->save($data);
            return $this->success($message, 'Message updated successfully');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 批量删除留言
     */
    public function batchDelete()
    {
        try {
            $ids = $this->request->post('ids', []);
            if (empty($ids) || !is_array($ids)) {
                return $this->error('请选择要删除的留言');
            }
            SkMessage::destroy($ids);
            return $this->success(null, '批量删除成功');
        } catch (\Exception $e) {
            Log::error('Batch delete error: ' . $e->getMessage());
            return $this->error('批量删除失败');
        }
    }

    /**
     * 删除留言
     */
    public function delete($id)
    {
        try {
            $message = SkMessage::find($id);
            if (!$message) {
                return $this->error('Message not found');
            }

            $message->delete();
            return $this->success(null, 'Message deleted successfully');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}
