<?php
/**
 * 电子元器件商城 - 用户相关接口（前台）
 * 文件说明：提供当前登录用户信息、资料更新、订单统计与其它用户操作接口。
 */

namespace app\controller\api;

use app\controller\BaseController;
use app\model\SkUser;
use app\model\SkOrder;
use app\model\SkQuoteRequest;
use app\model\SkSampleApply;
use app\model\SkAddress;
use think\facade\Validate;
use think\exception\ValidateException;
use think\facade\Log;
use think\Request;
use think\Response;

class UserController extends BaseController
{
    /**
     * 获取用户信息
     */
    public function info()
    {
        try {
            $userId = $this->request->userId;
            $user = SkUser::find($userId);

            if (!$user) {
                return $this->error('用户不存在');
            }

            return $this->success([
                'id' => $user->id,
                'username' => $user->username,
                'nickname' => $user->nickname ?: '',
                'email' => $user->email,
                'avatar' => $user->avatar ?: '',
                'phone' => $user->phone ?: '',
                'openid' => $user->openid ?: '',
                'created_at' => $user->create_time,
                'last_login_at' => $user->update_time
            ]);

        } catch (\Exception $e) {
            Log::error('Get user info error: ' . $e->getMessage());
            return $this->error('获取用户信息失败');
        }
    }

    /**
     * 获取用户资料(同info)
     */
    public function profile()
    {
        return $this->info();
    }

    /**
     * 更新用户资料（与updateInfo相同，用于支持PUT /api/v1/user/profile路由）
     */
    public function updateProfile()
    {
        return $this->updateInfo();
    }

    /**
     * 获取订单统计
     */
    public function orderStats()
    {
        try {
            $userId = $this->request->userId;
            $user = SkUser::find($userId);

            if (!$user) {
                return $this->error('用户不存在');
            }

            // 使用一条SQL聚合查询，避免N+1问题
            $rows = SkOrder::where('user_id', $user->id)
                ->field('status, count(*) as cnt')
                ->group('status')
                ->select();
            
            $map = array_column($rows->toArray(), 'cnt', 'status');
            $stats = [
                'total'     => array_sum($map),
                'pending'   => $map['pending']   ?? 0,
                'paid'      => $map['paid']      ?? 0,
                'shipped'   => $map['shipped']   ?? 0,
                'completed' => $map['completed'] ?? 0,
                'cancelled' => $map['cancelled'] ?? 0
            ];

            return $this->success($stats);

        } catch (\Exception $e) {
            Log::error('Get order stats error: ' . $e->getMessage());
            return $this->error('获取订单统计失败');
        }
    }

    /**
     * 更新用户信息
     */
    public function updateInfo()
    {
        try {
            $userId = $this->request->userId;
            $user = SkUser::find($userId);

            if (!$user) {
                return $this->error('用户不存在');
            }
            
            // 参数验证
            $validate = Validate::rule([
                'nickname' => 'max:50',
                'avatar' => 'url'
            ])->message([
                'nickname.max' => '昵称不能超过50个字符',
                'avatar.url' => '头像必须是有效的URL地址'
            ]);

            $data = $this->request->param();
            if (!$validate->check($data)) {
                return $this->error($validate->getError());
            }

            // 允许更新的字段
            $allowedFields = ['nickname', 'avatar'];
            $updateData = [];
            
            foreach ($allowedFields as $field) {
                if (isset($data[$field]) && $data[$field] !== '') {
                    $updateData[$field] = $data[$field];
                }
            }

            if (empty($updateData)) {
                return $this->error('没有要更新的数据');
            }

            $user->save($updateData);

            return $this->success([], '更新成功');

        } catch (\Exception $e) {
            Log::error('Update user info error: ' . $e->getMessage());
            return $this->error('更新用户信息失败');
        }
    }

