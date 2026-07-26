<?php

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkFaq;
use think\exception\ValidateException;
use think\facade\Log;

class FaqController extends BaseController
{
    /**
     * 获取FAQ列表
     */
    public function index()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 10;
        
        $query = SkFaq::where([]);

        if (!empty($params['keyword'])) {
            $keyword = $params['keyword'];
            $query->where('question|answer', 'like', '%' . $keyword . '%');
        }

        if (!empty($params['category'])) {
            $query->where('category', $params['category']);
        }

        if (!empty($params['product_id'])) {
            $query->where('product_id', $params['product_id']);
        }

        if (isset($params['is_hot']) && $params['is_hot'] !== '') {
            $query->where('is_hot', $params['is_hot']);
        }

        if (isset($params['status']) && $params['status'] !== '') {
            $query->where('status', $params['status']);
        }

        $total = $query->count();
        $list = $query->order('sort', 'asc')
                     ->order('created_at', 'desc')
                     ->page($page, $limit)
                     ->select();

        return $this->paginate($list, $total, $page, $limit);
    }

    /**
     * 获取FAQ详情
     */
    public function read($id)
    {
        $faq = SkFaq::find($id);
        if (!$faq) {
            return $this->error('常见问题不存在');
        }
        return $this->success($faq);
    }

    /**
     * 创建新FAQ
     */
    public function save()
    {
        try {
            $data = $this->filterDeprecatedLangFields($this->request->param());

            if (empty($data['question']) || empty($data['answer'])) {
                return $this->error('问题和答案不能为空');
            }

            $faq = SkFaq::create($data);
            return $this->success($faq, '常见问题创建成功');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 更新FAQ
     */
    public function update($id)
    {
        try {
            $faq = SkFaq::find($id);
            if (!$faq) {
                return $this->error('常见问题不存在');
            }

            $data = $this->filterDeprecatedLangFields($this->request->param());
            $faq->save($data);
            return $this->success($faq, '常见问题更新成功');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 批量删除FAQ
     */
    public function batchDelete()
    {
        try {
            $ids = $this->request->post('ids', []);
            if (empty($ids) || !is_array($ids)) {
                return $this->error('请选择要删除的常见问题');
            }
            SkFaq::destroy($ids);
            return $this->success(null, '批量删除成功');
        } catch (\Exception $e) {
            Log::error('Batch delete error: ' . $e->getMessage());
            return $this->error('批量删除失败');
        }
    }

    /**
     * 删除FAQ
     */
    public function delete($id)
    {
        try {
            $faq = SkFaq::find($id);
            if (!$faq) {
                return $this->error('常见问题不存在');
            }

            $faq->delete();
            return $this->success(null, '常见问题删除成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}
