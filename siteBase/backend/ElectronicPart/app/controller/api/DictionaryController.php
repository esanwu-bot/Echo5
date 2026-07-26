<?php
/**
 * 电子元器件商城 - 字典/自定义数据项目接口
 * 文件说明：提供可配置的数据字典项目（如规格、用途、配置项）的管理与查询功能。
 */
declare(strict_types=1);

namespace app\controller\api;

use app\BaseController;
use app\model\DictionaryProject;
use app\model\DictionaryField;
use app\model\DictionaryData;
use app\model\DictionaryFieldOption;
use think\facade\Db;
use think\exception\ValidateException;
use think\facade\Log;

/**
 * 字典数据API控制器
 * @package app\controller\api
 */
class DictionaryController extends BaseController
{
    /**
     * 获取项目列表
     */
    public function getProjects()
    {
        try {
            $params = $this->request->param();
            $list = DictionaryProject::getList($params);
            
            return $this->success($list, 'success');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 获取项目详情
     */
    public function getProject($id)
    {
        try {
            $project = DictionaryProject::find($id);
            if (!$project) {
                return $this->error('项目不存在', 404);
            }
            
            // 加载字段和选项
            $project->fields->load('options');
            
            return $this->success($project, 'success');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 根据代码获取项目
     */
    public function getProjectByCode($code)
    {
        try {
            $project = DictionaryProject::getByCode($code);
            if (!$project) {
                return $this->error('项目不存在', 404);
            }
            
            // 加载字段和选项
            $project->fields->load('options');
            
            return $this->success($project, 'success');
        } catch (\Exception $e) {Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 创建项目
     */
    public function createProject()
    {
        try {
            $data = $this->request->param();
            
            // 验证数据
            $validate = validate('DictionaryProject');
            if (!$validate->check($data)) {
                throw new ValidateException($validate->getError());
            }
            
            // 检查代码是否重复
            $exists = DictionaryProject::where('code', $data['code'])->find();
            if ($exists) {
                throw new ValidateException('项目代码已存在');
            }
            
            $project = DictionaryProject::create($data);
            
            return $this->success($project, '创建成功');
        } catch (ValidateException $e) {
            return json([
                'code' => 400,
                'message' => $e->getMessage()
            ]);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 更新项目
     */
    public function updateProject($id)
    {
        try {
            $data = $this->request->param();

            $project = DictionaryProject::find($id);
            if (!$project) {
                return $this->error('项目不存在', 404);
            }
            
            // 验证数据
            $validate = validate('DictionaryProject');
            if (!$validate->scene('update')->check($data)) {
                throw new ValidateException($validate->getError());
            }
            
            // 检查代码是否重复（排除自己）
            if (isset($data['code']) && $data['code'] !== $project->code) {
                $exists = DictionaryProject::where('code', $data['code'])
                    ->where('id', '<>', $id)
                    ->find();
                if ($exists) {
                    throw new ValidateException('项目代码已存在');
                }
            }
            
            $project->save($data);
            
            return $this->success($project, '更新成功');
        } catch (ValidateException $e) {
            return json([
                'code' => 400,
                'message' => $e->getMessage()
            ]);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 删除项目
     */
    public function deleteProject($id)
    {
        try {
            $project = DictionaryProject::find($id);
            if (!$project) {
                return $this->error('项目不存在', 404);
            }
            
            // 检查是否有数据
            $dataCount = DictionaryData::where('project_id', $id)->count();
            if ($dataCount > 0) {
                throw new ValidateException('项目下有数据，无法删除');
            }
            
            // 删除字段和选项
            Db::transaction(function () use ($id) {
                // 获取字段ID
                $fieldIds = DictionaryField::where('project_id', $id)->column('id');
                
                // 删除选项
                if (!empty($fieldIds)) {
                    DictionaryFieldOption::whereIn('field_id', $fieldIds)->delete();
                }
                
                // 删除字段
                DictionaryField::where('project_id', $id)->delete();
                
                // 删除项目
                DictionaryProject::destroy($id);
            });
            
            return $this->success([], '删除成功');
        } catch (ValidateException $e) {
            return json([
                'code' => 400,
                'message' => $e->getMessage()
            ]);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取数据列表
     */
    public function getDataList($projectId)
    {
        try {
            $params = $this->request->param();
            $list = DictionaryData::getList($projectId, $params);
            
            // 获取字段信息用于显示
            $fields = DictionaryField::getList($projectId);
            $fieldMap = [];
            foreach ($fields as $field) {
                $fieldMap[$field->code] = $field;
            }
            
            return $this->success([
                    'list' => $list,
                    'fields' => $fields
                ], 'success');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 获取数据详情
     */
    public function getData($id)
    {
        try {
            $data = DictionaryData::find($id);
            if (!$data) {
                return $this->error('数据不存在', 404);
            }
            
            return $this->success($data, 'success');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 创建数据
     */
    public function createData($projectId)
    {
        try {
            $data = $this->request->param();
            
            // 验证数据
            $validateResult = DictionaryData::validateData($projectId, $data);
            if ($validateResult !== true) {
                return json([
                    'code' => 400,
                    'message' => '数据验证失败',
                    'errors' => $validateResult
                ]);
            }
            
            // 检查代码是否重复
            $exists = DictionaryData::getByCode($projectId, $data['code']);
            if ($exists) {
                throw new ValidateException('数据代码已存在');
            }
            
            // 格式化字段值
            $fieldValues = DictionaryData::formatFieldValues($projectId, $data);
            
            $dictionaryData = DictionaryData::create([
                'project_id' => $projectId,
                'title' => $data['title'],
                'code' => $data['code'],
                'field_values' => $fieldValues,
                'sort_order' => $data['sort_order'] ?? 0,
                'status' => $data['status'] ?? 1
            ]);
            
            return $this->success($dictionaryData, '创建成功');
        } catch (ValidateException $e) {
            return json([
                'code' => 400,
                'message' => $e->getMessage()
            ]);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 更新数据
     */
    public function updateData($id)
    {
        try {
            $data = $this->request->param();
            
            $dictionaryData = DictionaryData::find($id);
            if (!$dictionaryData) {
                return $this->error('数据不存在', 404);
            }
            
            // 验证数据
            $validateResult = DictionaryData::validateData($dictionaryData->project_id, $data);
            if ($validateResult !== true) {
                return json([
                    'code' => 400,
                    'message' => '数据验证失败',
                    'errors' => $validateResult
                ]);
            }
            
            // 检查代码是否重复（排除自己）
            if (isset($data['code']) && $data['code'] !== $dictionaryData->code) {
                $exists = DictionaryData::getByCode($dictionaryData->project_id, $data['code']);
                if ($exists) {
                    throw new ValidateException('数据代码已存在');
                }
            }
            
            // 格式化字段值
            $fieldValues = DictionaryData::formatFieldValues($dictionaryData->project_id, $data);
            
            $dictionaryData->save([
                'title' => $data['title'],
                'code' => $data['code'],
                'field_values' => $fieldValues,
                'sort_order' => $data['sort_order'] ?? $dictionaryData->sort_order,
                'status' => $data['status'] ?? $dictionaryData->status
            ]);
            
            return $this->success($dictionaryData, '更新成功');
        } catch (ValidateException $e) {
            return json([
                'code' => 400,
                'message' => $e->getMessage()
            ]);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 删除数据
     */
    public function deleteData($id)
    {
        try {
            $data = DictionaryData::find($id);
            if (!$data) {
                return $this->error('数据不存在', 404);
            }
            
            $data->delete();
            
            return $this->success([], '删除成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 获取字段类型列表
     */
    public function getFieldTypes()
    {
        try {
            $types = DictionaryField::getFieldTypes();
            
            return $this->success($types, 'success');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 获取数据类型列表
     */
    public function getDataTypes()
    {
        try {
            $types = DictionaryField::getDataTypes();
            
            return $this->success($types, 'success');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}