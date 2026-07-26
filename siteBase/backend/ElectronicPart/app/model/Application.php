<?php
declare (strict_types = 1);

namespace app\model;

use think\Model;

/**
 * Application模型类 - 应用领域
 */
class Application extends Model
{
    // 设置表名
    protected $table = 'sk_application';
    
    // 设置字段信息
    protected $schema = [
        'id'           => 'int',
        'title'        => 'string',
        'title_en'     => 'string',
        'description'  => 'string',
        'description_en' => 'string',
        'cover_image'  => 'string',
        'icon'         => 'string',
        'content'      => 'string',
        'content_en'   => 'string',
        'features'     => 'json',
        'sort'         => 'int',
        'status'       => 'int',
        'create_time'  => 'datetime',
        'update_time'  => 'datetime',
    ];
    
    // 自动时间戳
    protected $autoWriteTimestamp = true;
    
    // JSON字段
    protected $json = ['features'];
    
    // 状态常量
    const STATUS_DISABLED = 0;  // 禁用
    const STATUS_ENABLED = 1;    // 启用
    
    /**
     * 获取状态列表
     */
    public static function getStatusList(): array
    {
        return [
            self::STATUS_DISABLED => '禁用',
            self::STATUS_ENABLED => '启用',
        ];
    }
    
    /**
     * 获取启用的应用领域
     */
    public static function getEnabledApplications(int $limit = 0): array
    {
        $query = self::where('status', self::STATUS_ENABLED)
            ->order('sort', 'asc')
            ->order('id', 'asc');
            
        if ($limit > 0) {
            $query->limit($limit);
        }
            
        return $query->select()
            ->toArray();
    }
    
    /**
     * 搜索应用领域
     */
    public static function searchApplications(string $keyword, int $limit = 10): array
    {
        return self::where('title', 'like', "%{$keyword}%")
            ->whereOr('description', 'like', "%{$keyword}%")
            ->where('status', self::STATUS_ENABLED)
            ->limit($limit)
            ->select()
            ->toArray();
    }
    
    /**
     * 根据ID获取应用领域
     */
    public static function getApplicationById(int $id): ?array
    {
        $application = self::where('id', $id)
            ->where('status', self::STATUS_ENABLED)
            ->find();
            
        return $application ? $application->toArray() : null;
    }
}