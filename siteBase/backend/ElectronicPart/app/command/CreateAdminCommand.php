<?php
namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use app\model\SkAdmin;
use app\model\SkRole;

class CreateAdminCommand extends Command
{
    protected function configure()
    {
        $this->setName('create:admin')
             ->setDescription('Create or reset administrator account');
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('=== 创建或重置管理员账号 ===');
        
        // 创建超级管理员角色
        $role = $this->createSuperAdminRole($output);
        
        // 创建或重置管理员账号
        $admin = $this->createOrResetAdmin($output, $role->id);
        
        $output->writeln('');
        $output->writeln('=== 操作完成 ===');
        $output->writeln('用户名: ' . $admin->username);
        $output->writeln('密码: password');
        $output->writeln('角色: 超级管理员');
        $output->writeln('状态: 已启用');
    }
    
    /**
     * 创建超级管理员角色
     */
    private function createSuperAdminRole(Output $output)
    {
        $role = SkRole::where('role_name', '超级管理员')->find();
        if (!$role) {
            $role = new SkRole();
            $role->role_name = '超级管理员';
            $role->description = '拥有所有权限的超级管理员';
            $role->status = 1;
            $role->permissions = '*';
            $role->save();
            $output->writeln('✓ 创建超级管理员角色成功');
        }
        return $role;
    }
    
    /**
     * 创建或重置管理员账号
     */
    private function createOrResetAdmin(Output $output, $roleId)
    {
        $username = 'admin';
        $password = 'password';
        
        $admin = SkAdmin::where('username', $username)->find();
        if ($admin) {
            // 更新密码和状态
            $admin->password = $password;
            $admin->status = 1;
            $admin->role_id = $roleId;
            $admin->save();
            $output->writeln('✓ 更新管理员账号成功');
        } else {
            // 创建新管理员
            $admin = new SkAdmin();
            $admin->username = $username;
            $admin->password = $password;
            $admin->real_name = '管理员';
            $admin->email = 'admin@example.com';
            $admin->phone = '13800138000';
            $admin->role_id = $roleId;
            $admin->status = 1;
            $admin->save();
            $output->writeln('✓ 创建管理员账号成功');
        }
        return $admin;
    }
}
