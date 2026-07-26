<?php
/**
 * 电子元器件商城 - 横幅/Banner 前台接口
 * 文件说明：提供首页或指定位置的横幅数据查询，返回本地化并处理图片 URL 的结果。
 */

namespace app\controller\api;

use app\BaseController;
use app\model\SkBanner;
use think\facade\Log;

/**
 * 横幅API控制器
 * @package app\controller\api
 */
class BannerController extends BaseController
{
    /**
     * 获取横幅列表
     * GET /api/v1/banners?position=home
     */
    public function index()
    {
        try {
            $params = $this->request->param();
            $position = $params['position'] ?? 'home';
            $lang = $this->getLang();
            $cacheKey = 'banner_index_' . $lang . '_' . $position;

            $bannerList = \think\facade\Cache::remember($cacheKey, function () use ($position) {
                $banners = SkBanner::position($position)
                                   ->enabled()
                                   ->active()
                                   ->sorted()
                                   ->select();

                // 本地化 Banner 数据
                $localizedFields = ['title', 'subtitle', 'description'];
                $bannerList = $this->localizeCollection($banners, $localizedFields);

                $baseUrl = $this->getWebsiteUrl();

                // 处理图片 URL
                $bannerList = array_map(function($banner) use ($baseUrl) {
                    $banner['image'] = $this->getFullUrl($banner['image'] ?? '', $baseUrl);
                    return $banner;
                }, $bannerList);

                return $bannerList;
            }, 3600);

            return $this->success($bannerList, 'success');
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 获取网站地址配置
     */
    private function getWebsiteUrl()
    {
        $config = \think\facade\Db::table('sk_config')
            ->where('config_key', 'website_url')
            ->find();
        
        if ($config && !empty($config['config_value'])) {
            return rtrim($config['config_value'], '/');
        }
        
        return $this->request->domain();
    }

    /**
     * 获取完整URL
     */
    private function getFullUrl($path, $baseUrl = null)
    {
        if (empty($path)) {
            return '';
        }
        
        if (strpos($path, 'http') === 0) {
            return $path;
        }
        
        if ($baseUrl === null) {
            $baseUrl = $this->getWebsiteUrl();
        }
        
        return $baseUrl . '/' . ltrim($path, '/');
    }
}