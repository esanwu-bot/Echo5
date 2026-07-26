<?php
/**
 * 电子元器件商城 - OAuth2 认证控制器
 * 文件说明：实现 OAuth2 授权与令牌接口，供第三方客户端使用授权流程。
 */
declare(strict_types=1);

namespace app\controller\oauth;

use app\BaseController;
use app\service\outer\OAuth2Service;
use think\Response;
use think\exception\ValidateException;
use think\facade\Log;

/**
 * OAuth2认证控制器
 */
class AuthController extends BaseController
{
    protected $oauth2Service;
    
    public function __construct()
    {
        parent::__construct();
        $this->oauth2Service = new OAuth2Service();
    }
    
    /**
     * 获取授权码 (Authorization Code Grant)
     */
    public function authorize(): Response
    {
        try {
            $params = $this->request->get();
            
            // 验证参数
            $this->validate($params, [
                'response_type|响应类型' => 'require|in:code',
                'client_id|客户端ID' => 'require',
                'redirect_uri|重定向URI' => 'require|url',
                'scope|权限范围' => 'max:255',
                'state|状态参数' => 'max:255'
            ]);
            
            $clientId = $params['client_id'];
            $redirectUri = $params['redirect_uri'];
            $scopes = !empty($params['scope']) ? explode(' ', $params['scope']) : [];
            $state = $params['state'] ?? '';
            
            // 验证客户端和重定向URI
            if (!$this->oauth2Service->validateClientAndRedirectUri($clientId, $redirectUri)) {
                return $this->errorRedirect($redirectUri, 'invalid_client', 'Invalid client or redirect URI', $state);
            }
            
            // 这里应该显示授权页面让用户确认
            // 为了简化，我们直接生成授权码（实际项目中需要用户授权确认）
            $userId = $this->getCurrentUserId(); // 获取当前登录用户ID
            
            $authCode = $this->oauth2Service->generateAuthorizationCode($clientId, $redirectUri, $scopes, $userId);
            
            // 构建重定向URL
            $redirectUrl = $redirectUri . '?code=' . $authCode;
            if (!empty($state)) {
                $redirectUrl .= '&state=' . urlencode($state);
            }
            
            return redirect($redirectUrl);
            
        } catch (ValidateException $e) {
            return json([
                'error' => 'invalid_request',
                'error_description' => $e->getError()
            ], 400);
        } catch (\Exception $e) {
            Log::error('OAuth2 authorize error', [
                'error' => $e->getMessage(),
                'params' => $params ?? []
            ]);
            
            $redirectUri = $params['redirect_uri'] ?? '';
            $state = $params['state'] ?? '';
            
            if (!empty($redirectUri)) {
                return $this->errorRedirect($redirectUri, 'server_error', 'Authorization server error', $state);
            }
            
            return json([
                'error' => 'server_error',
                'error_description' => 'Authorization server error'
            ], 500);
        }
    }
    
    /**
     * 获取访问令牌
     */
    public function token(): Response
    {
        try {
            $params = $this->request->post();
            
            // 验证基本参数
            $this->validate($params, [
                'grant_type|授权类型' => 'require|in:authorization_code,client_credentials,refresh_token',
                'client_id|客户端ID' => 'require',
                'client_secret|客户端密钥' => 'require'
            ]);
            
            $grantType = $params['grant_type'];
            $clientId = $params['client_id'];
            $clientSecret = $params['client_secret'];
            
            // 验证客户端凭证
            if (!$this->oauth2Service->validateClient($clientId, $clientSecret)) {
                return json([
                    'error' => 'invalid_client',
                    'error_description' => 'Invalid client credentials'
                ], 401);
            }
            
            switch ($grantType) {
                case 'authorization_code':
                    return $this->handleAuthorizationCodeGrant($params);
                    
                case 'client_credentials':
                    return $this->handleClientCredentialsGrant($params);
                    
                case 'refresh_token':
                    return $this->handleRefreshTokenGrant($params);
                    
                default:
                    return json([
                        'error' => 'unsupported_grant_type',
                        'error_description' => 'Unsupported grant type'
                    ], 400);
            }
            
        } catch (ValidateException $e) {
            return json([
                'error' => 'invalid_request',
                'error_description' => $e->getError()
            ], 400);
        } catch (\Exception $e) {
            Log::error('OAuth2 token error', [
                'error' => $e->getMessage(),
                'params' => $params ?? []
            ]);
            
            return json([
                'error' => 'server_error',
                'error_description' => 'Authorization server error'
            ], 500);
        }
    }
    
