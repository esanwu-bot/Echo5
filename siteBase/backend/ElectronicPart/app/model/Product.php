<?php

namespace app\model;

use think\facade\Db;

/**
 * Product模型类 - 别名到SkProduct
 * 用于兼容控制器中的引用
 */
class Product extends SkProduct
{
    // 产品状态常量
    const STATUS_NORMAL = 1;      // 正常
    const STATUS_DISABLED = 0;    // 禁用
    
    // 字段映射 - 兼容控制器中使用的字段名
    protected $mapping = [
        'created_at' => 'create_time',      // 创建时间映射
        'updated_at' => 'update_time',      // 更新时间映射
        'name' => 'title',                 // 名称映射
    ];
    
    // 重写获取器以支持字段映射
    public function __get($name)
    {
        // 如果是映射字段，返回实际字段的值
        if (isset($this->mapping[$name])) {
            return parent::__get($this->mapping[$name]);
        }
        
        // 处理已删除的字段 - 从关联表获取或返回默认值
        switch ($name) {
            case 'price':
                return $this->getDefaultPrice();
            case 'stock':
                return $this->getTotalStock();
            case 'main_image':
                $images = parent::__get('images');
                if (is_array($images) && !empty($images)) {
                    return $images[0];
                }
                return '';
            case 'image':
                $images = parent::__get('images');
                if (is_array($images) && !empty($images)) {
                    return $images[0];
                }
                return '';
            case 'sales_count':
            case 'sales':
                return 0;
            case 'model_number':
            case 'package_type':
                return '';
        }
        
        return parent::__get($name);
    }
    
    // 重写设置器以支持字段映射
    public function __set(string $name, $value): void
    {
        // 如果是映射字段，设置实际字段
        if (isset($this->mapping[$name])) {
            parent::__set($this->mapping[$name], $value);
            return;
        }
        
        // 忽略已删除字段的设置
        $deletedFields = ['price', 'stock', 'main_image', 'image', 'sales_count', 'sales', 'model_number', 'package_type'];
        if (in_array($name, $deletedFields)) {
            return;
        }
        
        parent::__set($name, $value);
    }
    
    // 获取默认价格（从型号价格阶梯获取最低价格）
    protected function getDefaultPrice()
    {
        $price = Db::name('sk_product_price_break')
            ->where('product_id', $this->id)
            ->order('price', 'asc')
            ->value('price');
        return $price ?: 0;
    }
    
    // 获取总库存（从型号表汇总）
    protected function getTotalStock()
    {
        $stock = Db::name('sk_product_models')
            ->where('series_id', $this->id)
            ->sum('stock');
        return $stock ?: 0;
    }
    
    // 检查库存是否充足
    public function hasEnoughStock($quantity)
    {
        return $this->stock >= $quantity;
    }
    
    // 减少库存
    public function decreaseStock($quantity)
    {
        $this->stock -= $quantity;
        return $this->save();
    }
    
    // 增加库存
    public function increaseStock($quantity)
    {
        $this->stock += $quantity;
        return $this->save();
    }
    
    // 增加销量
    public function incrementSalesCount($quantity)
    {
        $this->sales += $quantity;
        return $this->save();
    }
    
    // 获取库存状态
    public function getStockStatus()
    {
        if ($this->stock <= 0) {
            return 'out_of_stock';
        } elseif ($this->stock <= 10) {
            return 'low_stock';
        } else {
            return 'in_stock';
        }
    }
    
    // 获取库存状态文本
    public function getStockStatusTextAttribute($value, $data)
    {
        $status = $this->getStockStatus();
        
        $statusMap = [
            'out_of_stock' => '缺货',
            'low_stock' => '库存不足',
            'in_stock' => '有货'
        ];
        
        return $statusMap[$status] ?? '未知';
    }
}