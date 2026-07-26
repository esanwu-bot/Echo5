import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './LoadingSkeleton.css'; // Reuse styles if needed or add specific ones

interface SmartLoadingProps {
    isLoading: boolean;
    error?: Error | null;
    children: React.ReactNode;
    delay?: number;
    fallback?: React.ReactNode;
}

const SmartLoading: React.FC<SmartLoadingProps> = ({
    isLoading,
    error,
    children,
    delay = 300,
    fallback = null
}) => {
    const { t } = useTranslation();
    const [showLoading, setShowLoading] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isLoading) {
            timer = setTimeout(() => {
                setShowLoading(true);
            }, delay);
        } else {
            setShowLoading(false);
        }

        return () => clearTimeout(timer);
    }, [isLoading, delay]);

    if (error) {
        return (
            <div className="error-state" style={{ padding: '20px', textAlign: 'center' }}>
                <div className="error-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                <h3>{t('加载失败')}</h3>
                <p>{error.message || t('请检查网络连接后重试')}</p>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        marginTop: '16px',
                        padding: '8px 16px',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    {t('重新加载')}
                </button>
            </div>
        );
    }

    if (isLoading) {
        // If we are loading and the delay has passed, show the fallback (skeleton)
        // If the delay hasn't passed, we show nothing (or children if we wanted to keep old content, but here we want to avoid flash)
        // Actually, the requirement is:
        // "快速加载时不显示loading，避免闪烁" -> If loading finishes before delay, showLoading never becomes true.
        // But we need to return SOMETHING.
        // If showLoading is true, we return fallback.
        // If showLoading is false but isLoading is true, we return null (blank) to wait for the delay?
        // Or do we return the skeleton immediately?
        // The user's example:
        // if (isLoading && showLoading) return <LoadingSpinner />
        // if (isLoading && !showLoading) return null;

        // However, for Skeleton screens, we usually WANT to show them immediately or after a very short delay.
        // The user's SmartLoading example used a spinner. But in the final integration example:
        // <SmartLoading ... fallback={<ProductSkeleton />}>

        // Let's adapt the logic to support the skeleton as the loading state.
        // If we have a skeleton, we might want to show it immediately?
        // The user said "3. 智能加载状态组件 ... 快速加载时不显示loading，避免闪烁".
        // This usually applies to spinners. Skeletons are often shown immediately to layout the page.
        // BUT, if the data loads in 50ms, showing a skeleton for 50ms then content is a flash.
        // So the delay logic is still valid.

        if (showLoading) {
            return <>{fallback || <div className="loading-spinner">Loading...</div>}</>;
        }
        return null;
    }

    return <>{children}</>;
};

export default SmartLoading;
