<?php

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkAttribute;
use think\exception\ValidateException;
use think\facade\Validate;
use think\facade\Log;

class AttributeController extends BaseController
{
    /**
     * 获取属性列表
     */
    public function index()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 10;
        $keyword = $params['keyword'] ?? '';
        $status = $params['status'] ?? '';
        
        $query = SkAttribute::order('sort_order', 'asc')
                           ->order('id', 'desc');
        
        // 按关键词搜索
        if (!empty($keyword)) {
            $query->where(function($q) use ($keyword) {
                $q->whereLike('name', "%{$keyword}%")
                  ->whereOr('code', 'like', "%{$keyword}%");
            });
        }
        
        // 按状态筛选
        if ($status !== '') {
            $query->where('status', $status);
        }
        
        $total = $query->count();
        $list = $query->page($page, $limit)->select();
        
        return $this->paginate($list, $total, $page, $limit);
    }
    
    /**
     * 根据ID获取单个属性
     */
    public function read($id)
    {
        $attribute = SkAttribute::find($id);
        
        if (!$attribute) {
            return $this->error('属性不存在');
        }
        
        return $this->success($attribute);
    }
    
    /**
     * 创建新属性
     */
    public function save()
    {
        try {
            $data = $this->request->param();
            
            // 验证数据
            $validate = Validate::rule([
                'name' => 'require|max:100',
                'code' => 'require|max:50|unique:sk_attribute',
                'type' => 'require|in:text,number,select,checkbox,range',
                'data_type' => 'require|in:string,number,boolean',
                'unit' => 'max:20',
                'is_system' => 'in:0,1',
                'status' => 'in:0,1',
                'sort_order' => 'integer|egt:0'
            ]);
            
            if (!$validate->check($data)) {
                return $this->error($validate->getError());
            }
            
            // 设置默认值
            $data['is_system'] = $data['is_system'] ?? 0;
            $data['status'] = $data['status'] ?? 1;
            $data['sort_order'] = $data['sort_order'] ?? 0;
            
            // 处理选项字段
            if (isset($data['options']) && is_string($data['options'])) {
                // 将逗号分隔的字符串转换为数组
                $data['options'] = array_filter(array_map('trim', explode(',', $data['options'])));
            }
            
            $attribute = SkAttribute::create($data);
            
            return $this->success($attribute, '属性创建成功');
            
        } catch (ValidateException $e) {
            return $this->error($e->getMessage());
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 更新属性
     */
    public function update($id)
    {
        try {
            $attribute = SkAttribute::find($id);
            
            if (!$attribute) {
                return $this->error('属性不存在');
            }
            
            // 允许编辑系统属性，但特定字段受下方保护
            
            $data = $this->request->param();
            
            // 验证数据
            $validate = Validate::rule([
                'name' => 'max:100',
                'code' => 'max:50|unique:sk_attribute,code,' . $id,
                'type' => 'in:text,number,select,checkbox,range',
                'data_type' => 'in:string,number,boolean',
                'unit' => 'max:20',
                'status' => 'in:0,1',
                'sort_order' => 'integer|egt:0'
            ]);
            
            if (!$validate->check($data)) {
                return $this->error($validate->getError());
            }
            
            // 处理选项字段
            if (isset($data['options']) && is_string($data['options'])) {
                // 将逗号分隔的字符串转换为数组
                $data['options'] = array_filter(array_map('trim', explode(',', $data['options'])));
            }
            
            // 不允许修改is_system标识
            unset($data['is_system']);
            
            $attribute->save($data);
            
            return $this->success($attribute, '属性更新成功');
            
        } catch (ValidateException $e) {
            return $this->error($e->getMessage());
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 批量删除属性
     */
    public function batchDelete()
    {
        try {
            $ids = $this->request->post('ids', []);
            if (empty($ids) || !is_array($ids)) {
                return $this->error('请选择要删除的属性');
            }
            $failed = [];
            $deleted = 0;
            $categoryModel = \app\model\SkCategoryAttribute::class;
            $productAttrModel = \app\model\SkProductAttribute::class;
            foreach ($ids as $id) {
                $attr = SkAttribute::find($id);
                if (!$attr) continue;
                if ($attr->is_system == 1) { $failed[] = "属性 {$attr->name} 是系统属性"; continue; }
                if ($categoryModel::where('attribute_id', $id)->count() > 0) { $failed[] = "属性 {$attr->name} 被分类使用"; continue; }
                if ($productAttrModel::where('attribute_id', $id)->count() > 0) { $failed[] = "属性 {$attr->name} 被产品使用"; continue; }
                $attr->delete();
                $deleted++;
            }
            $msg = "成功删除 {$deleted} 个属性";
            if (!empty($failed)) $msg .= '，' . count($failed) . ' 个失败: ' . implode('; ', $failed);
            return $this->success(null, $msg);
        } catch (\Exception $e) {
            Log::error('Batch delete error: ' . $e->getMessage());
            return $this->error('批量删除失败');
        }
    }

    /**
     * 删除属性
     */
    public function delete($id)
    {
        try {
            $attribute = SkAttribute::find($id);
            
            if (!$attribute) {
                return $this->error('属性不存在');
            }
            
            // 禁止删除系统属性
            if ($attribute->is_system == 1) {
                return $this->error('系统属性不能删除');
            }
            
            // 检查属性是否被任何分类使用
            $categoryCount = \app\model\SkCategoryAttribute::where('attribute_id', $id)->count();
            if ($categoryCount > 0) {
                return $this->error('该属性正在被 ' . $categoryCount . ' 个分类使用，无法删除');
            }
            
            // 检查属性是否被任何商品使用
            $productCount = \app\model\SkProductAttribute::where('attribute_id', $id)->count();
            if ($productCount > 0) {
                return $this->error('该属性正在被 ' . $productCount . ' 个产品使用，无法删除');
            }
            
            $attribute->delete();
            
            return $this->success(null, '属性删除成功');
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}
