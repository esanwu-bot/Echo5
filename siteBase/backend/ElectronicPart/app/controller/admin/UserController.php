<?php

namespace app\controller\admin;
use think\facade\Log;

use app\controller\BaseController;
use app\model\User;
use app\model\Order;
use think\exception\ValidateException;
use think\facade\Validate;
use think\facade\Db;

class UserController extends BaseController
{
    /**
     * 获取用户列表
     */
    public function index()
    {
        try {
            // 参数验证
            $validate = Validate::rule([
                'page' => 'integer|>=:1',
                'limit' => 'integer|between:1,100',
                'status' => 'in:,0,1'
            ])->message([
                'page.integer' => '页码必须是整数',
                'limit.between' => '每页数量必须在1-100之间',
                'status.in' => '状态值不正确'
            ]);

            $params = $this->request->param();
            if (!$validate->check($params)) {
                return $this->error($validate->getError());
            }

            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 20;
            $keyword = trim($params['keyword'] ?? '');
            $status = $params['status'] ?? '';

            $query = User::with([]);

            // 关键词搜索
            if (!empty($keyword)) {
                $query->where(function($q) use ($keyword) {
                    $q->where('username', 'like', '%' . $keyword . '%')
                      ->whereOr('phone', 'like', '%' . $keyword . '%')
                      ->whereOr('email', 'like', '%' . $keyword . '%')
                      ->whereOr('company', 'like', '%' . $keyword . '%');
                });
            }

            // 状态筛选
            if ($status !== '') {
                $query->where('status', $status);
            }

            $total = $query->count();
            $users = $query->page($page, $limit)
                          ->order('id', 'desc')
                          ->select();

            // 格式化用户数据
            $userList = $users->map(function($user) {
                $totalAmount = Order::where('user_id', $user->id)
                                    ->whereIn('status', [Order::STATUS_PAID, Order::STATUS_SHIPPED, Order::STATUS_COMPLETED])
                                    ->sum('total_amount');

                return [
                    'id' => $user->id,
                    'username' => $user->username,
                    'phone' => $user->phone ?: '',
                    'email' => $user->email ?: '',
                    'company' => $user->company ?: '',
                    'country' => $user->country ?: '',
                    'status' => $user->status ? 'active' : 'disabled',
                    'total_orders' => Order::where('user_id', $user->id)->count(),
                    'total_amount' => floatval($totalAmount),
                    'created_at' => $user->create_time,
                    'updated_at' => $user->update_time
                ];
            });

            return $this->paginate($userList, $total, $page, $limit);

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error('Get admin user list error: ' . $e->getMessage());
            return $this->error('获取用户列表失败');
        }
    }

