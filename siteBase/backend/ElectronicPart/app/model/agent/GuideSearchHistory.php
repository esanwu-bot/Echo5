<?php
/**
 * 电子元器件商城 - 导购搜索历史模型
 * 文件说明：定义guide_search_history数据表结构、关联关系与业务方法。
 * 数据表：guide_search_history
 */
namespace app\model\agent;

use think\Model;

/**
 * 导购搜索历史模型
 * 记录用户的搜索行为，用于分析和优化导购体验
 *
 * @package app\model\agent
 */
class GuideSearchHistory extends Model
{
    /**
     * 数据表名
     * @var string
     */
    protected $table = 'guide_search_history';

    /**
     * 自动时间戳
     * @var bool
     */
    protected $autoWriteTimestamp = true;

    /**
     * 创建时间字段
     * @var string
     */
    protected $createTime = 'created_at';

    /**
     * 更新时间字段
     * @var bool
     */
    protected $updateTime = false;

    /**
     * 记录搜索历史
     *
     * @access public
     * @param string $keyword 搜索关键词
     * @param string|null $sessionId 会话ID
     * @param int|null $userId 用户ID
     * @param string|null $intent 识别的意图
     * @param int $productsFound 找到的产品数
     * @return self
     */
    public static function recordSearch(
        string $keyword,
        ?string $sessionId = null,
        ?int $userId = null,
        ?string $intent = null,
        int $productsFound = 0
    ): self {
        $history = new self();
        $history->keyword = $keyword;
        $history->session_id = $sessionId;
        $history->user_id = $userId;
        $history->intent = $intent;
        $history->products_found = $productsFound;
        $history->save();
        return $history;
    }

    /**
     * 获取用户最近的搜索记录
     *
     * @access public
     * @param int|null $userId 用户ID
     * @param string|null $sessionId 会话ID
     * @param int $limit 限制数量
     * @return array
     */
    public static function getRecentHistory(?int $userId, ?string $sessionId, int $limit = 10): array
    {
        $query = self::order('created_at', 'desc');

        if ($userId) {
            $query->where('user_id', $userId);
        } elseif ($sessionId) {
            $query->where('session_id', $sessionId);
        }

        return $query->limit($limit)
            ->field('id, keyword, intent, products_found, created_at')
            ->select()
            ->toArray();
    }

    /**
     * 清除用户搜索历史
     *
     * @access public
     * @param int|null $userId 用户ID
     * @param string|null $sessionId 会话ID
     * @return int 删除的记录数
     */
    public static function clearHistory(?int $userId, ?string $sessionId): int
    {
        $query = self::where('1', '1');

        if ($userId) {
            $query->where('user_id', $userId);
        } elseif ($sessionId) {
            $query->where('session_id', $sessionId);
        } else {
            return 0;
        }

        return $query->delete();
    }

    /**
     * 获取热门搜索关键词
     *
     * @access public
     * @param int $limit 限制数量
     * @param int $days 统计天数
     * @return array
     */
    public static function getHotKeywords(int $limit = 10, int $days = 7): array
    {
        $startTime = date('Y-m-d H:i:s', strtotime("-{$days} days"));

        return self::where('created_at', '>=', $startTime)
            ->field('keyword, COUNT(*) as count')
            ->group('keyword')
            ->order('count', 'desc')
            ->limit($limit)
            ->select()
            ->toArray();
    }

    /**
     * 获取搜索统计
     *
     * @access public
     * @param int $days 统计天数
     * @return array
     */
    public static function getStatistics(int $days = 7): array
    {
        $startTime = date('Y-m-d H:i:s', strtotime("-{$days} days"));

        $total = self::where('created_at', '>=', $startTime)->count();
        $uniqueKeywords = self::where('created_at', '>=', $startTime)
            ->group('keyword')
            ->count();
        $avgProductsFound = self::where('created_at', '>=', $startTime)
            ->avg('products_found');

        return [
            'total_searches' => $total,
            'unique_keywords' => $uniqueKeywords,
            'avg_products_found' => round($avgProductsFound, 2),
            'period_days' => $days,
        ];
    }
}
