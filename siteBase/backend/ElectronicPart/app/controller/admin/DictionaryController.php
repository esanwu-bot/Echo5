<?php
namespace app\controller\admin;

use app\BaseController;
use app\model\DictionaryProject;
use app\model\DictionaryField;
use app\model\DictionaryData;
use think\facade\Db;
use think\exception\ValidateException;
use think\facade\Log;

class DictionaryController extends BaseController
{
    /**
     * 获取项目列表
     */
    public function getProjects()
    {
        $name = $this->request->param('name');
        $code = $this->request->param('code');
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 20);

        $where = [];
        if ($name) $where[] = ['name', 'like', "%{$name}%"];
        if ($code) $where[] = ['code', 'like', "%{$code}%"];

        $list = DictionaryProject::where($where)
            ->order('sort_order', 'desc')
            ->order('id', 'desc')
            ->paginate(['list_rows' => $limit, 'page' => $page]);

        return json(['code' => 200, 'msg' => 'success', 'data' => $list]);
    }

    /**
     * 获取单个项目详情（包含字段）
     */
    public function read($id)
    {
        $project = DictionaryProject::with(['fields' => function($query) {
            $query->order('sort_order', 'asc');
        }])->find($id);

        if (!$project) {
            return json(['code' => 404, 'msg' => '项目不存在']);
        }

        return json(['code' => 200, 'msg' => 'success', 'data' => $project]);
    }

    /**
     * 保存项目（新增/编辑）
     */
    public function saveProject()
    {
        $data = $this->request->post();
        
        // 验证数据
        $validate = new \app\validate\DictionaryProject();
        if (!$validate->check($data)) {
            return json(['code' => 400, 'msg' => $validate->getError()]);
        }

        Db::startTrans();
        try {
            if (empty($data['id'])) {
                // 新增
                $project = DictionaryProject::create($data);
            } else {
                // 编辑
                $project = DictionaryProject::find($data['id']);
                if (!$project) {
                    throw new \Exception('项目不存在');
                }
                $project->save($data);
            }

            // 处理字段
            if (isset($data['fields']) && is_array($data['fields'])) {
                $this->syncFields($project->id, $data['fields']);
            }

            Db::commit();
            return json(['code' => 200, 'msg' => '保存成功', 'data' => $project]);
        } catch (\Exception $e) {
            Db::rollback();
            return json(['code' => 500, 'msg' => $e->getMessage()]);
        }
    }

    /**
     * 同步字段
     */
    private function syncFields($projectId, $fields)
    {
        $keepIds = [];
        foreach ($fields as $fieldData) {
            $fieldData['project_id'] = $projectId;
            
            // 确保 type 字段正确映射 (兼容前端可能传 type 或 field_type)
            if (isset($fieldData['type']) && !isset($fieldData['field_type'])) {
                $fieldData['field_type'] = $fieldData['type'];
            }

            if (empty($fieldData['id'])) {
                // 新增字段
                $field = DictionaryField::create($fieldData);
                $keepIds[] = $field->id;
            } else {
                // 更新字段
                $field = DictionaryField::find($fieldData['id']);
                if ($field) {
                    $field->save($fieldData);
                    $keepIds[] = $field->id;
                }
            }
        }

        // 删除未保留的字段
        if (!empty($keepIds)) {
            DictionaryField::where('project_id', $projectId)
                ->whereNotIn('id', $keepIds)
                ->delete();
        } else {
             // 如果传入空数组，说明删除了所有字段
             DictionaryField::where('project_id', $projectId)->delete();
        }
    }

    /**
     * 删除项目
     */
    public function deleteProject($id)
    {
        $project = DictionaryProject::find($id);
        if (!$project) {
            return json(['code' => 404, 'msg' => '项目不存在']);
        }

        Db::startTrans();
        try {
            // 删除关联字段
            DictionaryField::where('project_id', $id)->delete();
            // 删除关联数据
            DictionaryData::where('project_id', $id)->delete();
            // 删除项目
            $project->delete();

            Db::commit();
            return json(['code' => 200, 'msg' => '删除成功']);
        } catch (\Exception $e) {
            Db::rollback();
            return json(['code' => 500, 'msg' => '删除失败']);
        }
    }

    /**
     * 批量删除字典项目
     */
    public function batchDeleteProject()
    {
        $ids = $this->request->post('ids', []);
        if (empty($ids) || !is_array($ids)) {
            return json(['code' => 400, 'msg' => '请选择要删除的项目']);
        }
        Db::startTrans();
        try {
            foreach ($ids as $id) {
                DictionaryField::where('project_id', $id)->delete();
                DictionaryData::where('project_id', $id)->delete();
                DictionaryProject::destroy($id);
            }
            Db::commit();
            return json(['code' => 200, 'msg' => '批量删除成功']);
        } catch (\Exception $e) {
            Db::rollback();
            return json(['code' => 500, 'msg' => '批量删除失败']);
        }
    }

    /**
     * 批量删除字典数据
     */
    public function batchDeleteData()
    {
        $ids = $this->request->post('ids', []);
        if (empty($ids) || !is_array($ids)) {
            return json(['code' => 400, 'msg' => '请选择要删除的数据']);
        }
        try {
            DictionaryData::destroy($ids);
            return json(['code' => 200, 'msg' => '批量删除成功']);
        } catch (\Exception $e) {
            return json(['code' => 500, 'msg' => '批量删除失败']);
        }
    }

    /**
     * 获取数据列表
     */
    public function getDataList()
    {
        $projectId = $this->request->param('project_id');
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 20);

        if (!$projectId) {
            return json(['code' => 400, 'msg' => '缺少项目ID']);
        }

        $list = DictionaryData::where('project_id', $projectId)
            ->order('sort_order', 'desc')
            ->order('id', 'desc')
            ->paginate(['list_rows' => $limit, 'page' => $page])
            ->each(function($item) {
                // field_values 已经是数组了（模型中应该有配置 json 类型转换），如果没有则手动转换
                if (is_string($item->field_values)) {
                    $item->field_values = json_decode($item->field_values, true);
                }
                return $item;
            });

        return json(['code' => 200, 'msg' => 'success', 'data' => $list]);
    }

    /**
     * 保存数据
     */
    public function saveData()
    {
        $data = $this->request->post();

        // 验证
        if (empty($data['project_id'])) {
            return json(['code' => 400, 'msg' => '缺少项目ID']);
        }

        // 确保 field_values 是 JSON
        if (isset($data['field_values']) && is_array($data['field_values'])) {
            $data['field_values'] = json_encode($data['field_values'], JSON_UNESCAPED_UNICODE);
        }

        try {
            if (empty($data['id'])) {
                $item = DictionaryData::create($data);
            } else {
                $item = DictionaryData::find($data['id']);
                if ($item) {
                    $item->save($data);
                }
            }

            // 同步多语言词条（以 title 字段为例）
            if ($item) {
                $this->syncDictionaryTranslation($item);
            }

            return json(['code' => 200, 'msg' => '保存成功']);
        } catch (\Exception $e) {
            return json(['code' => 500, 'msg' => $e->getMessage()]);
        }
    }

    /**
     * 同步字典数据的多语言词条到 sk_translation
     */
    private function syncDictionaryTranslation(DictionaryData $item): void
    {
        $fieldValues = [];
        if (!empty($item->field_values)) {
            $fieldValues = is_string($item->field_values)
                ? json_decode($item->field_values, true)
                : $item->field_values;
        }

        if (!is_array($fieldValues)) {
            return;
        }

        // 提取中文标题（兼容多种字段名）
        $title = '';
        if (!empty($fieldValues['title_cn'])) {
            $title = $fieldValues['title_cn'];
        } elseif (!empty($fieldValues['title'])) {
            $title = $fieldValues['title'];
        } elseif (!empty($fieldValues['中文标题'])) {
            $title = $fieldValues['中文标题'];
        }

        if (empty($title)) {
            return;
        }

        /** @var \app\service\I18nService $i18n */
        $i18n = app(\app\service\I18nService::class);
        $i18n->saveKey('dictionary_data', (int) $item->id, 'title', $title);
    }

    /**
     * 删除数据
     */
    public function deleteData($id)
    {
        if (DictionaryData::destroy($id)) {
            /** @var \app\service\I18nService $i18n */
            $i18n = app(\app\service\I18nService::class);
            $i18n->deleteByBusiness('dictionary_data', (int) $id);
            return json(['code' => 200, 'msg' => '删除成功']);
        }
        return json(['code' => 500, 'msg' => '删除失败']);
    }
    
    /**
     * 获取所有可用字段/属性
     */
    public function fields()
    {
        // 从 sk_attribute 表获取属性数据
        $fields = \app\model\SkAttribute::where('status', 1)
            ->order('sort_order', 'asc')
            ->order('id', 'asc')
            ->select();
        
        // 格式化返回数据，确保前端能正确显示属性名称
        $formattedFields = $fields->map(function($item) {
            return [
                'id' => $item->id,
                'name' => $item->name,
                'title' => $item->name,
                'code' => $item->code,
                'status' => $item->status
            ];
        });
        
        return json(['code' => 200, 'msg' => 'success', 'data' => $formattedFields]);
    }
}
