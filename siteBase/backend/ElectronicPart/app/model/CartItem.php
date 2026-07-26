<?php

namespace app\model;

/**
 * CartItem模型类 - 别名到SkCart
 * 用于兼容控制器中的引用
 */
class CartItem extends SkCart
{
    // 添加便利方法
    
    /**
     * 获取选中的购物车商品
     *
     * @param int $userId 用户ID
     * @return array
     */
    public static function getSelectedItems($userId)
    {
        return self::where('user_id', $userId)
                   ->with(['product', 'model'])
                   ->select()
                   ->map(function($item) {
                       return [
                           'id' => $item->id,
                           'product_id' => $item->product_id,
                           'model_id' => $item->model_id,
                           'quantity' => $item->quantity,
                           'product' => $item->product ? $item->product->toArray() : null,
                           'model' => $item->model ? $item->model->toArray() : null,
                       ];
                   })
                   ->toArray();
    }
}