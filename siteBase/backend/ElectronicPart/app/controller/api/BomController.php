<?php
/**
 * 电子元器件商城 - BOM管理API控制器
 * 文件说明：提供BOM库存校验、询盘提交、文件上传等接口。
 * 路由：/api/v1/bom
 */

namespace app\controller\api;

use app\controller\BaseController;
use app\model\SkProductModel;
use app\model\SkProductAlternate;
use app\model\SkBomProject;
use app\model\SkBomItem;
use app\model\SkInquiry;
use app\model\SkInquiryItem;
use app\model\SkProductPriceBreak;
use app\model\SkProductSupplier;
use think\facade\Db;
use think\facade\Log;
use think\Response;

class BomController extends BaseController
{
    /**
     * 校验 BOM 库存并返回替代建议
     * POST /api/v1/bom/check-stock
     *
     * 支持按 model_id 精确匹配；model_id 缺失/无效时回退 model_code 查询。
     * 单价按用量匹配 sk_product_price_break 阶梯价，库存取自 sk_product_models.stock。
     *
     * @access public
     * @return Response
     */
    public function checkStock()
    {
        $items = $this->request->post('items', []);
        if (!is_array($items) || empty($items)) {
            return $this->error('请提供BOM项目列表', 400);
        }

        try {
            $modelIds = [];
            foreach ($items as $item) {
                $id = (int)($item['model_id'] ?? 0);
                if ($id > 0) {
                    $modelIds[] = $id;
                }
            }
            $modelIds = array_values(array_unique($modelIds));

            $modelMap = [];
            if (!empty($modelIds)) {
                $models = SkProductModel::with(['series', 'brand'])->whereIn('id', $modelIds)->select();
                foreach ($models as $m) {
                    $modelMap[(int)$m->id] = $m;
                }
            }

            $validatedItems = [];
            $warnings = [];

            foreach ($items as $item) {
                $modelId = (int)($item['model_id'] ?? 0);
                $modelCode = trim((string)($item['model_code'] ?? ''));
                $quantity = max(1, (int)($item['quantity'] ?? 1));

                // 优先 ID，其次 MPN 编码
                $model = $modelId > 0 ? ($modelMap[$modelId] ?? null) : null;
                if (!$model && $modelCode !== '') {
                    $model = SkProductModel::with(['series', 'brand'])
                        ->where('model_code', $modelCode)
                        ->find();
                    if ($model) {
                        $modelMap[(int)$model->id] = $model;
                    }
                }

                if (!$model) {
                    $notFoundLabel = $modelCode !== ''
                        ? "「{$modelCode}」"
                        : "ID {$modelId}";
                    $warnings[] = [
                        'model_id' => $modelId,
                        'model_code' => $modelCode,
                        'message' => $modelId <= 0 && $modelCode === ''
                            ? '无效 BOM 条目：缺少型号 ID（可能将系列误加入 BOM，请从型号列表添加）'
                            : "型号 {$notFoundLabel} 不存在，请删除该条目后从型号列表重新添加",
                    ];
                    // 保留前端条目结构，避免价格/库存字段丢失后无法展示
                    $validatedItems[] = [
                        'model_id' => $modelId,
                        'model_code' => $modelCode,
                        'model_name' => (string)($item['model_name'] ?? ''),
                        'brand_name' => (string)($item['brand_name'] ?? ''),
                        'quantity' => $quantity,
                        'unit_price' => 0.0,
                        'stock' => 0,
                        'warning' => true,
                        'alternate' => null,
                        'exists' => false,
                    ];
                    continue;
                }

                $resolvedId = (int)$model->id;
                $stock = (int)($model->stock ?? 0);
                $unitPrice = $this->getModelUnitPrice($model, $quantity);
                $brandName = $this->resolveBrandName($model);
                // 库存为 0 或缺货预警：库存不足用量，或库存仅够少量用量
                $warning = $stock <= 0 || $stock < $quantity || ($stock > 0 && $stock <= $quantity * 10);

                $alternate = null;
                if ($warning) {
                    $alternateData = SkProductAlternate::where('model_id', $resolvedId)
                        ->where(function ($q) {
                            $q->where('status', 'Active')->whereOr('status', 1);
                        })
                        ->order('priority', 'asc')
                        ->find();
                    if ($alternateData) {
                        $altModel = SkProductModel::with('brand')->where('id', $alternateData->alternate_model_id)->find();
                        $alternate = [
                            'alternate_model' => $altModel ? [
                                'id' => $altModel->id,
                                'model_code' => $altModel->model_code,
                                'brand_name' => $this->resolveBrandName($altModel),
                                'stock' => (int)($altModel->stock ?? 0),
                            ] : null,
                            'notes' => $alternateData->notes,
                        ];
                    }
                }

                $validatedItems[] = [
                    'model_id' => $resolvedId,
                    'model_code' => $model->model_code,
                    'model_name' => $model->model_name,
                    'brand_name' => $brandName,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'stock' => $stock,
                    'warning' => $warning,
                    'alternate' => $alternate,
                    'exists' => true,
                ];

                if ($warning) {
                    if ($stock <= 0) {
                        $msg = "{$model->model_code} 当前无库存，您的用量为 {$quantity} 片，建议提交询盘或寻找替代料号。";
                    } elseif ($stock < $quantity) {
                        $msg = "{$model->model_code} 当前库存仅 {$stock} 片，不足您的用量 {$quantity} 片，建议尽快下单或寻找替代料号。";
                    } else {
                        $msg = "{$model->model_code} 当前库存仅 {$stock} 片，您的用量为 {$quantity} 片，建议尽快下单或寻找替代料号。";
                    }
                    $warnings[] = [
                        'model_id' => $resolvedId,
                        'model_code' => $model->model_code,
                        'message' => $msg,
                        'alternate' => $alternate,
                    ];
                }
            }

            // 多语言翻译 model_name / brand_name
            $lang = $this->getLangCode();
            if ($lang !== 'zh-CN' && !empty($validatedItems)) {
                $i18nService = app(\app\service\I18nService::class);

                // 收集需要翻译的 model_id 和 brand_id
                $transModelIds = [];
                $transBrandIds = [];
                $itemBrandMap = []; // index => brand_id
                foreach ($validatedItems as $idx => &$vi) {
                    if (!empty($vi['exists']) && $vi['model_id'] > 0) {
                        $transModelIds[] = $vi['model_id'];
                        // 从 modelMap 或重新查询获取 brand_id
                        $mObj = $modelMap[$vi['model_id']] ?? null;
                        $brandId = $mObj ? (int)($mObj->brand_id ?? 0) : 0;
                        if ($brandId > 0) {
                            $transBrandIds[] = $brandId;
                            $itemBrandMap[$idx] = $brandId;
                        }
                    }
                }
                unset($vi);
                $transModelIds = array_values(array_unique($transModelIds));
                $transBrandIds = array_values(array_unique($transBrandIds));

                $modelTrans = !empty($transModelIds)
                    ? $i18nService->getTranslations('model', $transModelIds, $lang, ['model_name'])
                    : [];
                $brandTrans = !empty($transBrandIds)
                    ? $i18nService->getTranslations('brand', $transBrandIds, $lang, ['brand_name'])
                    : [];

                foreach ($validatedItems as $idx => &$vi) {
                    $mid = $vi['model_id'] ?? 0;
                    if ($mid > 0 && isset($modelTrans[$mid]['model_name'])) {
                        $vi['model_name'] = $modelTrans[$mid]['model_name'];
                    }
                    $bid = $itemBrandMap[$idx] ?? 0;
                    if ($bid > 0 && isset($brandTrans[$bid]['brand_name'])) {
                        $vi['brand_name'] = $brandTrans[$bid]['brand_name'];
                    }
                }
                unset($vi);
            }

            return $this->success([
                'items' => $validatedItems,
                'warnings' => $warnings,
            ]);
        } catch (\Exception $e) {
            Log::error('BOM校验失败: ' . $e->getMessage());
            return $this->error('校验失败', 500);
        }
    }

