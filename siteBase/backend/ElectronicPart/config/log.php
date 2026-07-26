<?php

// +----------------------------------------------------------------------
// | 日志设置
// +----------------------------------------------------------------------
return [
    // 默认日志记录通道
    'default' => env('log.channel', 'file'),
    
    // 日志记录级别
    'level' => ['error', 'critical', 'alert', 'emergency'],
    
    // 日志通道列表
    'channels' => [
        'file' => [
            // 日志记录方式
            'type' => 'File',
            // 日志保存目录
            'path' => '',
            // 单文件日志写入
            'single' => false,
            // 独立日志级别
            'apart_level' => ['error', 'sql'],
            // 最大日志文件数量
            'max_files' => 30,
            // 使用JSON格式记录
            'json' => false,
        ],

        // 错误日志专用通道
        'error' => [
            'type' => 'File',
            'path' => app()->getRuntimePath() . 'log' . DIRECTORY_SEPARATOR . 'error',
            'single' => true,
            'max_files' => 30,
            'file_size' => 1024 * 1024 * 10, // 10MB
            'level' => ['error', 'critical', 'alert', 'emergency'],
        ],

        // SQL日志专用通道
        'sql' => [
            'type' => 'File',
            'path' => app()->getRuntimePath() . 'log' . DIRECTORY_SEPARATOR . 'sql',
            'single' => true,
            'max_files' => 15,
            'level' => ['sql'],
        ],

        // 调试日志
        'debug' => [
            'type' => 'File',
            'path' => app()->getRuntimePath() . 'log' . DIRECTORY_SEPARATOR . 'debug',
            'single' => false,
            'max_files' => 7,
            'level' => ['debug', 'info'],
        ],
    ],

];
