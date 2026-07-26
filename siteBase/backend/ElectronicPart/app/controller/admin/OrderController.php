<?php

namespace app\controller\admin;
use think\facade\Log;

use app\controller\BaseController;
use app\model\Order;
use app\model\OrderItem;
use app\model\User;
use app\service\OrderService;
use think\exception\ValidateException;
use think\facade\Validate;
use think\facade\Db;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx as XlsxWriter;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;

class OrderController extends BaseController
{
    /**
     * 获取订单列表
     */
    public function index()
    {
        try {
            // 参数验证
            $validate = Validate::rule([
                'page' => 'integer|>=:1',
                'limit' => 'integer|between:1,100',
                'status' => 'in:,1,2,3,4,5',
                'start_date' => 'date',
                'end_date' => 'date'
            ])->message([
                'page.integer' => '页码必须是整数',
                'limit.between' => '每页数量必须在1-100之间',
                'status.in' => '订单状态不正确',
                'start_date.date' => '开始日期格式不正确',
                'end_date.date' => '结束日期格式不正确'
            ]);

            $params = $this->request->param();
            if (!$validate->check($params)) {
                return $this->error($validate->getError());
            }

            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 20;
            $keyword = trim($params['keyword'] ?? '');
            $status = $params['status'] ?? '';
            $startDate = $params['start_date'] ?? '';
            $endDate = $params['end_date'] ?? '';

            $query = Order::with(['user', 'orderItems']);

            // 关键词搜索（订单号、用户信息）
            if (!empty($keyword)) {
                $query->where(function($q) use ($keyword) {
                    $q->where('order_no', 'like', '%' . $keyword . '%')
                      ->whereOr('user_id', 'in', function($subQuery) use ($keyword) {
                          $subQuery->table('sk_user')
                                   ->where('nickname', 'like', '%' . $keyword . '%')
                                   ->whereOr('phone', 'like', '%' . $keyword . '%')
                                   ->field('id');
                      });
                });
            }

            // 状态筛选
            if ($status !== '') {
                $query->where('status', $status);
            }

            // 日期范围筛选
            if (!empty($startDate)) {
                $query->whereTime('created_at', '>=', $startDate);
            }
            if (!empty($endDate)) {
                $query->whereTime('created_at', '<=', $endDate . ' 23:59:59');
            }

            $total = $query->count();
            $orders = $query->page($page, $limit)
                           ->order('id', 'desc')
                           ->select();

            // 格式化订单数据
            $orderList = $orders->map(function($order) {
                return [
                    'id' => $order->id,
                    'order_no' => $order->order_no,
                    'user' => [
                        'id' => $order->user->id ?? 0,
                        'nickname' => $order->user->nickname ?? '未知用户',
                        'phone' => $order->user->phone ?? ''
                    ],
                    'total_amount' => $order->total_amount,
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
            Log::error('Get admin order list error: ' . $e->getMessage());
            return $this->error('获取订单列表失败');
        }
    }

    /**
     * 获取订单详情
     */
    public function read($id)
    {
        try {
            if (!is_numeric($id) || $id <= 0) {
                return $this->error('订单ID无效');
            }

            $order = Order::with(['user', 'orderItems', 'address'])->find($id);
            if (!$order) {
                return $this->error('订单不存在');
            }

            // 格式化地址信息
            $addressInfo = '';
            if ($order->address) {
                $addressInfo = ($order->address->province ?? '') . 
                              ($order->address->city ?? '') . 
                              ($order->address->district ?? '') . 
                              ($order->address->address ?? '');
            }

            // 格式化订单详情
            $orderData = [
                'id' => $order->id,
                'order_no' => $order->order_no,
                'user' => [
                    'id' => $order->user->id ?? 0,
                    'nickname' => $order->user->nickname ?? '未知用户',
                    'phone' => $order->user->phone ?? '',
                    'avatar' => $order->user->avatar ?? ''
                ],
                'total_amount' => $order->total_amount,
                'status' => $order->status,
                'status_text' => $order->status_text,
                'address_info' => $addressInfo,
                'remark' => $order->remark ?? '',
                'tracking_number' => $order->tracking_number ?? '',
                'paid_at' => $order->paid_at ?? '',
                'shipped_at' => $order->shipped_at ?? '',
                'completed_at' => $order->completed_at ?? '',
                'created_at' => $order->created_at,
                'updated_at' => $order->updated_at,
                'items' => $order->orderItems->map(function($item) {
                    return [
                        'id' => $item->id,
                        'product_id' => $item->product_id,
                        'product_name' => $item->product_name ?? '',
                        'product_image' => $item->product_image ?? '',
                        'price' => $item->price ?? 0,
                        'quantity' => $item->quantity ?? 1,
                        'total' => $item->total ?? 0
                    ];
                }),
                'can_update_status' => $this->getAvailableStatuses($order->status)
            ];

            return $this->success($orderData);

        } catch (\Exception $e) {
            Log::error('Get admin order detail error: ' . $e->getMessage());
            return $this->error('获取订单详情失败');
        }
    }

    /**
     * 更新订单状态
     */
    public function updateStatus($id)
    {
        try {
            if (!is_numeric($id) || $id <= 0) {
                return $this->error('订单ID无效');
            }

            $order = Order::find($id);
            if (!$order) {
                return $this->error('订单不存在');
            }

            // 参数验证
            $validate = Validate::rule([
                'status' => 'require|in:1,2,3,4,5',
                'tracking_number' => 'max:50'
            ])->message([
                'status.require' => '订单状态不能为空',
                'status.in' => '订单状态不正确',
                'tracking_number.max' => '物流单号不能超过50个字符'
            ]);

            $params = $this->request->param();
            if (!$validate->check($params)) {
                return $this->error($validate->getError());
            }

            $status = (int)$params['status'];
            $trackingNumber = $params['tracking_number'] ?? '';

            // 更新订单状态
            OrderService::updateOrderStatus($order, $status, [
                'tracking_number' => $trackingNumber
            ]);

            // 获取状态文本
            $statusMap = [
                Order::STATUS_PENDING => '待付款',
                Order::STATUS_PAID => '已付款',
                Order::STATUS_SHIPPED => '已发货',
                Order::STATUS_COMPLETED => '已完成',
                Order::STATUS_CANCELLED => '已取消'
            ];
            
            $statusText = $statusMap[$status] ?? '未知状态';
            return $this->success([], "订单状态已更新为：{$statusText}");

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error('Update order status error: ' . $e->getMessage());
            return $this->error('更新订单状态失败');
        }
    }

    /**
     * 订单发货
     */
    public function ship($id)
    {
        try {
            if (!is_numeric($id) || $id <= 0) {
                return $this->error('订单ID无效');
            }

            $order = Order::find($id);
            if (!$order) {
                return $this->error('订单不存在');
            }

            if ($order->status != Order::STATUS_PAID) {
                return $this->error('订单状态不允许发货');
            }

            // 参数验证
            $validate = Validate::rule([
                'tracking_number' => 'require|max:50',
                'shipping_company' => 'max:50'
            ])->message([
                'tracking_number.require' => '物流单号不能为空',
                'tracking_number.max' => '物流单号不能超过50个字符',
                'shipping_company.max' => '物流公司名称不能超过50个字符'
            ]);

            $params = $this->request->param();
            if (!$validate->check($params)) {
                return $this->error($validate->getError());
            }

            // 更新订单状态为已发货
            $order->tracking_number = $params['tracking_number'];
            $order->shipping_company = $params['shipping_company'] ?? '';
            $order->updateStatus(Order::STATUS_SHIPPED);

            return $this->success([], '订单发货成功');

        } catch (\Exception $e) {
            Log::error('Ship order error: ' . $e->getMessage());
            return $this->error('订单发货失败');
        }
    }

    /**
     * 订单退款
     */
    public function refund($id)
    {
        try {
            if (!is_numeric($id) || $id <= 0) {
                return $this->error('订单ID无效');
            }

            $order = Order::find($id);
            if (!$order) {
                return $this->error('订单不存在');
            }

            if (!in_array($order->status, [Order::STATUS_PAID, Order::STATUS_SHIPPED])) {
                return $this->error('订单状态不允许退款');
            }

            // 参数验证
            $validate = Validate::rule([
                'refund_amount' => 'require|float|>:0',
                'refund_reason' => 'require|max:200'
            ])->message([
                'refund_amount.require' => '退款金额不能为空',
                'refund_amount.float' => '退款金额必须是数字',
                'refund_amount.>' => '退款金额必须大于0',
                'refund_reason.require' => '退款原因不能为空',
                'refund_reason.max' => '退款原因不能超过200个字符'
            ]);

            $params = $this->request->param();
            if (!$validate->check($params)) {
                return $this->error($validate->getError());
            }

            $refundAmount = $params['refund_amount'];
            $refundReason = $params['refund_reason'];

            if ($refundAmount > $order->total_amount) {
                return $this->error('退款金额不能超过订单金额');
            }

            // TODO: 调用退款接口
            // $refundResult = PaymentService::refund($order, $refundAmount, $refundReason);

            // 更新订单状态
            $order->updateStatus(Order::STATUS_CANCELLED);
            $order->refund_amount = $refundAmount;
            $order->refund_reason = $refundReason;
            $order->refunded_at = date('Y-m-d H:i:s');
            $order->save();

            // 恢复库存
            $orderItems = OrderItem::where('order_id', $order->id)->select();
            foreach ($orderItems as $item) {
                $product = \app\model\Product::find($item->product_id);
                if ($product) {
                    $product->increaseStock($item->quantity);
                }
            }

            return $this->success([], '订单退款成功');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error('Refund order error: ' . $e->getMessage());
            return $this->error('订单退款失败');
        }
    }

    /**
     * 批量删除订单
     */
    public function batchDelete()
    {
        try {
            $ids = $this->request->post('ids', []);
            if (empty($ids) || !is_array($ids)) {
                return $this->error('请选择要删除的订单');
            }
            // 同时删除订单和订单明细
            OrderItem::whereIn('order_id', $ids)->delete();
            Order::destroy($ids);
            return $this->success(null, '批量删除成功');
        } catch (\Exception $e) {
            Log::error('Batch delete error: ' . $e->getMessage());
            return $this->error('批量删除失败');
        }
    }

    /**
     * 获取订单统计
     */
    public function statistics()
    {
        try {
            $stats = OrderService::getOrderStatistics();
            return $this->success($stats);

        } catch (\Exception $e) {
            Log::error('Get order statistics error: ' . $e->getMessage());
            return $this->error('获取订单统计失败');
        }
    }

    /**
     * 获取最近订单
     */
    public function recent()
    {
        try {
            $limit = min($this->request->param('limit', 10), 50);
            
            $orders = Order::with(['user', 'orderItems'])
                          ->order('id', 'desc')
                          ->limit($limit)
                          ->select();

            $orderList = $orders->map(function($order) {
                return [
                    'id' => $order->id,
                    'order_no' => $order->order_no,
                    'user_nickname' => $order->user->nickname ?? '未知用户',
                    'total_amount' => $order->total_amount,
                    'status' => $order->status,
                    'status_text' => $order->status_text,
                    'items_count' => $order->orderItems->count(),
                    'created_at' => $order->created_at
                ];
            });

            return $this->success($orderList);

        } catch (\Exception $e) {
            Log::error('Get recent orders error: ' . $e->getMessage());
            return $this->error('获取最近订单失败');
        }
    }

    /**
     * 获取销售趋势
     */
    public function salesChart()
    {
        try {
            $days = min($this->request->param('days', 7), 30);
            $trend = OrderService::getSalesTrend($days);
            
            return $this->success($trend);

        } catch (\Exception $e) {
            Log::error('Get sales chart error: ' . $e->getMessage());
            return $this->error('获取销售趋势失败');
        }
    }

    /**
     * 导出订单数据为 Excel（xlsx）
     */
    public function export()
    {
        try {
            $status    = $this->request->param('status', '');
            $startDate = $this->request->param('start_date', '');
            $endDate   = $this->request->param('end_date', '');

            $query = Order::with(['user', 'orderItems']);

            if ($status !== '') {
                $query->where('status', $status);
            }
            if (!empty($startDate)) {
                $query->whereTime('created_at', '>=', $startDate);
            }
            if (!empty($endDate)) {
                $query->whereTime('created_at', '<=', $endDate . ' 23:59:59');
            }

            $orders = $query->order('id', 'desc')->limit(10000)->select();

            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('订单列表');

            // 表头
            $headers = ['订单ID', '订单号', '用户昵称', '用户手机', '订单金额', '订单状态', '商品数量', '收货人', '收货地址', '创建时间'];
            foreach ($headers as $col => $header) {
                $sheet->setCellValue(chr(65 + $col) . '1', $header);
            }

            // 表头样式
            $sheet->getStyle('A1:' . chr(64 + count($headers)) . '1')->applyFromArray([
                'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ]);

            // 数据行
            $rowNum = 2;
            foreach ($orders as $order) {
                $sheet->setCellValue("A{$rowNum}", $order->id);
                $sheet->setCellValue("B{$rowNum}", $order->order_no);
                $sheet->setCellValue("C{$rowNum}", $order->user->nickname ?? '未知用户');
                $sheet->setCellValue("D{$rowNum}", $order->user->phone ?? '');
                $sheet->setCellValue("E{$rowNum}", $order->total_amount);
                $sheet->setCellValue("F{$rowNum}", $order->status_text ?? '');
                $sheet->setCellValue("G{$rowNum}", $order->orderItems->count());
                $sheet->setCellValue("H{$rowNum}", $order->receiver_name ?? '');
                $sheet->setCellValue("I{$rowNum}", $order->receiver_address ?? '');
                $sheet->setCellValue("J{$rowNum}", $order->created_at);
                $rowNum++;
            }

            // 自动列宽
            foreach (range('A', chr(64 + count($headers))) as $col) {
                $sheet->getColumnDimension($col)->setAutoSize(true);
            }

            // 数据行边框
            if ($rowNum > 2) {
                $sheet->getStyle('A2:' . chr(64 + count($headers)) . ($rowNum - 1))
                    ->applyFromArray(['borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]]);
            }

            $fileName = '订单数据_' . date('YmdHis') . '.xlsx';
            $tempFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . $fileName;

            $writer = new XlsxWriter($spreadsheet);
            $writer->save($tempFile);

            $fileContent = file_get_contents($tempFile);
            @unlink($tempFile);

            return response($fileContent, 200, [
                'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
                'Content-Length'      => strlen($fileContent),
                'Cache-Control'       => 'no-cache, must-revalidate',
            ]);

        } catch (\Exception $e) {
            Log::error('订单Excel导出失败: ' . $e->getMessage());
            return $this->error('导出失败：' . $e->getMessage());
        }
    }

    /**
     * 获取可用的状态转换
     * @param int $currentStatus
     * @return array
     */
    private function getAvailableStatuses(int $currentStatus): array
    {
        $transitions = [
            Order::STATUS_PENDING => [
                ['value' => Order::STATUS_PAID, 'text' => '已付款'],
                ['value' => Order::STATUS_CANCELLED, 'text' => '已取消']
            ],
            Order::STATUS_PAID => [
                ['value' => Order::STATUS_SHIPPED, 'text' => '已发货'],
                ['value' => Order::STATUS_CANCELLED, 'text' => '已取消']
            ],
            Order::STATUS_SHIPPED => [
                ['value' => Order::STATUS_COMPLETED, 'text' => '已完成']
            ],
            Order::STATUS_COMPLETED => [],
            Order::STATUS_CANCELLED => []
        ];

        return $transitions[$currentStatus] ?? [];
    }
}