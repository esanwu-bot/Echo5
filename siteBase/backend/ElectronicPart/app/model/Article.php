<?php
declare (strict_types = 1);

namespace app\model;

use think\Model;

/**
 * Article模型类 - 文章管理
 */
class Article extends Model
{
    // 设置表名
    protected $table = 'sk_article';
    
    // 设置字段信息
    protected $schema = [
        'id'               => 'int',
        'category_id'      => 'int',
        'title'            => 'string',
        'title_en'         => 'string',
        'slug'             => 'string',
        'author'           => 'string',
        'cover_image'      => 'string',
        'summary'          => 'string',
        'content'          => 'string',
        'content_en'       => 'string',
        'tags'             => 'string',
        'views'            => 'int',
        'status'           => 'int',
        'publish_time'     => 'datetime',
        'create_time'      => 'datetime',
        'update_time'      => 'datetime',
    ];
    
    // 自动时间戳
    protected $autoWriteTimestamp = true;
    
    // 状态常量
    const STATUS_DRAFT = 0;      // 草稿
    const STATUS_PUBLISHED = 1;   // 已发布
    const STATUS_ARCHIVED = 2;    // 已归档
    
    /**
     * 获取文章状态列表
     */
    public static function getStatusList(): array
    {
        return [
            self::STATUS_DRAFT => '草稿',
            self::STATUS_PUBLISHED => '已发布',
            self::STATUS_ARCHIVED => '已归档',
        ];
    }
    
    /**
     * 获取文章分类
     */
    public function category()
    {
        return $this->belongsTo(ArticleCategory::class, 'category_id');
    }
    
    /**
     * 获取已发布的文章
     */
    public static function getPublishedArticles(int $limit = 10): array
    {
        return self::where('status', self::STATUS_PUBLISHED)
            ->order('publish_time', 'desc')
            ->limit($limit)
            ->select()
            ->toArray();
    }
    
    /**
     * 根据分类获取文章
     */
    public static function getArticlesByCategory(int $categoryId, int $limit = 10): array
    {
        return self::where('category_id', $categoryId)
            ->where('status', self::STATUS_PUBLISHED)
            ->order('publish_time', 'desc')
            ->limit($limit)
            ->select()
            ->toArray();
    }
    
    /**
     * 搜索文章
     */
    public static function searchArticles(string $keyword, int $limit = 10): array
    {
        return self::where('title', 'like', "%{$keyword}%")
            ->whereOr('content', 'like', "%{$keyword}%")
            ->whereOr('summary', 'like', "%{$keyword}%")
            ->where('status', self::STATUS_PUBLISHED)
            ->limit($limit)
            ->select()
            ->toArray();
    }
}