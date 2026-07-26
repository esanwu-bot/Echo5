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
use app\model\SkPriceBreak;

class ImportElectronicComponentsDataCommand extends Command
{
    protected function configure()
    {
        $this->setName('import:electronic-components')
             ->setDescription('Import electronic components data from JSON file');
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('=== 开始导入电子元件库存数据 ===');
        
        // 读取JSON数据
        $jsonData = '{ 
   "电子元件库存": [ 
     { 
       "产品ID": "R001", 
       "产品名称": "贴片电阻", 
       "型号": "RC0402", 
       "规格": { 
         "电阻值": "10kΩ", 
         "容差": "±1%", 
         "功率": "0.0625W", 
         "温度系数": "±100ppm/℃", 
         "封装": "0402", 
         "工作温度": "-55℃ ~ 155℃" 
       }, 
       "品牌": "国巨(YAGEO)", 
       "分类": "电阻/贴片电阻", 
       "库存": { 
         "总库存": 12500, 
         "可用库存": 12000, 
         "在途库存": 500, 
         "安全库存": 1000, 
         "库位": "A-12-3" 
       }, 
       "供应商信息": { 
         "供应商编码": "SUP2023001", 
         "最小订购量": 1000, 
         "价格阶梯": { 
           "1-999": 0.008, 
           "1000-9999": 0.006, 
           "10000+": 0.005 
         } 
       }, 
       "参数特征": { 
         "技术类型": "厚膜电阻", 
         "阻值范围": "1Ω - 10MΩ", 
         "工作电压": "50V" 
       } 
     }, 
     { 
       "产品ID": "R002", 
       "产品名称": "金属膜电阻", 
       "型号": "MFR-25", 
       "规格": { 
         "电阻值": "1kΩ", 
         "容差": "±0.5%", 
         "功率": "0.25W", 
         "温度系数": "±25ppm/℃", 
         "封装": "轴向引线", 
         "引脚长度": "25mm" 
       }, 
       "品牌": "VISHAY", 
       "分类": "电阻/金属膜电阻", 
       "库存": { 
         "总库存": 8500, 
         "可用库存": 8000, 
         "在途库存": 500, 
         "安全库存": 500, 
         "库位": "B-05-7" 
       }, 
       "供应商信息": { 
         "供应商编码": "SUP2023002", 
         "最小订购量": 500, 
         "价格阶梯": { 
           "1-499": 0.15, 
           "500-4999": 0.12, 
           "5000+": 0.10 
         } 
       }, 
       "参数特征": { 
         "技术类型": "金属薄膜", 
         "阻值范围": "10Ω - 1MΩ", 
         "工作电压": "350V" 
       } 
     }, 
     { 
       "产品ID": "R003", 
       "产品名称": "功率电阻", 
       "型号": "RW-5W", 
       "规格": { 
         "电阻值": "100Ω", 
         "容差": "±5%", 
         "功率": "5W", 
         "温度系数": "±250ppm/℃", 
         "封装": "铝壳散热", 
         "安装方式": "螺栓安装" 
       }, 
       "品牌": "松下(Panasonic)", 
       "分类": "电阻/功率电阻", 
       "库存": { 
         "总库存": 300, 
         "可用库存": 250, 
         "在途库存": 50, 
         "安全库存": 50, 
         "库位": "C-08-2" 
       }, 
       "供应商信息": { 
         "供应商编码": "SUP2023003", 
         "最小订购量": 50, 
         "价格阶梯": { 
           "1-49": 1.20, 
           "50-199": 1.00, 
           "200+": 0.90 
         } 
       }, 
       "参数特征": { 
         "技术类型": "绕线电阻", 
         "阻值范围": "0.1Ω - 10kΩ", 
         "工作温度": "-55℃ ~ 275℃" 
       } 
     }, 
     { 
       "产品ID": "R004", 
       "产品名称": "精密电阻", 
       "型号": "PFR-1206", 
       "规格": { 
         "电阻值": "1.5kΩ", 
         "容差": "±0.1%", 
         "功率": "0.25W", 
         "温度系数": "±10ppm/℃", 
         "封装": "1206", 
         "工作温度": "-55℃ ~ 155℃" 
       }, 
       "品牌": "罗姆(ROHM)", 
       "分类": "电阻/精密电阻", 
       "库存": { 
         "总库存": 2200, 
         "可用库存": 2000, 
         "在途库存": 200, 
         "安全库存": 100, 
         "库位": "A-15-8" 
       }, 
       "供应商信息": { 
         "供应商编码": "SUP2023004", 
         "最小订购量": 100, 
         "价格阶梯": { 
           "1-99": 0.25, 
           "100-999": 0.20, 
           "1000+": 0.18 
         } 
       }, 
       "参数特征": { 
         "技术类型": "薄膜电阻", 
         "阻值范围": "10Ω - 100kΩ", 
         "长期稳定性": "±0.1%/年" 
       } 
     }, 
     { 
       "产品ID": "R005", 
       "产品名称": "可调电阻", 
       "型号": "3296W", 
       "规格": { 
         "电阻值": "10kΩ", 
         "容差": "±10%", 
         "功率": "0.5W", 
         "调节方式": "多圈精密调节", 
         "封装": "直插式", 
         "引脚间距": "2.54mm" 
       }, 
       "品牌": "BOURNS", 
       "分类": "电阻/可调电阻/电位器", 
       "库存": { 
         "总库存": 1800, 
         "可用库存": 1500, 
         "在途库存": 300, 
         "安全库存": 200, 
         "库位": "D-03-5" 
       }, 
       "供应商信息": { 
         "供应商编码": "SUP2023005", 
         "最小订购量": 100, 
         "价格阶梯": { 
           "1-99": 0.35, 
           "100-999": 0.30, 
           "1000+": 0.25 
         } 
       }, 
       "参数特征": { 
         "技术类型": "陶瓷基板", 
         "阻值范围": "10Ω - 2MΩ", 
         "调节圈数": "25圈" 
       } 
     } 
   ], 
   "分类索引": { 
     "电阻": [ 
       "贴片电阻", 
       "金属膜电阻", 
       "碳膜电阻", 
       "功率电阻", 
       "精密电阻", 
       "可调电阻", 
       "热敏电阻", 
       "压敏电阻" 
     ], 
     "电容": [ 
       "陶瓷电容", 
       "电解电容", 
       "钽电容", 
       "薄膜电容" 
     ], 
     "半导体": [ 
       "二极管", 
       "三极管", 
       "MOSFET", 
       "集成电路" 
     ], 
     "连接器": [ 
       "排针", 
       "端子", 
       "接插件" 
     ] 
   }, 
   "元数据": { 
     "最后更新时间": "2024-01-15T10:30:00Z", 
     "记录总数": 5, 
     "版本": "1.0" 
   } 
 }';
        
