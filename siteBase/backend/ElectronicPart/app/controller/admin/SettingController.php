<?php

namespace app\controller\admin;
use think\facade\Log;

use app\controller\BaseController;
use app\model\SkConfig;
use think\exception\ValidateException;
use think\facade\Validate;
use think\facade\Cache;
use think\facade\Db;
use think\facade\Config;

class SettingController extends BaseController
{
    /**
     * 获取系统设置
     */
    public function index()
    {
        try {
            // 从缓存获取设置
            $settings = Cache::get('system_settings');
            
            if (!$settings) {
                $settings = $this->getSettingsFromDatabase();
                Cache::set('system_settings', $settings, 3600);
            }

            return $this->success($settings);

        } catch (\Exception $e) {
            Log::error('Get settings error: ' . $e->getMessage());
            return $this->error('获取系统设置失败');
        }
    }

    /**
     * 更新系统设置
     */
    public function update()
    {
        try {
            // 参数验证
            $validate = Validate::rule([
                'site_name' => 'max:100',
                'site_description' => 'max:500',
                'site_keywords' => 'max:200',
                'contact_phone' => 'max:20',
                'contact_email' => 'email|max:100',
                'contact_address' => 'max:200',
                'order_auto_cancel_minutes' => 'integer|>=:1',
                'order_auto_confirm_days' => 'integer|>=:1',
                'low_stock_threshold' => 'integer|>=:0',
                'upload_max_size' => 'integer|>=:1',
                'upload_allowed_ext' => 'max:200'
            ])->message([
                'site_name.max' => '网站名称不能超过100个字符',
                'site_description.max' => '网站描述不能超过500个字符',
                'site_keywords.max' => '网站关键词不能超过200个字符',
                'contact_phone.max' => '联系电话不能超过20个字符',
                'contact_email.email' => '联系邮箱格式不正确',
                'contact_email.max' => '联系邮箱不能超过100个字符',
                'contact_address.max' => '联系地址不能超过200个字符',
                'order_auto_cancel_minutes.integer' => '订单自动取消时间必须是整数',
                'order_auto_confirm_days.integer' => '订单自动确认天数必须是整数',
                'low_stock_threshold.integer' => '库存预警阈值必须是整数',
                'upload_max_size.integer' => '上传文件大小限制必须是整数',
                'upload_allowed_ext.max' => '允许上传的文件类型不能超过200个字符'
            ]);

            $params = $this->request->param();
            if (!$validate->check($params)) {
                return $this->error($validate->getError());
            }

            // 更新设置到数据库
            $this->updateSettingsToDatabase($params);

            // 清除缓存
            Cache::delete('system_settings');

            return $this->success([], '系统设置更新成功');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error('Update settings error: ' . $e->getMessage());
            return $this->error('更新系统设置失败');
        }
    }

    /**
     * 获取分组设置
     */
    public function group($group = 'basic')
    {
        try {
            // 从缓存获取设置
            $cacheKey = 'settings_' . $group;
            $settings = Cache::get($cacheKey);
            
            if (!$settings) {
                $settings = SkConfig::getGroupConfigs($group);
                Cache::set($cacheKey, $settings, 3600);
            }

            return $this->success($settings);

        } catch (\Exception $e) {
            Log::error('Get group settings error: ' . $e->getMessage());
            return $this->error('获取系统设置失败');
        }
    }

    /**
     * 更新分组设置
     */
    public function updateGroup($group = 'basic')
    {
        try {
            $params = $this->request->param();
            
            // 验证分组是否存在
            $validGroups = ['basic', 'contact', 'seo', 'third_party', 'company'];
            if (!in_array($group, $validGroups)) {
                return $this->error('无效的设置分组');
            }
            
            // 更新设置
            foreach ($params as $key => $value) {
                SkConfig::setConfigValue($key, $value, '', $group);
            }
            
            // 清除缓存
            Cache::delete('settings_' . $group);
            Cache::delete('system_settings');

            return $this->success([], '设置更新成功');

        } catch (\Exception $e) {
            Log::error('Update group settings error: ' . $e->getMessage());
            return $this->error('更新设置失败');
        }
    }

    /**
     * 备份数据库
     */
    public function backup()
    {
        try {
            $backupFile = $this->createDatabaseBackup();
            
            return $this->success([
                'backup_file' => $backupFile,
                'backup_time' => date('Y-m-d H:i:s'),
                'file_size' => $this->formatFileSize(filesize($backupFile))
            ], '数据库备份成功');

        } catch (\Exception $e) {
            Log::error('Database backup error: ' . $e->getMessage());
            return $this->error('数据库备份失败，请稍后重试', 500);
        }
    }

