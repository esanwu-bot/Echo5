<?php
/**
 * 电子元器件商城 - 替代型号接口
 * 文件说明：提供型号替代型号的查询接口。
 */

namespace app\controller\api;

use app\controller\BaseController;
use app\model\SkProductModel;
use think\facade\Db;
use think\Response;
use think\facade\Log;

class ProductAlternateController extends BaseController
{
    /**
     * 获取型号的替代型号列表
     *
     * @access public
     * @param int|string $id 型号ID
     * @return Response
     */
    public function index($id): Response
    {
        try {
            $modelId = (int)$id;
            $model = SkProductModel::field('id')->find($modelId);
            if (!$model) {
                return $this->error('型号不存在', 404);
            }

            $alternateRows = Db::table('sk_product_alternate')
                ->alias('pa')
                ->join('sk_product_models pm', 'pm.id = pa.alternate_model_id')
                ->where('pa.model_id', $modelId)
                ->where('pa.status', 1)
                ->field([
                    'pa.id',
                    'pa.alternate_model_id',
                    'pa.match_type',
                    'pa.similarity_score',
                    'pa.notes',
                    'pm.model_code',
                    'pm.model_name',
                    'pm.package_type',
                    'pm.stock',
                    'pm.moq',
                ])
                ->order('pa.similarity_score', 'desc')
                ->select()
                ->toArray();

            $formatted = array_map(function ($item) {
                return [
                    'id' => (int)$item['id'],
                    'model_id' => (int)$item['alternate_model_id'],
                    'model_code' => $item['model_code'] ?? '',
                    'model_name' => $item['model_name'] ?? '',
                    'package_type' => $item['package_type'] ?? '',
                    'stock' => (int)($item['stock'] ?? 0),
                    'moq' => (int)($item['moq'] ?? 0),
                    'match_type' => $item['match_type'] ?? '',
                    'similarity_score' => isset($item['similarity_score']) ? (float)$item['similarity_score'] : 0,
                    'notes' => $item['notes'] ?? '',
                ];
            }, $alternateRows);

            return $this->success($formatted);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误', 500);
        }
    }

    /**
     * 获取型号的替代型号（与 index 相同，保持 RESTful 兼容）
     *
     * @access public
     * @return Response
     */
    public function getByModel(): Response
    {
        $modelId = (int)$this->request->get('model_id');
        if (!$modelId) {
            return $this->error('model_id 参数必传');
        }
        return $this->index($modelId);
    }
}
