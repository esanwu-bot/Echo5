<?php
/**
 * 电子元器件商城 - 后台商品管理控制器
 * 文件说明：提供后台商品的增删改查、导入导出、规格/品牌/供应商管理等功能，供管理端使用。
 */

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkProduct;
use app\model\SkCategory;
use app\model\SkProductSpec;
use app\model\SkBrand;
use app\model\SkSpecificationDefinition;
use app\model\SkProductAttribute;
use app\model\SkProductSupplier;
use app\model\SkProductPriceBreak;
use app\model\SkAttribute;
use app\model\SkCategoryAttributeValue;
use think\exception\ValidateException;
use think\facade\Db;
use think\facade\Log;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx as XlsxWriter;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;

class ProductController extends BaseController
{
    /**
     * 获取商品列表
     */
    public function index()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 10;
        
        $query = SkProduct::with(['category', 'brand', 'seriesModels', 'productSuppliers.supplier']);

        if (!empty($params['keyword']) && $params['keyword'] !== 'undefined') {
            $keyword = $params['keyword'];
            $query->where('name|product_code', 'like', '%' . $keyword . '%');
        }

        if (!empty($params['search']) && $params['search'] !== 'undefined') {
            $search = $params['search'];
            $query->where('name|product_code', 'like', '%' . $search . '%');
        }

        if (!empty($params['category_id']) && $params['category_id'] !== 'undefined') {
            $query->where('category_fk_id', $params['category_id']);
        }

        if (!empty($params['brand_id']) && $params['brand_id'] !== 'undefined') {
            $query->where('brand_id', $params['brand_id']);
        }

        if (isset($params['status']) && $params['status'] !== '' && $params['status'] !== 'undefined') {
            $query->where('is_on_sale', $params['status']);
        }

        // 高级筛选：按属性
        if (!empty($params['attribute_id']) && $params['attribute_id'] !== 'undefined' && !empty($params['attribute_value']) && $params['attribute_value'] !== 'undefined') {
            $query->whereExists(function ($q) use ($params) {
                $q->table('sk_product_attribute')
                  ->whereRaw('product_id = sk_product.id')
                  ->where('attribute_id', $params['attribute_id'])
                  ->where('attribute_value', 'like', '%' . $params['attribute_value'] . '%');
            });
        }

        // 高级筛选：按供应商
        if (!empty($params['supplier_id']) && $params['supplier_id'] !== 'undefined') {
            $query->whereExists(function ($q) use ($params) {
                $q->table('sk_product_suppliers')
                  ->whereRaw('product_id = sk_product.id')
                  ->where('supplier_id', $params['supplier_id']);
            });
        }

        

        $total = $query->count();
        $list = $query->order('sort', 'asc')
                     ->order('id', 'desc')
                     ->page($page, $limit)
                     ->select();

        // 为图片路径添加完整URL（价格/库存由 SkProduct 获取器自动计算并附加）
        $baseUrl = $this->request->domain();
        $list = $list->map(function($item) use ($baseUrl) {
            if (!empty($item->images) && is_array($item->images)) {
                $item->images = array_map(function($img) use ($baseUrl) {
                    if (!empty($img) && !str_starts_with($img, 'http')) {
                        return $baseUrl . $img;
                    }
                    return $img;
                }, $item->images);
            }

            return $item;
        });