    /**
     * 解析型号品牌名称
     *
     * @access protected
     * @param SkProductModel $model
     * @return string
     */
    protected function resolveBrandName($model): string
    {
        if (!$model) {
            return '';
        }
        if (!empty($model->brand)) {
            return (string)($model->brand->brand_name ?? $model->brand->name ?? '');
        }
        return (string)($model->getData('brand_name') ?? '');
    }

    /**
     * 获取型号参考单价（按用量匹配阶梯价）
     *
     * 取价顺序（见 docs/产品价格定义说明.md）：
     * 1. sk_product_price_break：按用量匹配最高可达档位；不足最低档时回退最低档参考价
     * 2. sk_product_suppliers：主供应商价，再任意供应商最低价
     * 3. 型号自身 pricing_unit_price（若存在）
     * 4. 返回 0
     *
     * @access protected
     * @param SkProductModel $model
     * @param int $quantity 用量（片）
     * @return float
     */
    protected function getModelUnitPrice($model, int $quantity = 1): float
    {
        if (!$model) {
            return 0.0;
        }

        $quantity = max(1, $quantity);

        // 安全获取关联产品对象：relation 可能未加载或返回非对象（DB字段同名冲突）
        $series = $model->series;
        if (!is_object($series)) {
            $seriesId = (int)($model->getAttr('series_id') ?? 0);
            if ($seriesId > 0) {
                $series = \app\model\SkProduct::find($seriesId);
            }
        }

        // product_id 在价格表中通常存 product_code；兼容历史数据中存数字 id 的情况
        $productKeys = [];
        if ($series && is_object($series)) {
            if (!empty($series->product_code)) {
                $productKeys[] = (string)$series->product_code;
            }
            if (!empty($series->id)) {
                $productKeys[] = (string)$series->id;
            }
        }

        foreach ($productKeys as $productKey) {
            // 1) 按用量匹配阶梯（quantity >= 分界点的最高档）
            $matchedPrice = SkProductPriceBreak::getPriceByQuantity($productKey, $quantity);
            if ($matchedPrice !== null && (float)$matchedPrice > 0) {
                return (float)$matchedPrice;
            }

            // 2) 用量低于最低档时，取最低档作为参考展示价
            $minBreak = SkProductPriceBreak::where('product_id', $productKey)
                ->order('quantity', 'asc')
                ->find();
            if ($minBreak && (float)$minBreak->price > 0) {
                return (float)$minBreak->price;
            }
        }

        // 3) 主供应商 / 任意供应商价
        foreach ($productKeys as $productKey) {
            $supplier = SkProductSupplier::where('product_id', $productKey)
                ->where('is_primary', 1)
                ->find();
            if ($supplier && (float)$supplier->price > 0) {
                return (float)$supplier->price;
            }

            $supplier = SkProductSupplier::where('product_id', $productKey)
                ->order('price', 'asc')
                ->find();
            if ($supplier && (float)$supplier->price > 0) {
                return (float)$supplier->price;
            }
        }

        // 4) 型号表字段兜底（部分环境可能存在 pricing_unit_price）
        try {
            $modelPrice = (float)($model->getAttr('pricing_unit_price') ?? 0);
        } catch (\Exception $e) {
            $modelPrice = 0.0;
        }
        if ($modelPrice > 0) {
            return $modelPrice;
        }

        return 0.0;
    }