        $data = json_decode($jsonData, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            $output->writeln('<error>错误: JSON 数据格式不正确</error>');
            $output->writeln('<error>错误信息: ' . json_last_error_msg() . '</error>');
            return 1;
        }
        
        try {
            // 首先导入分类数据
            $this->importCategories($data['分类索引'], $output);
            
            // 然后导入电子元件数据
            $this->importElectronicComponents($data['电子元件库存'], $output);
            
            $output->writeln('');
            $output->writeln('<info>=== 电子元件库存数据导入完成 ===</info>');
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
     * 导入分类数据
     */
    private function importCategories(array $categoryIndex, Output $output)
    {
        $output->writeln('');
        $output->writeln('正在导入分类数据...');
        
        // 导入一级分类和二级分类
        foreach ($categoryIndex as $mainCategoryName => $subCategories) {
            // 查找或创建一级分类
            $mainCategory = SkCategory::where('category_name', $mainCategoryName)->find();
            if (!$mainCategory) {
                $mainCategory = new SkCategory();
                // 生成唯一的分类编码，处理中文名称
                $categoryCode = strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $mainCategoryName), 0, 5));
                // 如果生成的编码为空，使用分类名称的首字母加时间戳
                if (empty($categoryCode)) {
                    $categoryCode = 'CAT' . date('His') . rand(100, 999);
                } else {
                    $categoryCode = $categoryCode . date('His') . rand(100, 999);
                }
                $mainCategory->category_code = $categoryCode;
                $mainCategory->category_name = $mainCategoryName;
                $mainCategory->description = $mainCategoryName;
                $mainCategory->parent_id = 0;
                $mainCategory->level = 1;
                $mainCategory->sort_order = 0;
                $mainCategory->status = 'Active';
                $mainCategory->save();
                $output->writeln('<info>✓ 创建一级分类: ' . $mainCategoryName . '</info>');
            }
            
