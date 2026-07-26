<?php
/**
 * 电子元器件商城 - 地址管理接口
 * 文件说明：用户地址增删改查接口，属于前台 API 模块（`api`）。
 * 备注：本项目为电子元器件商城（电子组件）。
 */

namespace app\controller\api;

use app\controller\BaseController;
use app\model\Address;
use think\facade\Log;

class AddressController extends BaseController
{
    /**
     * 获取用户地址列表
     */
    public function index()
    {
        $user = $this->getAuthUser();
        if (!$user) {
            return $this->error('未授权', 401);
        }

        $addresses = Address::where('user_id', $user->id)
                           ->order('is_default', 'desc')
                           ->order('id', 'desc')
                           ->select();

        return $this->success($addresses);
    }

    /**
     * 获取地址详情
     */
    public function read($id)
    {
        $user = $this->getAuthUser();
        if (!$user) {
            return $this->error('未授权', 401);
        }

        $address = Address::where('user_id', $user->id)->find($id);
        if (!$address) {
            return $this->error('地址不存在');
        }

        return $this->success($address);
    }

    /**
     * 创建地址
     */
    public function save()
    {
        $user = $this->getAuthUser();
        if (!$user) {
            return $this->error('未授权', 401);
        }

        $data = $this->request->param();
        $data['user_id'] = $user->id;

        // Validate required fields
        $required = ['name', 'phone', 'province', 'city', 'district', 'detail'];
        $fieldNames = ['name' => '姓名', 'phone' => '手机号', 'province' => '省份', 'city' => '城市', 'district' => '区县', 'detail' => '详细地址'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                return $this->error($fieldNames[$field] . '不能为空');
            }
        }

        // Validate phone number
        if (!preg_match('/^1[3-9]\d{9}$/', $data['phone'])) {
            return $this->error('手机号格式不正确');
        }

        try {
            $address = Address::create($data);

            // Set as default if it's the first address or explicitly requested
            if (isset($data['is_default']) && $data['is_default'] == 1) {
                $address->setAsDefault();
            } else {
                // If it's the first address, set as default
                $addressCount = Address::where('user_id', $user->id)->count();
                if ($addressCount == 1) {
                    $address->setAsDefault();
                }
            }

            return $this->success($address, '地址创建成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试');
        }
    }

    /**
     * 更新地址
     */
    public function update($id)
    {
        $user = $this->getAuthUser();
        if (!$user) {
            return $this->error('未授权', 401);
        }

        $address = Address::where('user_id', $user->id)->find($id);
        if (!$address) {
            return $this->error('地址不存在');
        }

        $data = $this->request->param();

        // Validate phone number if provided
        if (isset($data['phone']) && !preg_match('/^1[3-9]\d{9}$/', $data['phone'])) {
            return $this->error('手机号格式不正确');
        }

        try {
            $address->save($data);

            // Set as default if requested
            if (isset($data['is_default']) && $data['is_default'] == 1) {
                $address->setAsDefault();
            }

            return $this->success($address, '地址更新成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试');
        }
    }

    /**
     * 删除地址
     */
    public function delete($id)
    {
        $user = $this->getAuthUser();
        if (!$user) {
            return $this->error('未授权', 401);
        }

        $address = Address::where('user_id', $user->id)->find($id);
        if (!$address) {
            return $this->error('地址不存在');
        }

        try {
            $isDefault = $address->is_default;
            $address->delete();

            // If deleted address was default, set another address as default
            if ($isDefault) {
                $newDefault = Address::where('user_id', $user->id)->find();
                if ($newDefault) {
                    $newDefault->setAsDefault();
                }
            }

            return $this->success([], '地址删除成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试');
        }
    }

    /**
     * 设置默认地址
     */
    public function setDefault($id)
    {
        $user = $this->getAuthUser();
        if (!$user) {
            return $this->error('未授权', 401);
        }

        $address = Address::where('user_id', $user->id)->find($id);
        if (!$address) {
            return $this->error('地址不存在');
        }

        try {
            $address->setAsDefault();
            return $this->success([], '默认地址更新成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试');
        }
    }

    /**
     * 获取默认地址
     */
    public function getDefault()
    {
        $user = $this->getAuthUser();
        if (!$user) {
            return $this->error('未授权', 401);
        }

        $address = Address::where('user_id', $user->id)
                         ->where('is_default', 1)
                         ->find();

        if (!$address) {
            return $this->error('未找到默认地址');
        }

        return $this->success($address);
    }

    /**
     * 获取已认证用户
     */
    private function getAuthUser()
    {
        $token = $this->request->header('Authorization');
        if (!$token) {
            return null;
        }

        $token = str_replace('Bearer ', '', $token);

        try {
            $key = config('jwt.key', '');
            $decoded = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key($key, 'HS256'));
            
            return \app\model\User::find($decoded->user_id);
        } catch (\Exception $e) {
            return null;
        }
    }
}