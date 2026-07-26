@echo off
echo ========================================
echo 电子元器件产品数据导入脚本 (PDO版本)
echo ========================================
echo.

cd /d G:\tqx_new\tqx\backend\ElectronicPart\scripts
php direct_product_import.php

echo.
echo 脚本执行完成，按任意键退出...
pause >nul