<?php
/**
 * 电子元器件商城 - 语言管理（后台）
 * 文件说明：管理系统支持的语言（增删改查）、默认语言设置与缓存，用于后台国际化配置。
 */

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkLanguage;
use think\facade\Cache;
use think\facade\Db;
use think\facade\Log;

class LanguageAdminController extends BaseController
{
    /**
     * 获取所有语言（带分页）
     * 获取语言列表 (GET /admin/languages)
     */
    public function index()
    {
        try {
            $page = $this->request->param('page', 1);
            $limit = $this->request->param('limit', 10);
            $search = $this->request->param('search', '');
            
            $query = SkLanguage::order('is_default DESC, id ASC');
            
            // 按语言名称或代码搜索
            if (!empty($search)) {
                $query->where(function ($q) use ($search) {
                    $q->whereLike('lang_name', '%' . $search . '%')
                      ->whereOr('lang_code', 'like', '%' . $search . '%');
                });
            }
            
            $total = $query->count();
            $list = $query->page($page, $limit)->select();
            
            return $this->paginate($list, $total, $page, $limit);
            
        } catch (\Exception $e) {
            $this->logError('Get languages error: ' . $e->getMessage());
            return $this->error('获取语言列表失败');
        }
    }
    
    /**
     * 根据ID获取语言
     * 获取语言详情 (GET /admin/languages/:id)
     */
    public function read($id)
    {
        try {
            $language = SkLanguage::find($id);
            
            if (!$language) {
                return $this->error('语言不存在', 404);
            }
            
            return $this->success($language->toArray());
            
        } catch (\Exception $e) {
            $this->logError('Get language error: ' . $e->getMessage());
            return $this->error('获取语言详情失败');
        }
    }
    
    /**
     * 创建新语言
     * 创建语言 (POST /admin/languages)
     */
    public function save()
    {
        try {
            $data = $this->request->post();
            
            // 验证必填字段
            $this->validate($data, [
                'lang_code' => 'require|unique:sk_language',
                'lang_name' => 'require',
            ], [
                'lang_code.require' => '语言代码不能为空',
                'lang_code.unique' => '语言代码已存在',
                'lang_name.require' => '语言名称不能为空',
            ]);
            
            // 如果设为默认，则取消其他默认设置
            if (isset($data['is_default']) && $data['is_default'] == 1) {
                SkLanguage::where('is_default', 1)->update(['is_default' => 0]);
            }
            
            $language = SkLanguage::create([
                'lang_code' => $data['lang_code'],
                'lang_name' => $data['lang_name'],
                'is_default' => $data['is_default'] ?? 0,
                'status' => $data['status'] ?? 1,
            ]);
            
            // 清除缓存
            $this->clearLanguageCache();
            
            return $this->success($language->toArray(), '创建语言成功');
            
        } catch (\Exception $e) {
            $this->logError('Create language error: ' . $e->getMessage());
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 更新语言
     * 更新语言 (PUT /admin/languages/:id)
     */
    public function update($id)
    {
        try {
            $language = SkLanguage::find($id);
            
            if (!$language) {
                return $this->error('语言不存在', 404);
            }
            
            $data = $this->request->put();
            
            // 验证
            $this->validate($data, [
                'lang_code' => 'require|unique:sk_language,lang_code,' . $id,
                'lang_name' => 'require',
            ], [
                'lang_code.require' => '语言代码不能为空',
                'lang_code.unique' => '语言代码已存在',
                'lang_name.require' => '语言名称不能为空',
            ]);
            
            // 如果设为默认，则取消其他默认设置
            if (isset($data['is_default']) && $data['is_default'] == 1) {
                SkLanguage::where('is_default', 1)
                    ->where('id', '<>', $id)
                    ->update(['is_default' => 0]);
            }
            
            $language->save([
                'lang_code' => $data['lang_code'],
                'lang_name' => $data['lang_name'],
                'is_default' => $data['is_default'] ?? $language->is_default,
                'status' => $data['status'] ?? $language->status,
            ]);
            
            // 清除缓存
            $this->clearLanguageCache();
            
            return $this->success($language->toArray(), '更新语言成功');
            
        } catch (\Exception $e) {
            $this->logError('Update language error: ' . $e->getMessage());
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 删除语言
     * 删除语言 (DELETE /admin/languages/:id)
     */
    public function delete($id)
    {
        try {
            $language = SkLanguage::find($id);
            
            if (!$language) {
                return $this->error('语言不存在', 404);
            }
            
            // 不能删除默认语言
            if ($language->is_default == 1) {
                return $this->error('不能删除默认语言');
            }
            
            // 删除相关翻译
            Db::name('sk_translation')
                ->where('lang_code', $language->lang_code)
                ->delete();
            
            $language->delete();
            
            // 清除缓存
            $this->clearLanguageCache();
            
            return $this->success([], '删除语言成功');
            
        } catch (\Exception $e) {
            $this->logError('Delete language error: ' . $e->getMessage());
            return $this->error('删除语言失败');
        }
    }
    
    /**
     * 切换语言状态
     * 更新语言状态 (PUT /admin/languages/:id/status)
     */
    public function updateStatus($id)
    {
        try {
            $language = SkLanguage::find($id);
            
            if (!$language) {
                return $this->error('语言不存在', 404);
            }
            
            // 不能禁用默认语言
            if ($language->is_default == 1 && $language->status == 1) {
                return $this->error('不能禁用默认语言');
            }
            
            $language->status = $language->status == 1 ? 0 : 1;
            $language->save();
            
            // 清除缓存
            $this->clearLanguageCache();
            
            return $this->success($language->toArray(), '更新状态成功');
            
        } catch (\Exception $e) {
            $this->logError('Update language status error: ' . $e->getMessage());
            return $this->error('更新状态失败');
        }
    }
    
    /**
     * 设为默认语言
     * 设置默认语言 (PUT /admin/languages/:id/set-default)
     */
    public function setDefault($id)
    {
        try {
            $language = SkLanguage::find($id);
            
            if (!$language) {
                return $this->error('语言不存在', 404);
            }
            
            // 开启事务
            Db::startTrans();
            
            try {
                // 取消所有默认设置
                SkLanguage::where('is_default', 1)->update(['is_default' => 0]);
                
                // 设为默认并启用
                $language->is_default = 1;
                $language->status = 1;
                $language->save();
                
                Db::commit();
                
                // 清除缓存
                $this->clearLanguageCache();
                
                return $this->success($language->toArray(), '设置默认语言成功');
                
            } catch (\Exception $e) {
                Db::rollback();
                throw $e;
            }
            
        } catch (\Exception $e) {
            $this->logError('Set default language error: ' . $e->getMessage());
            return $this->error('设置默认语言失败');
        }
    }
    
    /**
     * 清除语言缓存
     */
    private function clearLanguageCache()
    {
        Cache::delete('api_languages_active');
        Cache::tag('languages')->clear();
    }
}