    /**
     * 恢复数据库
     */
    public function restore()
    {
        try {
            $backupFile = $this->request->param('backup_file');
            
            if (empty($backupFile)) {
                return $this->error('请选择备份文件');
            }

            if (!file_exists($backupFile)) {
                return $this->error('备份文件不存在');
            }

            $this->restoreDatabase($backupFile);

            return $this->success([], '数据库恢复成功');

        } catch (\Exception $e) {
            Log::error('Database restore error: ' . $e->getMessage());
            return $this->error('数据库恢复失败，请稍后重试', 500);
        }
    }

    /**
     * 从数据库获取设置
     */
    private function getSettingsFromDatabase()
    {
        return [
            // 基本信息
            'basic' => [
                'site_name' => SkConfig::getConfigValue('site_name', '天启芯科技'),
                'site_logo' => SkConfig::getConfigValue('site_logo', ''),
                'site_description' => SkConfig::getConfigValue('site_description', '专业的半导体元件供应商'),
                'site_keywords' => SkConfig::getConfigValue('site_keywords', '半导体,电子元件,MOS管,二极管,三极管'),
                'site_icp' => SkConfig::getConfigValue('site_icp', ''),
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
                'map_provider' => SkConfig::getConfigValue('map_provider', 'baidu'),
                'google_site_verification' => SkConfig::getConfigValue('google_site_verification', ''),
                'customer_service_code' => SkConfig::getConfigValue('customer_service_code', '')
            ],
            
            // 公司信息
            'company' => [
                'company_name' => SkConfig::getConfigValue('company_name', '天启芯科技有限公司'),
                'company_short_name' => SkConfig::getConfigValue('company_short_name', '天启芯'),
                'company_english_name' => SkConfig::getConfigValue('company_english_name', 'TianQiXin Technology'),
                'company_address' => SkConfig::getConfigValue('company_address', ''),
                'company_phone' => SkConfig::getConfigValue('company_phone', ''),
                'company_email' => SkConfig::getConfigValue('company_email', ''),
                'company_fax' => SkConfig::getConfigValue('company_fax', ''),
                'company_postcode' => SkConfig::getConfigValue('company_postcode', ''),
                'company_website' => SkConfig::getConfigValue('company_website', ''),
                'business_license' => SkConfig::getConfigValue('business_license', ''),
                'tax_number' => SkConfig::getConfigValue('tax_number', ''),
                'bank_account' => SkConfig::getConfigValue('bank_account', ''),
                'bank_name' => SkConfig::getConfigValue('bank_name', '')
            ],
            
            // 订单设置
            'order' => [
                'order_auto_cancel_minutes' => intval(SkConfig::getConfigValue('order_auto_cancel_minutes', 30)),
                'order_auto_confirm_days' => intval(SkConfig::getConfigValue('order_auto_confirm_days', 7)),
                'order_prefix' => SkConfig::getConfigValue('order_prefix', 'TQX'),
                'allow_guest_order' => SkConfig::getConfigValue('allow_guest_order', '0') === '1',
                'min_order_amount' => floatval(SkConfig::getConfigValue('min_order_amount', 0))
            ],
            
            // 库存设置
            'inventory' => [
                'low_stock_threshold' => intval(SkConfig::getConfigValue('low_stock_threshold', 10)),
                'out_of_stock_threshold' => intval(SkConfig::getConfigValue('out_of_stock_threshold', 0)),
                'stock_deduction_time' => SkConfig::getConfigValue('stock_deduction_time', 'order'),
                'allow_oversell' => SkConfig::getConfigValue('allow_oversell', '0') === '1'
            ],
            
            // 上传设置
            'upload' => [
                'upload_max_size' => intval(SkConfig::getConfigValue('upload_max_size', 10485760)),
                'upload_allowed_ext' => SkConfig::getConfigValue('upload_allowed_ext', 'jpg,jpeg,png,gif,webp,pdf,doc,docx,xls,xlsx'),
                'upload_path' => SkConfig::getConfigValue('upload_path', '/uploads'),
                'image_quality' => intval(SkConfig::getConfigValue('image_quality', 80)),
                'create_thumbnail' => SkConfig::getConfigValue('create_thumbnail', '1') === '1',
                'thumbnail_size' => SkConfig::getConfigValue('thumbnail_size', '300x300')
            ]
        ];
    }

