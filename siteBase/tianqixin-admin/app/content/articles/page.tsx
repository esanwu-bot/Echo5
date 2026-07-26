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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Edit, Trash2, Eye, FileText } from "lucide-react"
import { articleService, Article } from "@/lib/api/article"
import { API_BASE_URL } from "@/lib/api/config"
import { Checkbox } from "@/components/ui/checkbox"
// import MultiLangInput from "@/components/MultiLangInput"
import { format } from "date-fns"
import { message } from "antd"

export default function ArticlesManagePage() {
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<any>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    try {
      const response = await articleService.list({
        keyword: searchTerm,
        page: 1,
        limit: 100
      })
      if (response.code === 200) {
        setArticles(response.data.list || response.data)
      }
    } catch (error) {
      console.error('Error fetching articles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (article: any) => {
    setEditingArticle(article)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这篇文章吗？')) {
      try {
        const res = await articleService.delete(id)
        if (res.code === 200) {
          fetchArticles()
        }
      } catch (e) {
        console.error('Delete failed:', e)
      }
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return
    if (!confirm(`确定要删除选中的 ${selectedRowKeys.length} 篇文章吗？`)) return
    try {
      const response = await fetch(`${API_BASE_URL}/admin/articles/batch-delete`, {
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
        fetchArticles()
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
      if (editingArticle) {
        res = await articleService.update(editingArticle.id, formData)
      } else {
        res = await articleService.create(formData)
      }

      if (res?.code === 200 || res?.success) {
        message.success(editingArticle ? '文章更新成功' : '文章创建成功')
        setIsDialogOpen(false)
        setEditingArticle(null)
        fetchArticles()
      } else {
        message.error(res?.message || '保存失败')
        // 失败时不关闭 Dialog
      }
    } catch (e) {
      console.error('Save failed:', e)
      message.error('保存失败，请重试')
      // 失败时不关闭 Dialog
    }
  }

  // 安全获取分类名称
  const getCategoryName = (category: any) => {
    if (!category) return '未分类'
    if (typeof category === 'string') return category
    return category.name || category.category_name || '未分类'
  }

  const filteredArticles = articles.filter(item =>
    (item.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCategoryName(item.category).toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">技术文章管理</h1>
        <div className="flex items-center gap-2">
          {selectedRowKeys.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              批量删除 ({selectedRowKeys.length})
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingArticle(null)}>
              <Plus className="w-4 h-4 mr-2" />
              添加文章
            </Button>
          </DialogTrigger>
          <ArticleDialog
            article={editingArticle}
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
              placeholder="搜索文章..."
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
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            文章列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={filteredArticles.length > 0 && selectedRowKeys.length === filteredArticles.length}
                    onCheckedChange={(checked) => {
                      setSelectedRowKeys(checked ? filteredArticles.map((a) => a.id) : [])
                    }}
                  />
                </TableHead>
                <TableHead>标题</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>作者</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>浏览量</TableHead>
                <TableHead>发布时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredArticles.map((item) => (
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
                    <Badge variant="outline">{getCategoryName(item.category)}</Badge>
                  </TableCell>
                  <TableCell>{item.author}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'published' ? 'default' : 'secondary'}>
                      {item.status === 'published' ? '已发布' : '草稿'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4 text-gray-400" />
                      {item.views}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.publish_time || '未发布'}
                  </TableCell>
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

function ArticleDialog({ article, onSave, onClose }: any) {
  const [formData, setFormData] = useState<any>({
    title: '',
    summary: '',
    content: '',
    category: '',
    author: '',
    status: 'draft',
    publish_time: ''
  })

  const categories = [
    '技术指南',
    '应用指南',
    '设计参考',
    '故障排除',
    '产品介绍'
  ]

  useEffect(() => {
    if (article) {
      setFormData({
        title: article.title || '',
        summary: article.summary || '',
        content: article.content || '',
        category: article.category || '',
        author: article.author || '',
        status: article.status || 'draft',
        publish_time: article.publish_time || ''
      })
    } else {
      setFormData({
        title: '',
        summary: '',
        content: '',
        category: '',
        author: '',
        status: 'draft',
        publish_time: ''
      })
    }
  }, [article])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    onSave(formData)
  }

  return (
    <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{article ? '编辑文章' : '添加文章'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">标题</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="输入文章标题..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category">分类</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="author">作者</Label>
            <Input
              id="author"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="status">状态</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="published">已发布</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="summary">摘要</Label>
          <Textarea
            id="summary"
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            placeholder="输入文章摘要..."
          />
        </div>

        <div>
          <Label htmlFor="content">内容</Label>
          <Textarea
            id="content"
            rows={8}
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="输入文章内容..."
          />
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