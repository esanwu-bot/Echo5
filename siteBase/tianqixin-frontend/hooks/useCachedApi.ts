import { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api-client';

const cache = new Map<string, { data: any; timestamp: number }>();

interface CacheOptions extends RequestInit {
    cacheTime?: number; // Cache duration in milliseconds (default: 5 minutes)
}

interface UseCachedApiResult<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
}

export const useCachedApi = <T = any>(url: string, options: CacheOptions = {}): UseCachedApiResult<T> => {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const lang = typeof window !== 'undefined' ? localStorage.getItem('lang') || 'zh' : 'zh';
            const cacheKey = `${url}-${lang}-${JSON.stringify(options)}`;
            const cached = cache.get(cacheKey);
            const cacheTime = options.cacheTime || 300000;

            // If cache exists and is valid
            if (cached && Date.now() - cached.timestamp < cacheTime) {
                setData(cached.data);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const { cacheTime: _, ...fetchOptions } = options;
                const result = await apiRequest<T>(url, fetchOptions);

                // Cache data
                cache.set(cacheKey, {
                    data: result,
                    timestamp: Date.now()
                });

                setData(result as unknown as T);
            } catch (err) {
                setError(err instanceof Error ? err : new Error(String(err)));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [url, JSON.stringify(options)]);

    return { data, loading, error };
};