    /**
     * 获取会员统计数据
     */
    public function statistics()
    {
        try {
            // 总会员数
            $total = User::count();

            // 总消费金额
            $totalConsumption = Order::whereIn('status', [Order::STATUS_PAID, Order::STATUS_SHIPPED, Order::STATUS_COMPLETED])
                                    ->sum('total_amount');

            // 本月新增会员
            $thisMonthNew = User::whereTime('create_time', 'month')->count();
            
            $stats = [
                'total' => $total,
                'totalConsumption' => round($totalConsumption, 2),
                'this_month_new' => $thisMonthNew,
            ];

            return $this->success($stats);

        } catch (\Exception $e) {
            Log::error('Get user statistics error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取用户详情
     */
    public function read($id)
    {
        try {
            if (!is_numeric($id) || $id <= 0) {
                return $this->error('用户ID无效');
            }

            $user = User::find($id);
            if (!$user) {
                return $this->error('用户不存在');
            }

            // 获取用户统计数据
            $orderStats = [
                'total_orders' => Order::where('user_id', $id)->count(),
                'completed_orders' => Order::where('user_id', $id)->where('status', Order::STATUS_COMPLETED)->count(),
                'cancelled_orders' => Order::where('user_id', $id)->where('status', Order::STATUS_CANCELLED)->count(),
                'total_spent' => Order::where('user_id', $id)
                                    ->whereIn('status', [Order::STATUS_PAID, Order::STATUS_SHIPPED, Order::STATUS_COMPLETED])
                                    ->sum('total_amount'),
                'avg_order_amount' => Order::where('user_id', $id)
                                         ->whereIn('status', [Order::STATUS_PAID, Order::STATUS_SHIPPED, Order::STATUS_COMPLETED])
                                         ->avg('total_amount')
            ];

            // 获取最近订单
            $recentOrders = Order::where('user_id', $id)
                                ->order('id', 'desc')
                                ->limit(5)
                                ->select()
                                ->map(function($order) {
                                    return [
                                        'id' => $order->id,
                                        'order_no' => $order->order_no,
                                        'total_price' => $order->total_amount,
                                        'status' => $order->status,
                                        'status_text' => $order->status_text,
                                        'created_at' => $order->create_time
                                    ];
                                });

            $userData = [
                'id' => $user->id,
                'username' => $user->username,
                'phone' => $user->phone ?: '',
                'email' => $user->email ?: '',
                'company' => $user->company ?: '',
                'position' => $user->position ?: '',
                'country' => $user->country ?: '',
                'status' => $user->status,
                'status_text' => $user->status ? '正常' : '禁用',
                'created_at' => $user->create_time,
                'updated_at' => $user->update_time,
                'order_stats' => $orderStats,
                'recent_orders' => $recentOrders
            ];

            return $this->success($userData);

        } catch (\Exception $e) {
            Log::error('Get user detail error: ' . $e->getMessage());
            return $this->error('获取用户详情失败');
        }
    }

    /**
     * 更新用户状态
     */
    public function updateStatus($id)
    {
        try {
            if (!is_numeric($id) || $id <= 0) {
                return $this->error('用户ID无效');
            }

            $user = User::find($id);
            if (!$user) {
                return $this->error('用户不存在');
            }

            $status = $this->request->param('status');
            if (!in_array($status, [0, 1])) {
                return $this->error('状态值不正确');
            }

            $user->status = $status;
            $user->save();

            $statusText = $status ? '启用' : '禁用';
            return $this->success([], "用户{$statusText}成功");

        } catch (\Exception $e) {
            Log::error('Update user status error: ' . $e->getMessage());
            return $this->error('更新用户状态失败');
        }
    }

    /**
     * 获取用户订单
     */
    public function getUserOrders($id)
    {
        try {
            if (!is_numeric($id) || $id <= 0) {
                return $this->error('用户ID无效');
            }

            $user = User::find($id);
            if (!$user) {
                return $this->error('用户不存在');
            }

            // 参数验证
            $validate = Validate::rule([
                'page' => 'integer|>=:1',
                'limit' => 'integer|between:1,100',
                'status' => 'in:,1,2,3,4,5'
            ])->message([
                'page.integer' => '页码必须是整数',
                'limit.between' => '每页数量必须在1-100之间',
                'status.in' => '订单状态不正确'
            ]);

            $params = $this->request->param();
            if (!$validate->check($params)) {
                return $this->error($validate->getError());
            }

            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 20;
            $status = $params['status'] ?? '';

            $query = Order::with(['orderItems'])
                         ->where('user_id', $id);

            if ($status !== '') {
                $query->where('status', $status);
            }

            $total = $query->count();
            $orders = $query->page($page, $limit)
                           ->order('id', 'desc')
                           ->select();

            $orderList = $orders->map(function($order) {
                return [
                    'id' => $order->id,
                    'order_no' => $order->order_no,
                    'total_price' => $order->total_amount,
                    'status' => $order->status,
                    'status_text' => $order->status_text,
                    'items_count' => $order->orderItems->count(),
                    'created_at' => $order->created_at,
                    'updated_at' => $order->updated_at
                ];
            });

            return $this->paginate($orderList, $total, $page, $limit);

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error('Get user orders error: ' . $e->getMessage());
            return $this->error('获取用户订单失败');
        }
    }

    /**
     * 创建用户
     */
    public function create()
    {
        try {
            // 参数验证
            $validate = Validate::rule([
                'username' => 'require|max:50|unique:sk_user',
                'password' => 'require|length:6,20',
                'phone' => 'mobile|unique:sk_user',
                'email' => 'email|unique:sk_user',
                'company' => 'max:100',
                'position' => 'max:100',
                'country' => 'max:50',
                'status' => 'in:0,1'
            ])->message([
                'username.require' => '用户名不能为空',
                'username.max' => '用户名不能超过50个字符',
                'username.unique' => '用户名已存在',
                'password.require' => '密码不能为空',
                'password.length' => '密码长度必须在6-20位之间',
                'phone.mobile' => '手机号格式不正确',
                'phone.unique' => '手机号已存在',
                'email.email' => '邮箱格式不正确',
                'email.unique' => '邮箱已存在',
                'company.max' => '公司不能超过100个字符',
                'position.max' => '职位不能超过100个字符',
                'country.max' => '国家不能超过50个字符',
                'status.in' => '状态选择不正确'
            ]);

            $params = $this->request->param();
            if (!$validate->check($params)) {
                return $this->error($validate->getError());
            }

            // 创建用户数据
            $userData = [
                'username' => $params['username'],
                'password' => password_hash($params['password'], PASSWORD_DEFAULT),
                'phone' => $params['phone'] ?? '',
                'email' => $params['email'] ?? '',
                'company' => $params['company'] ?? '',
                'position' => $params['position'] ?? '',
                'country' => $params['country'] ?? '',
                'status' => $params['status'] ?? 1,
            ];

            $user = User::create($userData);

            return $this->success([
                'id' => $user->id,
                'username' => $user->username,
                'phone' => $user->phone
            ], '用户创建成功');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error('Create user error: ' . $e->getMessage());
            return $this->error('创建用户失败');
        }
    }

    /**
     * 更新用户
     */
    public function update($id)
    {
        try {
            if (!is_numeric($id) || $id <= 0) {
                return $this->error('用户ID无效');
            }

            $user = User::find($id);
            if (!$user) {
                return $this->error('用户不存在');
            }

            // 参数验证
            $validate = Validate::rule([
                'username' => 'max:50|unique:sk_user,username,' . $id,
                'phone' => 'mobile|unique:sk_user,phone,' . $id,
                'email' => 'email|unique:sk_user,email,' . $id,
                'company' => 'max:100',
                'position' => 'max:100',
                'country' => 'max:50',
                'status' => 'in:0,1',
                'password' => 'length:6,20'
            ])->message([
                'username.max' => '用户名不能超过50个字符',
                'username.unique' => '用户名已存在',
                'phone.mobile' => '手机号格式不正确',
                'phone.unique' => '手机号已存在',
                'email.email' => '邮箱格式不正确',
                'email.unique' => '邮箱已存在',
                'company.max' => '公司不能超过100个字符',
                'position.max' => '职位不能超过100个字符',
                'country.max' => '国家不能超过50个字符',
                'status.in' => '状态选择不正确',
                'password.length' => '密码长度必须在6-20位之间'
            ]);

            $params = $this->request->param();
            if (!$validate->check($params)) {
                return $this->error($validate->getError());
            }

            // 更新用户数据
            $updateData = [];
            if (isset($params['username'])) {
                $updateData['username'] = $params['username'];
            }
            if (isset($params['phone'])) {
                $updateData['phone'] = $params['phone'];
            }
            if (isset($params['email'])) {
                $updateData['email'] = $params['email'];
            }
            if (isset($params['company'])) {
                $updateData['company'] = $params['company'];
            }
            if (isset($params['position'])) {
                $updateData['position'] = $params['position'];
            }
            if (isset($params['country'])) {
                $updateData['country'] = $params['country'];
            }
            if (isset($params['status'])) {
                $updateData['status'] = $params['status'];
            }
            if (isset($params['password']) && !empty($params['password'])) {
                $updateData['password'] = password_hash($params['password'], PASSWORD_DEFAULT);
            }

            $user->save($updateData);

            return $this->success([
                'id' => $user->id,
                'username' => $user->username,
                'phone' => $user->phone
            ], '用户更新成功');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error('Update user error: ' . $e->getMessage());
            return $this->error('更新用户失败');
        }
    }

    /**
     * 批量删除用户
     */
    public function batchDelete()
    {
        try {
            $ids = $this->request->post('ids', []);
            if (empty($ids) || !is_array($ids)) {
                return $this->error('请选择要删除的会员');
            }
            User::destroy($ids);
            return $this->success(null, '批量删除成功');
        } catch (\Exception $e) {
            Log::error('Batch delete error: ' . $e->getMessage());
            return $this->error('批量删除失败');
        }
    }

    /**
     * 删除用户
     */
    public function delete($id)
    {
        try {
            if (!is_numeric($id) || $id <= 0) {
                return $this->error('用户ID无效');
            }

            $user = User::find($id);
            if (!$user) {
                return $this->error('用户不存在');
            }

            // 检查是否有订单记录
            $hasOrders = Order::where('user_id', $id)->count();
            if ($hasOrders > 0) {
                return $this->error('该用户有订单记录，不能删除');
            }

            $user->delete();

            return $this->success([], '用户删除成功');

        } catch (\Exception $e) {
            Log::error('Delete user error: ' . $e->getMessage());
            return $this->error('删除用户失败');
        }
    }
}