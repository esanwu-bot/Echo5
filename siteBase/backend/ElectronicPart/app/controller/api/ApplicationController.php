<?php
/**
 * 电子元器件商城 - 应用/用途接口
 * 文件说明：提供应用（用途/场景）列表与详情接口，供前端展示与过滤使用。
 */
declare(strict_types=1);

namespace app\controller\api;

use app\controller\BaseController;
use app\model\SkApplication;
use think\Response;
use think\facade\Log;

/**
 * 应用API控制器
 * @package app\controller\api
 */
class ApplicationController extends BaseController
{
    /**
     * 获取应用列表
     * GET /api/v1/applications?limit=6&category=industrial
     */
    public function index(): Response
    {
        try {
            $params = $this->request->get();
            
            $limit = (int)($params['limit'] ?? 20);
            $category = $params['category'] ?? '';
            
            $lang = $this->getLang();
            $cacheKey = 'application_index_' . $lang . '_' . $limit . '_' . $category;

            $applications = \think\facade\Cache::remember($cacheKey, function () use ($limit, $category) {
                $query = SkApplication::active()
                    ->order('sort', 'asc')
                    ->order('create_time', 'desc');
                
                // Filter by category if provided
                if (!empty($category)) {
                    $query->where('category', $category);
                }
                
                $applications = $query->limit($limit)->select();
                $applications = $this->localizeCollection($applications, ['title', 'description']);
                $applications = $this->processImageUrls($applications, ['image', 'icon']);

                // description 前端以纯文本渲染，过滤HTML标签（含畸形标签）
                foreach ($applications as &$item) {
                    if (!empty($item['description'])) {
                        $item['description'] = $this->stripHtmlTags($item['description']);
                    }
                }
                unset($item);
                
                return $applications;
            }, 3600);

            return $this->success($applications);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 获取应用详情
     * GET /api/v1/applications/:id
     */
    public function read(string $id): Response
    {
        try {
            $application = SkApplication::with(['products'])
                ->where('id', $id)
                ->where('status', 1)
                ->find();
            
            if (!$application) {
                return $this->error('应用不存在', 404);
            }

            $lang = $this->getLang();
            $cacheKey = 'application_read_' . $lang . '_' . $id;

            $applicationData = \think\facade\Cache::remember($cacheKey, function () use ($id) {
                $application = SkApplication::with(['products'])
                    ->where('id', $id)
                    ->where('status', 1)
                    ->find();
                
                $applicationData = $this->localizeItem($application, ['title', 'description', 'content']);
                $applicationData = $this->processImageUrls($applicationData, ['image', 'icon']);

                // 翻译关联产品（product模块: name/description）
                $lang = $this->getLangCode();
                if (!empty($applicationData['products']) && is_array($applicationData['products'])) {
                    $i18nService = app(\app\service\I18nService::class);
                    $applicationData['products'] = $i18nService->mapData(
                        $applicationData['products'], 'product', $lang, ['name', 'description']
                    );
                }

                // description 前端以纯文本渲染，过滤HTML标签（含畸形标签）
                if (!empty($applicationData['description'])) {
                    $applicationData['description'] = $this->stripHtmlTags($applicationData['description']);
                }

                // content 修复机器翻译产生的畸形HTML标签: "< p >" → "<p>", "< /p >" → "</p>"
                if (!empty($applicationData['content'])) {
                    $applicationData['content'] = preg_replace(
                        '/<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)((?:[^>"]*|"[^"]*")*?)\s*>/',
                        '<$1$2$3>',
                        $applicationData['content']
                    );
                }
                
                return $applicationData;
            }, 3600);

            return $this->success($applicationData);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}
