<?php
/**
 * 运行电子元器件产品表结构迁移
 * 
 * 使用方法：
 * 在命令行中运行: php run_sk_product_migration.php
 */

// 设置当前工作目录为项目根目录
chdir(dirname(__DIR__));

// 检查是否从命令行运行
if (PHP_SAPI !== 'cli') {
    exit('此脚本只能从命令行运行。');
}

echo "运行电子元器件产品表结构迁移...\n";

// 执行迁移命令
$command = 'php think migrate:run';
$output = [];
$returnVar = 0;

exec($command, $output, $returnVar);

// 显示输出
foreach ($output as $line) {
    echo $line . "\n";
}

// 检查命令是否成功执行
if ($returnVar === 0) {
    echo "\n电子元器件产品表结构迁移完成！\n";
} else {
    echo "\n电子元器件产品表结构迁移失败，错误代码: $returnVar\n";
}