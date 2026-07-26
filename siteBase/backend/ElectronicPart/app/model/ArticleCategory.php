<?php
declare (strict_types = 1);

namespace app\model;

use think\Model;

/**
 * ArticleCategory模型类 - 文章分类
 */
class ArticleCategory extends Model
{
    // 设置表名
    protected $table = 'sk_article_category';
    
    // 设置字段信息
    protected $schema = [
        'id'          => 'int',
        'parent_id'   => 'int',
        'name'        => 'string',
        'name_en'     => 'string',
        'slug'        => 'string',
        'sort'        => 'int',
        'status'      => 'int',
        'create_time' => 'datetime',
        'update_time' => 'datetime',
    ];
    
    // 自动时间戳
    protected $autoWriteTimestamp = true;
    
    /**
     * 获取子分类
     */
    public function children()
    {
        return $this->hasMany(self::class, 'parent_id');
    }
    
    /**
     * 获取父分类
     */
    public function parent()
    {
        return $this->belongsTo(self::class, 'parent_id');
    }
    
    /**
     * 获取分类下的文章
     */
    public function articles()
    {
        return $this->hasMany(Article::class, 'category_id');
    }
    
    /**
     * 获取所有分类（树形结构）
     */
    public static function getCategoryTree(): array
    {
        $categories = self::where('status', 1)
            ->order('sort', 'asc')
            ->order('id', 'asc')
            ->select()
            ->toArray();
            
        return self::buildTree($categories);
    }
    
    /**
     * 构建树形结构
     */
    private static function buildTree(array $categories, int $parentId = 0): array
    {
        $tree = [];
        foreach ($categories as $category) {
            if ($category['parent_id'] == $parentId) {
                $children = self::buildTree($categories, $category['id']);
                if (!empty($children)) {
                    $category['children'] = $children;
                }
                $tree[] = $category;
            }
        }
        return $tree;
    }
}