    /**
     * 更新设置到数据库
     */
    private function updateSettingsToDatabase($params)
    {
        // 更新基本信息
        if (isset($params['site_name'])) SkConfig::setConfigValue('site_name', $params['site_name'], '网站名称', 'basic');
        if (isset($params['site_logo'])) SkConfig::setConfigValue('site_logo', $params['site_logo'], '网站LOGO', 'basic');
        if (isset($params['site_description'])) SkConfig::setConfigValue('site_description', $params['site_description'], '网站描述', 'basic');
        if (isset($params['site_keywords'])) SkConfig::setConfigValue('site_keywords', $params['site_keywords'], '网站关键词', 'basic');
        if (isset($params['site_icp'])) SkConfig::setConfigValue('site_icp', $params['site_icp'], 'ICP备案号', 'basic');
        if (isset($params['site_copyright'])) SkConfig::setConfigValue('site_copyright', $params['site_copyright'], '版权信息', 'basic');
        
        // 更新联系信息
        if (isset($params['contact_phone'])) SkConfig::setConfigValue('contact_phone', $params['contact_phone'], '联系电话', 'contact');
        if (isset($params['contact_email'])) SkConfig::setConfigValue('contact_email', $params['contact_email'], '联系邮箱', 'contact');
        if (isset($params['contact_address'])) SkConfig::setConfigValue('contact_address', $params['contact_address'], '联系地址', 'contact');
        if (isset($params['contact_qq'])) SkConfig::setConfigValue('contact_qq', $params['contact_qq'], 'QQ号', 'contact');
        if (isset($params['contact_wechat'])) SkConfig::setConfigValue('contact_wechat', $params['contact_wechat'], '微信号', 'contact');
        if (isset($params['service_time'])) SkConfig::setConfigValue('service_time', $params['service_time'], '服务时间', 'contact');
        
        // 更新SEO设置
        if (isset($params['meta_title'])) SkConfig::setConfigValue('meta_title', $params['meta_title'], 'SEO标题', 'seo');
        if (isset($params['meta_description'])) SkConfig::setConfigValue('meta_description', $params['meta_description'], 'SEO描述', 'seo');
        if (isset($params['meta_keywords'])) SkConfig::setConfigValue('meta_keywords', $params['meta_keywords'], 'SEO关键词', 'seo');
        if (isset($params['og_image'])) SkConfig::setConfigValue('og_image', $params['og_image'], '社交分享图片', 'seo');
        if (isset($params['google_analytics'])) SkConfig::setConfigValue('google_analytics', $params['google_analytics'], 'Google Analytics代码', 'seo');
        if (isset($params['baidu_analytics'])) SkConfig::setConfigValue('baidu_analytics', $params['baidu_analytics'], '百度统计代码', 'seo');
        if (isset($params['baidu_verification'])) SkConfig::setConfigValue('baidu_verification', $params['baidu_verification'], '百度站长验证代码', 'seo');
        
        // 更新第三方服务
        if (isset($params['map_api_key'])) SkConfig::setConfigValue('map_api_key', $params['map_api_key'], '地图API Key', 'third_party');
        if (isset($params['map_provider'])) SkConfig::setConfigValue('map_provider', $params['map_provider'], '地图服务商', 'third_party');
        if (isset($params['google_site_verification'])) SkConfig::setConfigValue('google_site_verification', $params['google_site_verification'], 'Google站点验证', 'third_party');
        if (isset($params['customer_service_code'])) SkConfig::setConfigValue('customer_service_code', $params['customer_service_code'], '客服代码', 'third_party');
        
        // 更新公司信息
        if (isset($params['company_name'])) SkConfig::setConfigValue('company_name', $params['company_name'], '公司全称', 'company');
        if (isset($params['company_short_name'])) SkConfig::setConfigValue('company_short_name', $params['company_short_name'], '公司简称', 'company');
        if (isset($params['company_english_name'])) SkConfig::setConfigValue('company_english_name', $params['company_english_name'], '公司英文名称', 'company');
        if (isset($params['company_address'])) SkConfig::setConfigValue('company_address', $params['company_address'], '公司地址', 'company');
        if (isset($params['company_phone'])) SkConfig::setConfigValue('company_phone', $params['company_phone'], '公司电话', 'company');
        if (isset($params['company_email'])) SkConfig::setConfigValue('company_email', $params['company_email'], '公司邮箱', 'company');
        if (isset($params['company_fax'])) SkConfig::setConfigValue('company_fax', $params['company_fax'], '公司传真', 'company');
        if (isset($params['company_postcode'])) SkConfig::setConfigValue('company_postcode', $params['company_postcode'], '邮政编码', 'company');
        if (isset($params['company_website'])) SkConfig::setConfigValue('company_website', $params['company_website'], '公司网站', 'company');
        if (isset($params['business_license'])) SkConfig::setConfigValue('business_license', $params['business_license'], '营业执照号', 'company');
        if (isset($params['tax_number'])) SkConfig::setConfigValue('tax_number', $params['tax_number'], '税号', 'company');
        if (isset($params['bank_account'])) SkConfig::setConfigValue('bank_account', $params['bank_account'], '银行账号', 'company');
        if (isset($params['bank_name'])) SkConfig::setConfigValue('bank_name', $params['bank_name'], '开户银行', 'company');
        
        // 更新订单设置
        if (isset($params['order_auto_cancel_minutes'])) SkConfig::setConfigValue('order_auto_cancel_minutes', $params['order_auto_cancel_minutes'], '订单自动取消时间(分钟)', 'order');
        if (isset($params['order_auto_confirm_days'])) SkConfig::setConfigValue('order_auto_confirm_days', $params['order_auto_confirm_days'], '订单自动确认天数', 'order');
        if (isset($params['order_prefix'])) SkConfig::setConfigValue('order_prefix', $params['order_prefix'], '订单前缀', 'order');
        if (isset($params['allow_guest_order'])) SkConfig::setConfigValue('allow_guest_order', $params['allow_guest_order'] ? '1' : '0', '允许游客下单', 'order');
        if (isset($params['min_order_amount'])) SkConfig::setConfigValue('min_order_amount', $params['min_order_amount'], '最小订单金额', 'order');
        
        // 更新库存设置
        if (isset($params['low_stock_threshold'])) SkConfig::setConfigValue('low_stock_threshold', $params['low_stock_threshold'], '低库存预警阈值', 'inventory');
        if (isset($params['out_of_stock_threshold'])) SkConfig::setConfigValue('out_of_stock_threshold', $params['out_of_stock_threshold'], '缺货阈值', 'inventory');
        if (isset($params['stock_deduction_time'])) SkConfig::setConfigValue('stock_deduction_time', $params['stock_deduction_time'], '库存扣减时间', 'inventory');
        if (isset($params['allow_oversell'])) SkConfig::setConfigValue('allow_oversell', $params['allow_oversell'] ? '1' : '0', '允许超卖', 'inventory');
        
        // 更新上传设置
        if (isset($params['upload_max_size'])) SkConfig::setConfigValue('upload_max_size', $params['upload_max_size'], '上传文件最大大小', 'upload');
        if (isset($params['upload_allowed_ext'])) SkConfig::setConfigValue('upload_allowed_ext', $params['upload_allowed_ext'], '允许上传的文件扩展名', 'upload');
        if (isset($params['upload_path'])) SkConfig::setConfigValue('upload_path', $params['upload_path'], '文件上传路径', 'upload');
        if (isset($params['image_quality'])) SkConfig::setConfigValue('image_quality', $params['image_quality'], '图片质量', 'upload');
        if (isset($params['create_thumbnail'])) SkConfig::setConfigValue('create_thumbnail', $params['create_thumbnail'] ? '1' : '0', '创建缩略图', 'upload');
        if (isset($params['thumbnail_size'])) SkConfig::setConfigValue('thumbnail_size', $params['thumbnail_size'], '缩略图尺寸', 'upload');
        
        return true;
    }

