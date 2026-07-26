<?php

namespace app\controller\api;

use app\controller\BaseController;
use app\model\SkModelParamVal;
use think\facade\Db;
use think\Response;
use think\facade\Log;

class ModelParamValController extends BaseController
{
    /**
     * 获取型号的参数值列表
     * GET /api/v1/models/:id/params
     */
    public function index($modelId): Response
    {
        try {
            $params = SkModelParamVal::with(['param' => function($query) {
                $query->field('id, name, code, type, data_type, unit, options');
            }])
                ->where('model_id', $modelId)
                ->select()
                ->toArray();

            $formatted = array_map(function($item) {
                $paramDef = $item['param'] ?? [];
                return [
                    'id' => $item['id'],
                    'param_id' => $item['param_id'],
                    'param_name' => $paramDef['name'] ?? '',
                    'param_code' => $paramDef['code'] ?? '',
                    'type' => $paramDef['type'] ?? 'text',
                    'data_type' => $paramDef['data_type'] ?? 'string',
                    'unit' => $paramDef['unit'] ?? '',
                    'value' => $item['value'],
                    'value_numeric' => $item['value_numeric'],
                ];
            }, $params);

            return $this->success($formatted);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误', 500);
        }
    }
}
