<?php
declare(strict_types=1);

namespace app\controller\outer;

use app\BaseController;
use app\service\outer\OAuth2Service;
use think\Response;
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
     * 获取访问令牌
     * @return Response
     */
    public function token(): Response
    {
        $grantType = $this->request->post('grant_type');
        $clientId = $this->request->post('client_id');
        $clientSecret = $this->request->post('client_secret');
        
        // 验证必要参数
        if (empty($grantType) || empty($clientId) || empty($clientSecret)) {
            return json([
                'error' => 'invalid_request',
                'error_description' => '缺少必要参数'
            ], 400);
        }
        
        try {
            switch ($grantType) {
                case 'client_credentials':
                    $result = $this->oauth2Service->clientCredentialsGrant(
                        $clientId, 
                        $clientSecret
                    );
                    break;
                    
                case 'refresh_token':
                    $refreshToken = $this->request->post('refresh_token');
                    if (empty($refreshToken)) {
                        return json([
                            'error' => 'invalid_request',
                            'error_description' => '缺少refresh_token参数'
                        ], 400);
                    }
                    
                    $result = $this->oauth2Service->refreshTokenGrant(
                        $refreshToken, 
                        $clientId, 
                        $clientSecret
                    );
                    break;
                    
                default:
                    return json([
                        'error' => 'unsupported_grant_type',
                        'error_description' => '不支持的授权类型'
                    ], 400);
            }
            
            return json($result);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return json([
                'error' => 'invalid_client',
                'error_description' => '服务器内部错误，请稍后重试'
            ], 401);
        }
    }
    
    /**
     * 撤销令牌
     * @return Response
     */
    public function revoke(): Response
    {
        $token = $this->request->post('token');
        $clientId = $this->request->post('client_id');
        $clientSecret = $this->request->post('client_secret');
        
        if (empty($token) || empty($clientId) || empty($clientSecret)) {
            return json([
                'error' => 'invalid_request',
                'error_description' => '缺少必要参数'
            ], 400);
        }
        
        try {
            $this->oauth2Service->revokeToken($token, $clientId, $clientSecret);
            return json(['message' => '令牌已撤销']);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return json([
                'error' => 'invalid_request',
                'error_description' => '服务器内部错误，请稍后重试'
            ], 400);
        }
    }
    
    /**
     * 验证令牌
     * @return Response
     */
    public function introspect(): Response
    {
        $token = $this->request->post('token');
        $clientId = $this->request->post('client_id');
        $clientSecret = $this->request->post('client_secret');
        
        if (empty($token) || empty($clientId) || empty($clientSecret)) {
            return json([
                'error' => 'invalid_request',
                'error_description' => '缺少必要参数'
            ], 400);
        }
        
        try {
            $result = $this->oauth2Service->introspectToken($token, $clientId, $clientSecret);
            return json($result);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return json([
                'error' => 'invalid_request',
                'error_description' => '服务器内部错误，请稍后重试'
            ], 400);
        }
    }
}