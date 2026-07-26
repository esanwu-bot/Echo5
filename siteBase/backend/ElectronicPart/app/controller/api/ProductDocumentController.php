<?php

namespace app\controller\api;

use app\controller\BaseController;
use app\model\SkProductDocument;
use think\facade\Db;
use think\Response;
use think\facade\Log;

class ProductDocumentController extends BaseController
{
    /**
     * 获取产品文档列表
     * GET /api/v1/product-documents
     */
    public function index(): Response
    {
        try {
            $params = $this->request->get();
            $seriesId = (int)($params['series_id'] ?? 0);
            $modelId = (int)($params['model_id'] ?? 0);
            $docType = $params['doc_type'] ?? '';

            $query = SkProductDocument::where('status', 1);

            if ($seriesId > 0) {
                $query->where('series_id', $seriesId);
            }
            if ($modelId > 0) {
                $query->where('model_id', $modelId);
            }
            if (!empty($docType)) {
                $query->where('doc_type', $docType);
            }

            $documents = $query->order('create_time', 'desc')->select()->toArray();

            return $this->success($documents);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误', 500);
        }
    }

    /**
     * 获取单个文档详情
     * GET /api/v1/product-documents/:id
     */
    public function read($id): Response
    {
        try {
            $doc = SkProductDocument::where('id', $id)->where('status', 1)->find();
            if (!$doc) {
                return $this->error('文档不存在', 404);
            }
            return $this->success($doc);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误', 500);
        }
    }
}
