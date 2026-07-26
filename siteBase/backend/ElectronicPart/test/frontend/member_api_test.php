<?php
/**
 * 会员中心API测试脚本
 * 用于测试会员中心相关API的功能
 */

// 测试配置
$baseUrl = 'http://localhost:8000';
$apiPrefix = '/api/v1';
$token = ''; // 替换为实际的测试token

// 测试用的用户ID
$userId = 1;

// 测试结果统计
$testResults = [
    'passed' => 0,
    'failed' => 0,
    'total' => 0
];

/**
 * 发送HTTP请求
 */
function sendRequest($url, $method = 'GET', $data = [], $headers = []) {
    global $token;
    
    $ch = curl_init();
    
    // 设置基础URL
    $fullUrl = $url;
    
    // 设置请求头
    $defaultHeaders = [
        'Content-Type: application/json',
        'Authorization: ' . $token
    ];
    
    $headers = array_merge($defaultHeaders, $headers);
    
    curl_setopt($ch, CURLOPT_URL, $fullUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    // 设置请求方法
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    } elseif ($method === 'PUT') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    } elseif ($method === 'DELETE') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
    }
    
    // 执行请求
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    curl_close($ch);
    
    return [
        'code' => $httpCode,
        'response' => json_decode($response, true)
    ];
}

/**
 * 执行测试
 */
function runTest($name, $callback) {
    global $testResults;
    
    echo "\n=== 测试: {$name} ===\n";
    
    try {
        $result = $callback();
        
        if ($result['code'] >= 200 && $result['code'] < 300) {
            echo "✅ 测试通过\n";
            $testResults['passed']++;
        } else {
            echo "❌ 测试失败 (HTTP {$result['code']})\n";
            $testResults['failed']++;
        }
        
        echo "响应: " . json_encode($result['response'], JSON_PRETTY_PRINT) . "\n";
        
    } catch (Exception $e) {
        echo "❌ 测试异常: {$e->getMessage()}\n";
        $testResults['failed']++;
    }
    
    $testResults['total']++;
}

/**
 * 显示测试结果
 */
function showTestResults() {
    global $testResults;
    
    echo "\n";
    echo "====================================\n";
    echo "测试结果统计\n";
    echo "====================================\n";
    echo "总测试数: {$testResults['total']}\n";
    echo "通过: {$testResults['passed']}\n";
    echo "失败: {$testResults['failed']}\n";
    echo "通过率: " . number_format(($testResults['passed'] / $testResults['total']) * 100, 2) . "%\n";
    echo "====================================\n";
}

// 主测试函数
function main() {
    global $baseUrl, $apiPrefix;
    
    echo "开始测试会员中心API\n";
    echo "基础URL: {$baseUrl}\n";
    echo "API前缀: {$apiPrefix}\n";
    
    // 测试1: 获取用户个人信息
    runTest('获取用户个人信息', function() use ($baseUrl, $apiPrefix) {
        return sendRequest("{$baseUrl}{$apiPrefix}/member/profile");
    });
    
    // 测试2: 获取我的收藏
    runTest('获取我的收藏', function() use ($baseUrl, $apiPrefix) {
        return sendRequest("{$baseUrl}{$apiPrefix}/member/favorites");
    });
    
    // 测试3: 获取我的询盘
    runTest('获取我的询盘', function() use ($baseUrl, $apiPrefix) {
        return sendRequest("{$baseUrl}{$apiPrefix}/member/inquiries");
    });
    
    // 测试4: 获取样品申请
    runTest('获取样品申请', function() use ($baseUrl, $apiPrefix) {
        return sendRequest("{$baseUrl}{$apiPrefix}/member/sample-applications");
    });
    
    // 测试5: 获取我的订单
    runTest('获取我的订单', function() use ($baseUrl, $apiPrefix) {
        return sendRequest("{$baseUrl}{$apiPrefix}/member/orders");
    });
    
    // 测试6: 获取收货地址列表
    runTest('获取收货地址列表', function() use ($baseUrl, $apiPrefix) {
        return sendRequest("{$baseUrl}{$apiPrefix}/member/addresses");
    });
    
    // 显示测试结果
    showTestResults();
}

// 运行测试
main();