    /**
     * 提交 BOM 询盘
     * POST /api/v1/bom/inquiry
     *
     * @access public
     * @return Response
     */
    public function submitInquiry()
    {
        $data = $this->request->post();

        $rules = [
            'project_name' => 'require',
            'contact_name' => 'require',
            'email' => 'require|email',
            'phone' => 'require',
            'items' => 'require|array',
        ];

        $validate = new \think\Validate($rules);
        if (!$validate->check($data)) {
            return $this->error($validate->getError(), 400);
        }

        try {
            Db::startTrans();

            $inquiry = new SkInquiry();
            $inquiry->project_name = $data['project_name'];
            $inquiry->company = $data['company'] ?? '';
            $inquiry->contact_name = $data['contact_name'];
            $inquiry->email = $data['email'];
            $inquiry->phone = $data['phone'];
            $inquiry->quantity = $data['quantity'] ?? '';
            $inquiry->lead_time = $data['lead_time'] ?? '';
            $inquiry->notes = $data['notes'] ?? '';
            $inquiry->status = 'pending';
            $inquiry->user_id = $this->request->userId ?? 0;
            $inquiry->save();

            $inquiryId = $inquiry->id;

            foreach ($data['items'] as $item) {
                $inquiryItem = new SkInquiryItem();
                $inquiryItem->inquiry_id = $inquiryId;
                $inquiryItem->model_id = (int)$item['model_id'];
                $inquiryItem->model_code = $item['model_code'] ?? '';
                $inquiryItem->quantity = (int)$item['quantity'];
                $inquiryItem->save();
            }

            Db::commit();

            Log::info("BOM询盘提交成功 inquiry_id={$inquiryId}");

            return $this->success([
                'inquiry_id' => $inquiryId,
            ], '询盘提交成功');
        } catch (\Exception $e) {
            Db::rollback();
            Log::error('BOM询盘提交失败: ' . $e->getMessage());
            return $this->error('提交失败', 500);
        }
    }

