"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react"
import { newsService, News } from "@/lib/api/news"
import { API_BASE_URL } from "@/lib/api/config"
import { Checkbox } from "@/components/ui/checkbox"
// import MultiLangInput from "@/components/MultiLangInput"
import { message } from "antd"

export default function NewsManagePage() {
  const [news, setNews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingNews, setEditingNews] = useState<any>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  useEffect(() => {
    fetchNews()
  }, [])

  const fetchNews = async () => {
    try {
      const response = await newsService.list({
        keyword: searchTerm,
        page: 1,
        limit: 100
      })
      if (response.code === 200) {
        setNews(response.data.list || response.data)
      }
    } catch (error) {
      console.error('Error fetching news:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (newsItem: any) => {
    setEditingNews(newsItem)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这条新闻吗？')) {
      try {
        const res = await newsService.delete(id)
        if (res.code === 200) {
          fetchNews()
        }
      } catch (e) {
        console.error('Delete failed:', e)
      }
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return
    if (!confirm(`确定要删除选中的 ${selectedRowKeys.length} 条新闻吗？`)) return
    try {
      const response = await fetch(`${API_BASE_URL}/admin/news/batch-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
        body: JSON.stringify({ ids: selectedRowKeys }),
      })
      const data = await response.json()
      if (data.code === 200 || data.code === 0) {
        message.success('批量删除成功')
        setSelectedRowKeys([])
        fetchNews()
      } else {
        message.error(data.message || data.msg || '批量删除失败')
      }
    } catch (e) {
      console.error('Batch delete failed:', e)
      message.error('批量删除失败')
    }
  }

  const handleSave = async (formData: any) => {
    try {
      let res;
      if (editingNews) {
        res = await newsService.update(editingNews.id, formData)
      } else {
        res = await newsService.create(formData)
      }
      
      if (res?.code === 200 || res?.success) {
        message.success(editingNews ? '新闻更新成功' : '新闻创建成功')
        setIsDialogOpen(false)
        setEditingNews(null)
        fetchNews()
      } else {
        message.error(res?.message || '保存失败')
        // 失败时不关闭 Dialog，保持数据
      }
    } catch (e) {
      console.error('Save failed:', e)
      message.error('保存失败，请重试')
      // 失败时不关闭 Dialog
    }
  }

  const filteredNews = news.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">新闻管理</h1>
        <div className="flex items-center gap-2">
          {selectedRowKeys.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              批量删除 ({selectedRowKeys.length})
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingNews(null)}>
              <Plus className="w-4 h-4 mr-2" />
              添加新闻
            </Button>
          </DialogTrigger>
          <NewsDialog
            news={editingNews}
            onSave={handleSave}
            onClose={() => setIsDialogOpen(false)}
          />
        </Dialog>
      </div>
      </div>

      {/* 搜索区域 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="搜索新闻..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            <Button variant="outline" size="sm" onClick={() => { setSearchTerm(''); setSelectedRowKeys([]) }}>重置</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>新闻列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={filteredNews.length > 0 && selectedRowKeys.length === filteredNews.length}
                    onCheckedChange={(checked) => {
                      setSelectedRowKeys(checked ? filteredNews.map((n) => n.id) : [])
                    }}
                  />
                </TableHead>
                <TableHead>标题</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>置顶</TableHead>
                <TableHead>浏览量</TableHead>
                <TableHead>发布时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNews.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRowKeys.includes(item.id)}
                      onCheckedChange={(checked) => {
                        setSelectedRowKeys(checked
                          ? [...selectedRowKeys, item.id]
                          : selectedRowKeys.filter((k) => k !== item.id)
                        )
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-gray-500 line-clamp-1">
                        {item.summary}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'published' ? 'default' : 'secondary'}>
                      {item.status === 'published' ? '已发布' : '草稿'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.is_top && <Badge variant="outline">置顶</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4 text-gray-400" />
                      {item.views}
                    </div>
                  </TableCell>
                  <TableCell>{item.publish_time}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function NewsDialog({ news, onSave, onClose }: any) {
  const [formData, setFormData] = useState<any>({
    title: '',
    summary: '',
    content: '',
    status: 'draft',
    is_top: false,
    publish_time: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (news) {
      setFormData({
        title: news.title || '',
        summary: news.summary || '',
        content: news.content || '',
        status: news.status || 'draft',
        is_top: news.is_top || false,
        publish_time: news.publish_time || new Date().toISOString().split('T')[0]
      })
    } else {
      setFormData({
        title: '',
        summary: '',
        content: '',
        status: 'draft',
        is_top: false,
        publish_time: new Date().toISOString().split('T')[0]
      })
    }
  }, [news])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    onSave(formData)
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{news ? '编辑新闻' : '添加新闻'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">标题</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="输入新闻标题..."
          />
        </div>

        <div>
          <Label htmlFor="summary">摘要</Label>
          <Textarea
            id="summary"
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            placeholder="输入新闻摘要..."
          />
        </div>

        <div>
          <Label htmlFor="content">内容</Label>
          <Textarea
            id="content"
            rows={8}
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="输入新闻内容..."
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is_top"
            checked={formData.is_top}
            onCheckedChange={(checked) => setFormData({ ...formData, is_top: checked })}
          />
          <Label htmlFor="is_top">置顶显示</Label>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button type="submit">
            保存
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}