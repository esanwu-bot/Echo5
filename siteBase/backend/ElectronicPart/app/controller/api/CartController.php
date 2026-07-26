<?php
/**
 * 电子元器件商城 - 购物车接口
 * 文件说明：提供购物车商品增删改查与结算接口。
 * 支持登录用户（user_id）和游客（session_id）两种模式。
 */
declare(strict_types=1);

namespace app\controller\api;

use app\controller\BaseController;
use app\model\CartItem;
use app\model\SkProductModel;
use app\model\SkProductPriceBreak;
use app\model\SkProductSupplier;
use app\service\AuthService;
use think\Response;
use think\exception\ValidateException;
use think\facade\Log;

/**
 * 购物车API控制器
 * @package app\controller\api
 */
class CartController extends BaseController
{
    /**
     * 获取当前用户/会话标识
     * 购物车路由未挂载 auth 中间件，需自行解析 Authorization 头获取登录用户。
     */
    protected function getIdentity(): array
    {
        $userId = (int)($this->request->userId ?? 0);

        // 若中间件未注入 userId，则自行解析 Authorization 头
        if ($userId <= 0) {
            $token = $this->request->header('Authorization', '');
            if (!empty($token)) {
                try {
                    $authService = new AuthService();
                    $tokenData = $authService->verifyToken($token);
                    $userId = (int)($tokenData['user_id'] ?? 0);
                } catch (\Exception $e) {
                    // Token 无效时保持 userId 为 0，由调用方决定是否要求登录
                    Log::warning('购物车解析 Token 失败: ' . $e->getMessage());
                }
            }
        }

        $sessionId = $this->request->header('X-Session-Id', '');
        if (empty($sessionId)) {
            $sessionId = $this->request->param('session_id', '');
        }
        return [$userId, $sessionId];
    }