    /**
     * 上传 BOM 文件（Excel/CSV）
     * POST /api/v1/bom/upload
     *
     * @access public
     * @return Response
     */
    public function upload()
    {
        $file = $this->request->file('file');
        if (!$file) {
            return $this->error('请选择上传文件', 400);
        }

        // 验证文件大小（5MB）
        $maxSize = 5 * 1024 * 1024;
        if ($file->getSize() > $maxSize) {
            return $this->error('文件太大，最大限制为5MB', 400);
        }

        // 验证文件类型
        $allowedExts = ['csv', 'xlsx', 'xls'];
        $ext = strtolower($file->extension());
        if (!in_array($ext, $allowedExts)) {
            return $this->error('不支持的文件类型，仅限: csv, xlsx, xls', 400);
        }

        // 生成唯一文件名
        $saveName = md5(uniqid((string)rand(), true)) . '.' . $ext;
        $uploadPath = 'uploads/bom';
        $file->move($uploadPath, $saveName);

        $filePath = public_path() . $uploadPath . '/' . $saveName;

        try {
            $result = $this->parseBomFile($filePath);

            @unlink($filePath);

            // 多语言翻译 matched 中的 model_name / brand_name
            $lang = $this->getLangCode();
            if ($lang !== 'zh-CN' && !empty($result['matched'])) {
                $i18nService = app(\app\service\I18nService::class);
                $mIds = array_values(array_unique(array_column($result['matched'], 'model_id')));
                $bIds = array_values(array_unique(array_filter(array_column($result['matched'], 'brand_id'))));

                $modelTrans = !empty($mIds)
                    ? $i18nService->getTranslations('model', $mIds, $lang, ['model_name'])
                    : [];
                $brandTrans = !empty($bIds)
                    ? $i18nService->getTranslations('brand', $bIds, $lang, ['brand_name'])
                    : [];

                foreach ($result['matched'] as &$row) {
                    $mid = $row['model_id'] ?? 0;
                    if ($mid > 0 && isset($modelTrans[$mid]['model_name'])) {
                        $row['model_name'] = $modelTrans[$mid]['model_name'];
                    }
                    $bid = $row['brand_id'] ?? 0;
                    if ($bid > 0 && isset($brandTrans[$bid]['brand_name'])) {
                        $row['brand_name'] = $brandTrans[$bid]['brand_name'];
                    }
                    unset($row['brand_id']);
                }
                unset($row);
            } else {
                // 中文环境下也移除辅助字段
                foreach ($result['matched'] as &$row) {
                    unset($row['brand_id']);
                }
                unset($row);
            }

            return $this->success($result);
        } catch (\Exception $e) {
            @unlink($filePath);
            Log::error('BOM文件解析失败: ' . $e->getMessage());
            return $this->error('文件解析失败：' . $e->getMessage(), 500);
        }
    }

