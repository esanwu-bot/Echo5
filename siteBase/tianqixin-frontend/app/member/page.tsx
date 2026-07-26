'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { userApi, getAuthToken, authApi } from '../../lib/api-client';
import { Card, Statistic } from 'antd';
import { MessageOutlined, FileTextOutlined, ShoppingCartOutlined, UserOutlined, HomeOutlined } from '@ant-design/icons';
import Link from 'next/link';

const MemberCenter = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ orders: 0, applications: 0 });

  useEffect(() => {
    const loadData = async () => {
      const token = getAuthToken();
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const [profileRes, ordersRes, samplesRes] = await Promise.all([
          userApi.getProfile(),
          userApi.getOrders({ limit: 1 }),
          userApi.getSampleApplications({ limit: 1 }),
        ]);

        if (profileRes.code === 200) {
          setUser(profileRes.data);
        } else {
          router.push('/login');
          return;
        }

        if (ordersRes.code === 200) {
          setStats(prev => ({ ...prev, orders: ordersRes.data?.total || 0 }));
        }

        if (samplesRes.code === 200) {
          setStats(prev => ({ ...prev, applications: samplesRes.data?.total || 0 }));
        }
      } catch (error) {
        console.error('加载用户信息失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('登出失败:', error);
    }
    router.push('/');
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e60012]"></div>
    </div>;
  }

  if (!user) {
    return null;
  }

  const menuItems = [
    { key: 'orders', icon: <ShoppingCartOutlined />, label: t('我的订单'), href: '/member/orders' },
    { key: 'sample-application', icon: <FileTextOutlined />, label: t('样品申请'), href: '/member/sample-application' },
    { key: 'inquiry', icon: <MessageOutlined />, label: t('我的询盘'), href: '/member/inquiry' },
    { key: 'addresses', icon: <HomeOutlined />, label: t('收货地址'), href: '/member/addresses' },
    { key: 'profile', icon: <UserOutlined />, label: t('个人信息'), href: '/member/profile' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t('会员中心')}</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">{t('欢迎回来')}，{user.nickname || user.username}！</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <Statistic title={t('我的订单')} value={stats.orders} suffix={t('个')} />
          </Card>
          <Card>
            <Statistic title={t('我的收藏')} value="-" suffix="" />
          </Card>
          <Card>
            <Statistic title={t('样品申请')} value={stats.applications} suffix={t('项')} />
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuItems.map((item) => (
          <Link key={item.key} href={item.href} className="block">
            <Card
              className="hover:shadow-lg transition-shadow duration-300 cursor-pointer"
              bodyStyle={{ padding: '2rem' }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="text-4xl mb-4 text-primary">{item.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{item.label}</h3>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={handleLogout}
          className="text-gray-500 hover:text-red-600 transition-colors"
        >
          {t('退出登录')}
        </button>
      </div>
    </div>
  );
};

export default MemberCenter;