    /**
     * 获取我的订单
     */
    public function orders()
    {
        try {
            $userId = $this->request->userId;
            $user = SkUser::find($userId);
            
            if (!$user) {
                return $this->error('用户不存在');
            }
            
            $status = $this->request->param('status', 'all');
            $page = $this->request->param('page', 1);
            $limit = min($this->request->param('limit', 20), 50);
            
            $query = SkOrder::where('user_id', $user->id);
            
            if ($status !== 'all') {
                $query->where('status', $status);
            }
            
            $orders = $query->page($page, $limit)
                           ->order('create_time', 'desc')
                           ->select();
            
            $total = $query->count();
            
            $orderList = $orders->map(function($order) {
                return [
                    'id' => $order->id,
                    'order_no' => $order->order_no,
                    'total_amount' => $order->total_amount,
                    'status' => $order->status,
                    'status_text' => $this->getOrderStatusText($order->status),
                    'created_at' => $order->create_time
                ];
            });
            
            return $this->paginate($orderList, $total, $page, $limit);
            
        } catch (\Exception $e) {
            Log::error('Get user orders error: ' . $e->getMessage());
            return $this->error('获取订单列表失败');
        }
    }

    /**
     * 获取我的活动
     * 修复：避免全量数据加载到内存中，使用分别查询后再合并的方式
     */
    public function activities()
    {
        try {
            $userId = $this->request->userId;
            $page = $this->request->param('page', 1);
            $limit = min($this->request->param('limit', 20), 50);
            $type = $this->request->param('type', '');
            
            // 先获取用户邮箱
            $user = SkUser::find($userId);
            if (!$user) {
                return $this->error('用户不存在');
            }
            
            $list = [];
            $total = 0;

            $email = $user->email;
            $offset = ($page - 1) * $limit;

            if (!empty($type)) {
                // 指定类型时：分别查询，各自分页
                if ($type === 'quote') {
                    $quotes = SkQuoteRequest::where('email', $email)
                        ->page($page, $limit)
                        ->order('create_time', 'desc')
                        ->select();
                    foreach ($quotes as $q) {
                        $list[] = [
                            'id' => $q->id, 'type' => 'quote',
                            'product_info' => $q->product_info,
                            'status' => $q->status ?? 'pending',
                            'create_time' => $q->create_time
                        ];
                    }
                    $total = SkQuoteRequest::where('email', $email)->count();
                } else {
                    $samples = SkSampleApply::where('email', $email)
                        ->page($page, $limit)
                        ->order('create_time', 'desc')
                        ->select();
                    foreach ($samples as $s) {
                        $list[] = [
                            'id' => $s->id, 'type' => 'sample',
                            'product_info' => $s->product_name,
                            'status' => $s->status ?? 'pending',
                            'create_time' => $s->create_time
                        ];
                    }
                    $total = SkSampleApply::where('email', $email)->count();
                }

                return json([
                    'code' => 200, 'message' => 'success',
                    'data' => ['list' => $list, 'total' => $total, 'page' => $page, 'limit' => $limit],
                    'timestamp' => time()
                ]);
            }

            // 未指定类型时：使用 UNION 在数据库层排序分页，避免全量加载到内存
            $unionSql = "(SELECT id, 'quote' AS type, product_info, status, create_time FROM sk_quote_request WHERE email = '{$email}')
                UNION ALL
                (SELECT id, 'sample' AS type, product_name AS product_info, status, create_time FROM sk_sample_apply WHERE email = '{$email}')
                ORDER BY create_time DESC
                LIMIT {$limit} OFFSET {$offset}";

            $totalSql = "SELECT COUNT(*) AS total FROM (
                SELECT id FROM sk_quote_request WHERE email = '{$email}'
                UNION ALL
                SELECT id FROM sk_sample_apply WHERE email = '{$email}'
            ) AS combined";

            $list = \think\facade\Db::query($unionSql);
            $totalResult = \think\facade\Db::query($totalSql);
            $total = $totalResult[0]['total'] ?? 0;

            return json([
                'code' => 200, 'message' => 'success',
                'data' => ['list' => $list, 'total' => $total, 'page' => $page, 'limit' => $limit],
                'timestamp' => time()
            ]);
        } catch (\Exception $e) {
            Log::error('Get activities error: ' . $e->getMessage());
            // 生产环境不暴露详细错误信息
            return $this->error('获取失败，请稍后重试', 500);
        }
    }

    /**
     * 获取我的收藏
     */
    public function favorites()
    {
        try {
            $userId = $this->request->userId;
            $user = SkUser::find($userId);
            
            if (!$user) {
                return $this->error('用户不存在');
            }
            
            $page = $this->request->param('page', 1);
            $limit = min($this->request->param('limit', 20), 50);
            
            // 功能未实现，返回空数据
            $favorites = [];
            $total = 0;
            
            return $this->paginate($favorites, $total, $page, $limit);
            
        } catch (\Exception $e) {
            Log::error('Get user favorites error: ' . $e->getMessage());
            return $this->error('获取收藏列表失败');
        }
    }

    /**
     * 添加收藏
     * 修复：功能未实现，返回501 Not Implemented
     */
    public function addFavorite()
    {
        // 功能未实现，返回501
        return $this->error('收藏功能暂未实现', 501);
    }

    /**
     * 移除收藏
     * 修复：功能未实现，返回501 Not Implemented
     */
    public function removeFavorite($id)
    {
        // 功能未实现，返回501
        return $this->error('收藏功能暂未实现', 501);
    }

    /**
     * 获取我的询盘
     */
    public function inquiries()
    {
        try {
            $userId = $this->request->userId;
            $user = SkUser::find($userId);
            
            if (!$user) {
                return $this->error('用户不存在');
            }
            
            $page = $this->request->param('page', 1);
            $limit = min($this->request->param('limit', 20), 50);
            
            $queries = SkQuoteRequest::where('email', $user->email)
                                    ->page($page, $limit)
                                    ->order('create_time', 'desc')
                                    ->select();
            
            $total = SkQuoteRequest::where('email', $user->email)->count();
            
            $inquiryList = $queries->map(function($query) {
                return [
                    'id' => $query->id,
                    'product_info' => $query->product_info,
                    'content' => $query->content,
                    'status' => $query->status ?? 'pending',
                    'status_text' => $this->getInquiryStatusText($query->status ?? 'pending'),
                    'created_at' => $query->create_time,
                    'reply' => $query->reply ?? null
                ];
            });
            
            return $this->paginate($inquiryList, $total, $page, $limit);
            
        } catch (\Exception $e) {
            Log::error('Get user inquiries error: ' . $e->getMessage());
            return $this->error('获取询盘列表失败');
        }
    }

    /**
     * 创建询盘
     */
    public function createInquiry()
    {
        try {
            $userId = $this->request->userId;
            $user = SkUser::find($userId);
            
            if (!$user) {
                return $this->error('用户不存在');
            }
            
            $data = $this->request->param();
            
            $inquiry = new SkQuoteRequest();
            $inquiry->email = $user->email;
            $inquiry->product_info = $data['product_info'] ?? '';
            $inquiry->content = $data['content'] ?? '';
            $inquiry->status = 'pending';
            $inquiry->create_time = date('Y-m-d H:i:s');
            $inquiry->save();
            
            return $this->success(['id' => $inquiry->id], '询盘提交成功');
            
        } catch (\Exception $e) {
            Log::error('Create inquiry error: ' . $e->getMessage());
            return $this->error('提交询盘失败');
        }
    }

    /**
     * 获取我的样品申请
     */
    public function sampleApplications()
    {
        try {
            $userId = $this->request->userId;
            $user = SkUser::find($userId);
            
            if (!$user) {
                return $this->error('用户不存在');
            }
            
            $page = $this->request->param('page', 1);
            $limit = min($this->request->param('limit', 20), 50);
            
            $samples = SkSampleApply::where('email', $user->email)
                                   ->page($page, $limit)
                                   ->order('create_time', 'desc')
                                   ->select();
            
            $total = SkSampleApply::where('email', $user->email)->count();
            
            $sampleList = $samples->map(function($sample) {
                return [
                    'id' => $sample->id,
                    'product_name' => $sample->product_name,
                    'status' => $sample->status ?? 'processing',
                    'status_text' => $this->getSampleStatusText($sample->status ?? 'processing'),
                    'progress' => $sample->progress ?? 0,
                    'created_at' => $sample->create_time,
                    'expected_date' => $sample->expected_date ?? null,
                    'completed_date' => $sample->completed_date ?? null,
                    'reply_content' => $sample->reply_content ?? null
                ];
            });
            
            return $this->paginate($sampleList, $total, $page, $limit);
            
        } catch (\Exception $e) {
            Log::error('Get user sample applications error: ' . $e->getMessage());
            return $this->error('获取样品申请列表失败');
        }
    }

    /**
     * 创建样品申请
     */
    public function createSampleApplication()
    {
        try {
            $userId = $this->request->userId;
            $user = SkUser::find($userId);
            
            if (!$user) {
                return $this->error('用户不存在');
            }
            
            $data = $this->request->param();
            
            $sample = new SkSampleApply();
            $sample->email = $user->email;
            $sample->product_name = $data['product_name'] ?? '';
            $sample->company = $data['company'] ?? '';
            $sample->contact = $data['contact'] ?? '';
            $sample->phone = $data['phone'] ?? '';
            $sample->status = 'processing';
            $sample->progress = 0;
            $sample->create_time = date('Y-m-d H:i:s');
            $sample->save();
            
            return $this->success(['id' => $sample->id], '样品申请提交成功');
            
        } catch (\Exception $e) {
            Log::error('Create sample application error: ' . $e->getMessage());
            return $this->error('提交样品申请失败');
        }
    }

    /**
     * 获取收货地址列表
     */
    public function addresses()
    {
        try {
            $userId = $this->request->userId;
            $user = SkUser::find($userId);
            
            if (!$user) {
                return $this->error('用户不存在');
            }
            
            $addresses = SkAddress::where('user_id', $user->id)
                                 ->order('is_default', 'desc')
                                 ->order('id', 'desc')
                                 ->select();
            
            $addressList = $addresses->map(function($address) {
                return [
                    'id' => $address->id,
                    'name' => $address->name,
                    'phone' => $address->phone,
                    'province' => $address->province,
                    'city' => $address->city,
                    'district' => $address->district,
                    'address' => $address->address,
                    'is_default' => $address->is_default == 1
                ];
            });
            
            return $this->success($addressList);
            
        } catch (\Exception $e) {
            Log::error('Get user addresses error: ' . $e->getMessage());
            return $this->error('获取收货地址列表失败');
        }
    }

    /**
     * 添加收货地址
     */
    public function addAddress()
    {
        try {
            $userId = $this->request->userId;
            $user = SkUser::find($userId);
            
            if (!$user) {
                return $this->error('用户不存在');
            }
            
            $data = $this->request->param();
            
            // 验证参数
            $validate = Validate::rule([
                'name|收货人' => 'require|max:50',
                'phone|手机号' => 'require|mobile',
                'province|省份' => 'require',
                'city|城市' => 'require',
                'district|区县' => 'require',
                'address|详细地址' => 'require|max:200'
            ]);
            
            if (!$validate->check($data)) {
                return $this->error($validate->getError());
            }
            
            // 如果是默认地址，先取消其他默认地址
            if (isset($data['is_default']) && $data['is_default'] == true) {
                SkAddress::where('user_id', $user->id)->update(['is_default' => 0]);
            }
            
            $address = new SkAddress();
            $address->user_id = $user->id;
            $address->name = $data['name'];
            $address->phone = $data['phone'];
            $address->province = $data['province'];
            $address->city = $data['city'];
            $address->district = $data['district'];
            $address->address = $data['address'];
            $address->is_default = isset($data['is_default']) && $data['is_default'] == true ? 1 : 0;
            $address->save();
            
            return $this->success(['id' => $address->id], '地址添加成功');
            
        } catch (\Exception $e) {
            Log::error('Add address error: ' . $e->getMessage());
            return $this->error('添加收货地址失败');
        }
    }

    /**
     * 更新收货地址
     */
    public function updateAddress($id)
    {
        try {
            $userId = $this->request->userId;
            $user = SkUser::find($userId);
            
            if (!$user) {
                return $this->error('用户不存在');
            }
            
            $address = SkAddress::where('id', $id)->where('user_id', $user->id)->find();
            if (!$address) {
                return $this->error('地址不存在');
            }
            
            $data = $this->request->param();
            
            // 验证参数
            $validate = Validate::rule([
                'name|收货人' => 'require|max:50',
                'phone|手机号' => 'require|mobile',
                'province|省份' => 'require',
                'city|城市' => 'require',
                'district|区县' => 'require',
                'address|详细地址' => 'require|max:200'
            ]);
            
            if (!$validate->check($data)) {
                return $this->error($validate->getError());
            }
            
            // 如果是默认地址，先取消其他默认地址
            if (isset($data['is_default']) && $data['is_default'] == true) {
                SkAddress::where('user_id', $user->id)->update(['is_default' => 0]);
                $address->is_default = 1;
            }
            
            $address->name = $data['name'];
            $address->phone = $data['phone'];
            $address->province = $data['province'];
            $address->city = $data['city'];
            $address->district = $data['district'];
            $address->address = $data['address'];
            $address->save();
            
            return $this->success([], '地址更新成功');
            
        } catch (\Exception $e) {
            Log::error('Update address error: ' . $e->getMessage());
            return $this->error('更新收货地址失败');
        }
    }

    /**
     * 删除收货地址
     */
    public function deleteAddress($id)
    {
        try {
            $userId = $this->request->userId;
            $user = SkUser::find($userId);
            
            if (!$user) {
                return $this->error('用户不存在');
            }
            
            $address = SkAddress::where('id', $id)->where('user_id', $user->id)->find();
            if (!$address) {
                return $this->error('地址不存在');
            }
            
            $address->delete();
            
            return $this->success([], '地址删除成功');
            
        } catch (\Exception $e) {
            Log::error('Delete address error: ' . $e->getMessage());
            return $this->error('删除收货地址失败');
        }
    }

    /**
     * 设置默认地址
     */
    public function setDefaultAddress($id)
    {
        try {
            $userId = $this->request->userId;
            $user = SkUser::find($userId);
            
            if (!$user) {
                return $this->error('用户不存在');
            }
            
            $address = SkAddress::where('id', $id)->where('user_id', $user->id)->find();
            if (!$address) {
                return $this->error('地址不存在');
            }
            
            // 先取消其他默认地址
            SkAddress::where('user_id', $user->id)->update(['is_default' => 0]);
            
            // 设置当前地址为默认
            $address->is_default = 1;
            $address->save();
            
            return $this->success([], '默认地址设置成功');
            
        } catch (\Exception $e) {
            Log::error('Set default address error: ' . $e->getMessage());
            return $this->error('设置默认地址失败');
        }
    }

    /**
     * 获取订单状态文本
     */
    private function getOrderStatusText($status)
    {
        $statusMap = [
            'pending' => '待支付',
            'paid' => '已支付',
            'shipped' => '已发货',
            'completed' => '已完成',
            'cancelled' => '已取消'
        ];

        return $statusMap[$status] ?? '未知状态';
    }

    /**
     * 获取询盘状态文本
     */
    private function getInquiryStatusText($status)
    {
        $statusMap = [
            'pending' => '待回复',
            'replied' => '已回复',
            'closed' => '已关闭'
        ];
        
        return $statusMap[$status] ?? '未知状态';
    }

    /**
     * 获取样品申请状态文本
     */
    private function getSampleStatusText($status)
    {
        $statusMap = [
            'processing' => '处理中',
            'shipped' => '已发货',
            'completed' => '已完成',
            'cancelled' => '已取消'
        ];
        
        return $statusMap[$status] ?? '未知状态';
    }
}