    /**
     * 解析 BOM 文件
     *
     * @access protected
     * @param string $filePath
     * @return array
     */
    protected function parseBomFile(string $filePath): array
    {
        $ext = pathinfo($filePath, PATHINFO_EXTENSION);

        if ($ext === 'csv') {
            return $this->parseCsvFile($filePath);
        } elseif (in_array($ext, ['xlsx', 'xls'])) {
            return $this->parseExcelFile($filePath);
        }

        throw new \Exception('不支持的文件格式');
    }

    /**
     * 解析 CSV 文件
     *
     * @access protected
     * @param string $filePath
     * @return array
     */
    protected function parseCsvFile(string $filePath): array
    {
        $matched = [];
        $unmatched = [];

        $handle = fopen($filePath, 'r');
        if (!$handle) {
            throw new \Exception('无法打开文件');
        }

        $headers = fgetcsv($handle);
        if (!$headers) {
            fclose($handle);
            throw new \Exception('文件内容为空');
        }

        $mpnIndex = -1;
        $quantityIndex = -1;

        foreach ($headers as $i => $header) {
            $header = trim(strtolower($header));
            if ($mpnIndex === -1 && (strpos($header, 'mpn') !== false || strpos($header, 'part') !== false)) {
                $mpnIndex = $i;
            }
            if ($mpnIndex === -1 && strpos($header, '型号') !== false && strpos($header, '描述') === false) {
                $mpnIndex = $i;
            }
            if ($quantityIndex === -1 && (strpos($header, '数量') !== false || strpos($header, 'qty') !== false || strpos($header, '用量') !== false)) {
                $quantityIndex = $i;
            }
        }

        if ($mpnIndex === -1) {
            fclose($handle);
            throw new \Exception('未找到型号列（MPN/型号/Part）');
        }

        $rowNum = 1;
        while (($row = fgetcsv($handle)) !== false) {
            $rowNum++;
            $mpn = trim($row[$mpnIndex] ?? '');
            if (empty($mpn)) {
                continue;
            }

            $quantity = $quantityIndex >= 0 ? ((int)$row[$quantityIndex] ?? 1) : 1;

            $model = $this->findModelByMpn($mpn);

            if ($model) {
                $qty = max(1, $quantity);
                $matched[] = [
                    'model_id' => $model->id,
                    'model_code' => $model->model_code,
                    'model_name' => $model->model_name,
                    'brand_id' => (int)($model->brand_id ?? 0),
                    'brand_name' => $this->resolveBrandName($model),
                    'quantity' => $qty,
                    'unit_price' => $this->getModelUnitPrice($model, $qty),
                    'stock' => (int)($model->stock ?? 0),
                ];
            } else {
                $unmatched[] = [
                    'row' => $rowNum,
                    'mpn' => $mpn,
                    'quantity' => $quantity,
                    'reason' => '未找到匹配型号',
                ];
            }
        }

        fclose($handle);

        return [
            'matched' => $matched,
            'unmatched' => $unmatched,
            'total' => count($matched) + count($unmatched),
        ];
    }

    /**
     * 按 MPN 查找型号（兼容 Active / 1 / 0 等多种 status 历史数据）
     *
     * @access protected
     * @param string $mpn
     * @return SkProductModel|null
     */
    protected function findModelByMpn(string $mpn)
    {
        $mpn = trim($mpn);
        if ($mpn === '') {
            return null;
        }

        // 优先精确匹配启用型号
        $model = SkProductModel::with(['series', 'brand'])
            ->where('model_code', $mpn)
            ->where(function ($q) {
                $q->whereIn('status', ['Active', 'active', '1', 1]);
            })
            ->find();

        if ($model) {
            return $model;
        }

        // 回退：不限状态（部分脏数据 status 为 0 但仍可展示）
        return SkProductModel::with(['series', 'brand'])
            ->where('model_code', $mpn)
            ->find();
    }

