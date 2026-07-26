<?php

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkDocument;
use think\exception\ValidateException;
use think\facade\Log;

class DocumentController extends BaseController
{
    /**
     * 获取文档列表
     */
    public function index()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 10;
        
        $query = SkDocument::where([]);

        if (!empty($params['keyword'])) {
            $keyword = $params['keyword'];
            $query->where('title|content|category', 'like', '%' . $keyword . '%');
        }

        if (!empty($params['category'])) {
            $query->where('category', $params['category']);
        }

        if (!empty($params['product_id'])) {
            $query->where('product_id', $params['product_id']);
        }

        if (isset($params['status']) && $params['status'] !== '') {
            $query->where('status', $params['status']);
        }

        $total = $query->count();
        $list = $query->order('created_at', 'desc')
                     ->page($page, $limit)
                     ->select();

        return $this->paginate($list, $total, $page, $limit);
    }

    /**
     * 获取文档详情
     */
    public function read($id)
    {
        $doc = SkDocument::find($id);
        if (!$doc) {
            return $this->error('文档不存在');
        }
        return $this->success($doc);
    }

    /**
     * 创建新文档
     */
    public function save()
    {
        try {
            $data = $this->filterDeprecatedLangFields($this->request->param());

            if (empty($data['title'])) {
                return $this->error('文档标题不能为空');
            }

            // 如果提供了created_at则移除，让数据库设置默认值
            unset($data['created_at']);
            
            // 如果模型未自动设置created_at，则设置默认值
            if (!isset($data['created_at'])) {
                $data['created_at'] = date('Y-m-d H:i:s');
            }

            $doc = SkDocument::create($data);
            return $this->success($doc, '文档创建成功');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 更新文档
     */
    public function update($id)
    {
        try {
            $doc = SkDocument::find($id);
            if (!$doc) {
                return $this->error('文档不存在');
            }

            $data = $this->filterDeprecatedLangFields($this->request->param());
            
            // 移除created_at以防止修改
            unset($data['created_at']);
            
            $doc->save($data);
            return $this->success($doc, '文档更新成功');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 批量删除文档
     */
    public function batchDelete()
    {
        try {
            $ids = $this->request->post('ids', []);
            if (empty($ids) || !is_array($ids)) {
                return $this->error('请选择要删除的文档');
            }
            SkDocument::destroy($ids);
            return $this->success(null, '批量删除成功');
        } catch (\Exception $e) {
            Log::error('Batch delete error: ' . $e->getMessage());
            return $this->error('批量删除失败');
        }
    }

    /**
     * 删除文档
     */
    public function delete($id)
    {
        try {
            $doc = SkDocument::find($id);
            if (!$doc) {
                return $this->error('文档不存在');
            }

            $doc->delete();
            return $this->success(null, '文档删除成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}
