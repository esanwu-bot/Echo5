<?php

return [
    // Default database connection
    'default'         => env('database.driver', 'mysql'),
    
    // Database connections
    'connections'     => [
        'mysql' => [
            // Database type
            'type'            => env('database.type', 'mysql'),
            // Server address
            'hostname'        => env('database.hostname', ''),
            // Database name
            'database'        => env('database.database', ''),
            // Username
            'username'        => env('database.username', ''),
            // Password
            'password'        => env('database.password', ''),
            // Port
            'hostport'        => env('database.hostport', '3306'),
            // Connection parameters
            'params'          => [],
            // Database charset
            'charset'         => env('database.charset', 'utf8mb4'),
            // Database table prefix
            'prefix'          => env('database.prefix', ''),
            // Database deployment mode: 0 single server, 1 distributed server
            'deploy'          => 0,
            // Database read-write separation: true read-write separation, false no read-write separation
            'rw_separate'     => false,
            // Read server
            'read_master'     => false,
            // Specify slave server sequence number
            'slave_no'        => '',
            // Auto-reconnect when database connection is lost
            'break_reconnect' => false,
            // Break matching
            'break_match_str' => [],
        ],
        // 电子元器件产品数据库连接
        'semiconductor' => [
            // Database type
            'type'            => env('semiconductor.database.type', 'mysql'),
            // Server address
            'hostname'        => env('semiconductor.database.hostname', ''),
            // Database name
            'database'        => env('semiconductor.database.database', ''),
            // Username
            'username'        => env('semiconductor.database.username', ''),
            // Password
            'password'        => env('semiconductor.database.password', ''),
            // Port
            'hostport'        => env('semiconductor.database.hostport', '3306'),
            // Connection parameters
            'params'          => [],
            // Database charset
            'charset'         => env('semiconductor.database.charset', 'utf8mb4'),
            // Database table prefix
            'prefix'          => env('semiconductor.database.prefix', ''),
            // Database deployment mode: 0 single server, 1 distributed server
            'deploy'          => 0,
            // Database read-write separation: true read-write separation, false no read-write separation
            'rw_separate'     => false,
            // Read server
            'read_master'     => false,
            // Specify slave server sequence number
            'slave_no'        => '',
            // Auto-reconnect when database connection is lost
            'break_reconnect' => false,
            // Break matching
            'break_match_str' => [],
        ],
    ],
    
    // Query class
    'query'           => '\\think\\db\\Query',
    
    // Enable field cache
    'fields_cache'    => true,
    
    // Field cache path
    'schema_cache_path' => app()->getRuntimePath() . 'schema' . DIRECTORY_SEPARATOR,
];