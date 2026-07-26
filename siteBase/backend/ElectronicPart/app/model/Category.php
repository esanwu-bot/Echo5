<?php

namespace app\model;

use think\Model;

/**
 * 商品分类模型
 */
class Category extends Model
{
    protected $table = 'sk_category';
    
    // 设置字段信息
    protected $schema = [
        'id'           => 'int',
        'parent_id'    => 'int',
        'name'         => 'string',
        'name_en'      => 'string',
        'name_zh_hant' => 'string',
        'slug'         => 'string',
        'icon'         => 'string',
        'sort'         => 'int',
        'status'       => 'int',
        'create_time'  => 'datetime',
        'update_time'  => 'datetime',
        'code'         => 'string',
    ];
    
    // 自动时间戳
    protected $autoWriteTimestamp = 'datetime';
    
    // 状态常量
    const STATUS_DISABLED = 0;
    const STATUS_ENABLED = 1;
    
    /**
     * 获取启用的分类
     */
    public function scopeEnabled($query)
    {
        return $query->where('status', self::STATUS_ENABLED);
    }
    
    /**
     * 按排序获取
     */
    public function scopeSort($query)
    {
        return $query->order('sort', 'asc')->order('id', 'asc');
    }
    
    /**
     * 获取父分类
     */
    public function parent()
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }
    
    /**
     * 获取子分类
     */
    public function children()
    {
        return $this->hasMany(Category::class, 'parent_id');
    }
    
    /**
     * 关联产品
     */
    public function products()
    {
        return $this->hasMany(Product::class, 'category_id');
    }
}