            // 导入二级分类
            foreach ($subCategories as $subCategoryName) {
                $subCategory = SkCategory::where('category_name', $subCategoryName)->where('parent_id', $mainCategory->id)->find();
                if (!$subCategory) {
                    $subCategory = new SkCategory();
                    // 生成唯一的分类编码，处理中文名称
                    $categoryCode = strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $subCategoryName), 0, 5));
                    // 如果生成的编码为空，使用分类名称的首字母加时间戳
                    if (empty($categoryCode)) {
                        $categoryCode = 'SUB' . date('His') . rand(100, 999);
                    } else {
                        $categoryCode = $categoryCode . date('His') . rand(100, 999);
                    }
                    $subCategory->category_code = $categoryCode;
                    $subCategory->category_name = $subCategoryName;
                    $subCategory->description = $subCategoryName;
                    $subCategory->parent_id = $mainCategory->id;
                    $subCategory->level = 2;
                    $subCategory->sort_order = 0;
                    $subCategory->status = 'Active';
                    $subCategory->save();
                    $output->writeln('<info>  ✓ 创建二级分类: ' . $subCategoryName . '</info>');
                }
            }
        }
        
        $output->writeln('<info>✓ 分类数据导入完成</info>');
    }
    
    /**
     * 导入电子元件数据
     */
    private function importElectronicComponents(array $components, Output $output)
    {
        $output->writeln('');
        $output->writeln('正在导入电子元件数据...');
        
        foreach ($components as $component) {
            $output->writeln('');
            $output->writeln('<comment>正在处理: ' . $component['产品名称'] . '</comment>');
            
            // 1. 处理品牌
            $brandName = $component['品牌'];
            // 提取品牌名称（去除括号内的英文）
            if (strpos($brandName, '(') !== false) {
                $brandName = trim(substr($brandName, 0, strpos($brandName, '(')));
            }
            
            $brand = SkBrand::where('brand_name', $brandName)->find();
            if (!$brand) {
                $brand = new SkBrand();
                $brand->brand_code = strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $brandName), 0, 10));
                // 处理中文品牌名称，生成唯一编码
                if (empty($brand->brand_code)) {
                    $brand->brand_code = 'BRD' . date('His') . rand(100, 999);
                } else {
                    $brand->brand_code = $brand->brand_code . date('His') . rand(100, 999);
                }
                $brand->brand_name = $brandName;
                $brand->description = $brandName;
                $brand->brand_logo = '';
                $brand->website = '';
                $brand->status = 'Active';
                $brand->save();
                $output->writeln('<info>  ✓ 创建品牌: ' . $brandName . '</info>');
            }
            
            // 2. 处理分类
            $categoryPath = $component['分类'];
            $categoryParts = explode('/', $categoryPath);
            $mainCategoryName = $categoryParts[0];
            $subCategoryName = $categoryParts[1] ?? '';
            
            $mainCategory = SkCategory::where('category_name', $mainCategoryName)->where('parent_id', 0)->find();
            if (!$mainCategory) {
                $output->writeln('<error>  错误: 未找到一级分类 ' . $mainCategoryName . '</error>');
                continue;
            }
            
            $category = $mainCategory;
            if ($subCategoryName) {
                $subCategory = SkCategory::where('category_name', $subCategoryName)->where('parent_id', $mainCategory->id)->find();
                if (!$subCategory) {
                    $output->writeln('<error>  错误: 未找到二级分类 ' . $subCategoryName . '</error>');
                    continue;
                }
                $category = $subCategory;
            }
            
            // 3. 处理型号
            $modelName = $component['型号'];
            $model = SkProductModel::where('model_name', $modelName)->find();
            if (!$model) {
                $model = new SkProductModel();
                $model->model_code = strtoupper(preg_replace('/[^a-zA-Z0-9]/', '', $modelName));
                $model->model_name = $modelName;
                $model->description = $modelName;
                $model->brand_id = $brand->id;
                $model->category_id = $category->id;
                $model->status = 'Active';
                $model->save();
                $output->writeln('<info>  ✓ 创建型号: ' . $modelName . '</info>');
            }
            
            // 4. 处理供应商
            $supplierCode = $component['供应商信息']['供应商编码'];
            $supplier = SkSupplier::where('supplier_code', $supplierCode)->find();
            if (!$supplier) {
                $supplier = new SkSupplier();
                $supplier->supplier_code = $supplierCode;
                $supplier->supplier_name = $supplierCode;
                $supplier->contact_person = '供应商联系人';
                $supplier->contact_email = $supplierCode . '@example.com';
                $supplier->contact_phone = '13800138000';
                $supplier->address = '供应商地址';
                $supplier->website = '';
                $supplier->status = 'Active';
                $supplier->save();
                $output->writeln('<info>  ✓ 创建供应商: ' . $supplierCode . '</info>');
            }
            
            // 5. 处理产品
            $productCode = $component['产品ID'];
            $product = SkProduct::where('name', $component['产品名称'])->find();
            if (!$product) {
                $product = new SkProduct();
                $product->name = $component['产品名称'];
                $product->brand_id = $brand->id;
                $product->category_id = $category->id;
                $product->description = $component['产品名称'] . ' - ' . $component['型号'];
                $product->specs = json_encode($component['规格']);
                $product->images = json_encode([]);
                $product->status = 'Active';
                $product->views = 0;
                // 添加缺少的必填字段
                $product->inventory_min_order_quantity = $component['供应商信息']['最小订购量'];
                // 从价格阶梯中获取最小价格作为默认单价
                $priceBreaks = $component['供应商信息']['价格阶梯'];
                $minPrice = min(array_values($priceBreaks));
                $product->pricing_unit_price = $minPrice;
                $product->pricing_currency = 'USD'; // 默认货币为美元
                $product->save();
                // 将型号关联到产品系列 (model.series_id = product.id)
                if (!$model->series_id) {
                    $model->series_id = $product->id;
                    $model->save();
                }
                $output->writeln('<info>  ✓ 创建产品: ' . $component['产品名称'] . '</info>');
            }
            
            // 6. 处理库存
            $inventory = SkInventory::where('product_id', $product->id)->find();
            $now = date('Y-m-d H:i:s');
            if (!$inventory) {
                // 检查并创建默认存储位置
                $defaultStorageLocation = \app\model\SkStorageLocation::where('location_name', '默认仓库')->find();
                if (!$defaultStorageLocation) {
                    $defaultStorageLocation = new \app\model\SkStorageLocation();
                    $defaultStorageLocation->location_code = 'DEFAULT';
                    $defaultStorageLocation->location_name = '默认仓库';
                    $defaultStorageLocation->description = '默认存储位置';
                    $defaultStorageLocation->status = 'Active';
                    $defaultStorageLocation->save();
                }
                
                $inventory = new SkInventory();
                $inventory->product_id = $product->id;
                $inventory->storage_location_id = $defaultStorageLocation->id; // 使用实际存在的存储位置ID
                $inventory->quantity = $component['库存']['总库存'];
                $inventory->reserved_quantity = $component['库存']['总库存'] - $component['库存']['可用库存'];
                $inventory->available_quantity = $component['库存']['可用库存'];
                $inventory->safety_stock = $component['库存']['安全库存'];
                $inventory->in_transit_stock = $component['库存']['在途库存'];
                $inventory->in_transit_quantity = $component['库存']['在途库存'];
                $inventory->last_updated = $now;
                $inventory->created_at = $now;
                $inventory->updated_at = $now;
                $inventory->save();
                $output->writeln('<info>  ✓ 创建库存记录</info>');
            }
            
            // 7. 处理价格阶梯 - 暂时跳过，因为缺少对应的模型
            // $priceBreaks = $component['供应商信息']['价格阶梯'];
            // foreach ($priceBreaks as $range => $price) {
            //     // 价格阶梯处理逻辑
            // }
            
            $output->writeln('<info>  ✓ 完成: ' . $component['产品名称'] . '</info>');
        }
        
        $output->writeln('');
        $output->writeln('<info>✓ 电子元件数据导入完成</info>');
    }
}