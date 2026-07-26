<?php
/**
 * 天启芯科技 - 浏览器语言映射服务
 * 对标 CRMEB LangCountryServices
 */
namespace app\service\system\lang;

use app\dao\system\lang\LangCountryDao;
use think\facade\Cache;

class LangCountryService
{
    protected $dao;

    public function __construct(LangCountryDao $dao)
    {
        $this->dao = $dao;
    }

    public function getDao(): LangCountryDao
    {
        return $this->dao;
    }

    /**
     * 地区语言映射列表
     */
    public function getList(array $where = []): array
    {
        [$page, $limit] = $this->dao->getPageValue();
        $list = $this->dao->selectList($where, '*', $page, $limit, 'id desc', [], true)->toArray();

        /** @var LangTypeService $typeService */
        $typeService = app()->make(LangTypeService::class);
        $typeList = $typeService->getAllActive();
        $typeMap = array_column($typeList, 'language_name', 'id');

        foreach ($list as &$item) {
            $item['link_lang'] = isset($typeMap[$item['type_id']])
                ? $typeMap[$item['type_id']]
                : '未关联';
        }

        $count = $this->dao->count($where);
        return compact('list', 'count');
    }

    /**
     * 保存地区映射
     */
    public function save(int $id, array $data): bool
    {
        if ($id) {
            $this->dao->update($id, $data);
        } else {
            if (!isset($data['status'])) {
                $data['status'] = 1;
            }
            $this->dao->save($data);
        }
        Cache::clear();
        return true;
    }

    /**
     * 删除地区映射
     */
    public function delete(int $id): bool
    {
        $this->dao->delete($id);
        Cache::clear();
        return true;
    }

    /**
     * 更新状态
     */
    public function updateStatus(int $id, int $status): bool
    {
        $this->dao->update($id, ['status' => $status]);
        Cache::clear();
        return true;
    }

    /**
     * 根据浏览器 Accept-Language 查找 type_id
     * 只返回已启用的映射（status=1）
     */
    public function getTypeIdByCode(string $code): int
    {
        $typeId = $this->dao->value(['code' => $code, 'status' => 1], 'type_id');
        return $typeId ?: 1; // 默认中文
    }
}
