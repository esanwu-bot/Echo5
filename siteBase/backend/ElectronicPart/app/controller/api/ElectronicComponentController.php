<?php
/**
 * 电子元器件商城 - 电子元件接口
 * 文件说明：提供电子元器件库存、规格、供应商与价格阶梯等聚合数据接口，供前端或外部系统查询。
 */
declare(strict_types=1);

namespace app\controller\api;

use app\controller\BaseController;
use app\model\SkProduct;
use think\Response;
use think\facade\Log;
use think\facade\Cache;

/**
 * 电子元件API控制器
 * @package app\controller\api
 */
class ElectronicComponentController extends BaseController
{
    /**
     * 获取电子元件库存数据
     */
    public function index(): Response
    {
        try {
            $lang = $this->request->lang ?? 'zh';
            $cacheKey = 'electronicComponent_index_' . $lang;
            
            $result = Cache::remember($cacheKey, function() {
                $products = SkProduct::with(['category', 'subcategory', 'brand', 'inventory', 'productSuppliers.suppliers', 'specs.specDefinition', 'productPriceBreaks'])->active()->select()->toArray();
                
                $electronicComponents = [];
                $categoryIndex = [];
                
                foreach ($products as $product) {
                    // 格式化规格参数
                    $specs = [];
                    if (!empty($product['specs'])) {
                        foreach ($product['specs'] as $spec) {
                            $specName = $spec['spec_definition']['name'] ?? $spec['spec_name'] ?? '';
                            if (!empty($specName)) {
                                $specs[$specName] = $spec['value'] ?? '';
                            }
                        }
                    }
                    
                    // 格式化库存数据
                    $inventory = [
                        '总库存' => 0,
                        '可用库存' => 0,
                        '在途库存' => 0,
                        '安全库存' => 0
                    ];
                    if (!empty($product['inventory'])) {
                        foreach ($product['inventory'] as $inv) {
                            $inventory['总库存'] += $inv['quantity'] ?? 0;
                            $inventory['可用库存'] += $inv['available_quantity'] ?? 0;
                            $inventory['在途库存'] += $inv['in_transit_stock'] ?? 0;
                            $inventory['安全库存'] += $inv['safety_stock'] ?? 0;
                        }
                    }
                    
                    // 格式化供应商信息和价格阶梯
                    $supplierInfo = [
                        '供应商编码' => '',
                        '最小订购量' => 0,
                        '价格阶梯' => []
                    ];
                    if (!empty($product['product_suppliers'])) {
                        foreach ($product['product_suppliers'] as $ps) {
                            $supplierInfo['供应商编码'] = $ps['supplier']['supplier_code'] ?? '';
                            $supplierInfo['最小订购量'] = $ps['min_order_quantity'] ?? 0;
                        }
                    }
                    
                    // 格式化价格阶梯
                    $priceBreaks = [];
                    if (!empty($product['product_price_breaks'])) {
                        foreach ($product['product_price_breaks'] as $pb) {
                            $range = '';
                            if ($pb['quantity'] === 1) {
                                $range = '1-999';
                            } elseif ($pb['quantity'] === 1000) {
                                $range = '1000-9999';
                            } else {
                                $range = '10000+';
                            }
                            $priceBreaks[$range] = $pb['price'] ?? 0;
                        }
                    }
                    $supplierInfo['价格阶梯'] = $priceBreaks;
                    
                    // 格式化参数特征
                    $parameterFeatures = [];
                    if (!empty($product['specs'])) {
                        $parameterKeys = ['技术类型', '阻值范围', '工作电压', '工作温度'];
                        foreach ($product['specs'] as $spec) {
                            $specName = $spec['spec_definition']['name'] ?? $spec['spec_name'] ?? '';
                            if (in_array($specName, $parameterKeys)) {
                                $parameterFeatures[$specName] = $spec['value'] ?? '';
                            }
                        }
                    }
                    
                    // 构建完整的电子元件数据
                    $component = [
                        '产品ID' => $product['product_code'] ?? $product['id'],
                        '产品名称' => $product['name'] ?? '',
                        '型号' => $product['model']['model_name'] ?? $product['model_code'] ?? '',
                        '规格' => $specs,
                        '品牌' => $product['brand']['name'] ?? '',
                        '分类' => $product['category']['name'] ?? '' . (!empty($product['subcategory']['name']) ? '/' . $product['subcategory']['name'] : ''),
                        '库存' => $inventory,
                        '供应商信息' => $supplierInfo,
                        '参数特征' => $parameterFeatures
                    ];
                    
                    $electronicComponents[] = $component;
                    
                    // 构建分类索引
                    $categoryName = $product['category']['name'] ?? '';
                    $subcategoryName = $product['subcategory']['name'] ?? '';
                    if (!empty($categoryName)) {
                        if (!isset($categoryIndex[$categoryName])) {
                            $categoryIndex[$categoryName] = [];
                        }
                        if (!empty($subcategoryName) && !in_array($subcategoryName, $categoryIndex[$categoryName])) {
                            $categoryIndex[$categoryName][] = $subcategoryName;
                        }
                    }
                }
                
                // 构建返回数据
                return [
                    '电子元件库存' => $electronicComponents,
                    '分类索引' => $categoryIndex,
                    '元数据' => [
                        '最后更新时间' => date('Y-m-d\TH:i:s\Z'),
                        '记录总数' => count($electronicComponents),
                        '版本' => '1.0'
                    ]
                ];
            }, 3600);
            
            return $this->success($result);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}