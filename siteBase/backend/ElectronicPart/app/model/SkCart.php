<?php
/**
 * 电子元器件商城 - 购物车模型
 * 文件说明：定义购物车数据表结构、关联关系与购物车业务方法。
 *
 * @property int $id
 * @property int $user_id
 * @property int $product_id
 * @property int|null $model_id
 * @property string|null $session_id
 * @property int $quantity
 * @property string|null $create_time
 * @property string|null $update_time
 */

namespace app\model;

use think\Model;

class SkCart extends Model
{
    protected $table = 'sk_cart';

    // 自动时间戳
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';

    // 字段类型转换
    protected $type = [
        'user_id' => 'integer',
        'product_id' => 'integer',
        'model_id' => 'integer',
        'quantity' => 'integer',
    ];

    // 关联用户
    public function user()
    {
        return $this->belongsTo(SkUser::class, 'user_id');
    }

    // 关联产品
    public function product()
    {
        return $this->belongsTo(SkProduct::class, 'product_id');
    }

    // 关联型号
    public function model()
    {
        return $this->belongsTo(SkProductModel::class, 'model_id');
    }
    
    /**
     * 获取用户购物车列表（支持登录用户和游客session）
     */
    public static function getUserCart(int $userId = 0, string $sessionId = ''): array
    {
        $query = self::with(['product', 'model']);
        if ($userId > 0) {
            $query->where('user_id', $userId);
        } elseif ($sessionId) {
            $query->where('session_id', $sessionId);
        } else {
            return [];
        }
        return $query->select()->toArray();
    }
    
    /**
     * 添加商品到购物车（支持型号ID和游客session）
     */
    public static function addToCart(int $userId, ?int $productId, ?int $modelId, int $quantity, string $sessionId = '', int $specId = 0): bool
    {
        // 仅传入型号ID时，自动从型号关联的系列中补全产品ID
        if (empty($productId) && !empty($modelId)) {
            $model = SkProductModel::find($modelId);
            if ($model) {
                $productId = (int)($model->getAttr('series_id') ?? 0);
            }
        }
        // 确保 product_id 不为 null（数据库 NOT NULL 约束）
        $productId = $productId ?? 0;

        $query = self::where('quantity', '>', 0);
        if ($userId > 0) {
            $query->where('user_id', $userId);
        } elseif ($sessionId) {
            $query->where('session_id', $sessionId);
        } else {
            return false;
        }
        if ($modelId) {
            $query->where('model_id', $modelId);
        } elseif ($productId) {
            $query->where('product_id', $productId);
        } else {
            return false;
        }

        $cartItem = $query->find();

        if ($cartItem) {
            $cartItem->quantity += $quantity;
            return $cartItem->save();
        } else {
            return self::create([
                'user_id' => $userId > 0 ? $userId : 0,
                'product_id' => $productId,
                'model_id' => $modelId,
                'session_id' => $sessionId,
                'quantity' => $quantity,
                'spec_id' => $specId,
            ]) ? true : false;
        }
    }
    
    /**
     * 更新购物车商品数量
     */
    public function updateQuantity(int $quantity): bool
    {
        if ($quantity <= 0) {
            return $this->delete();
        }
        $this->quantity = $quantity;
        return $this->save();
    }
    
    /**
     * 清空购物车（支持登录用户和游客session）
     */
    public static function clearCart(int $userId = 0, string $sessionId = ''): bool
    {
        if ($userId > 0) {
            return self::where('user_id', $userId)->delete() !== false;
        }
        if ($sessionId) {
            return self::where('session_id', $sessionId)->delete() !== false;
        }
        return false;
    }
    
    /**
     * 获取购物车统计（支持登录用户和游客session）
     */
    public static function getCartStats(int $userId = 0, string $sessionId = ''): array
    {
        $query = self::where('quantity', '>', 0);
        if ($userId > 0) {
            $query->where('user_id', $userId);
        } elseif ($sessionId) {
            $query->where('session_id', $sessionId);
        } else {
            return ['total_count' => 0, 'item_count' => 0];
        }
        
        $items = $query->select();
        $totalCount = 0;
        
        foreach ($items as $item) {
            $totalCount += $item->quantity;
        }
        
        return [
            'total_count' => $totalCount,
            'item_count' => count($items),
        ];
    }
    
    /**
     * 合并游客购物车到用户购物车（登录后调用）
     */
    public static function mergeSessionCart(string $sessionId, int $userId): bool
    {
        if (empty($sessionId) || $userId <= 0) {
            return false;
        }
        
        $sessionItems = self::where('session_id', $sessionId)->select();
        foreach ($sessionItems as $item) {
            $existing = self::where('user_id', $userId)
                ->where(function ($query) use ($item) {
                    if ($item->model_id) {
                        $query->where('model_id', $item->model_id);
                    } elseif ($item->product_id) {
                        $query->where('product_id', $item->product_id);
                    }
                })
                ->find();
            if ($existing) {
                $existing->quantity += $item->quantity;
                $existing->save();
                $item->delete();
            } else {
                $item->user_id = $userId;
                $item->session_id = null;
                $item->save();
            }
        }
        return true;
    }
}