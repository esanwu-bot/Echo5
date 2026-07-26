<?php
/**
 * 电子元器件商城 - 设置接口
 * 文件说明：集中返回站点设置、公司信息、SEO 等配置，供前端初始化与展示使用。
 */
declare (strict_types = 1);

namespace app\controller\api;

use app\BaseController;
use app\model\SkConfig;
use think\Request;
use think\Response;
use think\facade\Log;
use think\facade\Cache;

class SettingController extends BaseController
{
    /**
     * 获取所有设置
     */
    public function index(): Response
    {
        try {
            $lang = $this->request->lang ?? 'zh';
            $cacheKey = 'setting_index_' . $lang;
            
            $settings = Cache::remember($cacheKey, function() {
                return [
                    // 基本信息
                    'basic' => [
                        'site_name' => SkConfig::getConfigValue('site_name', '天启芯科技'),
                        'site_description' => SkConfig::getConfigValue('site_description', '专业的半导体元件供应商'),
                        'site_keywords' => SkConfig::getConfigValue('site_keywords', '半导体,电子元件,MOS管,二极管,三极管'),
                        'site_copyright' => SkConfig::getConfigValue('site_copyright', '© ' . date('Y') . ' 天启芯科技 版权所有')
                    ],
                    
                    // 联系信息
                    'contact' => [
                        'contact_phone' => SkConfig::getConfigValue('contact_phone', ''),
                        'contact_email' => SkConfig::getConfigValue('contact_email', ''),
                        'contact_address' => SkConfig::getConfigValue('contact_address', ''),
                        'contact_qq' => SkConfig::getConfigValue('contact_qq', ''),
                        'contact_wechat' => SkConfig::getConfigValue('contact_wechat', ''),
                        'service_time' => SkConfig::getConfigValue('service_time', '9:00-18:00')
                    ],
                    
                    // SEO设置
                    'seo' => [
                        'meta_title' => SkConfig::getConfigValue('meta_title', '天启芯科技 - 专业的半导体元件供应商'),
                        'meta_description' => SkConfig::getConfigValue('meta_description', '天启芯科技专注于半导体元件的研发、生产和销售，提供高品质的MOS管、二极管、三极管等电子元件'),
                        'meta_keywords' => SkConfig::getConfigValue('meta_keywords', '半导体,电子元件,MOS管,二极管,三极管'),
                        'og_image' => SkConfig::getConfigValue('og_image', ''),
                        'google_analytics' => SkConfig::getConfigValue('google_analytics', ''),
                        'baidu_analytics' => SkConfig::getConfigValue('baidu_analytics', ''),
                        'baidu_verification' => SkConfig::getConfigValue('baidu_verification', '')
                    ],
                    
                    // 第三方服务
                    'third_party' => [
                        'map_api_key' => SkConfig::getConfigValue('map_api_key', ''),
                        'map_provider' => SkConfig::getConfigValue('map_provider', 'baidu')
                    ],
                    
                    // 公司信息
                    'company' => [
                        'company_name' => SkConfig::getConfigValue('company_name', '天启芯科技有限公司'),
                        'company_short_name' => SkConfig::getConfigValue('company_short_name', '天启芯'),
                        'company_address' => SkConfig::getConfigValue('company_address', ''),
                        'company_phone' => SkConfig::getConfigValue('company_phone', ''),
                        'company_email' => SkConfig::getConfigValue('company_email', '')
                    ]
                ];
            }, 3600);
            
            $settings['timestamp'] = time();
            return $this->success($settings);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 获取分组设置
     */
    public function group(Request $request, $group = 'basic'): Response
    {
        try {
            // 验证分组
            $validGroups = ['basic', 'contact', 'seo', 'third_party', 'company'];
            if (!in_array($group, $validGroups)) {
                return $this->error('无效的设置分组', 400);
            }
            
            $lang = $this->request->lang ?? 'zh';
            $cacheKey = 'setting_group_' . $group . '_' . $lang;
            
            $settings = Cache::remember($cacheKey, function() use ($group) {
                // 根据分组返回相应的设置
                $settings = [];
                
                switch ($group) {
                    case 'basic':
                        $settings = [
                            'site_name' => SkConfig::getConfigValue('site_name', '天启芯科技'),
                            'site_description' => SkConfig::getConfigValue('site_description', '专业的半导体元件供应商'),
                            'site_keywords' => SkConfig::getConfigValue('site_keywords', '半导体,电子元件,MOS管,二极管,三极管'),
                            'site_copyright' => SkConfig::getConfigValue('site_copyright', '© ' . date('Y') . ' 天启芯科技 版权所有')
                        ];
                        break;
                        
                    case 'contact':
                        $settings = [
                            'contact_phone' => SkConfig::getConfigValue('contact_phone', ''),
                            'contact_email' => SkConfig::getConfigValue('contact_email', ''),
                            'contact_address' => SkConfig::getConfigValue('contact_address', ''),
                            'contact_qq' => SkConfig::getConfigValue('contact_qq', ''),
                            'contact_wechat' => SkConfig::getConfigValue('contact_wechat', ''),
                            'service_time' => SkConfig::getConfigValue('service_time', '9:00-18:00')
                        ];
                        break;
                        
                    case 'seo':
                        $settings = [
                            'meta_title' => SkConfig::getConfigValue('meta_title', '天启芯科技 - 专业的半导体元件供应商'),
                            'meta_description' => SkConfig::getConfigValue('meta_description', '天启芯科技专注于半导体元件的研发、生产和销售，提供高品质的MOS管、二极管、三极管等电子元件'),
                            'meta_keywords' => SkConfig::getConfigValue('meta_keywords', '半导体,电子元件,MOS管,二极管,三极管'),
                            'og_image' => SkConfig::getConfigValue('og_image', ''),
                            'google_analytics' => SkConfig::getConfigValue('google_analytics', ''),
                            'baidu_analytics' => SkConfig::getConfigValue('baidu_analytics', ''),
                            'baidu_verification' => SkConfig::getConfigValue('baidu_verification', '')
                        ];
                        break;
                        
                    case 'third_party':
                        $settings = [
                            'map_api_key' => SkConfig::getConfigValue('map_api_key', ''),
                            'map_provider' => SkConfig::getConfigValue('map_provider', 'baidu')
                        ];
                        break;
                        
                    case 'company':
                        $settings = [
                            'company_name' => SkConfig::getConfigValue('company_name', '天启芯科技有限公司'),
                            'company_short_name' => SkConfig::getConfigValue('company_short_name', '天启芯'),
                            'company_address' => SkConfig::getConfigValue('company_address', ''),
                            'company_phone' => SkConfig::getConfigValue('company_phone', ''),
                            'company_email' => SkConfig::getConfigValue('company_email', '')
                        ];
                        break;
                }
                
                return $settings;
            }, 3600);
            
            $settings['timestamp'] = time();
            return $this->success($settings);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}