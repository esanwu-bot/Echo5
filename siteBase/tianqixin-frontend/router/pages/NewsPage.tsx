import { useState } from "react"
import { NewsList } from "../../components/NewsList"
import { Seo } from "../../components/Seo"
import { useNavigate } from "react-router-dom"

export function NewsPage() {
  const navigate = useNavigate()

  const handleNewsDetail = (id: string) => {
    navigate(`/news/${id}`)
  }

  return (
    <div className="min-h-screen bg-white pt-20">
      <Seo
        title="新闻动态"
        description="了解天启芯科技最新企业资讯、产品发布、行业动态与活动信息。"
        url="/news"
        type="website"
      />
      <div className="container mx-auto px-4 py-8">
        <NewsList onNavigateToDetail={handleNewsDetail} />
      </div>
    </div>
  )
}