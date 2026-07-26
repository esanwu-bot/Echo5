<?php
/**
 * 电子元器件商城 - 控制器
 * 文件说明：后台管理员相关接口（用户/权限管理），仅供管理员操作。
 * 注意：本项目为电子元器件商城（电子组件），非酒水商城。
 */

namespace app\controller\admin;
use think\facade\Log;

use app\controller\BaseController;
use app\model\SkAdmin;
use app\model\SkRole;
use think\exception\ValidateException;
use think\facade\Validate;
use think\facade\Db;

class AdminController extends BaseController
{
    /**
     * 获取管理员列表
     */
    public function index()
    {
        try {
            // 检查权限（仅超级管理员可访问）
            $currentAdmin = $this->request->admin;
            if ($currentAdmin->role_id !== 1) {
                return $this->error('权限不足', 403);
            }

            // 参数验证
            $validate = Validate::rule([
                'page' => 'integer|>=:1',
                'limit' => 'integer|between:1,100',
                'status' => 'in:,0,1',
                'role' => 'in:,admin,super_admin'
            ])->message([
                'page.integer' => '页码必须是整数',
                'limit.between' => '每页数量必须在1-100之间',
                'status.in' => '状态值不正确',
                'role.in' => '角色值不正确'
            ]);

            $params = $this->request->param();
            if (!$validate->check($params)) {
                return $this->error($validate->getError());
            }

            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 20;
            $keyword = trim($params['keyword'] ?? '');
            $status = $params['status'] ?? '';
            $role = $params['role'] ?? '';

            $query = SkAdmin::query();

            // 关键词搜索
            if (!empty($keyword)) {
                $query->where(function($q) use ($keyword) {
                    $q->where('username', 'like', '%' . $keyword . '%')
                      ->whereOr('real_name', 'like', '%' . $keyword . '%')
                      ->whereOr('email', 'like', '%' . $keyword . '%');
                });
            }

            // 状态筛选
            if ($status !== '') {
                $query->where('status', $status);
            }

            // 角色筛选
            if (!empty($role)) {
                $query->where('role', $role);
            }

            $total = $query->count();
            $admins = $query->page($page, $limit)
                           ->order('id', 'desc')
                           ->select();

            // 格式化管理员数据
            $adminList = $admins->map(function($admin) {
                return [
                    'id' => $admin->id,
                    'username' => $admin->username,
                    'nickname' => $admin->real_name,
                    'email' => $admin->email ?: '',

                    'role' => $admin->role_id == 1 ? 'super_admin' : 'admin',
                    'role_text' => $this->getRoleText($admin->role_id == 1 ? 'super_admin' : 'admin'),
                    'status' => $admin->status,
                    'status_text' => $admin->status ? '正常' : '禁用',
                    'last_login_time' => $admin->last_login_time,

                    'created_at' => $admin->created_at,
                    'updated_at' => $admin->updated_at
                ];
            });

            return $this->paginate($adminList, $total, $page, $limit);

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error('Get admin list error: ' . $e->getMessage());
            return $this->error('获取管理员列表失败');
        }
    }

    /**
     * 创建管理员
     */
    public function create()
    {
        try {
            // 检查权限（仅超级管理员可访问）
            $currentAdmin = $this->request->admin;
            if ($currentAdmin->role_id !== 1) {
                return $this->error('权限不足', 403);
            }

            // 参数验证
            $validate = Validate::rule([
                'username' => 'require|length:3,20|unique:sk_admin',
                'password' => 'require|length:6,20',
                'real_name' => 'require|length:2,20',
                'email' => 'email|unique:sk_admin',
                'role' => 'require|in:admin,super_admin'
            ])->message([
                'username.require' => '用户名不能为空',
                'username.length' => '用户名长度必须在3-20个字符之间',
                'username.unique' => '用户名已存在',
                'password.require' => '密码不能为空',
                'password.length' => '密码长度必须在6-20个字符之间',
                'real_name.require' => '姓名不能为空',
                'real_name.length' => '姓名长度必须在2-20个字符之间',
                'email.email' => '邮箱格式不正确',
                'email.unique' => '邮箱已存在',
                'role.require' => '角色不能为空',
                'role.in' => '角色值不正确'
            ]);

            $params = $this->request->param();
            if (!$validate->check($params)) {
                return $this->error($validate->getError());
            }

            // 创建管理员
            $adminData = [
                'username' => $params['username'],
                'password' => password_hash($params['password'], PASSWORD_DEFAULT),
                'real_name' => $params['real_name'] ?? $params['nickname'] ?? '',
                'email' => $params['email'] ?? '',
                'role_id' => $params['role'] === 'super_admin' ? 1 : 2,
                'status' => 1
            ];

            $admin = SkAdmin::create($adminData);

            return $this->success([
                'id' => $admin->id,
                'username' => $admin->username,
                'nickname' => $admin->real_name,
                'role' => $admin->role_id == 1 ? 'super_admin' : 'admin'
            ], '管理员创建成功');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error('Create admin error: ' . $e->getMessage());
            return $this->error('创建管理员失败');
        }
    }

