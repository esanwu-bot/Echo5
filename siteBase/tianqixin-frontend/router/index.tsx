import React, { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const HomePage = React.lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })))
const CategoryNavPage = React.lazy(() => import('../pages/products/CategoryNavPage').then(m => ({ default: m.CategoryNavPage })))
const CategoryDetailPage = React.lazy(() => import('../pages/products/CategoryDetailPage').then(m => ({ default: m.CategoryDetailPage })))
const ApplicationsPage = React.lazy(() => import('./pages/ApplicationsPage').then(m => ({ default: m.ApplicationsPage })))
const ApplicationDetailPage = React.lazy(() => import('./pages/ApplicationDetailPage').then(m => ({ default: m.ApplicationDetailPage })))
const SupportPage = React.lazy(() => import('./pages/SupportPage').then(m => ({ default: m.SupportPage })))
const AboutPage = React.lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })))
const NewsPage = React.lazy(() => import('./pages/NewsPage').then(m => ({ default: m.NewsPage })))
const NewsDetailPage = React.lazy(() => import('./pages/NewsDetailPage').then(m => ({ default: m.NewsDetailPage })))
const LoginPage = React.lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))
const RegisterPage = React.lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })))
const RegisterSuccessPage = React.lazy(() => import('./pages/RegisterSuccessPage').then(m => ({ default: m.RegisterSuccessPage })))
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))
const MemberPage = React.lazy(() => import('./pages/MemberPage').then(m => ({ default: m.MemberPage })))
const SampleApplicationPage = React.lazy(() => import('./pages/SampleApplicationPage').then(m => ({ default: m.SampleApplicationPage })))
const MallHomePage = React.lazy(() => import('./pages/MallHomePage').then(m => ({ default: m.MallHomePage })))
const ProductDetailPage = React.lazy(() => import('./pages/ProductDetailPage').then(m => ({ default: m.ProductDetailPage })))
const CartPage = React.lazy(() => import('./pages/CartPage').then(m => ({ default: m.CartPage })))
const CheckoutPage = React.lazy(() => import('./pages/CheckoutPage').then(m => ({ default: m.CheckoutPage })))
// 支付功能暂未开放
// const PaymentPage = React.lazy(() => import('./pages/PaymentPage').then(m => ({ default: m.PaymentPage })))
// const PaymentSuccessPage = React.lazy(() => import('./pages/PaymentSuccessPage').then(m => ({ default: m.PaymentSuccessPage })))
const MallAddedSuccessPage = React.lazy(() => import('./pages/MallAddedSuccessPage').then(m => ({ default: m.MallAddedSuccessPage })))
const MallSubmitSuccessPage = React.lazy(() => import('./pages/MallSubmitSuccessPage').then(m => ({ default: m.MallSubmitSuccessPage })))
const MallProductDetailPage = React.lazy(() => import('./pages/MallProductDetailPage').then(m => ({ default: m.MallProductDetailPage })))
const ArticleDetailPage = React.lazy(() => import('./pages/ArticleDetailPage').then(m => ({ default: m.ArticleDetailPage })))
const AddressesPage = React.lazy(() => import('./pages/AddressesPage').then(m => ({ default: m.AddressesPage })))
const OrdersPage = React.lazy(() => import('./pages/OrdersPage').then(m => ({ default: m.OrdersPage })))
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))
const ModelDetailPage = React.lazy(() => import('./pages/ModelDetailPage').then(m => ({ default: m.ModelDetailPage })))
const GuidePage = React.lazy(() => import('./pages/GuidePage'))
const SeriesListPage = React.lazy(() => import('./pages/SeriesListPage').then(m => ({ default: m.SeriesListPage })))
const SeriesDetailPage = React.lazy(() => import('./pages/SeriesDetailPage').then(m => ({ default: m.SeriesDetailPage })))
const ModelMatrixPage = React.lazy(() => import('./pages/ModelMatrixPage').then(m => ({ default: m.ModelMatrixPage })))
const BOMPage = React.lazy(() => import('./pages/BOMPage').then(m => ({ default: m.BOMPage })))
const ComparisonPage = React.lazy(() => import('./pages/ComparisonPage').then(m => ({ default: m.ComparisonPage })))

function RouterFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: '4px solid #e5e7eb',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'router-spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes router-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export function AppRouter() {
  return (
    <Suspense fallback={<RouterFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<CategoryNavPage />} />
        <Route path="/products/:categoryId" element={<CategoryDetailPage />} />
        <Route path="/products/:categoryId/list" element={<ModelMatrixPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="/applications/:id" element={<ApplicationDetailPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/news/:id" element={<NewsDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register/success" element={<RegisterSuccessPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/member" element={<MemberPage />} />
        <Route path="/member/addresses" element={<AddressesPage />} />
        <Route path="/member/orders" element={<OrdersPage />} />
        <Route path="/member/sample-application" element={<SampleApplicationPage />} />
        <Route path="/mall" element={<MallHomePage />} />
        <Route path="/mall/product/:id" element={<MallProductDetailPage />} />
        <Route path="/mall/cart" element={<CartPage />} />
        <Route path="/mall/checkout" element={<CheckoutPage />} />
{/* 支付功能暂未开放 */}
        {/* <Route path="/mall/payment" element={<PaymentPage />} /> */}
        {/* <Route path="/mall/payment-success" element={<PaymentSuccessPage />} /> */}
        <Route path="/mall/added-success" element={<MallAddedSuccessPage />} />
        <Route path="/mall/submit-success" element={<MallSubmitSuccessPage />} />
        <Route path="/article/:id" element={<ArticleDetailPage />} />
        <Route path="/series" element={<SeriesListPage />} />
        <Route path="/series/:id" element={<SeriesDetailPage />} />
        <Route path="/series/:id/models" element={<ModelMatrixPage />} />
        <Route path="/models/:id" element={<ModelDetailPage />} />
        <Route path="/bom" element={<BOMPage />} />
        <Route path="/compare" element={<ComparisonPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
