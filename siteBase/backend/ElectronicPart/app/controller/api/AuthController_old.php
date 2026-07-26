<?php
/**
 * 电子元器件商城 - 旧版授权/认证接口（保留）
 * 文件说明：历史登录/认证实现，保留供兼容或参考，推荐使用新的 `AuthController`。
 */

namespace app\controller\api;

use app\controller\BaseController;
use app\model\SkUser;
use app\service\AuthService;
use think\App;
use think\exception\ValidateException;
use think\Response;
use think\facade\Validate;
use think\facade\Log;

class AuthController extends BaseController
{
    protected $authService;
    
    public function __construct(App $app)
    {
        parent::__construct($app);
        $this->authService = new AuthService();
    }
    
    /**
     * 用户登录（用户名/手机号 + 密码）
     */
    public function login(): Response
    {
        try {
            $params = $this->request->post();
            
            // 验证参数
            $validate = Validate::rule([
                'username|用户名' => 'require',
                'password|密码' => 'require|min:6'
            ]);
            
            if (!$validate->check($params)) {
                throw new ValidateException($validate->getError());
            }
            
            $result = $this->authService->login($params['username'], $params['password']);
            
            return json([
                'code' => 200,
                'message' => '登录成功',
                'data' => $result
            ]);
            
        } catch (ValidateException $e) {
            return json([
                'code' => 400,
                'message' => $e->getError()
            ], 400);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return json([
                'code' => 500,
                'message' => '服务器内部错误，请稍后重试'
            ], 500);
        }
    }
    
    /**
     * 微信小程序登录
     */
    public function loginByWechat(): Response
    {
        try {
            $params = $this->request->post();
            
            // 验证参数
            $validate = Validate::rule([
                'code|微信code' => 'require'
            ]);
            
            if (!$validate->check($params)) {
                throw new ValidateException($validate->getError());
            }
            
            $userInfo = [];
            if (isset($params['userInfo']) && is_array($params['userInfo'])) {
                $userInfo = $params['userInfo'];
            }
            
            $result = $this->authService->loginByWechat($params['code'], $userInfo);
            
            return json([
                'code' => 200,
                'message' => '登录成功',
                'data' => $result
            ]);
            
        } catch (ValidateException $e) {
            return json([
                'code' => 400,
                'message' => $e->getError()
            ], 400);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return json([
                'code' => 500,
                'message' => '服务器内部错误，请稍后重试'
            ], 500);
        }
    }
    
    /**
     * 手机号登录
     */
    public function loginBySms(): Response
    {
        try {
            $params = $this->request->post();
            
            // 验证参数
            $validate = Validate::rule([
                'phone|手机号' => 'require|mobile',
                'code|验证码' => 'require|length:6'
            ]);
            
            if (!$validate->check($params)) {
                throw new ValidateException($validate->getError());
            }
            
            $result = $this->authService->loginBySms($params['phone'], $params['code']);
            
            return json([
                'code' => 200,
                'message' => '登录成功',
                'data' => $result
            ]);
            
        } catch (ValidateException $e) {
            return json([
                'code' => 400,
                'message' => $e->getError()
            ], 400);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return json([
                'code' => 500,
                'message' => '服务器内部错误，请稍后重试'
            ], 500);
        }
    }

    /**
     * 发送短信验证码
     */
    public function sendSms(): Response
    {
        try {
            $params = $this->request->post();
            
            // 验证参数
            $validate = Validate::rule([
                'phone|手机号' => 'require|mobile',
                'type|类型' => 'require|in:register,login,reset_password'
            ]);
            
            if (!$validate->check($params)) {
                throw new ValidateException($validate->getError());
            }
            
            $result = $this->authService->sendSmsCode($params['phone'], $params['type']);
            
            return json([
                'code' => 200,
                'message' => '验证码发送成功',
                'data' => $result
            ]);
            
        } catch (ValidateException $e) {
            return json([
                'code' => 400,
                'message' => $e->getError()
            ], 400);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return json([
                'code' => 500,
                'message' => '服务器内部错误，请稍后重试'
            ], 500);
        }
    }

    /**
     * 验证短信验证码
     */
    public function verifySms(): Response
    {
        try {
            $params = $this->request->post();
            
            // 验证参数
            $validate = Validate::rule([
                'phone|手机号' => 'require|mobile',
                'code|验证码' => 'require|length:6'
            ]);
            
            if (!$validate->check($params)) {
                throw new ValidateException($validate->getError());
            }
            
            $result = $this->authService->verifySmsCode($params['phone'], $params['code']);
            
            return json([
                'code' => 200,
                'message' => '验证码验证成功',
                'data' => $result
            ]);
            
        } catch (ValidateException $e) {
            return json([
                'code' => 400,
                'message' => $e->getError()
            ], 400);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return json([
                'code' => 500,
                'message' => '服务器内部错误，请稍后重试'
            ], 500);
        }
    }
    
    /**
     * 用户注册
     */
    public function register(): Response
    {
        try {
            $params = $this->request->post();
            
            // 验证参数
            $validate = Validate::rule([
                'username|用户名' => 'require|unique:users',
                'phone|手机号' => 'require|mobile|unique:users',
                'password|密码' => 'require|min:6',
                'password_confirm|确认密码' => 'require|confirm:password'
            ]);
            
            if (!$validate->check($params)) {
                throw new ValidateException($validate->getError());
            }
            
            $result = $this->authService->register($params);
            
            return json([
                'code' => 200,
                'message' => '注册成功',
                'data' => $result
            ]);
            
        } catch (ValidateException $e) {
            return json([
                'code' => 400,
                'message' => $e->getError()
            ], 400);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return json([
                'code' => 500,
                'message' => '服务器内部错误，请稍后重试'
            ], 500);
        }
    }

