<?php
declare (strict_types = 1);

namespace app\model;

use think\Model;

/**
 * SkConfig模型类
 * 系统配置模型
 */
class SkConfig extends Model
{
    protected $table = 'sk_config';
    protected $pk = 'id';
    
    // 自动时间戳
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';
    
    // 类型转换
    protected $type = [
        'id' => 'integer',
    ];
    
    /**
     * 获取配置值
     * @param string $key 配置键
     * @param mixed $default 默认值
     * @return mixed
     */
    public static function getConfigValue(string $key, $default = null)
    {
        $config = self::where('config_key', $key)->find();
        return $config ? $config->config_value : $default;
    }
    
    /**
     * 设置配置值
     * @param string $key 配置键
     * @param mixed $value 配置值
     * @param string $description 描述
     * @param string $group 分组
     * @return bool
     */
    public static function setConfigValue(string $key, $value, string $description = '', string $group = 'system')
    {
        $config = self::where('config_key', $key)->find();
        
        if ($config) {
            $config->config_value = is_array($value) ? json_encode($value) : $value;
            $config->description = $description;
            $config->group = $group;
            return $config->save();
        } else {
            return self::create([
                'config_key' => $key,
                'config_value' => is_array($value) ? json_encode($value) : $value,
                'description' => $description,
                'group' => $group
            ]) ? true : false;
        }
    }
    
    /**
     * 获取分组配置
     * @param string $group 分组名称
     * @return array
     */
    public static function getGroupConfigs(string $group)
    {
        $configs = self::where('group', $group)->select();
        $result = [];
        
        foreach ($configs as $config) {
            $result[$config->config_key] = $config->config_value;
        }
        
        return $result;
    }
    
    /**
     * 获取所有配置
     * @return array
     */
    public static function getAllConfigs()
    {
        $configs = self::select();
        $result = [];
        
        foreach ($configs as $config) {
            $result[$config->config_key] = $config->config_value;
        }
        
        return $result;
    }
}