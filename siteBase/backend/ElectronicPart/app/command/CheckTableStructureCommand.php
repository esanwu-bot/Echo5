<?php
namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\facade\Db;

class CheckTableStructureCommand extends Command
{
    protected function configure()
    {
        $this->setName('check:table-structure')
             ->setDescription('Check table structure');
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('=== 检查表结构 ===');
        
        // 检查分类相关表
        $output->writeln('');
        $output->writeln('=== 分类表结构 ===');
        $this->checkTable($output, 'sk_category');
        $this->checkTable($output, 'sk_categories');
        
        // 检查品牌相关表
        $output->writeln('');
        $output->writeln('=== 品牌表结构 ===');
        $this->checkTable($output, 'sk_brand');
        $this->checkTable($output, 'sk_brands');
        
        // 检查型号相关表
        $output->writeln('');
        $output->writeln('=== 型号表结构 ===');
        $this->checkTable($output, 'sk_product_models');
        
        // 检查供应商相关表
        $output->writeln('');
        $output->writeln('=== 供应商表结构 ===');
        $this->checkTable($output, 'sk_suppliers');
        
        $output->writeln('');
        $output->writeln('=== 检查完成 ===');
        return 0;
    }
    
    private function checkTable(Output $output, string $tableName)
    {
        try {
            $columns = Db::query("DESCRIBE {$tableName}");
            $output->writeln("<comment>表名: {$tableName}</comment>");
            $output->writeln('  字段:');
            foreach ($columns as $column) {
                $output->writeln(sprintf("  %-20s %-20s %s", $column['Field'], $column['Type'], $column['Null'] === 'NO' ? 'NOT NULL' : ''));
            }
        } catch (\Exception $e) {
            $output->writeln("<error>  表 {$tableName} 不存在</error>");
        }
    }
}