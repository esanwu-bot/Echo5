<?php
/**
 * 电子元器件商城 - 购物车服务
 * 文件说明：处理用户购物车相关业务逻辑（添加/更新/删除/查询/缓存）。
 * 注意：本项目为电子元器件商城（电子组件），非酒水类商品。
 */

namespace app\service;

use app\model\SkCart as Cart;
use app\model\Product;
use app\model\User;
use think\facade\Cache;
use think\facade\Db;
use think\exception\ValidateException;

class CartService
{
    /**
     * 添加商品到购物车
     * @param User $user 用户
     * @param int $productId 商品ID
     * @param int $quantity 数量
     * @param array $options 选项（规格等）
     * @return array
     * @throws ValidateException
     */
    public static function addToCart(User $user, int $productId, int $quantity = 1, array $options = []): array
    {
        // 验证商品
        $product = Product::where('status', 1)->find($productId);
        if (!$product) {
            throw new ValidateException('商品不存在或已下架');
        }

        // 检查购物车中是否已有该商品
        $existingCart = Cart::where('user_id', $user->id)
                           ->where('product_id', $productId)
                           ->find();

        $totalQuantity = $quantity;
        if ($existingCart) {
            $totalQuantity += $existingCart->quantity;
        }

        // 验证库存
        if (!$product->hasEnoughStock($totalQuantity)) {
            throw new ValidateException('商品库存不足，当前库存：' . $product->stock);
        }

        // 检查购物车商品数量限制
        $cartItemCount = Cart::where('user_id', $user->id)->count();
        if (!$existingCart && $cartItemCount >= 100) {
            throw new ValidateException('购物车商品数量不能超过100个');
        }

        Db::startTrans();
        try {
            if ($existingCart) {
                // 更新数量
                $existingCart->quantity = $totalQuantity;
                $existingCart->save();
                $cartItem = $existingCart;
            } else {
                // 新增商品
                $cartItem = Cart::create([
                    'user_id' => $user->id,
                    'product_id' => $productId,
                    'quantity' => $quantity,
                    'options' => json_encode($options)
                ]);
            }

            // 清除缓存
            self::clearUserCartCache($user->id);

            Db::commit();

            return [
                'cart_item' => $cartItem,
                'cart_count' => self::getCartCount($user->id),
                'message' => $existingCart ? '商品数量已更新' : '商品已添加到购物车'
            ];

        } catch (\Exception $e) {
            Db::rollback();
            throw new ValidateException('添加到购物车失败：' . $e->getMessage());
        }
    }

    /**
     * 更新购物车商品数量
     * @param User $user 用户
     * @param int $productId 商品ID
     * @param int $quantity 新数量
     * @return array
     * @throws ValidateException
     */
    public static function updateQuantity(User $user, int $productId, int $quantity): array
    {
        $cartItem = Cart::where('user_id', $user->id)
                       ->where('product_id', $productId)
                       ->find();

        if (!$cartItem) {
            throw new ValidateException('购物车中没有该商品');
        }

        // 如果数量为0，删除商品
        if ($quantity <= 0) {
            return self::removeFromCart($user, $productId);
        }

        // 验证库存
        $product = Product::find($productId);
        if (!$product || $product->is_on_sale != 1) {
            throw new ValidateException('商品不存在或已下架');
        }

        if (!$product->hasEnoughStock($quantity)) {
            throw new ValidateException('商品库存不足，当前库存：' . $product->stock);
        }

        // 更新数量
        $cartItem->quantity = $quantity;
        $cartItem->save();

        // 清除缓存
        self::clearUserCartCache($user->id);

        return [
            'cart_item' => $cartItem,
            'cart_count' => self::getCartCount($user->id),
            'message' => '购物车已更新'
        ];
    }

    /**
     * 从购物车移除商品
     * @param User $user 用户
     * @param int $productId 商品ID
     * @return array
     * @throws ValidateException
     */
    public static function removeFromCart(User $user, int $productId): array
    {
        $cartItem = Cart::where('user_id', $user->id)
                       ->where('product_id', $productId)
                       ->find();

        if (!$cartItem) {
            throw new ValidateException('购物车中没有该商品');
        }

        $cartItem->delete();

        // 清除缓存
        self::clearUserCartCache($user->id);

        return [
            'cart_count' => self::getCartCount($user->id),
            'message' => '商品已从购物车移除'
        ];
    }

    /**
     * 清空购物车
     * @param User $user 用户
     * @return array
     */
    public static function clearCart(User $user): array
    {
        $removedCount = Cart::where('user_id', $user->id)->delete();

        // 清除缓存
        self::clearUserCartCache($user->id);

        return [
            'removed_count' => $removedCount,
            'message' => '购物车已清空'
        ];
    }