    /**
     * 解析 Excel 文件
     *
     * @access protected
     * @param string $filePath
     * @return array
     */
    protected function parseExcelFile(string $filePath): array
    {
        if (!class_exists('\PhpOffice\PhpSpreadsheet\IOFactory')) {
            throw new \Exception('未安装 PHPExcel/PhpSpreadsheet 扩展');
        }

        $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReaderForFile($filePath);
        $spreadsheet = $reader->load($filePath);
        $worksheet = $spreadsheet->getActiveSheet();

        $matched = [];
        $unmatched = [];

        $highestRow = $worksheet->getHighestRow();
        $highestColumn = $worksheet->getHighestColumn();

        $headers = [];
        for ($col = 'A'; $col <= $highestColumn; $col++) {
            $headers[] = trim(strtolower($worksheet->getCell($col . '1')->getValue() ?? ''));
        }

        $mpnIndex = -1;
        $quantityIndex = -1;

        foreach ($headers as $i => $header) {
            if ($mpnIndex === -1 && (strpos($header, 'mpn') !== false || strpos($header, 'part') !== false)) {
                $mpnIndex = $i;
            }
            if ($mpnIndex === -1 && strpos($header, '型号') !== false && strpos($header, '描述') === false) {
                $mpnIndex = $i;
            }
            if ($quantityIndex === -1 && (strpos($header, '数量') !== false || strpos($header, 'qty') !== false || strpos($header, '用量') !== false)) {
                $quantityIndex = $i;
            }
        }

        if ($mpnIndex === -1) {
            throw new \Exception('未找到型号列（MPN/型号/Part）');
        }

        for ($row = 2; $row <= $highestRow; $row++) {
            $colIndex = 0;
            $mpn = '';
            $quantity = 1;

            for ($col = 'A'; $col <= $highestColumn; $col++) {
                $value = trim($worksheet->getCell($col . $row)->getValue() ?? '');
                if ($colIndex === $mpnIndex) {
                    $mpn = $value;
                }
                if ($colIndex === $quantityIndex) {
                    $quantity = (int)$value;
                }
                $colIndex++;
            }

            if (empty($mpn)) {
                continue;
            }

            $model = $this->findModelByMpn($mpn);

            if ($model) {
                $qty = max(1, $quantity);
                $matched[] = [
                    'model_id' => $model->id,
                    'model_code' => $model->model_code,
                    'model_name' => $model->model_name,
                    'brand_id' => (int)($model->brand_id ?? 0),
                    'brand_name' => $this->resolveBrandName($model),
                    'quantity' => $qty,
                    'unit_price' => $this->getModelUnitPrice($model, $qty),
                    'stock' => (int)($model->stock ?? 0),
                ];
            } else {
                $unmatched[] = [
                    'row' => $row,
                    'mpn' => $mpn,
                    'quantity' => $quantity,
                    'reason' => '未找到匹配型号',
                ];
            }
        }

        return [
            'matched' => $matched,
            'unmatched' => $unmatched,
            'total' => count($matched) + count($unmatched),
        ];
    }

    /**
     * 获取用户 BOM 项目列表
     * GET /api/v1/bom/projects
     *
     * @access public
     * @return Response
     */
    public function getProjects()
    {
        $userId = $this->request->userId ?? 0;

        try {
            $projects = SkBomProject::where('user_id', $userId)
                ->order('create_time', 'desc')
                ->select();

            return $this->success($projects);
        } catch (\Exception $e) {
            Log::error('获取BOM项目失败: ' . $e->getMessage());
            return $this->error('获取失败', 500);
        }
    }

    /**
     * 获取单个 BOM 项目详情
     * GET /api/v1/bom/projects/:id
     *
     * @access public
     * @param int $id
     * @return Response
     */
    public function getProject($id)
    {
        $userId = $this->request->userId ?? 0;

        try {
            $project = SkBomProject::where('id', (int)$id)
                ->where('user_id', $userId)
                ->find();

            if (!$project) {
                return $this->error('项目不存在', 404);
            }

            $items = SkBomItem::where('project_id', (int)$id)->select();
            $project->items = $items;

            return $this->success($project);
        } catch (\Exception $e) {
            Log::error('获取BOM项目详情失败: ' . $e->getMessage());
            return $this->error('获取失败', 500);
        }
    }

