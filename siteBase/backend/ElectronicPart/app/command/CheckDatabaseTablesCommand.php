<?php
namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\facade\Db;

class CheckDatabaseTablesCommand extends Command
{
    protected function configure()
    {
        $this->setName('check:tables')
             ->setDescription('Check database tables');
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('=== 检查数据库表 ===');
        
        // 获取所有表名
        $tables = Db::query('SHOW TABLES');
        
        $output->writeln('数据库中的表:');
        foreach ($tables as $table) {
            $output->writeln('<info>  ✓ ' . reset($table) . '</info>');
        }
        
        $output->writeln('');
        $output->writeln('=== 检查完成 ===');
        return 0;
    }
}