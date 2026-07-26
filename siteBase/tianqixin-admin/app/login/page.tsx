'use client';

import { useState, useEffect } from 'react';
import { Form, Input, Button, Spin, App } from 'antd';
import { User, Lock, Shield, BarChart3, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import Image from 'next/image';

function LoginPageContent() {
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const { message } = App.useApp();

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.replace('/');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (loginSuccess) {
      message.success('登录成功');
      setLoginSuccess(false);
      router.push('/');
    }
  }, [loginSuccess, message, router]);

  useEffect(() => {
    if (loginError) {
      message.error(loginError);
      setLoginError(null);
    }
  }, [loginError, message]);

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      setLoading(true);
      setLoginError(null);
      await login(values.username, values.password);
      setLoginSuccess(true);
    } catch (error: any) {
      setLoginError(error.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="tqx-login-page">
      {/* 左侧品牌区 */}
      <div className="tqx-login-brand">
        <div className="tqx-login-brand-inner">
          <div className="tqx-login-brand-logo">
            <Image src="/logo.png" alt="天启芯" width={40} height={40} />
          </div>
          <h2>天启芯管理后台</h2>
          <p>
            一站式企业管理平台，涵盖商品、订单、会员、内容、多语言等核心业务模块，助力高效运营与数据决策。
          </p>

          <div className="tqx-login-features">
            <div className="tqx-login-feature">
              <div className="tqx-login-feature-icon" style={{ background: 'rgba(37, 99, 235, 0.15)' }}>
                <BarChart3 size={20} style={{ color: '#60a5fa' }} />
              </div>
              <span>数据分析</span>
            </div>
            <div className="tqx-login-feature">
              <div className="tqx-login-feature-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                <Shield size={20} style={{ color: '#34d399' }} />
              </div>
              <span>安全可靠</span>
            </div>
            <div className="tqx-login-feature">
              <div className="tqx-login-feature-icon" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                <Zap size={20} style={{ color: '#fbbf24' }} />
              </div>
              <span>高效管理</span>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧表单区 */}
      <div className="tqx-login-form-area">
        <div className="tqx-login-form-card">
          <h3>欢迎回来</h3>
          <p className="tqx-login-subtitle">请输入您的账号信息登录系统</p>

          <Form
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
            layout="vertical"
            className="tqx-login-form"
          >
            <Form.Item
              name="username"
              label="用户名"
              colon={false}
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, message: '用户名至少3个字符' },
              ]}
            >
              <Input
                prefix={<User size={16} />}
                placeholder="请输入用户名"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              colon={false}
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
            >
              <Input.Password
                prefix={<Lock size={16} />}
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
              >
                登录
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <App>
      <LoginPageContent />
    </App>
  );
}
