# 代客下单API测试脚本

Write-Host "🧪 开始测试代客下单API..." -ForegroundColor Green

$baseUrl = "http://localhost:3000"

# 测试订单列表API
Write-Host "📋 测试订单列表API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/admin/proxy-order/list?page=1&limit=10" -Method GET
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ 订单列表API测试通过" -ForegroundColor Green
    } else {
        Write-Host "❌ 订单列表API测试失败: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ 订单列表API测试异常: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试商品列表API
Write-Host "🛍️ 测试商品列表API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/admin/proxy-order/products?page=1&limit=50" -Method GET
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ 商品列表API测试通过" -ForegroundColor Green
    } else {
        Write-Host "❌ 商品列表API测试失败: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ 商品列表API测试异常: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试用户搜索API
Write-Host "👤 测试用户搜索API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/admin/proxy-order/search-users?keyword=test" -Method GET
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ 用户搜索API测试通过" -ForegroundColor Green
    } else {
        Write-Host "❌ 用户搜索API测试失败: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ 用户搜索API测试异常: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试用户地址API
Write-Host "📍 测试用户地址API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/admin/proxy-order/user-addresses?user_id=1" -Method GET
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ 用户地址API测试通过" -ForegroundColor Green
    } else {
        Write-Host "❌ 用户地址API测试失败: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ 用户地址API测试异常: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试订单详情API
Write-Host "👁️ 测试订单详情API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/admin/proxy-order/detail/1" -Method GET
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ 订单详情API测试通过" -ForegroundColor Green
    } else {
        Write-Host "❌ 订单详情API测试失败: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ 订单详情API测试异常: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试创建订单API
Write-Host "🛒 测试创建订单API..." -ForegroundColor Yellow
try {
    $orderData = @{
        user_id = 1
        address_id = 1
        items = @(
            @{
                product_id = 1
                quantity = 1
            }
        )
        remark = "测试订单"
    } | ConvertTo-Json -Depth 3

    $response = Invoke-WebRequest -Uri "$baseUrl/api/admin/proxy-order/create" -Method POST -Body $orderData -ContentType "application/json"
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ 创建订单API测试通过" -ForegroundColor Green
    } else {
        Write-Host "❌ 创建订单API测试失败: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ 创建订单API测试异常: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "🎉 API测试完成!" -ForegroundColor Green
Write-Host "📝 注意：当前使用的是模拟数据，实际使用时需要连接真实的后端API" -ForegroundColor Cyan