    /**
     * 获取购物车列表
     * GET /api/v1/cart
     */
    public function index(): Response
    {
        try {
            [$userId, $sessionId] = $this->getIdentity();
            $cartItems = CartItem::getUserCart($userId, $sessionId);

            // 预加载型号及其所属产品，用于获取真实库存与单价
            $modelIds = array_filter(array_column($cartItems, 'model_id'));
            $modelMap = [];
            if (!empty($modelIds)) {
                $models = SkProductModel::with('series')->whereIn('id', $modelIds)->select();
                foreach ($models as $m) {
                    $modelMap[(int)$m->id] = $m;
                }
            }

            $items = array_map(function ($item) use ($modelMap) {
                $modelId = isset($item['model_id']) ? (int)$item['model_id'] : 0;
                $model = $modelMap[$modelId] ?? null;

                // 优先从型号取库存，否则从产品取
                $stock = $model ? (int)$model->stock : ((int)($item['product']['stock'] ?? 0));
                // 通过型号所属产品获取参考单价（按当前用量匹配阶梯价）
                $price = $model
                    ? $this->getModelUnitPrice($model, (int)$item['quantity'])
                    : (float)($item['product']['price'] ?? 0);

                // 优先使用 main_image，否则取 images 数组第一张
                $productImage = $item['product']['main_image'] ?? '';
                if (empty($productImage) && !empty($item['product']['images']) && is_array($item['product']['images'])) {
                    $productImage = $item['product']['images'][0] ?? '';
                }

                return [
                    'id'            => (int)$item['id'],
                    'product_id'    => (int)$item['product_id'],
                    'model_id'      => $modelId,
                    'product_name'  => $model ? ($model->model_name ?: ($item['product']['name'] ?? '')) : ($item['product']['name'] ?? ''),
                    'product_image' => $productImage,
                    'price'         => $price,
                    'stock'         => $stock,
                    'quantity'      => (int)$item['quantity'],
                ];
            }, $cartItems);

            return $this->success(['list' => $items], '获取成功');

        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 400);
        }
    }

    /**
     * 获取型号的参考单价（按用量匹配阶梯价）
     *
     * 取价顺序（见 docs/产品价格定义说明.md）：
     * 1. sk_product_price_break：按用量匹配最高可达档位；不足最低档时回退最低档参考价
     * 2. sk_product_suppliers：主供应商价，再任意供应商最低价
     * 3. 返回 0
     *
     * @access protected
     * @param SkProductModel $model
     * @param int $quantity 用量（片）
     * @return float
     */
    protected function getModelUnitPrice($model, int $quantity = 1): float
    {
        if (!$model) {
            return 0.0;
        }

        // 安全获取关联产品对象：relation 可能未加载或返回非对象
        $series = $model->series;
        if (!is_object($series)) {
            $seriesId = (int)($model->getAttr('series_id') ?? 0);
            if ($seriesId > 0) {
                $series = \app\model\SkProduct::find($seriesId);
            }
        }

        if (!$series || !is_object($series)) {
            return 0.0;
        }

        $quantity = max(1, $quantity);
        $productCode = $series->product_code;
        if (empty($productCode)) {
            return 0.0;
        }

        // 1) 按用量匹配阶梯（quantity >= 分界点的最高档）
        $matchedPrice = SkProductPriceBreak::getPriceByQuantity($productCode, $quantity);
        if ($matchedPrice !== null && (float)$matchedPrice > 0) {
            return (float)$matchedPrice;
        }

        // 2) 用量低于最低档时，取最低档作为参考展示价
        $priceBreak = SkProductPriceBreak::where('product_id', $productCode)
            ->order('quantity', 'asc')
            ->find();
        if ($priceBreak && (float)$priceBreak->price > 0) {
            return (float)$priceBreak->price;
        }

        // 3) 主供应商价格
        $supplier = SkProductSupplier::where('product_id', $productCode)
            ->where('is_primary', 1)
            ->find();
        if ($supplier && (float)$supplier->price > 0) {
            return (float)$supplier->price;
        }

        // 4) 任意供应商最低价
        $supplier = SkProductSupplier::where('product_id', $productCode)
            ->order('price', 'asc')
            ->find();
        if ($supplier && (float)$supplier->price > 0) {
            return (float)$supplier->price;
        }

        return 0.0;
    }

    /**
     * 添加商品到购物车
     * POST /api/v1/cart/items
     *
     * 请求参数：
     *   model_id (推荐) 或 product_id (向后兼容)
     *   quantity
     *   spec_id (可选)
     */
    public function add(): Response
    {
        try {
            [$userId, $sessionId] = $this->getIdentity();
            if ($userId <= 0 && empty($sessionId)) {
                return $this->error('请先登录或提供会话标识', 401);
            }

            $params = $this->request->post();

            $modelId = isset($params['model_id']) ? (int)$params['model_id'] : 0;
            $productId = isset($params['product_id']) ? (int)$params['product_id'] : 0;
            $quantity = (int)($params['quantity'] ?? 0);
            $specId = (int)($params['spec_id'] ?? 0);

            if ($quantity <= 0) {
                return $this->error('数量必须大于0', 400);
            }
            if ($modelId <= 0 && $productId <= 0) {
                return $this->error('请提供型号ID(model_id)或商品ID(product_id)', 400);
            }

            // 优先用 model_id 查库存
            if ($modelId > 0) {
                $model = SkProductModel::find($modelId);
                if (!$model || !in_array($model->status, [0, 1, 'Active', 'active'])) {
                    return $this->error('型号不存在或已下架', 400);
                }
                if ((int)$model->stock < $quantity) {
                    return $this->error("库存不足，当前库存 {$model->stock}", 400);
                }
            }

            $result = CartItem::addToCart($userId, $productId ?: null, $modelId ?: null, $quantity, $sessionId, $specId);

            if (!$result) {
                return $this->error('添加失败', 400);
            }

            return $this->success([], '添加成功');

        } catch (ValidateException $e) {
            return json([
                'code' => 400,
                'message' => $e->getError()
            ], 400);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 400);
        }
    }

    /**
     * 更新购物车商品数量
     * PUT /api/v1/cart/items/:id
     */
    public function update(int $id): Response
    {
        try {
            [$userId, $sessionId] = $this->getIdentity();

            $params = $this->request->post();
            $quantity = (int)($params['quantity'] ?? 0);

            $query = CartItem::where('id', $id);
            if ($userId > 0) {
                $query->where('user_id', $userId);
            } elseif ($sessionId) {
                $query->where('session_id', $sessionId);
            } else {
                return $this->error('请先登录', 401);
            }

            $cartItem = $query->find();
            if (!$cartItem) {
                return $this->error('购物车项不存在', 400);
            }

            // 检查型号库存
            if ($quantity > 0 && $cartItem->model_id) {
                $model = SkProductModel::find($cartItem->model_id);
                if ($model && (int)$model->stock < $quantity) {
                    return $this->error("库存不足，当前库存 {$model->stock}", 400);
                }
            }

            $result = $cartItem->updateQuantity($quantity);
            if (!$result) {
                return $this->error('更新失败', 400);
            }

            // 返回按新用量匹配的最新单价与库存，供前端联动刷新小计/合计
            $updatedItem = [
                'id'         => (int)$cartItem->id,
                'product_id' => (int)$cartItem->product_id,
                'model_id'   => (int)$cartItem->model_id,
                'quantity'   => (int)$cartItem->quantity,
            ];
            $model = $cartItem->model_id
                ? SkProductModel::with('series')->find($cartItem->model_id)
                : null;
            if ($model) {
                $updatedItem['price'] = $this->getModelUnitPrice($model, (int)$cartItem->quantity);
                $updatedItem['stock'] = (int)$model->stock;
                $updatedItem['product_name'] = (string)($model->model_name ?: '');
            }

            return $this->success(['item' => $updatedItem], '更新成功');

        } catch (ValidateException $e) {
            return json([
                'code' => 400,
                'message' => $e->getError()
            ], 400);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 400);
        }
    }

    /**
     * 删除购物车商品
     * DELETE /api/v1/cart/items/:id
     */
    public function delete(int $id): Response
    {
        try {
            [$userId, $sessionId] = $this->getIdentity();

            $query = CartItem::where('id', $id);
            if ($userId > 0) {
                $query->where('user_id', $userId);
            } elseif ($sessionId) {
                $query->where('session_id', $sessionId);
            } else {
                return $this->error('请先登录', 401);
            }

            $cartItem = $query->find();
            if (!$cartItem) {
                return $this->error('购物车项不存在', 400);
            }

            $cartItem->delete();
            return $this->success([], '删除成功');

        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 400);
        }
    }

    /**
     * 获取购物车统计
     * GET /api/v1/cart/count
     */
    public function stats(): Response
    {
        try {
            [$userId, $sessionId] = $this->getIdentity();
            $stats = CartItem::getCartStats($userId, $sessionId);

            return $this->success($stats, '获取成功');

        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 400);
        }
    }

    /**
     * 清空购物车
     * DELETE /api/v1/cart
     */
    public function clear(): Response
    {
        try {
            [$userId, $sessionId] = $this->getIdentity();

            CartItem::clearCart($userId, $sessionId);

            return $this->success([], '清空成功');

        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 400);
        }
    }

    /**
     * 合并游客购物车到登录用户（登录后调用）
     * POST /api/v1/cart/merge
     */
    public function merge(): Response
    {
        try {
            $userId = (int)($this->request->userId ?? 0);
            $sessionId = $this->request->post('session_id', '');

            if ($userId <= 0) {
                return $this->error('请先登录', 401);
            }
            if (empty($sessionId)) {
                return $this->error('请提供会话标识', 400);
            }

            CartItem::mergeSessionCart($sessionId, $userId);

            return $this->success([], '合并成功');

        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('合并失败', 500);
        }
    }
}
