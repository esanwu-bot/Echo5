<?php
/**
 * 电子元器件商城 - 文档管理接口
 * 文件说明：提供产品手册、数据表、资料下载等文档的查询与详情接口。
 */
declare (strict_types = 1);

namespace app\controller\api;

use app\BaseController;
use app\model\SkDocument;
use think\Request;
use think\Response;
use think\facade\Log;
use think\facade\Cache;

class DocumentController extends BaseController
{
    /**
     * 文档列表
     */
    public function index(Request $request): Response
    {
        $params = $request->param();
        $page = (int)($params['page'] ?? 1);
        $limit = (int)($params['limit'] ?? 20);
        $category = $params['category'] ?? '';
        $keyword = $params['keyword'] ?? '';

        $lang = $request->lang ?? 'zh';
        $cacheKey = 'document_index_' . $lang . '_p' . $page . '_l' . $limit . '_c' . $category . '_k' . $keyword;

        $data = Cache::remember($cacheKey, function () use ($category, $keyword, $limit, $page) {
            $query = SkDocument::where('status', 1); // 只显示已启用的文档

            // 按分类筛选
            if (!empty($category)) {
                $query->where('category', $category);
            }

            // 按关键词搜索
            if (!empty($keyword)) {
                $query->where('title|description', 'like', '%' . $keyword . '%');
            }

            // 按排序值和创建时间排序
            // Order by sort then created_at (some databases use created_at instead of create_time)
            $documents = $query->order('sort', 'asc')
                              ->order('created_at', 'desc')
                              ->paginate([
                                  'list_rows' => $limit,
                                  'page' => $page
                              ]);

            // 本地化文章数据
            $localizedFields = ['title', 'content'];
            $localizedList = $this->localizeCollection($documents->items(), $localizedFields);

            // 处理数据，移除不必要的字段
            $processedList = [];
            foreach ($localizedList as $item) {
                // $item is now an array from toLocalizedArray
                $createdAt = $item['created_at'] ?? $item['create_time'] ?? null;
                $processedItem = [
                    'id' => $item['id'],
                    'title' => $item['title'],
                    'description' => $item['content'] ?? '', // Document table uses content or description
                    'category' => $item['category'],
                    'file_path' => $item['file_path'] ?? '',
                    //'file_path' => $item['file_path'] ?: ($item['file_url'] ?? ''),
                    'file_size' => $item['file_size'] ?? 0,
                    'file_type' => $item['file_type'] ?? '',
                    'download_count' => $item['download_count'] ?? 0,
                    'create_time' => $createdAt ? (is_numeric($createdAt) ? (int)$createdAt : strtotime($createdAt)) : null,
                ];
                $processedList[] = $processedItem;
            }

            return [
                'list' => $processedList,
                'total' => $documents->total(),
                'current_page' => $documents->currentPage(),
                'per_page' => $documents->listRows(),
                'last_page' => $documents->lastPage(),
            ];
        }, 3600);

        try {
            $data['timestamp'] = time();
            return $this->success([
                'list' => $data['list'],
                'total' => $data['total'],
                'current_page' => $data['current_page'],
                'per_page' => $data['per_page'],
                'last_page' => $data['last_page'],
                'timestamp' => $data['timestamp'],
            ]);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 文档详情
     */
    public function read(Request $request, $id): Response
    {
        $lang = $request->lang ?? 'zh';
        $cacheKey = 'document_read_' . $id . '_' . $lang;

        $data = Cache::remember($cacheKey, function () use ($id) {
            $document = SkDocument::where('id', $id)->where('status', 1)->find();

            if (!$document) {
                return null;
            }

            // 本地化文档数据
            $localizedFields = ['title', 'content'];
            $documentData = $this->localizeItem($document, $localizedFields);

            // 准备返回数据，不包含完整内容
            $createdAt = $documentData['created_at'] ?? $documentData['create_time'] ?? null;
            $updatedAt = $documentData['updated_at'] ?? $documentData['update_time'] ?? null;
            $data = [
                'id' => $documentData['id'],
                'title' => $documentData['title'],
                'description' => $documentData['content'] ?? '',
                'category' => $documentData['category'],
                'file_path' => $documentData['file_path'] ?: ($documentData['file_url'] ?? ''),
                'file_size' => $documentData['file_size'] ?? 0,
                'file_type' => $documentData['file_type'] ?? '',
                'download_count' => $documentData['download_count'] ?? 0,
                'create_time' => $createdAt ? (is_numeric($createdAt) ? (int)$createdAt : strtotime($createdAt)) : null,
                'update_time' => $updatedAt ? (is_numeric($updatedAt) ? (int)$updatedAt : strtotime($updatedAt)) : null,
            ];

            return $data;
        }, 3600);

        try {
            if ($data === null) {
                return $this->error('文档不存在或已下线', 404);
            }

            $data['timestamp'] = time();
            return $this->success($data);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 文档下载
     */
    public function download(Request $request, $id): Response
    {
        try {
            $document = SkDocument::where('id', $id)->where('status', 1)->find();

            if (!$document) {
                return $this->error('文档不存在或已下线', 404);
            }

            // 支持 file_path 或 file_url 字段
            $docPath = $document->file_path ?: ($document->file_url ?? '');
            if (empty($docPath)) {
                return $this->error('文档文件路径为空', 400);
            }

            // 增加下载次数
            $document->download_count += 1;
            $document->save();

            // 如果文档路径是一个可访问的 URL（以 / 开头或以 http 开头），直接重定向到该 URL
            if (strpos($docPath, 'http') === 0) {
                return redirect($docPath);
            }

            if (strpos($docPath, '/') === 0) {
                // 构建绝对 URL 并重定向（例如 /documents/xxx.pdf -> http(s)://host/documents/xxx.pdf）
                $url = $request->domain() . $docPath;
                return redirect($url);
            }

            // 否则视为文件系统路径，尝试从磁盘返回（使用 app()->getRootPath() 以避免未定义常量）
            $rootPath = function_exists('app') ? app()->getRootPath() : null;
            if ($rootPath) {
                $filePath = $rootPath . 'public' . DIRECTORY_SEPARATOR . ltrim($docPath, '\\/');
                if (file_exists($filePath)) {
                    $fileType = $document->file_type ?: 'application/octet-stream';
                    $fileName = $document->title . '.' . pathinfo($docPath, PATHINFO_EXTENSION);
                    return download($filePath, $fileName)->contentType($fileType);
                }
            }

            return $this->error('文件不存在或无法访问', 404);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取文档分类列表
     */
    public function categories(Request $request): Response
    {
        $lang = $request->lang ?? 'zh';
        $cacheKey = 'document_categories_' . $lang;

        $categoryList = Cache::remember($cacheKey, function () {
            // 获取所有启用的文档分类
            $categories = SkDocument::where('status', 1)
                                    ->where('category', '<>', '')
                                    ->distinct()
                                    ->field('category')
                                    ->select();

            $list = [];
            foreach ($categories as $category) {
                $list[] = $category->category;
            }

            return $list;
        }, 3600);

        try {
            return $this->success([
                'list' => $categoryList,
                'timestamp' => time(),
            ]);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}