    /**
     * 获取购物车详情
     * @param User $user 用户
     * @param bool $useCache 是否使用缓存
     * @return array
     */
    public static function getCartDetails(User $user, bool $useCache = true): array
    {
        $cacheKey = "user_cart_details_{$user->id}";
        
        if ($useCache) {
            $cached = Cache::get($cacheKey);
            if ($cached) {
                return $cached;
            }
        }

        $cartItems = Cart::with(['product'])
                        ->where('user_id', $user->id)
                        ->order('id', 'desc')
                        ->select();

        $items = [];
        $totalPrice = 0;
        $totalQuantity = 0;
        $availableItems = 0;
        $unavailableItems = 0;
        $outOfStockItems = 0;

        foreach ($cartItems as $item) {
            $product = $item->product;
            $isAvailable = $product && $product->is_on_sale == 1;
            $hasStock = $isAvailable && $product->hasEnoughStock($item->quantity);
            $subtotal = $isAvailable ? $product->price * $item->quantity : 0;

            $itemData = [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'quantity' => $item->quantity,
                'options' => $item->options ? json_decode($item->options, true) : [],
                'subtotal' => $subtotal,
                'formatted_subtotal' => '$' . number_format($subtotal, 2) . ' USD',
                'is_available' => $isAvailable,
                'has_stock' => $hasStock,
                'created_at' => $item->created_at,
                'updated_at' => $item->updated_at
            ];

            if ($product) {
                $itemData['product'] = [
                    'id' => $product->id,
                    'name' => $product->name,
                    'price' => $product->price,
                    'formatted_price' => $product->formatted_price,
                    'stock' => $product->stock,
                    'main_image' => $product->main_image ?: '',
                    'is_on_sale' => $product->is_on_sale,
                    'stock_status' => $product->getStockStatus(),
                    'stock_status_text' => $product->stock_status_text,
                    'tags' => $product->getTags()
                ];
            } else {
                $itemData['product'] = null;
            }

            $items[] = $itemData;

            // 统计
            $totalQuantity += $item->quantity;
            if ($isAvailable) {
                if ($hasStock) {
                    $totalPrice += $subtotal;
                    $availableItems++;
                } else {
                    $outOfStockItems++;
                }
            } else {
                $unavailableItems++;
            }
        }

        $result = [
            'items' => $items,
            'summary' => [
                'total_items' => count($items),
                'total_quantity' => $totalQuantity,
                'total_price' => $totalPrice,
                'formatted_total_price' => '$' . number_format($totalPrice, 2) . ' USD',
                'available_items' => $availableItems,
                'unavailable_items' => $unavailableItems,
                'out_of_stock_items' => $outOfStockItems,
                'can_checkout' => $availableItems > 0 && $outOfStockItems == 0
            ],
            'updated_at' => date('Y-m-d H:i:s')
        ];

        // 缓存5分钟
        if ($useCache) {
            Cache::set($cacheKey, $result, 300);
        }

        return $result;
    }

    /**
     * 获取购物车商品数量
     * @param int $userId 用户ID
     * @return int
     */
    public static function getCartCount(int $userId): int
    {
        $cacheKey = "user_cart_count_{$userId}";
        $count = Cache::get($cacheKey);
        
        if ($count === false) {
            $count = Cart::where('user_id', $userId)->sum('quantity') ?: 0;
            Cache::set($cacheKey, $count, 300); // 缓存5分钟
        }
        
        return $count;
    }

    /**
     * 批量添加商品到购物车
     * @param User $user 用户
     * @param array $products 商品列表
     * @return array
     */
    public static function batchAddToCart(User $user, array $products): array
    {
        $results = [];
        $successCount = 0;
        $failCount = 0;

        foreach ($products as $product) {
            try {
                $result = self::addToCart(
                    $user,
                    $product['product_id'],
                    $product['quantity'] ?? 1,
                    $product['options'] ?? []
                );
                
                $results[] = [
                    'product_id' => $product['product_id'],
                    'success' => true,
                    'message' => $result['message']
                ];
                $successCount++;
                
            } catch (\Exception $e) {
                $results[] = [
                    'product_id' => $product['product_id'],
                    'success' => false,
                    'error' => $e->getMessage()
                ];
                $failCount++;
            }
        }

        return [
            'results' => $results,
            'summary' => [
                'success_count' => $successCount,
                'fail_count' => $failCount,
                'total_count' => count($products)
            ],
            'cart_count' => self::getCartCount($user->id)
        ];
    }

    /**
     * 批量移除商品
     * @param User $user 用户
     * @param array $productIds 商品ID列表
     * @return array
     */
    public static function batchRemoveFromCart(User $user, array $productIds): array
    {
        $removedCount = Cart::where('user_id', $user->id)
                           ->whereIn('product_id', $productIds)
                           ->delete();

        // 清除缓存
        self::clearUserCartCache($user->id);

        return [
            'removed_count' => $removedCount,
            'cart_count' => self::getCartCount($user->id),
            'message' => "成功移除 {$removedCount} 个商品"
        ];
    }

