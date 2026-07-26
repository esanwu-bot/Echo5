<?php
/**
 * 电子元器件商城 - 常见问题（FAQ）接口
 * 文件说明：提供产品/服务相关的问答列表与查询，支持关键词与分类筛选，返回本地化结果。
 */

namespace app\controller\api;

use app\controller\BaseController;
use app\model\SkFaq;
use think\facade\Cache;

class FaqController extends BaseController
{
    /**
     * 获取FAQ列表
     */
    public function index()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 20;

        $lang = $this->request->lang ?? 'zh';
        $keyword = $params['keyword'] ?? '';
        $category = $params['category'] ?? '';
        $productId = $params['product_id'] ?? '';
        $isHot = isset($params['is_hot']) && $params['is_hot'] !== '' ? $params['is_hot'] : '';
        $cacheKey = 'faq_index_' . $lang . '_p' . $page . '_l' . $limit . '_k' . $keyword . '_c' . $category . '_pid' . $productId . '_hot' . $isHot;

        $result = Cache::remember($cacheKey, function () use ($params, $page, $limit) {
            $query = SkFaq::where('status', 1); // Only show active FAQs

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

            $total = $query->count();
            $list = $query->order('sort', 'asc')
                         ->order('created_at', 'desc')
                         ->page($page, $limit)
                         ->select();

            // 本地化 FAQ 数据
            $localizedFields = ['question', 'answer'];
            $faqList = $this->localizeCollection($list, $localizedFields);

            return [
                'list' => $faqList,
                'total' => $total,
            ];
        }, 3600);

        return $this->paginate($result['list'], $result['total'], $page, $limit);
    }
}