    /**
     * 保存 BOM 项目
     * POST /api/v1/bom/projects
     *
     * @access public
     * @return Response
     */
    public function saveProject()
    {
        $userId = $this->request->userId ?? 0;
        $data = $this->request->post();

        if (empty($data['name'])) {
            return $this->error('请输入项目名称', 400);
        }

        try {
            Db::startTrans();

            $project = new SkBomProject();
            $project->user_id = $userId;
            $project->name = $data['name'];
            $project->total_quantity = $data['total_quantity'] ?? 0;
            $project->total_amount = $data['total_amount'] ?? 0;
            $project->save();

            $projectId = $project->id;

            if (!empty($data['items']) && is_array($data['items'])) {
                foreach ($data['items'] as $item) {
                    $bomItem = new SkBomItem();
                    $bomItem->project_id = $projectId;
                    $bomItem->model_id = (int)$item['model_id'];
                    $bomItem->model_code = $item['model_code'] ?? '';
                    $bomItem->model_name = $item['model_name'] ?? '';
                    $bomItem->brand_name = $item['brand_name'] ?? '';
                    $bomItem->quantity = (int)$item['quantity'];
                    $bomItem->unit_price = (float)$item['unit_price'];
                    $bomItem->stock = (int)$item['stock'];
                    $bomItem->save();
                }
            }

            Db::commit();

            return $this->success($project, '保存成功');
        } catch (\Exception $e) {
            Db::rollback();
            Log::error('保存BOM项目失败: ' . $e->getMessage());
            return $this->error('保存失败', 500);
        }
    }

    /**
     * 更新 BOM 项目
     * PUT /api/v1/bom/projects/:id
     *
     * @access public
     * @param int $id
     * @return Response
     */
    public function updateProject($id)
    {
        $userId = $this->request->userId ?? 0;
        $data = $this->request->put();

        try {
            $project = SkBomProject::where('id', (int)$id)
                ->where('user_id', $userId)
                ->find();

            if (!$project) {
                return $this->error('项目不存在', 404);
            }

            Db::startTrans();

            if (!empty($data['name'])) {
                $project->name = $data['name'];
            }
            if (isset($data['total_quantity'])) {
                $project->total_quantity = $data['total_quantity'];
            }
            if (isset($data['total_amount'])) {
                $project->total_amount = $data['total_amount'];
            }
            $project->save();

            if (!empty($data['items']) && is_array($data['items'])) {
                SkBomItem::where('project_id', (int)$id)->delete();

                foreach ($data['items'] as $item) {
                    $bomItem = new SkBomItem();
                    $bomItem->project_id = (int)$id;
                    $bomItem->model_id = (int)$item['model_id'];
                    $bomItem->model_code = $item['model_code'] ?? '';
                    $bomItem->model_name = $item['model_name'] ?? '';
                    $bomItem->brand_name = $item['brand_name'] ?? '';
                    $bomItem->quantity = (int)$item['quantity'];
                    $bomItem->unit_price = (float)$item['unit_price'];
                    $bomItem->stock = (int)$item['stock'];
                    $bomItem->save();
                }
            }

            Db::commit();

            return $this->success($project, '更新成功');
        } catch (\Exception $e) {
            Db::rollback();
            Log::error('更新BOM项目失败: ' . $e->getMessage());
            return $this->error('更新失败', 500);
        }
    }

    /**
     * 删除 BOM 项目
     * DELETE /api/v1/bom/projects/:id
     *
     * @access public
     * @param int $id
     * @return Response
     */
    public function deleteProject($id)
    {
        $userId = $this->request->userId ?? 0;

        try {
            $project = SkBomProject::where('id', (int)$id)
                ->where('user_id', $userId)
                ->find();

            if (!$project) {
                return $this->error('项目不存在', 404);
            }

            Db::startTrans();

            SkBomItem::where('project_id', (int)$id)->delete();
            $project->delete();

            Db::commit();

            return $this->success([], '删除成功');
        } catch (\Exception $e) {
            Db::rollback();
            Log::error('删除BOM项目失败: ' . $e->getMessage());
            return $this->error('删除失败', 500);
        }
    }
}