    /**
     * 处理授权码授权
     */
    protected function handleAuthorizationCodeGrant(array $params): Response
    {
        // 验证授权码授权参数
        $this->validate($params, [
            'code|授权码' => 'require',
            'redirect_uri|重定向URI' => 'require|url'
        ]);
        
        $code = $params['code'];
        $clientId = $params['client_id'];
        $clientSecret = $params['client_secret'];
        $redirectUri = $params['redirect_uri'];
        
        $tokenData = $this->oauth2Service->getAccessTokenByAuthCode($code, $clientId, $clientSecret, $redirectUri);
        
        return json($tokenData);
    }
    
    /**
     * 处理客户端凭证授权
     */
    protected function handleClientCredentialsGrant(array $params): Response
    {
        $clientId = $params['client_id'];
        $scopes = !empty($params['scope']) ? explode(' ', $params['scope']) : [];
        
        $tokenData = $this->oauth2Service->generateAccessToken($clientId, $scopes);
        
        return json($tokenData);
    }
    
    /**
     * 处理刷新令牌授权
     */
    protected function handleRefreshTokenGrant(array $params): Response
    {
        // 验证刷新令牌参数
        $this->validate($params, [
            'refresh_token|刷新令牌' => 'require'
        ]);
        
        $refreshToken = $params['refresh_token'];
        $clientId = $params['client_id'];
        $clientSecret = $params['client_secret'];
        
        $tokenData = $this->oauth2Service->refreshAccessToken($refreshToken, $clientId, $clientSecret);
        
        return json($tokenData);
    }
    
    /**
     * 撤销令牌
     */
    public function revoke(): Response
    {
        try {
            $params = $this->request->post();
            
            // 验证参数
            $this->validate($params, [
                'token|令牌' => 'require',
                'client_id|客户端ID' => 'require',
                'client_secret|客户端密钥' => 'require'
            ]);
            
            $token = $params['token'];
            $clientId = $params['client_id'];
            $clientSecret = $params['client_secret'];
            
            $result = $this->oauth2Service->revokeToken($token, $clientId, $clientSecret);
            
            if ($result) {
                return json([
                    'message' => 'Token revoked successfully'
                ]);
            } else {
                return json([
                    'error' => 'invalid_token',
                    'error_description' => 'Invalid token or client credentials'
                ], 400);
            }
            
        } catch (ValidateException $e) {
            return json([
                'error' => 'invalid_request',
                'error_description' => $e->getError()
            ], 400);
        } catch (\Exception $e) {
            Log::error('OAuth2 revoke error', [
                'error' => $e->getMessage(),
                'params' => $params ?? []
            ]);
            
            return json([
                'error' => 'server_error',
                'error_description' => 'Authorization server error'
            ], 500);
        }
    }
    
    /**
     * 获取客户端信息
     */
    public function clientInfo(): Response
    {
        try {
            $clientId = $this->request->get('client_id');
            
            if (empty($clientId)) {
                return json([
                    'error' => 'invalid_request',
                    'error_description' => 'Missing client_id parameter'
                ], 400);
            }
            
            $clientInfo = $this->oauth2Service->getClientInfo($clientId);
            
            if (empty($clientInfo)) {
                return json([
                    'error' => 'invalid_client',
                    'error_description' => 'Invalid client_id'
                ], 404);
            }
            
            return json([
                'data' => $clientInfo
            ]);
            
        } catch (\Exception $e) {
            Log::error('OAuth2 client info error', [
                'error' => $e->getMessage()
            ]);
            
            return json([
                'error' => 'server_error',
                'error_description' => 'Authorization server error'
            ], 500);
        }
    }
    
    /**
     * 错误重定向
     */
    protected function errorRedirect(string $redirectUri, string $error, string $description, string $state = ''): Response
    {
        $errorUrl = $redirectUri . '?error=' . urlencode($error) . '&error_description=' . urlencode($description);
        
        if (!empty($state)) {
            $errorUrl .= '&state=' . urlencode($state);
        }
        
        return redirect($errorUrl);
    }
    
    /**
     * 获取当前用户ID
     * 这里应该从会话或JWT中获取用户ID
     */
    protected function getCurrentUserId(): int
    {
        // 简化实现，实际项目中应该从认证中间件获取
        return $this->request->userId ?? 0;
    }
}