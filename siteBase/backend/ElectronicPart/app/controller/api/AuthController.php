<?php
/**
 * 电子元器件商城 - 授权/认证接口（API）
 * 文件说明：处理用户登录、注册与认证相关逻辑，属于前台 API 模块。
 * 备注：项目为电子元器件/电子组件商城。
 */

declare(strict_types=1);

namespace app\controller\api;

use app\controller\BaseController;
use app\model\SkUser;
use app\service\AuthService;
use app\service\MailService;
use think\App;
use think\exception\ValidateException;
use think\Response;
use think\facade\Validate;

class AuthController extends BaseController
{
    protected $authService;
    protected $mailService;
    
    public function __construct(App $app)
    {
        parent::__construct($app);
        $this->authService = new AuthService();
        $this->mailService = new MailService();
    }
    
    /**
     * 用户登录
     */
    public function login(): Response
    {
        try {
            $params = $this->request->param();
            
            $validate = Validate::rule([
                'username|用户名' => 'require',
                'password|密码' => 'require|min:6'
            ]);
            
            if (!$validate->check($params)) {
                throw new ValidateException($validate->getError());
            }
            
            $this->logDebug('User login attempt', [
                'username' => $params['username']
            ]);
            
            $result = $this->authService->login($params['username'], $params['password']);
            
            $this->logDebug('User login successful', [
                'user_id' => $result['user']['id'],
                'username' => $params['username']
            ]);
            
            return $this->success($result, '登录成功');
            
        } catch (ValidateException $e) {
            $this->logError('Login validation failed', [
                'error' => $e->getError(),
                'input' => $this->request->post()
            ], 'auth');
            return $this->error($e->getError(), 400);
        } catch (\Exception $e) {
            $this->logError('Login system error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 'auth');
            // 生产环境不暴露详细错误信息
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 用户注册
     */
    public function register(): Response
    {
        try {
            // 直接使用param()获取参数，自动处理GET和POST参数，POST优先
            $params = $this->request->param();
            
            // 处理不同的密码确认字段名
            if (isset($params['confirm_password'])) {
                $params['password_confirm'] = $params['confirm_password'];
            }
            
            // 调试日志，查看实际接收到的参数
            $this->logDebug('Registration params', $params);
            
            // 移除内置的unique验证，在服务层手动验证
            $validate = Validate::rule([
                'email|邮箱' => 'require|regex:/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/',
                'password|密码' => 'require|min:6|regex:/^(?=.*[A-Z]).+$/',
                'password_confirm|确认密码' => 'require|confirm:password',
                'phone|手机号' => 'mobile|max:20', // 去掉 require
                'company|公司' => 'max:255',
                'contact_name|联系人' => 'max:100',
                'country|国家' => 'max:100',
                'postal_code|邮编' => 'alphaNum|max:20'
            ]);
            
            // 先验证参数
            if (!$validate->check($params)) {
                throw new ValidateException($validate->getError());
            }
            
            // 为可选字段设置默认值
            $params['phone'] = $params['phone'] ?? NULL;
            $params['company'] = $params['company'] ?? NULL;
            $params['contact_name'] = $params['contact_name'] ?? NULL;
            $params['country'] = $params['country'] ?? NULL;
            $params['postal_code'] = $params['postal_code'] ?? NULL;
            $params['username'] = $params['username'] ?? '';
            
            $this->logDebug('User registration attempt', [
                'email' => $params['email'],
                'company' => $params['company']
            ]);
            
            $result = $this->authService->register($params);
            
            $this->logDebug('User registration successful', [
                'user_id' => $result['user']['id'],
                'email' => $params['email']
            ]);
            
            return $this->success([
                'user_id' => $result['user']['id'],
                'email' => $result['user']['email'],
                'token' => $result['token'],
                'user' => $result['user']
            ], '注册成功');
            
        } catch (ValidateException $e) {
            $this->logError('Registration validation failed', [
                'error' => $e->getError(),
                'input' => $this->request->post()
            ], 'auth');
            return $this->error($e->getError(), 400);
        } catch (\Exception $e) {
            $this->logError('Registration system error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 'auth');
            // 临时调试：返回具体错误信息以便排查
            return $this->error('注册失败: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 忘记密码
     */
    public function forgotPassword(): Response
    {
        try {
            $params = $this->request->param();
            
            $validate = Validate::rule([
                'email|邮箱' => 'require|email'
            ]);
            
            if (!$validate->check($params)) {
                throw new ValidateException($validate->getError());
            }
            
            // 限流检查：同一邮箱5分钟内最多发送4次
            $rateLimitKey = 'forgot_password_rate_limit_' . md5($params['email']);
            $requestCount = cache($rateLimitKey);
            
            if ($requestCount === false) {
                // 首次请求，设置计数为1，有效期5分钟
                cache($rateLimitKey, 1, 300);
            } elseif ($requestCount >= 4) {
                // 超过限制
                $this->logWarning('Password reset rate limit exceeded', [
                    'email' => $params['email'],
                    'count' => $requestCount
                ]);
                return $this->error('您操作太频繁，请稍后再试', 429);
            } else {
                // 增加计数
                cache($rateLimitKey, $requestCount + 1, 300);
            }
            
            $user = SkUser::where('email', $params['email'])->find();
            if (!$user) {
                return $this->error('该邮箱未注册', 404);
            }
            
            $resetToken = random_int(100000, 999999);
            cache('reset_password_' . $user->id, $resetToken, 600);
            
            $this->logDebug('Password reset requested', [
                'email' => $params['email'],
                'user_id' => $user->id,
                'request_count' => cache($rateLimitKey)
            ]);
            
            $subject = '密码重置验证码';
            $body = '<p>您的密码重置验证码是：<strong>' . $resetToken . '</strong></p><p>该验证码10分钟内有效</p>';
            $this->mailService->sendEmail($params['email'], $subject, $body);
            
            // 安全修复：响应中不得返回token字段，验证码仅通过邮件发送
            return $this->success([
                'email' => $params['email']
            ], '重置密码邮件已发送');
            
        } catch (ValidateException $e) {
            $this->logError('Password reset validation failed', [
                'error' => $e->getError(),
                'input' => $this->request->post()
            ], 'auth');
            return $this->error($e->getError(), 400);
        } catch (\Exception $e) {
            $this->logError('Password reset system error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 'auth');
            // 生产环境不暴露详细错误信息
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 重置密码
     */
    public function resetPassword(): Response
    {
        try {
            $params = $this->request->param();
            
            $validate = Validate::rule([
                'email|邮箱' => 'require|email',
                'token|验证码' => 'require',
                'password|新密码' => 'require|min:6',
                'password_confirm|确认密码' => 'require|confirm:password'
            ]);
            
            if (!$validate->check($params)) {
                throw new ValidateException($validate->getError());
            }
            
            $user = SkUser::where('email', $params['email'])->find();
            if (!$user) {
                return $this->error('用户不存在', 404);
            }
            
            $cachedToken = cache('reset_password_' . $user->id);
            if (!$cachedToken || $cachedToken != $params['token']) {
                return $this->error('验证码无效或已过期', 400);
            }
            
            $user->password = password_hash($params['password'], PASSWORD_DEFAULT);
            $user->save();
            
            cache('reset_password_' . $user->id, null);
            
            $this->logDebug('Password reset successful', [
                'user_id' => $user->id,
                'email' => $params['email']
            ]);
            
            // 明确返回空数据，确保不包含token和user信息
            return $this->success([], '密码重置成功');
            
        } catch (ValidateException $e) {
            $this->logError('Password reset validation failed', [
                'error' => $e->getError(),
                'input' => $this->request->post()
            ], 'auth');
            return $this->error($e->getError(), 400);
        } catch (\Exception $e) {
            $this->logError('Password reset system error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 'auth');
            // 生产环境不暴露详细错误信息
            return $this->error('服务器内部错误，请稍后重试', 500);
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
            
            $this->logDebug('User logout', [
                'token' => $token
            ]);
            
            return $this->success([], '退出成功');
            
        } catch (\Exception $e) {
            $this->logError('Logout system error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 'auth');
            // 生产环境不暴露详细错误信息
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}