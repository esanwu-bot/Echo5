<?php
/**
 * 天启芯科技 - 翻译词条管理 API（后台）
 * 数据源已切换为 sk_translation 表（业务动态翻译）
 */
namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkTranslation;
use app\model\system\lang\LangType;
use app\service\system\lang\LangCodeService;
use think\facade\Cache;

class LangCodeAdminController extends BaseController
{
    protected $service;

    public function __construct(\think\App $app, LangCodeService $service)
    {
        parent::__construct($app);
        $this->service = $service;
    }

    /**
     * 翻译词条列表（读取 sk_translation 表）
     * 获取语言代码列表 (GET /admin/lang_codes)
     */
    public function index()
    {
        try {
            $page       = (int)$this->request->get('page', 1);
            $limit      = (int)$this->request->get('limit', 10);
            $langCode   = $this->request->get('lang_code', '');
            $module     = $this->request->get('module', '');
            $businessId = $this->request->get('business_id', '');
            $search     = $this->request->get('remarks', '');

            $query = SkTranslation::order('id', 'desc');

            if (!empty($langCode)) {
                $query->where('lang_code', $langCode);
            }
            if (!empty($module)) {
                $query->where('module', $module);
            }
            if ($businessId !== '') {
                $query->where('business_id', (int)$businessId);
            }
            if (!empty($search)) {
                $like = '%' . $search . '%';
                $query->whereRaw('field LIKE ? OR trans_key LIKE ? OR trans_value LIKE ?', [$like, $like, $like]);
            }

            $count = $query->count();
            $list = $query->page($page, $limit)->select()->toArray();

            // 映射字段，兼容前端展示
            foreach ($list as &$item) {
                $item['remarks'] = $item['field'] . ' (' . ($item['module'] ?? '') . ')';
                $item['code'] = $item['module'] . ':' . $item['business_id'] . ':' . $item['field'];
                $item['lang_explain'] = $item['trans_value'];
                $item['language_name'] = $item['lang_code'];
                $item['is_admin'] = 1;
                $item['type_id'] = $this->getTypeIdByLangCode($item['lang_code']);
            }

            // 获取语言类型列表（复用已有方法）
            $langType = $this->getLangTypeOptions();

            // 获取可选模块列表
            $modules = SkTranslation::distinct(true)->field('module')->select()->toArray();
            $moduleOptions = [];
            foreach ($modules as $m) {
                if (!empty($m['module'])) {
                    $moduleOptions[] = $m['module'];
                }
            }

            // 获取可用语言列表（从 LangType 表读取，确保固定4种且含 ID）
            $langTypeList = LangType::where('status', 1)->where('is_del', 0)->column('file_name', 'id');
            $langCodeOptions = array_values(array_unique(array_filter($langTypeList)));

            return $this->success(compact('list', 'count', 'langType', 'moduleOptions', 'langCodeOptions'));
        } catch (\Exception $e) {
            $this->logError('获取翻译词条列表失败', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return $this->error('获取翻译词条列表失败: ' . $e->getMessage());
        }
    }

    /**
     * 获取语言类型选项（value 为 type_id，兼容前端）
     */
    protected function getLangTypeOptions(): array
    {
        $types = LangType::where('status', 1)->where('is_del', 0)->select()->toArray();
        $langType = [];
        foreach ($types as $item) {
            $langType[] = [
                'title' => $item['language_name'] . '(' . $item['file_name'] . ')',
                'value' => $item['id'],
            ];
        }
        return [
            'isAdmin' => [
                ['title' => '管理后台', 'value' => 1],
                ['title' => '用户前端', 'value' => 2],
            ],
            'langType' => $langType,
        ];
    }

    /**
     * lang_code → type_id 映射
     */
    protected function getTypeIdByLangCode(string $langCode): int
    {
        static $map = null;
        if ($map === null) {
            $map = LangType::where('status', 1)->where('is_del', 0)->column('id', 'file_name');
        }
        return $map[$langCode] ?? 0;
    }

    /**
     * 翻译词条详情（按code查所有语言翻译）
     * 获取语言代码详情 (GET /admin/lang_codes/info?code=xxx)
     */
    public function info()
    {
        try {
            $code = $this->request->param('code', '');
            if (empty($code)) return $this->error('参数错误');
            $parts = explode(':', $code);
            if (count($parts) < 3) return $this->error('参数格式错误');

            $query = SkTranslation::where('module', $parts[0])
                ->where('field', $parts[2]);
            if ($parts[1] === '' || $parts[1] === null) {
                $query->whereNull('business_id');
            } else {
                $query->where('business_id', (int)$parts[1]);
            }
            $list = $query->select()->toArray();

            foreach ($list as &$item) {
                $item['lang_explain']  = $item['trans_value'];
                $item['type_id']       = $this->getTypeIdByLangCode($item['lang_code']);
                $item['language_name'] = $item['lang_code'];
            }

            $remarks = $parts[2] . ' (' . $parts[0] . ')';
            $module = $parts[0];
            $business_id = $parts[1] === '' || $parts[1] === null ? null : (int)$parts[1];
            return $this->success(compact('list', 'code', 'remarks', 'module', 'business_id'));
        } catch (\Exception $e) {
            return $this->error($e->getMessage() ?: '获取翻译词条详情失败');
        }
    }

    /**
     * 新增/编辑翻译词条（直接写入 sk_translation 表）
     * 创建语言代码 (POST /admin/lang_codes)
     */
    public function save()
    {
        try {
            $data = $this->request->post();
            if (empty($data['remarks'])) return $this->error('备注标识不能为空');
            if (empty($data['list'])) return $this->error('翻译内容不能为空');

            $isEdit = $data['edit'] ?? 0;
            $field  = trim($data['remarks']);
            $module = !empty($data['module']) ? $data['module'] : 'ui';
            $businessId = (int)($data['business_id'] ?? 0);

            // 编辑模式：先删除旧记录
            if ($isEdit && !empty($data['code'])) {
                $parts = explode(':', $data['code']);
                if (count($parts) >= 3) {
                    $delQuery = SkTranslation::where('module', $parts[0])
                        ->where('field', $parts[2]);
                    if ($parts[1] === '' || $parts[1] === null) {
                        $delQuery->whereNull('business_id');
                    } else {
                        $delQuery->where('business_id', (int)$parts[1]);
                    }
                    $delQuery->delete();
                }
            }

            // type_id → lang_code 映射
            $langTypeMap = LangType::where('status', 1)->where('is_del', 0)->column('file_name', 'id');

            // 写入各语言版本
            foreach ($data['list'] as $item) {
                $typeId   = $item['type_id'] ?? 0;
                $langCode = $langTypeMap[$typeId] ?? '';
                $transValue = $item['lang_explain'] ?? '';
                if (empty($langCode)) continue;

                SkTranslation::create([
                    'lang_code'     => $langCode,
                    'trans_key'     => $field,
                    'trans_value'   => $transValue,
                    'module'        => $module,
                    'business_id'   => $businessId,
                    'field'         => $field,
                    'source_lang'   => 'zh-CN',
                    'is_translated' => empty($transValue) ? 0 : 1,
                ]);

                // 清除该语言翻译缓存
                Cache::delete('api_translations_' . $langCode);
            }

            return $this->success([], '翻译词条保存成功');
        } catch (\Exception $e) {
            return $this->error($e->getMessage() ?: '保存翻译词条失败');
        }
    }

    /**
     * 删除翻译词条（按code）
     * 删除语言代码 (DELETE /admin/lang_codes/:code)
     */
    public function delete($code)
    {
        try {
            if (empty($code)) return $this->error('参数错误');
            $parts = explode(':', $code);
            if (count($parts) >= 3) {
                $delQuery = SkTranslation::where('module', $parts[0])
                    ->where('field', $parts[2]);
                if ($parts[1] === '' || $parts[1] === null) {
                    $delQuery->whereNull('business_id');
                } else {
                    $delQuery->where('business_id', (int)$parts[1]);
                }
                $delQuery->delete();
            }
            // 清除所有语言翻译缓存
            $this->clearTranslationCache();
            return $this->success([], '翻译词条删除成功');
        } catch (\Exception $e) {
            return $this->error('删除翻译词条失败');
        }
    }

    /**
     * 按ID删除单条翻译
     * 根据ID删除语言代码 (DELETE /admin/lang_codes/id/:id)
     */
    public function deleteById($id)
    {
        try {
            $record = SkTranslation::find((int)$id);
            if ($record) {
                $record->delete();
                Cache::delete('api_translations_' . $record->lang_code);
            }
            return $this->success([], '翻译词条删除成功');
        } catch (\Exception $e) {
            return $this->error('删除翻译词条失败');
        }
    }

    /**
     * 清除所有语言翻译缓存
     */
    protected function clearTranslationCache(): void
    {
        $codes = ['zh-CN', 'en-US', 'ja-JP', 'ko-KR'];
        foreach ($codes as $code) {
            Cache::delete('api_translations_' . $code);
        }
    }

    /**
     * 批量删除翻译词条（按ID）
     */
    public function batchDelete()
    {
        try {
            $ids = $this->request->post('ids', []);
            if (empty($ids)) return $this->error('请选择要删除的词条');
            SkTranslation::destroy($ids);
            $this->clearTranslationCache();
            return $this->success([], '批量删除成功');
        } catch (\Exception $e) {
            return $this->error('批量删除失败');
        }
    }

    /**
     * 单文本机器翻译（火山引擎）
     * 翻译语言代码 (POST /admin/lang_codes/translate)
     */
    public function translate()
    {
        try {
            $text = $this->request->post('text', '');
            if (empty($text)) return $this->error('翻译文本不能为空');

            $result = $this->service->translateText($text);
            return $this->success($result, '翻译成功');
        } catch (\Exception $e) {
            return $this->error($e->getMessage() ?: '翻译失败');
        }
    }

    /**
     * 批量翻译（针对某个语言类型）
     * 批量翻译语言代码 (POST /admin/lang_codes/batch_translate)
     */
    public function batchTranslate()
    {
        try {
            $typeId = (int)$this->request->post('type_id', 0);
            $file = $this->request->post('file_name', '');

            if (!$typeId || !$file) return $this->error('参数错误');

            $this->service->batchTranslate($typeId, $file);
            return $this->success([], '批量翻译成功');
        } catch (\Exception $e) {
            return $this->error($e->getMessage() ?: '批量翻译失败');
        }
    }
}
