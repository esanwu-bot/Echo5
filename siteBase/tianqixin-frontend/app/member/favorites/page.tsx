'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { getAuthToken, apiRequest } from '../../../lib/api-client';
import { Card, Empty, List, Button, Image } from 'antd';
import { HeartOutlined, DeleteOutlined } from '@ant-design/icons';
import { toast } from 'sonner';

const FavoritesPage = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    const loadFavorites = async () => {
      try {
        const response = await apiRequest('/member/favorites');
        if (response.code === 200) {
          const list = response.data?.list || response.data?.data || response.data || [];
          setFavorites(Array.isArray(list) ? list : []);
        }
      } catch (error) {
        console.error('获取收藏失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, [router]);

  const handleRemove = async (id: number) => {
    try {
      const response = await apiRequest(`/member/favorites/${id}`, { method: 'DELETE' });
      if (response.code === 200) {
        toast.success('已取消收藏');
        setFavorites(prev => prev.filter(f => f.id !== id));
      } else {
        toast.error(response.message || '操作失败');
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e60012]"></div>
    </div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">我的收藏</h1>

      {favorites.length === 0 ? (
        <Empty description="暂无收藏" />
      ) : (
        <List
          grid={{ gutter: 16, column: 1, md: 2, lg: 3 }}
          dataSource={favorites}
          renderItem={(item) => (
            <List.Item>
              <Card
                hoverable
                cover={item.image || item.main_image ? (
                  <Image
                    alt={item.name || item.product_name}
                    src={item.image || item.main_image}
                    height={200}
                    className="object-cover"
                    fallback="/mosfet1.jpg"
                  />
                ) : null}
                actions={[
                  <Button danger icon={<DeleteOutlined />} size="small" onClick={() => handleRemove(item.id)}>删除</Button>
                ]}
              >
                <Card.Meta
                  title={item.name ? t(item.name) : item.product_name ? t(item.product_name) : item.title ? t(item.title) : ''}
                  description={
                    <div>
                      {item.description && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{t(item.description)}</p>}
                      {item.price && <p className="text-lg font-bold text-[#e60012]">${typeof item.price === 'number' ? item.price.toFixed(2) : item.price} USD</p>}
                      {item.created_at && <p className="text-xs text-muted-foreground mt-2">添加于: {item.created_at}</p>}
                    </div>
                  }
                />
              </Card>
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default FavoritesPage;