    /**
     * 清理无效商品
     * @param User $user 用户
     * @return array
     */
    public static function cleanInvalidItems(User $user): array
    {
        // 查找无效商品（商品不存在或已下架）
        $invalidItems = Cart::alias('c')
                           ->leftJoin('products p', 'c.product_id = p.id')
                           ->where('c.user_id', $user->id)
                           ->where(function($query) {
                               $query->whereNull('p.id')
                                     ->whereOr('p.status', 0);
                           })
                           ->column('c.id');

        $removedCount = 0;
        if (!empty($invalidItems)) {
            $removedCount = Cart::whereIn('id', $invalidItems)->delete();
            // 清除缓存
            self::clearUserCartCache($user->id);
        }

        return [
            'removed_count' => $removedCount,
            'cart_count' => self::getCartCount($user->id),
            'message' => "清理了 {$removedCount} 个无效商品"
        ];
    }

    /**
     * 检查购物车商品库存
     * @param User $user 用户
     * @return array
     */
    public static function checkStock(User $user): array
    {
        $cartItems = Cart::with(['product'])
                        ->where('user_id', $user->id)
                        ->select();

        $issues = [];
        $hasIssues = false;

        foreach ($cartItems as $item) {
            $product = $item->product;
            
            if (!$product) {
                $issues[] = [
                    'cart_id' => $item->id,
                    'product_id' => $item->product_id,
                    'issue' => 'product_not_found',
                    'message' => '商品不存在'
                ];
                $hasIssues = true;
                continue;
            }

            if ($product->is_on_sale != 1) {
                $issues[] = [
                    'cart_id' => $item->id,
                    'product_id' => $item->product_id,
                    'product_name' => $product->name,
                    'issue' => 'product_unavailable',
                    'message' => '商品已下架'
                ];
                $hasIssues = true;
                continue;
            }

            if (!$product->hasEnoughStock($item->quantity)) {
                $issues[] = [
                    'cart_id' => $item->id,
                    'product_id' => $item->product_id,
                    'product_name' => $product->name,
                    'requested_quantity' => $item->quantity,
                    'available_stock' => $product->stock,
                    'issue' => 'insufficient_stock',
                    'message' => "库存不足，需要 {$item->quantity} 个，库存仅剩 {$product->stock} 个"
                ];
                $hasIssues = true;
            }
        }

        return [
            'has_issues' => $hasIssues,
            'issues' => $issues,
            'total_issues' => count($issues)
        ];
    }

    /**
     * 获取购物车推荐商品
     * @param User $user 用户
     * @param int $limit 数量限制
     * @return array
     */
    public static function getRecommendedProducts(User $user, int $limit = 6): array
    {
        // 获取购物车中的商品分类
        $categoryIds = Cart::alias('c')
                          ->join('products p', 'c.product_id = p.id')
                          ->where('c.user_id', $user->id)
                          ->where('p.status', 1)
                          ->column('p.category_id');

        if (empty($categoryIds)) {
            // 如果购物车为空，返回热销商品
            $products = Product::where('status', 1)
                              ->inStock()
                              ->orderBySales('desc')
                              ->limit($limit)
                              ->select();
        } else {
            // 获取购物车中已有的商品ID
            $existingProductIds = Cart::where('user_id', $user->id)->column('product_id');
            
            // 推荐同分类的其他商品
            $products = Product::whereIn('category_id', array_unique($categoryIds))
                              ->whereNotIn('id', $existingProductIds)
                              ->where('status', 1)
                              ->inStock()
                              ->orderBySales('desc')
                              ->limit($limit)
                              ->select();
        }

        return $products->map(function($product) {
            return [
                'id' => $product->id,
                'name' => $product->name,
                'price' => $product->price,
                'formatted_price' => $product->formatted_price,
                'main_image' => $product->main_image ?: '',
                'sales_count' => $product->sales_count,
                'stock' => $product->stock,
                'tags' => $product->getTags()
            ];
        })->toArray();
    }

    /**
     * 清除用户购物车缓存
     * @param int $userId 用户ID
     */
    private static function clearUserCartCache(int $userId): void
    {
        Cache::delete("user_cart_{$userId}");
        Cache::delete("user_cart_details_{$userId}");
        Cache::delete("user_cart_count_{$userId}");
    }

    /**
     * 获取购物车摘要信息
     * @param User $user 用户
     * @return array
     */
    public static function getCartSummary(User $user): array
    {
        $count = self::getCartCount($user->id);
        $details = self::getCartDetails($user, true);
        
        return [
            'count' => $count,
            'total_price' => $details['summary']['total_price'],
            'formatted_total_price' => $details['summary']['formatted_total_price'],
            'can_checkout' => $details['summary']['can_checkout'],
            'has_issues' => $details['summary']['unavailable_items'] > 0 || $details['summary']['out_of_stock_items'] > 0
        ];
    }
}