    /**
     * 更新管理员
     */
    public function update($id)
    {
        try {
            // 检查权限（仅超级管理员可访问）
            $currentAdmin = $this->request->admin;
            if ($currentAdmin->role_id !== 1) {
                return $this->error('权限不足', 403);
            }

            if (!is_numeric($id) || $id <= 0) {
                return $this->error('管理员ID无效');
            }

            $admin = SkAdmin::find($id);
            if (!$admin) {
                return $this->error('管理员不存在');
            }

            // 不能修改自己的信息
            if ($admin->id == $currentAdmin->id) {
                return $this->error('不能修改自己的信息');
            }

            // 参数验证
            $validate = Validate::rule([
                'username' => 'length:3,20|unique:sk_admin,username,' . $id,
                'password' => 'length:6,20',
                'real_name' => 'length:2,20',
                'email' => 'email|unique:sk_admin,email,' . $id,
                'role' => 'in:admin,super_admin'
            ])->message([
                'username.length' => '用户名长度必须在3-20个字符之间',
                'username.unique' => '用户名已存在',
                'password.length' => '密码长度必须在6-20个字符之间',
                'nickname.length' => '昵称长度必须在2-20个字符之间',
                'email.email' => '邮箱格式不正确',
                'email.unique' => '邮箱已存在',
                'role.in' => '角色值不正确'
            ]);

            $params = $this->request->param();
            if (!$validate->check($params)) {
                return $this->error($validate->getError());
            }

            // 更新数据
            $updateData = [];
            if (isset($params['username'])) $updateData['username'] = $params['username'];
            if (isset($params['nickname'])) $updateData['real_name'] = $params['nickname'];
            if (isset($params['real_name'])) $updateData['real_name'] = $params['real_name'];
            if (isset($params['email'])) $updateData['email'] = $params['email'];

            if (isset($params['role'])) $updateData['role_id'] = $params['role'] === 'super_admin' ? 1 : 2;
            
            // 如果提供了新密码，则更新密码
            if (!empty($params['password'])) {
                $updateData['password'] = password_hash($params['password'], PASSWORD_DEFAULT);
            }

            $admin->save($updateData);

            return $this->success([], '管理员信息更新成功');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error('Update admin error: ' . $e->getMessage());
            return $this->error('更新管理员信息失败');
        }
    }

    /**
     * 删除管理员
     */
    public function delete($id)
    {
        try {
            // 检查权限（仅超级管理员可访问）
            $currentAdmin = $this->request->admin;
            if ($currentAdmin->role_id !== 1) {
                return $this->error('权限不足', 403);
            }

            if (!is_numeric($id) || $id <= 0) {
                return $this->error('管理员ID无效');
            }

            $admin = SkAdmin::find($id);
            if (!$admin) {
                return $this->error('管理员不存在');
            }

            // 不能删除自己
            if ($admin->id == $currentAdmin->id) {
                return $this->error('不能删除自己');
            }

            // 不能删除超级管理员（除非自己也是超级管理员）
            if ($admin->role_id == 1 ? 'super_admin' : 'admin' === 'super_admin' && $currentAdmin->role !== 'super_admin') {
                return $this->error('不能删除超级管理员');
            }

            $admin->delete();

            return $this->success([], '管理员删除成功');

        } catch (\Exception $e) {
            Log::error('Delete admin error: ' . $e->getMessage());
            return $this->error('删除管理员失败');
        }
    }

