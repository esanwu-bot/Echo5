import { useState, useEffect } from 'react'

// 通用API请求Hook
export function useApi<T = any>(
  apiCall: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await apiCall()
        setData(result)
      } catch (err: any) {
        setError(err.message || 'An error occurred')
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, dependencies)

  return { data, loading, error }
}

// 带分页的API Hook
export function usePaginatedApi<T = any>(
  apiCall: (page: number, limit?: number) => Promise<{ list: T[], total: number, page: number, limit: number, pages: number }>,
  initialPage = 1,
  initialLimit = 10
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(initialPage)
  const [limit] = useState(initialLimit)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)

  const fetchData = async (currentPage = page) => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiCall(currentPage, limit)
      setData(result.list)
      setTotal(result.total)
      setPages(result.pages)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(page)
  }, [page, limit])

  const loadPage = (newPage: number) => {
    setPage(newPage)
  }

  const refresh = () => {
    fetchData(page)
  }

  return {
    data,
    loading,
    error,
    page,
    total,
    pages,
    loadPage,
    refresh
  }
}