        return $this->paginate($list, $total, $page, $limit);
    }

    /**
     * 获取商品详情
     */
    public function read($id)
    {
        $product = SkProduct::with([
            'category',
            'brand',
            'attributes.attribute',
            'productSuppliers.supplier',
            'productPriceBreaks'
        ])->find($id);
        
        if (!$product) {
            return $this->error('产品不存在');
        }
        
        // 处理图片URL
        $baseUrl = $this->request->domain();
        if (!empty($product->images) && is_array($product->images)) {
            $product->images = array_map(function($img) use ($baseUrl) {
                if (!empty($img) && !str_starts_with($img, 'http')) {
                    return $baseUrl . $img;
                }
                return $img;
            }, $product->images);
        }

        // 前端表单使用 category_id，模型字段为 category_fk_id，做兼容性映射
        $product->category_id = $product->category_fk_id;

        // 编辑页需要编辑表内基础字段，避免获取器返回计算值导致保存时覆盖基础值
        $product->price = $product->getAttr('price') ?? 0;
        $product->stock = $product->getAttr('stock') ?? 0;

        return $this->success($product);
    }

    /**
     * 创建新商品
     */
    public function save()
    {
        Db::startTrans();
        try {
            $data = $this->request->param();
            
            if (!empty($data['category_id'])) {
                $data['category_fk_id'] = $data['category_id'];
                unset($data['category_id']);
            }

            // 验证分类是否存在
            if (!empty($data['category_fk_id'])) {
                if (!SkCategory::find($data['category_fk_id'])) {
                    return $this->error('分类不存在');
                }
            }

            // 直接将规格作为JSON字段使用
            if (empty($data['specs']) || !is_array($data['specs'])) {
                $data['specs'] = null;
            }

            // 直接将图片作为JSON字段使用
            if (empty($data['images']) || !is_array($data['images'])) {
                $data['images'] = null;
            }

            $product = SkProduct::create($data);

            // 同步关联
            $this->syncAssociations($product, $data);

            Db::commit();
            return $this->success($product, '产品创建成功');

        } catch (\Exception $e) {
            Db::rollback();
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 更新商品
     */
    public function update($id)
    {
        Db::startTrans();
        try {
            $product = SkProduct::find($id);
            if (!$product) {
                return $this->error('产品不存在');
            }

            $data = $this->request->param();
            
            if (!empty($data['category_id'])) {
                $data['category_fk_id'] = $data['category_id'];
                unset($data['category_id']);
            }

            // 验证分类是否存在
            if (!empty($data['category_fk_id'])) {
                if (!SkCategory::find($data['category_fk_id'])) {
                    return $this->error('分类不存在');
                }
            }

            // 直接将规格作为JSON字段使用
            if (empty($data['specs']) || !is_array($data['specs'])) {
                $data['specs'] = null;
            }

            // 直接将图片作为JSON字段使用
            if (empty($data['images']) || !is_array($data['images'])) {
                $data['images'] = null;
            }

            $product->save($data);

            // 同步关联
            $this->syncAssociations($product, $data);

            Db::commit();
            return $this->success($product, '产品更新成功');

        } catch (\Exception $e) {
            Db::rollback();
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 删除商品
     */
    public function delete($id)
    {
        Db::startTrans();
        try {
            $product = SkProduct::find($id);
            if (!$product) {
                return $this->error('产品不存在');
            }

            // 如有必要检查依赖项，例如订单
            // 目前直接删除商品
            
            $product->delete();

            Db::commit();
            return $this->success(null, '产品删除成功');
        } catch (\Exception $e) {
            Db::rollback();
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 从Excel导入商品
     * 支持 xlsx/xls 格式，列顺序：商品名称、商品编码、分类ID、品牌ID、单价、库存、排序、状态(1/0)、描述
     */
    public function import()
    {
        Db::startTrans();
        try {
            $file = $this->request->file('file');
            if (!$file) {
                return $this->error('请上传文件');
            }

            $ext = strtolower($file->getOriginalExtension());
            if (!in_array($ext, ['xlsx', 'xls'])) {
                return $this->error('仅支持Excel文件（xlsx/xls）');
            }

            $filePath = $file->getRealPath();
            $spreadsheet = IOFactory::load($filePath);
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray(null, true, true, false);

            if (empty($rows) || count($rows) < 2) {
                return $this->error('文件内容为空或仅有表头，无可导入数据');
            }

            // 跳过第一行表头
            array_shift($rows);

            $importedCount = 0;
            $failedCount   = 0;
            $failedRows    = [];

            foreach ($rows as $rowIndex => $row) {
                // 跳过完全空行
                if (empty(array_filter($row, fn($v) => $v !== null && $v !== ''))) {
                    continue;
                }

                $rowNum = $rowIndex + 2; // 行号（含表头从2开始）

                $name        = trim((string)($row[0] ?? ''));
                $productCode = trim((string)($row[1] ?? ''));
                $categoryId  = intval($row[2] ?? 0);
                $brandId     = intval($row[3] ?? 0);
                $price       = is_numeric($row[4] ?? '') ? (float)$row[4] : 0;
                $stock       = intval($row[5] ?? 0);
                $sort        = intval($row[6] ?? 0);
                $isOnSale    = intval($row[7] ?? 1);
                $description = trim((string)($row[8] ?? ''));

                if (empty($name)) {
                    $failedCount++;
                    $failedRows[] = "第{$rowNum}行：商品名称不能为空";
                    continue;
                }

                // 验证分类
                if ($categoryId > 0 && !SkCategory::find($categoryId)) {
                    $failedCount++;
                    $failedRows[] = "第{$rowNum}行（{$name}）：分类ID {$categoryId} 不存在";
                    continue;
                }

                // 验证品牌
                if ($brandId > 0 && !SkBrand::find($brandId)) {
                    $failedCount++;
                    $failedRows[] = "第{$rowNum}行（{$name}）：品牌ID {$brandId} 不存在";
                    continue;
                }

                // 编码重复检查：有编码时跳过重复行
                if (!empty($productCode)) {
                    $exists = SkProduct::where('product_code', $productCode)->find();
                    if ($exists) {
                        $failedCount++;
                        $failedRows[] = "第{$rowNum}行（{$name}）：编码 {$productCode} 已存在，已跳过";
                        continue;
                    }
                }

                SkProduct::create([
                    'name'           => $name,
                    'product_code'   => $productCode,
                    'category_fk_id' => $categoryId ?: 0,
                    'brand_id'       => $brandId ?: 0,
                    'price'          => $price,
                    'stock'          => $stock,
                    'sort'           => $sort,
                    'is_on_sale'     => in_array($isOnSale, [0, 1]) ? $isOnSale : 1,
                    'description'    => $description,
                ]);

                $importedCount++;
            }

            Db::commit();

            return $this->success([
                'imported_count' => $importedCount,
                'failed_count'   => $failedCount,
                'failed_rows'    => $failedRows,
            ], "导入完成：成功 {$importedCount} 条，失败/跳过 {$failedCount} 条");

        } catch (\Exception $e) {
            Db::rollback();
            Log::error('产品Excel导入失败: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('导入失败：' . $e->getMessage(), 500);
        }
    }

    /**
     * 导出商品数据为 Excel（xlsx）
     */
    public function export()
    {
        try {
            $params = $this->request->param();
            $query  = SkProduct::with(['category', 'brand']);

            if (!empty($params['keyword'])) {
                $query->where('name|product_code', 'like', '%' . $params['keyword'] . '%');
            }
            if (!empty($params['category_id'])) {
                $query->where('category_fk_id', $params['category_id']);
            }
            if (!empty($params['brand_id'])) {
                $query->where('brand_id', $params['brand_id']);
            }
            if (isset($params['status']) && $params['status'] !== '') {
                $query->where('is_on_sale', $params['status']);
            }

            $products = $query->order('sort', 'asc')->order('id', 'desc')->limit(10000)->select();

            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('商品列表');

            // 表头
            $headers = ['商品ID', '商品名称', '商品编码', '分类', '品牌', '单价', '库存', '排序', '状态', '创建时间'];
            foreach ($headers as $col => $header) {
                $cell = chr(65 + $col) . '1';
                $sheet->setCellValue($cell, $header);
            }

            // 表头样式
            $headerStyle = [
                'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ];
            $sheet->getStyle('A1:' . chr(64 + count($headers)) . '1')->applyFromArray($headerStyle);

            // 数据行
            $rowNum = 2;
            foreach ($products as $product) {
                $sheet->setCellValue("A{$rowNum}", $product->id);
                $sheet->setCellValue("B{$rowNum}", $product->name);
                $sheet->setCellValue("C{$rowNum}", $product->product_code);
                $sheet->setCellValue("D{$rowNum}", $product->category ? $product->category->name : '');
                $sheet->setCellValue("E{$rowNum}", $product->brand ? $product->brand->brand_name : '');
                $sheet->setCellValue("F{$rowNum}", $product->getAttr('price') ?? 0);
                $sheet->setCellValue("G{$rowNum}", $product->getAttr('stock') ?? 0);
                $sheet->setCellValue("H{$rowNum}", $product->sort ?? 0);
                $sheet->setCellValue("I{$rowNum}", $product->is_on_sale == 1 ? '上架' : '下架');
                $sheet->setCellValue("J{$rowNum}", $product->created_at);
                $rowNum++;
            }

            // 自动列宽
            foreach (range('A', chr(64 + count($headers))) as $col) {
                $sheet->getColumnDimension($col)->setAutoSize(true);
            }

            // 数据行边框
            if ($rowNum > 2) {
                $sheet->getStyle('A2:' . chr(64 + count($headers)) . ($rowNum - 1))
                    ->applyFromArray(['borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]]);
            }

            $fileName = 'products_export_' . date('YmdHis') . '.xlsx';
            $tempFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . $fileName;

            $writer = new XlsxWriter($spreadsheet);
            $writer->save($tempFile);

            $fileContent = file_get_contents($tempFile);
            @unlink($tempFile);

            return response($fileContent, 200, [
                'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
                'Content-Length'      => strlen($fileContent),
                'Cache-Control'       => 'no-cache, must-revalidate',
            ]);

        } catch (\Exception $e) {
            Log::error('产品Excel导出失败: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('导出失败：' . $e->getMessage(), 500);
        }
    }

    /**
     * 批量删除商品
     */
    public function batchDelete()
    {
        try {
            $ids = $this->request->param('ids');
            if (empty($ids) || !is_array($ids)) {
                return $this->error('无效的ID');
            }

            Db::startTrans();
            SkProduct::destroy($ids);
            // 同时删除关联数据
            SkProductAttribute::where('product_id', 'in', $ids)->delete();
            SkProductSupplier::where('product_id', 'in', $ids)->delete();
            SkProductPriceBreak::where('product_id', 'in', $ids)->delete();
            
            Db::commit();
            return $this->success(null, '批量删除成功');
        } catch (\Exception $e) {
            Db::rollback();
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 批量更新商品状态
     */
    public function batchStatus()
    {
        try {
            $ids = $this->request->param('ids');
            $status = $this->request->param('status');
            
            if (empty($ids) || !is_array($ids)) {
                return $this->error('无效的ID');
            }

            SkProduct::where('id', 'in', $ids)->update(['is_on_sale' => $status]);
            
            return $this->success(null, '批量状态更新成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 下载商品导入模板（Excel）
     */
    public function importTemplate()
    {
        try {
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('商品导入模板');

            // 表头
            $headers = ['商品名称', '商品编码', '分类ID', '品牌ID', '单价', '库存', '排序', '状态(1上架/0下架)', '描述'];
            foreach ($headers as $col => $header) {
                $cell = chr(65 + $col) . '1';
                $sheet->setCellValue($cell, $header);
            }

            // 表头样式
            $headerStyle = [
                'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ];
            $sheet->getStyle('A1:' . chr(64 + count($headers)) . '1')->applyFromArray($headerStyle);

            // 示例数据行
            $sheet->setCellValue('A2', '示例芯片');
            $sheet->setCellValue('B2', 'IC-001');
            $sheet->setCellValue('C2', 1);
            $sheet->setCellValue('D2', 1);
            $sheet->setCellValue('E2', 0.50);
            $sheet->setCellValue('F2', 1000);
            $sheet->setCellValue('G2', 1);
            $sheet->setCellValue('H2', 1);
            $sheet->setCellValue('I2', '这是一个示例芯片产品');

            // 示例行浅灰背景
            $sheet->getStyle('A2:I2')->applyFromArray([
                'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F2F2F2']],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ]);

            // 自动列宽
            foreach (range('A', chr(64 + count($headers))) as $col) {
                $sheet->getColumnDimension($col)->setAutoSize(true);
            }

            // 备注说明（第4行起）
            $sheet->setCellValue('A4', '【填写说明】');
            $sheet->getStyle('A4')->getFont()->setBold(true);
            $sheet->setCellValue('A5', '1. 商品名称为必填项，不能为空');
            $sheet->setCellValue('A6', '2. 商品编码如重复将跳过该行（不覆盖）');
            $sheet->setCellValue('A7', '3. 分类ID/品牌ID需填写系统中已存在的数字ID，填0或留空则不关联');
            $sheet->setCellValue('A8', '4. 单价/库存为商品基础单价与基础库存，单位 USD/件');
            $sheet->setCellValue('A9', '5. 状态：1=上架，0=下架，默认1');
            $sheet->setCellValue('A10', '6. 请勿修改第1行表头顺序');

            $fileName = 'product_import_template.xlsx';
            $tempFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . $fileName;

            $writer = new XlsxWriter($spreadsheet);
            $writer->save($tempFile);

            $fileContent = file_get_contents($tempFile);
            @unlink($tempFile);

            return response($fileContent, 200, [
                'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
                'Content-Length'      => strlen($fileContent),
                'Cache-Control'       => 'no-cache, must-revalidate',
            ]);

        } catch (\Exception $e) {
            Log::error('生成导入模板失败: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('生成模板失败：' . $e->getMessage(), 500);
        }
    }

    /**
     * 同步商品关联（属性、供应商、价格阶梯）
     */
    private function syncAssociations($product, $data)
    {
        // 1. Sync Attributes
        if (isset($data['attributes']) && is_array($data['attributes'])) {
            // 删除现有属性
            SkProductAttribute::where('product_id', $product->id)->delete();
            
            $attrData = [];

            foreach ($data['attributes'] as $attr) {
                if (!empty($attr['attribute_id'])) {
                    $attrId = (int)$attr['attribute_id'];
                    $value = $attr['attribute_value'] ?? '';
                    $attrData[] = [
                        'product_id' => $product->id,
                        'attribute_id' => $attrId,
                        'attribute_value' => $value,
                        'numeric_value' => is_numeric($value) ? (float)$value : null,
                    ];
                }
            }

            if (!empty($attrData)) {
                (new SkProductAttribute())->saveAll($attrData);
                
                // 1.1 Sync Category Attribute Values (Unique values per category)
                if (!empty($product->category_fk_id)) {
                    foreach ($attrData as $attr) {
                        if (!empty($attr['attribute_value'])) {
                            $check = Db::table('sk_category_attribute_values')->where([
                                'category_id' => $product->category_fk_id,
                                'attribute_id' => $attr['attribute_id'],
                                'attribute_value' => $attr['attribute_value']
                            ])->find();
                            
                            if (!$check) {
                                Db::table('sk_category_attribute_values')->insert([
                                    'category_id' => $product->category_fk_id,
                                    'attribute_id' => $attr['attribute_id'],
                                    'attribute_value' => $attr['attribute_value'],
                                    'create_time' => date('Y-m-d H:i:s')
                                ]);
                            }
                        }
                    }
                }
            }
        }

        // 2. Sync Suppliers
        if (isset($data['product_suppliers']) && is_array($data['product_suppliers'])) {
            SkProductSupplier::where('product_id', $product->id)->delete();
            
            $supplierData = [];
            foreach ($data['product_suppliers'] as $s) {
                if (!empty($s['supplier_id'])) {
                    $supplierData[] = [
                        'product_id' => $product->id,
                        'supplier_id' => $s['supplier_id'],
                        'min_order_quantity' => $s['min_order_quantity'] ?? 1,
                        'lead_time' => $s['lead_time'] ?? 0,
                        'is_primary' => $s['is_primary'] ?? 0,
                    ];
                }
            }
            if (!empty($supplierData)) {
                (new SkProductSupplier())->saveAll($supplierData);
            }
        }

        // 3. Sync Price Breaks
        if (isset($data['product_price_breaks']) && is_array($data['product_price_breaks'])) {
            SkProductPriceBreak::where('product_id', $product->id)->delete();
            
            $priceData = [];
            foreach ($data['product_price_breaks'] as $pb) {
                if (!empty($pb['quantity']) && !empty($pb['price'])) {
                    $priceData[] = [
                        'product_id' => $product->id,
                        'quantity' => $pb['quantity'],
                        'price' => $pb['price']
                    ];
                }
            }
            if (!empty($priceData)) {
                (new SkProductPriceBreak())->saveAll($priceData);
            }
        }
    }
}