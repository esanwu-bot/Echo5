<?php

namespace app\model;

use think\Model;

class SkProductPriceBreak extends Model
{
    protected $table = 'sk_product_price_break';
    protected $pk = 'id';
    protected $dateFormat = 'Y-m-d H:i:s';
    
    // 类型转换
    protected $type = [
        'product_id' => 'string',
        'quantity' => 'integer',
        'price' => 'float',
    ];
    
    /**
     * 关联产品
     */
    public function product()
    {
        return $this->belongsTo(SkProduct::class, 'product_id', 'id');
    }
    
    /**
     * 获取价格区间列表
     */
    public static function getList($params = [])
    {
        $query = self::query();
        
        // 按商品ID过滤
        if (!empty($params['product_id'])) {
            $query->where('product_id', $params['product_id']);
        }
        
        // 按数量范围过滤
        if (!empty($params['quantity_min'])) {
            $query->where('quantity', '>=', $params['quantity_min']);
        }
        if (!empty($params['quantity_max'])) {
            $query->where('quantity', '<=', $params['quantity_max']);
        }
        
        // 排序
        $orderBy = $params['order_by'] ?? 'quantity';
        $sort = $params['sort'] ?? 'asc';
        $query->order($orderBy, $sort);
        
        // 分页
        if (!empty($params['page']) && !empty($params['page_size'])) {
            $page = (int)$params['page'];
            $pageSize = (int)$params['page_size'];
            $total = $query->count();
            $list = $query->page($page, $pageSize)->select();
            
            return [
                'list' => $list,
                'total' => $total,
                'page' => $page,
                'page_size' => $pageSize
            ];
        }
        
        return $query->select();
    }
    
    /**
     * 检查价格区间是否已存在
     */
    public static function checkExists($productId, $quantity, $excludeId = null)
    {
        $query = self::where('product_id', $productId)
            ->where('quantity', $quantity);
        
        if ($excludeId) {
            $query->where('id', '<>', $excludeId);
        }
        
        return $query->find();
    }
    
    /**
     * 获取商品的价格区间列表
     */
    public static function getByProductId($productId)
    {
        return self::where('product_id', $productId)
            ->order('quantity', 'asc')
            ->select();
    }
    
    /**
     * 获取指定数量的价格
     */
    public static function getPriceByQuantity($productId, $quantity)
    {
        // 获取所有价格区间，按数量倒序排列
        $priceBreaks = self::where('product_id', $productId)
            ->order('quantity', 'desc')
            ->select();
        
        // 返回符合条件的最高的数量对应的价格
        foreach ($priceBreaks as $break) {
            if ($quantity >= $break['quantity']) {
                return $break['price'];
            }
        }
        
        return null;
    }
}