    /**
     * 更新管理员状态
     */
    public function updateStatus($id)
    {
        try {
            // 检查权限（仅超级管理员可访问）
            $currentAdmin = $this->request->admin;
            if ($currentAdmin->role_id !== 1) {
                return $this->error('权限不足', 403);
            }

            if (!is_numeric($id) || $id <= 0) {
                return $this->error('管理员ID无效');
            }

            $admin = SkAdmin::find($id);
            if (!$admin) {
                return $this->error('管理员不存在');
            }

            // 不能修改自己的状态
            if ($admin->id == $currentAdmin->id) {
                return $this->error('不能修改自己的状态');
            }

            $status = $this->request->param('status');
            if (!in_array($status, [0, 1])) {
                return $this->error('状态值不正确');
            }

            $admin->status = $status;
            $admin->save();

            $statusText = $status ? '启用' : '禁用';
            return $this->success([], "管理员{$statusText}成功");

        } catch (\Exception $e) {
            Log::error('Update admin status error: ' . $e->getMessage());
            return $this->error('更新管理员状态失败');
        }
    }

    /**
     * 管理员登录
     */
    public function login()
    {
        try {
            // 参数验证
            $validate = Validate::rule([
                'username' => 'require|length:3,20',
                'password' => 'require|length:6,20'
            ])->message([
                'username.require' => '用户名不能为空',
                'username.length' => '用户名长度必须在3-20个字符之间',
                'password.require' => '密码不能为空',
                'password.length' => '密码长度必须在6-20个字符之间'
            ]);

            $params = $this->request->param();
            if (!$validate->check($params)) {
                return $this->error($validate->getError());
            }

            // 查询管理员
            $admin = SkAdmin::where('username', $params['username'])->find();
            if (!$admin) {
                return $this->error('用户名或密码错误');
            }

            // 验证密码
            if (!password_verify($params['password'], $admin->password)) {
                return $this->error('用户名或密码错误');
            }

            // 检查状态
            if (!$admin->status) {
                return $this->error('账号已被禁用');
            }

            // 更新登录信息
            $admin->last_login_time = date('Y-m-d H:i:s');
            $admin->save();

            // 生成token
            $token = $this->createToken($admin);

            // 返回登录信息
            return $this->success([
                'token' => $token,
                'user' => [
                    'id' => $admin->id,
                    'username' => $admin->username,
                    'nickname' => $admin->real_name,

                    'role' => $admin->role_id == 1 ? 'super_admin' : 'admin',
                    'role_text' => $this->getRoleText($admin->role_id == 1 ? 'super_admin' : 'admin')
                ]
            ], '登录成功');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error('Admin login error: ' . $e->getMessage());
            return $this->error('登录失败');
        }
    }

    /**
     * 获取当前管理员信息
     */
    public function info()
    {
        try {
            $admin = $this->request->admin;
            
            return $this->success([
                'id' => $admin->id,
                'username' => $admin->username,
                'real_name' => $admin->real_name,
                'email' => $admin->email ?: '',
                'avatar' => $admin->avatar ?: '',
                'role' => $admin->role_id == 1 ? 'super_admin' : 'admin',
                'role_text' => $this->getRoleText($admin->role_id == 1 ? 'super_admin' : 'admin'),
                'status' => $admin->status,
                'last_login_time' => $admin->last_login_time,

                'created_at' => $admin->created_at
            ]);

        } catch (\Exception $e) {
            Log::error('Get admin info error: ' . $e->getMessage());
            return $this->error('获取管理员信息失败');
        }
    }

    /**
     * 管理员退出登录
     */
    public function logout()
    {
        try {
            // TODO: 实现token黑名单机制
            
            return $this->success([], '退出登录成功');

        } catch (\Exception $e) {
            Log::error('Admin logout error: ' . $e->getMessage());
            return $this->error('退出登录失败');
        }
    }

    /**
     * 生成token
     */
    private function createToken($admin)
    {
        // 简单的token生成，实际项目中应该使用JWT或其他安全方式
        $payload = [
            'id' => $admin->id,
            'username' => $admin->username,
            'role' => $admin->role_id == 1 ? 'super_admin' : 'admin',
            'exp' => time() + 86400 * 7 // 7天有效期
        ];
        
        return base64_encode(json_encode($payload));
    }

    /**
     * 获取角色文本
     */
    private function getRoleText($role)
    {
        $roleMap = [
            'admin' => '管理员',
            'super_admin' => '超级管理员'
        ];

        return $roleMap[$role] ?? '未知角色';
    }
}