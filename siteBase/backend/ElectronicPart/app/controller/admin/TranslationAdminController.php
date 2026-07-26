<?php

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkTranslation;
use app\model\SkLanguage;
use app\service\GoogleTranslateService;
use think\facade\Cache;
use think\facade\Db;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\IOFactory;
use think\facade\Log;

class TranslationAdminController extends BaseController
{
    /**
     * 获取所有翻译（带分页和筛选）
     * 获取翻译列表 (GET /admin/translations)
     */
    public function index()
    {
        try {
            $page = $this->request->param('page', 1);
            $limit = $this->request->param('limit', 10);
            $langCode = $this->request->param('lang_code', '');
            $module = $this->request->param('module', '');
            $search = $this->request->param('search', '');
            
            $query = SkTranslation::order('id DESC');
            
            // 按语言代码筛选
            if (!empty($langCode)) {
                $query->where('lang_code', $langCode);
            }
            
            // 按模块筛选
            if (!empty($module)) {
                $query->where('module', $module);
            }
            
            // 按键或值搜索
            if (!empty($search)) {
                $query->where(function ($q) use ($search) {
                    $q->whereLike('trans_key', '%' . $search . '%')
                      ->whereOr('trans_value', 'like', '%' . $search . '%');
                });
            }
            
            $total = $query->count();
            $list = $query->page($page, $limit)->select();
            
            return $this->paginate($list, $total, $page, $limit);
            
        } catch (\Exception $e) {
            $this->logError('Get translations error: ' . $e->getMessage());
            return $this->error('获取翻译列表失败');
        }
    }
    
    /**
     * 根据ID获取翻译
     * 获取翻译详情 (GET /admin/translations/:id)
     */
    public function read($id)
    {
        try {
            $translation = SkTranslation::find($id);
            
            if (!$translation) {
                return $this->error('翻译不存在', 404);
            }
            
            return $this->success($translation->toArray());
            
        } catch (\Exception $e) {
            $this->logError('Get translation error: ' . $e->getMessage());
            return $this->error('获取翻译详情失败');
        }
    }
    
