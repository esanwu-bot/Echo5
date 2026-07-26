<?php
namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use app\model\SkBrand;
use app\model\SkCategory;
use app\model\SkProductModel;
use app\model\SkSupplier;
use app\model\SkProduct;
use app\model\SkProductSupplier;
use app\model\SkInventory;

class ImportTestDataCommand extends Command
{
    protected function configure()
    {
        $this->setName('import:test-data')
             ->setDescription('Import test data from JSON file');
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('=== 开始导入测试数据 ===');
        
        // 读取JSON文件
        $jsonPath = __DIR__ . '/../../../test_data.json';
        if (!file_exists($jsonPath)) {
            $output->writeln('<error>错误: 测试数据文件 test_data.json 不存在</error>');
            $output->writeln('<error>请确保 test_data.json 文件位于项目根目录</error>');
            return 1;
        }
        
        $jsonData = file_get_contents($jsonPath);
        $data = json_decode($jsonData, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            $output->writeln('<error>错误: JSON 文件格式不正确</error>');
            return 1;
        }
        
        try {
            // 按照正确的顺序导入数据
            $this->importBrands($data['brands'], $output);
            $this->importCategories($data['categories'], $output);
            $this->importModels($data['models'], $output);
            $this->importSuppliers($data['suppliers'], $output);
            $this->importProducts($data['products'], $output);
            $this->importProductSuppliers($data['product_suppliers'], $output);
            $this->importInventory($data['inventory'], $output);
            
            $output->writeln('');
            $output->writeln('<info>=== 测试数据导入完成 ===</info>');
            $output->writeln('<info>导入成功！</info>');
            return 0;
        } catch (\Exception $e) {
            $output->writeln('<error>导入过程中发生错误: ' . $e->getMessage() . '</error>');
            $output->writeln('<error>错误位置: ' . $e->getFile() . ':' . $e->getLine() . '</error>');
            $output->writeln('<error>错误栈: ' . $e->getTraceAsString() . '</error>');
            return 1;
        }
    }
    
    /**
     * 导入品牌数据
     */
    private function importBrands(array $brands, Output $output)
    {
        $output->writeln('');
        $output->writeln('正在导入品牌数据...');
        
        foreach ($brands as $brandData) {
            $brand = SkBrand::find($brandData['id']);
            if ($brand) {
                $brand->save($brandData);
                $output->writeln('<comment>更新品牌: ' . $brandData['name'] . '</comment>');
            } else {
                $brand = new SkBrand();
                $brand->save($brandData);
                $output->writeln('<info>✓ 创建品牌: ' . $brandData['name'] . '</info>');
            }
        }
        
        $output->writeln('<info>✓ 品牌数据导入完成</info>');
    }
    
    /**
     * 导入分类数据
     */
    private function importCategories(array $categories, Output $output)
    {
        $output->writeln('');
        $output->writeln('正在导入分类数据...');
        
        foreach ($categories as $categoryData) {
            $category = SkCategory::find($categoryData['id']);
            if ($category) {
                $category->save($categoryData);
                $output->writeln('<comment>更新分类: ' . $categoryData['name'] . '</comment>');
            } else {
                $category = new SkCategory();
                $category->save($categoryData);
                $output->writeln('<info>✓ 创建分类: ' . $categoryData['name'] . '</info>');
            }
        }
        
        $output->writeln('<info>✓ 分类数据导入完成</info>');
    }
    
    /**
     * 导入型号数据
     */
    private function importModels(array $models, Output $output)
    {
        $output->writeln('');
        $output->writeln('正在导入型号数据...');
        
        foreach ($models as $modelData) {
            $model = SkProductModel::find($modelData['id']);
            if ($model) {
                $model->save($modelData);
                $output->writeln('<comment>更新型号: ' . $modelData['name'] . '</comment>');
            } else {
                $model = new SkProductModel();
                $model->save($modelData);
                $output->writeln('<info>✓ 创建型号: ' . $modelData['name'] . '</info>');
            }
        }
        
        $output->writeln('<info>✓ 型号数据导入完成</info>');
    }
    
    /**
     * 导入供应商数据
     */
    private function importSuppliers(array $suppliers, Output $output)
    {
        $output->writeln('');
        $output->writeln('正在导入供应商数据...');
        
        foreach ($suppliers as $supplierData) {
            $supplier = SkSupplier::find($supplierData['id']);
            if ($supplier) {
                $supplier->save($supplierData);
                $output->writeln('<comment>更新供应商: ' . $supplierData['name'] . '</comment>');
            } else {
                $supplier = new SkSupplier();
                $supplier->save($supplierData);
                $output->writeln('<info>✓ 创建供应商: ' . $supplierData['name'] . '</info>');
            }
        }
        
        $output->writeln('<info>✓ 供应商数据导入完成</info>');
    }
    
    /**
     * 导入产品数据
     */
    private function importProducts(array $products, Output $output)
    {
        $output->writeln('');
        $output->writeln('正在导入产品数据...');
        
        foreach ($products as $productData) {
            $product = SkProduct::find($productData['id']);
            if ($product) {
                $product->save($productData);
                $output->writeln('<comment>更新产品: ' . $productData['name'] . '</comment>');
            } else {
                $product = new SkProduct();
                $product->save($productData);
                $output->writeln('<info>✓ 创建产品: ' . $productData['name'] . '</info>');
            }
        }
        
        $output->writeln('<info>✓ 产品数据导入完成</info>');
    }
    
    /**
     * 导入产品-供应商关联数据
     */
    private function importProductSuppliers(array $productSuppliers, Output $output)
    {
        $output->writeln('');
        $output->writeln('正在导入产品-供应商关联数据...');
        
        foreach ($productSuppliers as $psData) {
            $ps = SkProductSupplier::find($psData['id']);
            if ($ps) {
                $ps->save($psData);
                $output->writeln('<comment>更新产品-供应商关联: 产品ID ' . $psData['product_id'] . ' - 供应商ID ' . $psData['supplier_id'] . '</comment>');
            } else {
                $ps = new SkProductSupplier();
                $ps->save($psData);
                $output->writeln('<info>✓ 创建产品-供应商关联: 产品ID ' . $psData['product_id'] . ' - 供应商ID ' . $psData['supplier_id'] . '</info>');
            }
        }
        
        $output->writeln('<info>✓ 产品-供应商关联数据导入完成</info>');
    }
    
    /**
     * 导入库存数据
     */
    private function importInventory(array $inventory, Output $output)
    {
        $output->writeln('');
        $output->writeln('正在导入库存数据...');
        
        foreach ($inventory as $inventoryData) {
            $inv = SkInventory::find($inventoryData['id']);
            if ($inv) {
                $inv->save($inventoryData);
                $output->writeln('<comment>更新库存: 产品ID ' . $inventoryData['product_id'] . ' - 数量 ' . $inventoryData['quantity'] . '</comment>');
            } else {
                $inv = new SkInventory();
                $inv->save($inventoryData);
                $output->writeln('<info>✓ 创建库存: 产品ID ' . $inventoryData['product_id'] . ' - 数量 ' . $inventoryData['quantity'] . '</info>');
            }
        }
        
        $output->writeln('<info>✓ 库存数据导入完成</info>');
    }
}