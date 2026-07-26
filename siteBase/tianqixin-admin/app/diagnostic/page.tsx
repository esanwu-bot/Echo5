'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Descriptions, Tag, Spin, message } from 'antd';
import { API_BASE_URL } from '@/lib/api/config';
import { decodeToken, isTokenExpired, getTokenRemainingTime, formatDuration } from '@/lib/auth-debug';

export default function DiagnosticPage() {
  const [token, setToken] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [serverConfig, setServerConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    setToken(storedToken);
    
    if (storedToken) {
      const decoded = decodeToken(storedToken);
      setTokenInfo(decoded);
    }
  }, []);

  const fetchServerConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/diagnostic/jwt-config`);
      const data = await response.json();
      if (data.code === 200) {
        setServerConfig(data.data);
      } else {
        message.error('获取服务器配置失败');
      }
    } catch (error) {
      message.error('请求失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const validateTokenWithServer = async () => {
    if (!token) {
      message.warning('请先登录获取 Token');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/diagnostic/validate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (data.code === 200) {
        message.success('Token 验证完成，请查看控制台');
        console.log('Token validation result:', data.data);
      } else {
        message.error(data.message);
      }
    } catch (error) {
      message.error('请求失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">认证诊断工具</h1>

      <Spin spinning={loading}>
        {/* Token 状态 */}
        <Card title="当前 Token 状态" className="mb-4">
          {token ? (
            <>
              <Alert
                message="Token 已存在"
                description={token.substring(0, 50) + '...'}
                type="info"
                showIcon
                className="mb-4"
              />
              
              {tokenInfo && (
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="算法">{tokenInfo.header?.alg}</Descriptions.Item>
                  <Descriptions.Item label="签发者 (iss)">{tokenInfo.payload?.iss}</Descriptions.Item>
                  <Descriptions.Item label="接收者 (aud)">{tokenInfo.payload?.aud}</Descriptions.Item>
                  <Descriptions.Item label="管理员ID">{tokenInfo.payload?.data?.admin_id}</Descriptions.Item>
                  <Descriptions.Item label="用户名">{tokenInfo.payload?.data?.username}</Descriptions.Item>
                  <Descriptions.Item label="签发时间">
                    {tokenInfo.payload?.iat ? new Date(tokenInfo.payload.iat * 1000).toLocaleString() : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="过期时间">
                    {tokenInfo.payload?.exp ? new Date(tokenInfo.payload.exp * 1000).toLocaleString() : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="是否过期">
                    {isTokenExpired(token) ? (
                      <Tag color="red">已过期</Tag>
                    ) : (
                      <Tag color="green">
                        剩余 {formatDuration(getTokenRemainingTime(token))}
                      </Tag>
                    )}
                  </Descriptions.Item>
                </Descriptions>
              )}
            </>
          ) : (
            <Alert
              message="未找到 Token"
              description="请先登录系统"
              type="warning"
              showIcon
            />
          )}
        </Card>

        {/* 服务器配置 */}
        <Card 
          title="服务器 JWT 配置" 
          className="mb-4"
          extra={
            <Button type="primary" onClick={fetchServerConfig}>
              获取配置
            </Button>
          }
        >
          {serverConfig ? (
            <Descriptions bordered column={1}>
              <Descriptions.Item label="环境文件存在">
                {serverConfig.env_file_exists ? (
                  <Tag color="green">是</Tag>
                ) : (
                  <Tag color="red">否</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="运行时配置">
                <pre className="bg-gray-100 p-2 rounded">
                  {JSON.stringify(serverConfig.runtime_config, null, 2)}
                </pre>
              </Descriptions.Item>
              <Descriptions.Item label="环境变量值">
                <pre className="bg-gray-100 p-2 rounded">
                  {JSON.stringify(serverConfig.env_values, null, 2)}
                </pre>
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Alert message="点击按钮获取服务器配置" type="info" />
          )}
        </Card>

        {/* 配置匹配检查 */}
        {tokenInfo && serverConfig && (
          <Card title="配置匹配检查" className="mb-4">
            <Descriptions bordered column={1}>
              <Descriptions.Item label="签发者匹配">
                {tokenInfo.payload?.iss === serverConfig.runtime_config?.issuer ? (
                  <Tag color="green">匹配</Tag>
                ) : (
                  <Tag color="red">
                    不匹配 (Token: {tokenInfo.payload?.iss}, 服务器: {serverConfig.runtime_config?.issuer})
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="接收者匹配">
                {tokenInfo.payload?.aud === serverConfig.runtime_config?.audience ? (
                  <Tag color="green">匹配</Tag>
                ) : (
                  <Tag color="red">
                    不匹配 (Token: {tokenInfo.payload?.aud}, 服务器: {serverConfig.runtime_config?.audience})
                  </Tag>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {/* 操作按钮 */}
        <Card>
          <div className="flex gap-4">
            <Button type="primary" onClick={validateTokenWithServer}>
              服务器验证 Token
            </Button>
            <Button onClick={() => {
              localStorage.removeItem('auth_token');
              localStorage.removeItem('user_info');
              window.location.reload();
            }} danger>
              清除 Token 并刷新
            </Button>
            <Button onClick={() => window.location.href = '/login'}>
              去登录页
            </Button>
          </div>
        </Card>
      </Spin>

      {/* 使用说明 */}
      <Card title="常见问题" className="mt-4">
        <div className="space-y-2">
          <p><strong>1. Token 验证失败?</strong></p>
          <ul className="list-disc pl-6">
            <li>检查「签发者匹配」和「接收者匹配」是否都为绿色</li>
            <li>如果不匹配，说明 Token 是用不同的配置生成的</li>
            <li>点击「清除 Token 并刷新」然后重新登录</li>
          </ul>
          
          <p><strong>2. Token 已过期?</strong></p>
          <ul className="list-disc pl-6">
            <li>检查「是否过期」标签</li>
            <li>如果显示红色「已过期」，需要重新登录</li>
          </ul>

          <p><strong>3. 环境变量未生效?</strong></p>
          <ul className="list-disc pl-6">
            <li>检查「环境文件存在」是否为绿色</li>
            <li>检查「运行时配置」与「环境变量值」是否一致</li>
            <li>如果不一致，可能需要重启后端服务</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