    /**
     * 获取用户信息
     */
    public function profile(): Response
    {
        try {
            $userId = $this->request->userId;
            $user = User::find($userId);
            
            if (!$user) {
                return json([
                    'code' => 404,
                    'message' => '用户不存在'
                ], 404);
            }
            
            return json([
                'code' => 200,
                'message' => '获取成功',
                'data' => [
                    'user' => $user->hidden(['password'])->toArray()
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return json([
                'code' => 500,
                'message' => '服务器内部错误，请稍后重试'
            ], 500);
        }
    }

    /**
     * 更新用户信息
     */
    public function updateProfile(): Response
    {
        try {
            $userId = $this->request->userId;
            $params = $this->request->post();
            
            $user = User::find($userId);
            if (!$user) {
                return json([
                    'code' => 404,
                    'message' => '用户不存在'
                ], 404);
            }
            
            // 允许更新的字段
            $allowFields = ['nickname', 'avatar', 'gender', 'birthday'];
            $updateData = [];
            
            foreach ($allowFields as $field) {
                if (isset($params[$field])) {
                    $updateData[$field] = $params[$field];
                }
            }
            
            if (!empty($updateData)) {
                $user->save($updateData);
            }
            
            return json([
                'code' => 200,
                'message' => '更新成功',
                'data' => [
                    'user' => $user->hidden(['password'])->toArray()
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return json([
                'code' => 500,
                'message' => '服务器内部错误，请稍后重试'
            ], 500);
        }
    }

    /**
     * 用户登出
     */
    public function logout(): Response
    {
        try {
            $token = $this->request->header('Authorization');
            if ($token) {
                $this->authService->logout($token);
            }
            
            return json([
                'code' => 200,
                'message' => '退出成功'
            ]);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return json([
                'code' => 500,
                'message' => '服务器内部错误，请稍后重试'
            ], 500);
        }
    }

    /**
     * 刷新Token
     */
    public function refreshToken(): Response
    {
        try {
            $token = $this->request->header('Authorization');
            if (!$token) {
                return json([
                    'code' => 401,
                    'message' => 'Token不能为空'
                ], 401);
            }
            
            $result = $this->authService->refreshToken($token);
            
            return json([
                'code' => 200,
                'message' => '刷新成功',
                'data' => $result
            ]);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return json([
                'code' => 401,
                'message' => '服务器内部错误，请稍后重试'
            ], 401);
        }
    }

    /**
     * 发送找回密码邮件
     */
    public function forgotPassword(): Response
    {
        try {
            $params = $this->request->post();
            
            // 验证参数
            $validate = Validate::rule([
                'email|邮箱' => 'require|email'
            ]);
            
            if (!$validate->check($params)) {
                throw new ValidateException($validate->getError());
            }
            
            // 查找用户
            $user = User::where('email', $params['email'])->find();
            if (!$user) {
                return json([
                    'code' => 404,
                    'message' => '该邮箱未注册'
                ], 404);
            }
            
            // 生成重置令牌（6位数字）- 使用密码学安全随机数
            $resetToken = random_int(100000, 999999);
            
            // 保存到缓存，有效期10分钟
            cache('reset_password_' . $user->id, $resetToken, 600);
            
            // TODO: 发送邮件（这里简化处理，实际应该发送邮件）
            // 开发环境下直接返回token
            
            return json([
                'code' => 200,
                'message' => '重置密码邮件已发送',
                'data' => [
                    'email' => $params['email'],
                    'token' => $resetToken // 生产环境应该删除这行
                ]
            ]);
            
        } catch (ValidateException $e) {
            return json([
                'code' => 400,
                'message' => $e->getError()
            ], 400);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return json([
                'code' => 500,
                'message' => '服务器内部错误，请稍后重试'
            ], 500);
        }
    }

    /**
     * 重置密码
     */
    public function resetPassword(): Response
    {
        try {
            $params = $this->request->post();
            
            // 验证参数
            $validate = Validate::rule([
                'email|邮箱' => 'require|email',
                'token|验证码' => 'require',
                'password|新密码' => 'require|min:6',
                'password_confirm|确认密码' => 'require|confirm:password'
            ]);
            
            if (!$validate->check($params)) {
                throw new ValidateException($validate->getError());
            }
            
            // 查找用户
            $user = User::where('email', $params['email'])->find();
            if (!$user) {
                return json([
                    'code' => 404,
                    'message' => '用户不存在'
                ], 404);
            }
            
            // 验证token
            $cachedToken = cache('reset_password_' . $user->id);
            if (!$cachedToken || $cachedToken != $params['token']) {
                return json([
                    'code' => 400,
                    'message' => '验证码无效或已过期'
                ], 400);
            }
            
            // 更新密码
            $user->password = password_hash($params['password'], PASSWORD_DEFAULT);
            $user->save();
            
            // 清除token
            cache('reset_password_' . $user->id, null);
            
            return json([
                'code' => 200,
                'message' => '密码重置成功'
            ]);
            
        } catch (ValidateException $e) {
            return json([
                'code' => 400,
                'message' => $e->getError()
            ], 400);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return json([
                'code' => 500,
                'message' => '服务器内部错误，请稍后重试'
            ], 500);
        }
    }
}