    /**
     * 创建新翻译
     * 创建翻译 (POST /admin/translations)
     */
    public function save()
    {
        try {
            $data = $this->request->post();
            
            // 验证必填字段
            $this->validate($data, [
                'lang_code' => 'require',
                'trans_key' => 'require',
                'trans_value' => 'require',
            ], [
                'lang_code.require' => '语言代码不能为空',
                'trans_key.require' => '翻译键不能为空',
                'trans_value.require' => '翻译值不能为空',
            ]);
            
            // 检查语言是否存在
            $language = SkLanguage::where('lang_code', $data['lang_code'])->find();
            if (!$language) {
                return $this->error('语言不存在');
            }
            
            // 检查同一语言和模块下是否存在重复键
            $exists = SkTranslation::where('lang_code', $data['lang_code'])
                ->where('trans_key', $data['trans_key'])
                ->where('module', $data['module'] ?? '')
                ->find();
                
            if ($exists) {
                return $this->error('该翻译键已存在');
            }
            
            $translation = SkTranslation::create([
                'lang_code' => $data['lang_code'],
                'trans_key' => $data['trans_key'],
                'trans_value' => $data['trans_value'],
                'module' => $data['module'] ?? '',
            ]);
            
            // 清除缓存
            $this->clearTranslationCache($data['lang_code']);
            
            return $this->success($translation->toArray(), '创建翻译成功');
            
        } catch (\Exception $e) {
            $this->logError('Create translation error: ' . $e->getMessage());
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 更新翻译
     * 更新翻译 (PUT /admin/translations/:id)
     */
    public function update($id)
    {
        try {
            $translation = SkTranslation::find($id);
            
            if (!$translation) {
                return $this->error('翻译不存在', 404);
            }
            
            $data = $this->request->put();
            
            // 验证
            $this->validate($data, [
                'trans_value' => 'require',
            ], [
                'trans_value.require' => '翻译值不能为空',
            ]);
            
            $oldLangCode = $translation->lang_code;
            
            $translation->save([
                'trans_value' => $data['trans_value'],
                'module' => $data['module'] ?? $translation->module,
            ]);
            
            // 清除缓存
            $this->clearTranslationCache($oldLangCode);
            
            return $this->success($translation->toArray(), '更新翻译成功');
            
        } catch (\Exception $e) {
            $this->logError('Update translation error: ' . $e->getMessage());
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 删除翻译
     * 删除翻译 (DELETE /admin/translations/:id)
     */
    public function delete($id)
    {
        try {
            $translation = SkTranslation::find($id);

            if (!$translation) {
                return $this->error('翻译不存在', 404);
            }

            $langCode = $translation->lang_code;
            SkTranslation::where('id', $id)->delete();

            // 清除缓存
            $this->clearTranslationCache($langCode);

            return $this->success([], '删除翻译成功');

        } catch (\Exception $e) {
            $this->logError('Delete translation error: ' . $e->getMessage());
            return $this->error('删除翻译失败');
        }
    }
    
    /**
     * 批量删除翻译
     */
    public function batchDelete()
    {
        try {
            $ids = $this->request->post('ids', []);
            if (empty($ids) || !is_array($ids)) {
                return $this->error('请选择要删除的翻译');
            }
            SkTranslation::whereIn('id', $ids)->delete();
            Cache::tag('translations')->clear();
            return $this->success(null, '批量删除成功');
        } catch (\Exception $e) {
            Log::error('Batch delete error: ' . $e->getMessage());
            return $this->error('批量删除失败');
        }
    }

    /**
     * 使用Google翻译API自动翻译
     * 自动翻译 (POST /admin/translations/auto-translate)
     */
    public function autoTranslate()
    {
        try {
            $data = $this->request->post();
            
            // 验证
            $this->validate($data, [
                'text' => 'require',
                'target_lang' => 'require',
            ], [
                'text.require' => '翻译文本不能为空',
                'target_lang.require' => '目标语言不能为空',
            ]);
            
            $translateService = new GoogleTranslateService();
            $result = $translateService->translate(
                $data['text'],
                $data['target_lang'],
                $data['source_lang'] ?? null
            );
            
            return $this->success([
                'original' => $data['text'],
                'translated' => $result['text'],
                'source_lang' => $result['source'],
                'target_lang' => $data['target_lang'],
            ], '翻译成功');
            
        } catch (\Exception $e) {
            $this->logError('Auto translate error: ' . $e->getMessage());
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 批量从Excel/CSV导入翻译
     * 批量导入翻译 (POST /admin/translations/batch-import)
     */
    public function batchImport()
    {
        try {
            $file = $this->request->file('file');
            
            if (!$file) {
                return $this->error('请上传文件');
            }
            
            // 加载电子表格
            $spreadsheet = IOFactory::load($file->getPathname());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();
            
            // 跳过表头行
            array_shift($rows);
            
            $imported = 0;
            $errors = [];
            
            Db::startTrans();
            
            try {
                foreach ($rows as $index => $row) {
                    // 期望列：lang_code, trans_key, trans_value, module
                    if (count($row) < 3) {
                        $errors[] = "行 " . ($index + 2) . ": 数据不完整";
                        continue;
                    }
                    
                    $langCode = trim($row[0]);
                    $transKey = trim($row[1]);
                    $transValue = trim($row[2]);
                    $module = isset($row[3]) ? trim($row[3]) : '';
                    
                    if (empty($langCode) || empty($transKey) || empty($transValue)) {
                        $errors[] = "行 " . ($index + 2) . ": 必填字段为空";
                        continue;
                    }
                    
                    // 检查语言是否存在
                    $language = SkLanguage::where('lang_code', $langCode)->find();
                    if (!$language) {
                        $errors[] = "行 " . ($index + 2) . ": 语言代码 {$langCode} 不存在";
                        continue;
                    }
                    
                    // 更新或创建
                    $translation = SkTranslation::where('lang_code', $langCode)
                        ->where('trans_key', $transKey)
                        ->where('module', $module)
                        ->find();
                    
                    if ($translation) {
                        $translation->trans_value = $transValue;
                        $translation->save();
                    } else {
                        SkTranslation::create([
                            'lang_code' => $langCode,
                            'trans_key' => $transKey,
                            'trans_value' => $transValue,
                            'module' => $module,
                        ]);
                    }
                    
                    $imported++;
                }
                
                Db::commit();
                
                // 清除所有翻译缓存
                Cache::tag('translations')->clear();
                
                return $this->success([
                    'imported' => $imported,
                    'errors' => $errors,
                ], "成功导入 {$imported} 条翻译");
                
            } catch (\Exception $e) {
                Db::rollback();
                throw $e;
            }
            
        } catch (\Exception $e) {
            $this->logError('Batch import error: ' . $e->getMessage());
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 导出翻译到Excel
     * 导出翻译 (GET /admin/translations/export)
     */
    public function export()
    {
        try {
            $langCode = $this->request->param('lang_code', '');
            $module = $this->request->param('module', '');
            
            $query = SkTranslation::order('lang_code ASC, trans_key ASC');
            
            if (!empty($langCode)) {
                $query->where('lang_code', $langCode);
            }
            
            if (!empty($module)) {
                $query->where('module', $module);
            }
            
            $translations = $query->select()->toArray();
            
            // 创建电子表格
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            
            // 设置表头
            $sheet->setCellValue('A1', '语言代码');
            $sheet->setCellValue('B1', '翻译键');
            $sheet->setCellValue('C1', '翻译值');
            $sheet->setCellValue('D1', '模块');
            
            // 添加数据
            $row = 2;
            foreach ($translations as $translation) {
                $sheet->setCellValue('A' . $row, $translation['lang_code']);
                $sheet->setCellValue('B' . $row, $translation['trans_key']);
                $sheet->setCellValue('C' . $row, $translation['trans_value']);
                $sheet->setCellValue('D' . $row, $translation['module']);
                $row++;
            }
            
            // 创建写入器
            $writer = new Xlsx($spreadsheet);
            $filename = 'translations_' . date('YmdHis') . '.xlsx';
            $filepath = runtime_path() . 'temp/' . $filename;
            
            // 如果临时目录不存在则创建
            if (!is_dir(runtime_path() . 'temp/')) {
                mkdir(runtime_path() . 'temp/', 0755, true);
            }
            
            $writer->save($filepath);
            
            // 下载文件并在下载后删除
            $response = download($filepath, $filename);
            
            // 发送响应后删除文件
            register_shutdown_function(function() use ($filepath) {
                if (file_exists($filepath)) {
                    unlink($filepath);
                }
            });
            
            return $response;
            
        } catch (\Exception $e) {
            $this->logError('Export translations error: ' . $e->getMessage());
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 清除翻译缓存
     */
    private function clearTranslationCache($langCode)
    {
        Cache::delete('api_translations_' . $langCode);
        Cache::tag('translations')->clear();
    }
}
