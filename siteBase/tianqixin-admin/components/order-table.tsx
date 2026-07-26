"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import { message, Modal, Form, Input, Descriptions } from "antd"
import { Loader2, Eye, PackageCheck, Ban } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

const { TextArea } = Input

interface Application {
  id: number
  company: string
  contact_name: string
  email: string
  phone: string
  product_name: string
  quantity: number
  purpose: string
  status: string
  create_time: string
  reply_content?: string
}

export function OrderTable() {
  const { isAuthenticated } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [total, setTotal] = useState(0)

  const [isModalVisible, setIsModalVisible] = useState(false)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const fetchApplications = async (currentPage: number) => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      const response = await apiClient.get("/admin/sample-applications", {
        params: {
          page: currentPage,
          pageSize: pageSize,
        },
      })
      if (response.data.code === 200) {
        setApplications(response.data.data.list || [])
        setTotal(response.data.data.total || 0)
      }
    } catch (error) {
      console.error("Fetch applications error:", error)
      message.error("获取业务申请列表失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications(page)
  }, [page, isAuthenticated])

  const getStatusStyle = (status?: string) => {
    switch (status) {
      case "approved":
      case "completed":
        return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" }
      case "shipping":
        return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" }
      case "pending":
      case "shipped":
        return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" }
      case "refuse":
      case "rejected":
        return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" }
      default:
        return { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" }
    }
  }

  const getStatusText = (status?: string) => {
    switch (status) {
      case "pending":
      case "shipped":
        return "待处理"
      case "approved": return "已批准"
      case "shipping": return "已发货"
      case "completed": return "已完成"
      case "refuse":
      case "rejected": return "已拒绝"
      default: return status || '未知'
    }
  }

  const handleRowClick = (app: Application) => {
    if (app.status === 'pending' || app.status === 'shipped') {
      setSelectedApp(app)
      form.setFieldsValue({ reply_content: app.reply_content || '' })
      setIsModalVisible(true)
    }
  }

  const handleUpdateStatus = async (status: 'approved' | 'refuse') => {
    if (!selectedApp) return

    setSubmitting(true)
    try {
      const values = await form.validateFields()
      const response = await apiClient.put(`/admin/sample-applications/${selectedApp.id}`, {
        status,
        reply_content: values.reply_content
      })

      if (response.data.code === 200) {
        message.success(status === 'approved' ? "已确认发货" : "已拒绝申请")
        setIsModalVisible(false)
        fetchApplications(page)
      } else {
        message.error(response.data.message || "操作失败")
      }
    } catch (error) {
      console.error("Update application error:", error)
      message.error("操作失败")
    } finally {
      setSubmitting(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  const renderPagination = () => {
    if (totalPages <= 1) return null

    const pages = []
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= page - 1 && i <= page + 1)
      ) {
        pages.push(i)
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...")
      }
    }

    return (
      <div className="flex justify-center mt-5 gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(prev => Math.max(1, prev - 1))}
          disabled={page === 1}
          className="rounded-lg text-xs"
        >
          上一页
        </Button>
        {pages.map((p, index) => (
          <Button
            key={index}
            variant={p === page ? "default" : "outline"}
            size="sm"
            className={`w-8 h-8 rounded-lg text-xs ${p === page ? "bg-blue-600 hover:bg-blue-700 border-blue-600" : ""}`}
            onClick={() => typeof p === "number" && setPage(p)}
            disabled={p === "..."}
          >
            {p}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
          disabled={page === totalPages}
          className="rounded-lg text-xs"
        >
          下一页
        </Button>
      </div>
    )
  }

  return (
    <Card className="border border-[#e5e9f0] rounded-xl shadow-sm overflow-hidden">
      <CardHeader className="border-b border-[#e5e9f0] bg-white px-6 py-4">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold text-[#1a1d2e]">
          <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
          最新业务申请
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto min-h-[300px] relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            </div>
          )}
          <table className="w-full">
            <thead>
              <tr className="bg-[#f4f6fb]">
                <th className="text-left py-3 px-5 font-medium text-xs text-[#5a6177] uppercase tracking-wide">申请编号</th>
                <th className="text-left py-3 px-5 font-medium text-xs text-[#5a6177] uppercase tracking-wide">客户名称</th>
                <th className="text-left py-3 px-5 font-medium text-xs text-[#5a6177] uppercase tracking-wide">申请类型</th>
                <th className="text-left py-3 px-5 font-medium text-xs text-[#5a6177] uppercase tracking-wide">产品型号</th>
                <th className="text-left py-3 px-5 font-medium text-xs text-[#5a6177] uppercase tracking-wide">状态</th>
                <th className="text-left py-3 px-5 font-medium text-xs text-[#5a6177] uppercase tracking-wide">申请时间</th>
              </tr>
            </thead>
            <tbody>
              {applications.length > 0 ? (
                applications.map((application, idx) => {
                  const style = getStatusStyle(application.status)
                  const isClickable = application.status === 'pending' || application.status === 'shipped'
                  return (
                    <tr
                      key={application.id}
                      className={`border-b border-[#f0f2f8] hover:bg-[#f8f9fc] transition-colors ${isClickable ? 'cursor-pointer' : ''}`}
                      onClick={() => handleRowClick(application)}
                    >
                      <td className="py-3.5 px-5 text-sm">
                        {application?.id != null ? (
                          isClickable ? (
                            <span className="text-blue-600 hover:text-blue-800 font-medium hover:underline flex items-center gap-1.5">
                              <Eye className="w-3.5 h-3.5" />
                              APP{application.id.toString().padStart(6, '0')}
                            </span>
                          ) : (
                            <span className="text-[#1a1d2e]">APP{application.id.toString().padStart(6, '0')}</span>
                          )
                        ) : '-'}
                      </td>
                      <td className="py-3.5 px-5 text-sm text-[#1a1d2e]">{application.company || application.contact_name}</td>
                      <td className="py-3.5 px-5 text-sm text-[#5a6177]">样品申请</td>
                      <td className="py-3.5 px-5">
                        <Badge variant="outline" className="text-xs font-medium border-[#e5e9f0] text-[#5a6177] bg-[#f4f6fb]">
                          {application.product_name}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
                          {getStatusText(application.status)}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-sm text-[#9aa3be]">
                        {application.create_time ? new Date(application.create_time).toLocaleString() : '-'}
                      </td>
                    </tr>
                  )
                })
              ) : !loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#9aa3be] text-sm">
                    暂无申请数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[#f0f2f8]">
          <div className="text-xs text-[#9aa3be]">
            共 {total} 条记录，第 {page}/{totalPages} 页
          </div>
          {renderPagination()}
        </div>

        <Modal
          title={
            <span className="flex items-center gap-2 text-base font-semibold">
              <PackageCheck className="w-5 h-5 text-blue-600" />
              处理业务申请
            </span>
          }
          open={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          footer={[
            <Button key="cancel" variant="outline" onClick={() => setIsModalVisible(false)} className="mr-2 rounded-lg">
              取消
            </Button>,
            <Button
              key="refuse"
              onClick={() => handleUpdateStatus('refuse')}
              disabled={submitting}
              className="mr-2 bg-red-600 text-white hover:bg-red-700 rounded-lg flex items-center gap-1.5"
            >
              <Ban className="w-4 h-4" />
              拒绝
            </Button>,
            <Button
              key="approve"
              onClick={() => handleUpdateStatus('approved')}
              disabled={submitting}
              className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center gap-1.5"
            >
              <PackageCheck className="w-4 h-4" />
              确认发货
            </Button>,
          ]}
          width={600}
        >
          {selectedApp && (
            <div className="space-y-4 py-4">
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="客户名称">{selectedApp.company || selectedApp.contact_name}</Descriptions.Item>
                <Descriptions.Item label="联系人">{selectedApp.contact_name}</Descriptions.Item>
                <Descriptions.Item label="联系电话">{selectedApp.phone}</Descriptions.Item>
                <Descriptions.Item label="产品型号">{selectedApp.product_name}</Descriptions.Item>
                <Descriptions.Item label="申请数量">{selectedApp.quantity}</Descriptions.Item>
                <Descriptions.Item label="申请原因">{selectedApp.purpose || '-'}</Descriptions.Item>
              </Descriptions>

              <Form form={form} layout="vertical">
                <Form.Item
                  name="reply_content"
                  label="回复内容"
                  rules={[{ required: true, message: '请输入回复内容' }]}
                >
                  <TextArea rows={4} placeholder="请输入回复客户的内容..." />
                </Form.Item>
              </Form>
            </div>
          )}
        </Modal>
      </CardContent>
    </Card>
  )
}
