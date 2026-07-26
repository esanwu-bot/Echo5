<?php
/**
 * 天启芯科技 - 语言类型服务
 * 对标 CRMEB LangTypeServices
 */
namespace app\service\system\lang;

use app\dao\system\lang\LangTypeDao;
use think\facade\Cache;

class LangTypeService
{
    protected $dao;

    public function __construct(LangTypeDao $dao)
    {
        $this->dao = $dao;
    }

    public function getDao(): LangTypeDao
    {
        return $this->dao;
    }

    /**
     * 语言类型列表
     */
    public function getList(array $where = []): array
    {
        [$page, $limit] = $this->dao->getPageValue();
        $list = $this->dao->selectList($where, '*', $page, $limit);
        $count = $this->dao->count($where);
        return compact('list', 'count');
    }

    /**
     * 全部启用语言（不分页）
     */
    public function getAllActive(): array
    {
        return $this->dao->getModel()
            ->where('status', 1)
            ->where('is_del', 0)
            ->select()
            ->toArray();
    }

    /**
     * 保存语言类型
     */
    public function save(array $data): bool
    {
        $id = $data['id'] ?? 0;
        
        if ($id) {
            $this->dao->update($id, $data);
        } else {
            unset($data['id']);
            $res = $this->dao->save($data);
            if ($res) {
                $id = $res->id;
                
                // 同步翻译码表：将中文(type_id=1)的词条复制到新语言
                /** @var LangCodeService $codeService */
                $codeService = app()->make(LangCodeService::class);
                $list = $codeService->getDao()->selectList(['type_id' => 1], '*', 1, 9999)->toArray();
                foreach ($list as &$item) {
                    unset($item['id']);
                    $item['type_id'] = $id;
                }
                if (!empty($list)) {
                    $codeService->getDao()->saveAll($list);
                }
            } else {
                throw new \Exception('保存失败');
            }
        }

        // 设置默认语言
        if (!empty($data['is_default']) && $data['is_default'] == 1) {
            $this->dao->updateByWhere([['id', '<>', $id]], ['is_default' => 0]);
        }
        
        $this->setDefaultLangName();
        $this->clearCache();
        return true;
    }

    /**
     * 修改状态
     */
    public function updateStatus(int $id, int $status): bool
    {
        $this->dao->update($id, ['status' => $status]);
        $this->setDefaultLangName();
        $this->clearCache();
        return true;
    }

    /**
     * 删除（软删除）
     */
    public function delete(int $id): bool
    {
        $this->dao->update($id, ['is_del' => 1]);
        
        // 解除关联的浏览器映射
        /** @var LangCountryService $countryService */
        $countryService = app()->make(LangCountryService::class);
        $countryService->getDao()->updateByWhere(['type_id' => $id], ['type_id' => 0]);
        
        // 删除关联的翻译词条
        /** @var LangCodeService $codeService */
        $codeService = app()->make(LangCodeService::class);
        $codeService->getDao()->delete(['type_id' => $id]);
        
        $this->setDefaultLangName();
        $this->clearCache();
        return true;
    }

    /**
     * 设置默认语言缓存
     */
    public function setDefaultLangName(): void
    {
        $fileName = $this->dao->value(['is_default' => 1, 'status' => 1, 'is_del' => 0], 'file_name');
        Cache::set('range_name', $fileName ?: 'zh-CN');
    }

    /**
     * 获取默认语言 file_name
     */
    public function getDefaultFileName(): string
    {
        return Cache::remember('range_name', function () {
            return $this->dao->value(['is_default' => 1, 'status' => 1, 'is_del' => 0], 'file_name') ?: 'zh-CN';
        }, 3600);
    }

    /**
     * 清除语言相关缓存
     */
    public function clearCache(): void
    {
        Cache::delete('range_name');
        Cache::delete('lang_type_data');
        Cache::delete('api_languages_active');
        Cache::delete('language_default');
    }
}