    /**
     * 创建数据库备份
     */
    private function createDatabaseBackup()
    {
        $config = Config::get('database.connections.mysql');
        $host = $config['hostname'];
        $port = $config['hostport'];
        $database = $config['database'];
        $username = $config['username'];
        $password = $config['password'];
        
        $backupDir = runtime_path() . 'backup';
        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0755, true);
        }
        
        $backupFile = $backupDir . '/' . $database . '_' . date('YmdHis') . '.sql';
        
        $command = "mysqldump -h{$host} -P{$port} -u{$username} -p{$password} {$database} > {$backupFile}";
        exec($command);
        
        if (!file_exists($backupFile)) {
            throw new \Exception('数据库备份失败');
        }
        
        return $backupFile;
    }

    /**
     * 恢复数据库
     */
    private function restoreDatabase($backupFile)
    {
        $config = Config::get('database.connections.mysql');
        $host = $config['hostname'];
        $port = $config['hostport'];
        $database = $config['database'];
        $username = $config['username'];
        $password = $config['password'];
        
        $command = "mysql -h{$host} -P{$port} -u{$username} -p{$password} {$database} < {$backupFile}";
        exec($command);
        
        return true;
    }

    /**
     * 格式化文件大小
     */
    private function formatFileSize($bytes)
    {
        if ($bytes >= 1073741824) {
            return round($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return round($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return round($bytes / 1024, 2) . ' KB';
        } else {
            return $bytes . ' bytes';
        }
    }
}