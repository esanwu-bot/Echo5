<?php
/**
 * 电子元器件商城 - 产品模型
 * 文件说明：定义产品数据表结构、关联关系与业务方法，支持多语言特性。
 */

namespace app\model;

use app\model\BaseModel;


/**
 * @property int $id
 * @property string $name
 * @property string $product_code
 * @property int $brand_id
 * @property int $category_fk_id
 * @property string|null $description
 * @property int $status
 * @property int $is_on_sale
 * @property string|null $images
 * @property string|null $specs
 * @property string|null $mpn_prefix
 * @property string|null $spec_summary
 * @property float|null $price 基础单价（USD）
 * @property int $stock 基础库存

 * @property int $views
 * @property int $sort
 * @property int $rohs_compliant
 * @property string|null $features
 */
class SkProduct extends BaseModel
{
    
    protected $table = 'sk_product';

    // 自动时间戳
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';

    // 多语言字段配置
    protected $i18nFields = ['name', 'description', 'features'];
    protected $i18nModule = 'product';

    // 字段类型转换
    protected $type = [
        'status' => 'integer',
        'sort' => 'integer',
        'views' => 'integer',
        'category_fk_id' => 'integer',
        'brand_id' => 'integer',
        'is_on_sale' => 'integer',
        'rohs_compliant' => 'integer',
        'price' => 'float',
        'stock' => 'integer',
        'specs' => 'json',
        'images' => 'json',
        'spec_summary' => 'json',
        'mpn_prefix' => 'string',
        'create_time' => 'datetime',
        'update_time' => 'datetime',

    ];

    // 附加输出字段
    protected $append = ['price', 'stock'];

    /**
     * 插入后同步多语言词条
     */
    public static function onAfterInsert($model): void
    {
        \app\service\I18nService::syncModel($model);
    }

    /**
     * 更新后同步多语言词条
     */
    public static function onAfterUpdate($model): void
    {
        \app\service\I18nService::syncModel($model);
    }

    /**
     * 删除后清理多语言词条
     */
    public static function onAfterDelete($model): void
    {
        \app\service\I18nService::deleteModel($model);
    }

    // 获取上架产品
    public function scopeActive($query)
    {
        return $query->where('is_on_sale', 1);
    }

    // 关联分类
    public function category()
    {
        return $this->belongsTo(SkCategory::class, 'category_fk_id');
    }

    // 关联品牌
    public function brand()
    {
        return $this->belongsTo(SkBrand::class, 'brand_id');
    }

    // 关联规格
    public function specs()
    {
        return $this->hasMany(SkProductSpec::class, 'product_id');
    }

    // 关联属性
    public function attributes()
    {
        return $this->hasMany(SkProductAttribute::class, 'product_id');
    }

    // 关联供应商（多对多）
    public function suppliers()
    {
        return $this->belongsToMany(SkSupplier::class, 'sk_product_suppliers', 'supplier_id', 'product_id')
            ->bind(['supplier_name', 'supplier_code']);
    }

    // 关联产品供应商
    public function productSuppliers()
    {
        return $this->hasMany(SkProductSupplier::class, 'product_id');
    }

    // 关联库存
    public function inventory()
    {
        return $this->hasMany(SkInventory::class, 'product_id');
    }

    // 获取总可用库存
    public function getTotalAvailableStock()
    {
        return $this->inventory()->sum('available_quantity');
    }

    // 关联价格阶梯
    public function productPriceBreaks()
    {
        return $this->hasMany(SkProductPriceBreak::class, 'product_id');
    }

    // 关联型号 (作为 SPU 系列, 1:N)
    public function seriesModels()
    {
        return $this->hasMany(SkProductModel::class, 'series_id');
    }

    /**
     * 获取器：参考单价
     * 优先使用 sk_product.price 基础单价字段；未设置时再按阶梯价/供应商价计算
     *
     * @return float
     */
    protected function getPriceAttr(): float
    {
        // 若表内已维护基础单价，则直接返回（允许显式设置为 0）
        // 使用 getData 避免触发自身获取器导致递归
        $basePrice = $this->getData('price');
        if ($basePrice !== null && (float)$basePrice > 0) {
            return (float)$basePrice;
        }

        return $this->getReferencePrice();
    }

    /**
     * 获取器：总库存
     * 优先使用 sk_product.stock 基础库存字段；未设置时再汇总型号库存
     *
     * @return int
     */
    protected function getStockAttr(): int
    {
        // 若表内已维护基础库存，则直接返回（允许显式设置为 0）
        // 使用 getData 避免触发自身获取器导致递归
        $baseStock = $this->getData('stock');
        if ($baseStock !== null) {
            return (int)$baseStock;
        }

        return $this->getTotalStock();
    }

    /**
     * 获取产品参考单价
     * 优先取 sk_product_price_break 最低档价格，无则取 sk_product_suppliers 主供应商价格
     *
     * @return float
     */
    public function getReferencePrice(): float
    {
        $productKeys = [];
        if (!empty($this->product_code)) {
            $productKeys[] = (string)$this->product_code;
        }
        if (!empty($this->id)) {
            $productKeys[] = (string)$this->id;
        }

        foreach ($productKeys as $productKey) {
            // 1) 取阶梯价最低档
            $minBreak = SkProductPriceBreak::where('product_id', $productKey)
                ->order('quantity', 'asc')
                ->find();
            if ($minBreak && (float)$minBreak->price > 0) {
                return (float)$minBreak->price;
            }
        }

        foreach ($productKeys as $productKey) {
            // 2) 主供应商价格
            $supplier = SkProductSupplier::where('product_id', $productKey)
                ->where('is_primary', 1)
                ->find();
            if ($supplier && (float)$supplier->price > 0) {
                return (float)$supplier->price;
            }

            // 3) 任意供应商最低价
            $supplier = SkProductSupplier::where('product_id', $productKey)
                ->order('price', 'asc')
                ->find();
            if ($supplier && (float)$supplier->price > 0) {
                return (float)$supplier->price;
            }
        }

        return 0.0;
    }

    /**
     * 获取产品总库存（汇总旗下所有型号库存）
     *
     * @return int
     */
    public function getTotalStock(): int
    {
        return (int)$this->seriesModels()->sum('stock');
    }
}