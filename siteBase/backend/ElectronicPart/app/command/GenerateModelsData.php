<?php
declare (strict_types = 1);

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\input\Argument;
use think\console\input\Option;
use think\console\Output;
use app\model\SkBrand;
use app\model\SkCategory;
use app\model\SkProductModel;

class GenerateModelsData extends Command
{
    protected function configure()
    {
        // 指令配置
        $this->setName('generate:models-data')
            ->setDescription('Generate models data for testing');
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('=== 开始生成型号数据 ===');
        
        // 1. 检查并创建品牌数据
        $output->writeln('检查品牌数据...');
        $brands = SkBrand::select();
        if (empty($brands)) {
            $brandNames = [
                '国巨(YAGEO)', '村田(MURATA)', 'TDK', '三星(SAMSUNG)', 
                '美信(MAXIM)', '德州仪器(TI)', '英飞凌(INFINEON)', '意法半导体(ST)',
                '安森美(ON)', '微芯(MICROCHIP)'
            ];
            
            foreach ($brandNames as $brandName) {
                $brand = new SkBrand();
                $brand->brand_name = $brandName;
                $brand->brand_code = strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $brandName), 0, 10)) . time();
                $brand->status = 1;
                $brand->save();
            }
            $output->writeln('已创建 ' . count($brandNames) . ' 个品牌');
            $brands = SkBrand::select();
        } else {
            $output->writeln('找到 ' . count($brands) . ' 个品牌');
        }
        
        // 2. 检查并创建分类数据
        $output->writeln('检查分类数据...');
        $categories = SkCategory::select();
        if (empty($categories)) {
            $categoryNames = [
                ['name' => '电阻', 'parent_id' => 0],
                ['name' => '电容', 'parent_id' => 0],
                ['name' => '电感', 'parent_id' => 0],
                ['name' => '二极管', 'parent_id' => 0],
                ['name' => '三极管', 'parent_id' => 0],
                ['name' => 'MOSFET', 'parent_id' => 0],
                ['name' => 'IC', 'parent_id' => 0],
                ['name' => '贴片电阻', 'parent_id' => 1],
                ['name' => '金属膜电阻', 'parent_id' => 1],
                ['name' => '功率电阻', 'parent_id' => 1],
                ['name' => '可调电阻', 'parent_id' => 1]
            ];
            
            foreach ($categoryNames as $categoryData) {
                $category = new SkCategory();
                $category->category_name = $categoryData['name'];
                $category->category_code = strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $categoryData['name']), 0, 10)) . time();
                $category->parent_id = $categoryData['parent_id'];
                $category->status = 0;
                $category->sort = 10;
                $category->save();
            }
            $output->writeln('已创建 ' . count($categoryNames) . ' 个分类');
            $categories = SkCategory::select();
        } else {
            $output->writeln('找到 ' . count($categories) . ' 个分类');
        }
        
        // 3. 生成型号数据
        $modelData = [
            ['name' => 'RC0402', 'code' => 'RC0402', 'series' => '贴片电阻系列', 'package_type' => '0402'],
            ['name' => 'RC0603', 'code' => 'RC0603', 'series' => '贴片电阻系列', 'package_type' => '0603'],
            ['name' => 'RC0805', 'code' => 'RC0805', 'series' => '贴片电阻系列', 'package_type' => '0805'],
            ['name' => 'CC0402', 'code' => 'CC0402', 'series' => '贴片电容系列', 'package_type' => '0402'],
            ['name' => 'CC0603', 'code' => 'CC0603', 'series' => '贴片电容系列', 'package_type' => '0603'],
            ['name' => 'CC0805', 'code' => 'CC0805', 'series' => '贴片电容系列', 'package_type' => '0805'],
            ['name' => 'LL0402', 'code' => 'LL0402', 'series' => '贴片电感系列', 'package_type' => '0402'],
            ['name' => 'LL0603', 'code' => 'LL0603', 'series' => '贴片电感系列', 'package_type' => '0603'],
            ['name' => '1N4148', 'code' => '1N4148', 'series' => '二极管系列', 'package_type' => 'DO-35'],
            ['name' => '1N4007', 'code' => '1N4007', 'series' => '二极管系列', 'package_type' => 'DO-41'],
            ['name' => '2N2222', 'code' => '2N2222', 'series' => '三极管系列', 'package_type' => 'TO-92'],
            ['name' => '2N3904', 'code' => '2N3904', 'series' => '三极管系列', 'package_type' => 'TO-92'],
            ['name' => 'IRF540', 'code' => 'IRF540', 'series' => 'MOSFET系列', 'package_type' => 'TO-220'],
            ['name' => 'IRF9540', 'code' => 'IRF9540', 'series' => 'MOSFET系列', 'package_type' => 'TO-220'],
            ['name' => 'LM358', 'code' => 'LM358', 'series' => 'IC系列', 'package_type' => 'DIP-8'],
            ['name' => 'LM7805', 'code' => 'LM7805', 'series' => 'IC系列', 'package_type' => 'TO-220'],
            ['name' => 'X1234', 'code' => 'X1234', 'series' => '晶振系列', 'package_type' => 'SMD-3225'],
            ['name' => 'JRC4558', 'code' => 'JRC4558', 'series' => 'IC系列', 'package_type' => 'DIP-8'],
            ['name' => 'SN74HC00', 'code' => 'SN74HC00', 'series' => '逻辑IC系列', 'package_type' => 'DIP-14'],
            ['name' => 'NE555', 'code' => 'NE555', 'series' => '定时器系列', 'package_type' => 'DIP-8']
        ];
        
        $createdCount = 0;
        $brandCount = count($brands);
        $categoryCount = count($categories);
        
        $output->writeln('开始生成型号数据...');
        foreach ($modelData as $model) {
            // 检查型号是否已存在
            $existingModel = SkProductModel::where('model_code', $model['code'])->find();
            if ($existingModel) {
                $output->writeln('型号 ' . $model['name'] . ' 已存在，跳过');
                continue;
            }
            
            // 随机选择品牌和分类
            $brandIndex = rand(0, $brandCount - 1);
            $categoryIndex = rand(0, $categoryCount - 1);
            
            // 创建型号
            $newModel = new SkProductModel();
            $newModel->model_code = $model['code'];
            $newModel->model_name = $model['name'];
            $newModel->series = $model['series'];
            $newModel->package_type = $model['package_type'];
            $newModel->brand_id = $brands[$brandIndex]['id'];
            $newModel->category_id = $categories[$categoryIndex]['id'];
            $newModel->status = 1;
            $newModel->sort = 10;
            
            if ($newModel->save()) {
                $createdCount++;
                $output->writeln('成功创建型号: ' . $model['name'] . ' (' . $model['code'] . ')');
            } else {
                $output->writeln('创建型号失败: ' . $model['name']);
            }
        }
        
        $output->writeln('=== 型号数据生成完成 ===');
        $output->writeln('共生成 ' . $createdCount . ' 个型号');
        $output->writeln('数据库中现在共有 ' . SkProductModel::count() . ' 个型号');
    }
}
