<?php
/**
 * 电子元器件商城 - 分类属性接口
 * 文件说明：提供分类属性相关接口（获取分类下属性、筛选属性和必填属性），用于前端商品筛选与规格显示。
 */

namespace app\controller\api;

use app\controller\BaseController;
use app\model\SkCategoryAttribute;
use app\model\SkCategory;
use think\facade\Cache;

class CategoryAttributeController extends BaseController
{
    /**
     * 获取指定分类的属性
     */
    public function getCategoryAttributes($categoryId)
    {
        $lang = $this->request->lang ?? 'zh';
        $cacheKey = 'categoryAttribute_getCategoryAttributes_' . $categoryId . '_' . $lang;
        
        $attributes = Cache::remember($cacheKey, function() use ($categoryId) {
            $attributes = SkCategoryAttribute::with('attribute')
                                            ->where('category_id', $categoryId)
                                            ->order('sort_order', 'asc')
                                            ->select();
            
            // 格式化返回结果，确保 attribute 名称正确
            $attributes->each(function($item) {
                if ($item->attribute) {
                    // 处理 attribute 的 field_values
                    $fieldValues = $item->attribute->field_values;
                    if (!is_array($fieldValues)) {
                        $fieldValues = json_decode($fieldValues, true) ?: [];
                    }
                    
                    // 确保 attribute 有正确的名称
                    $attrName = $fieldValues['attr_name'] ?? $item->attribute->title ?? '未命名属性';
                    $item->attribute->name = $attrName;
                    $item->attribute->title = $attrName;
                }
            });
            
            return $attributes;
        }, 3600);
        
        return $this->success($attributes);
    }
    
    /**
     * 获取指定分类的可筛选属性
     */
    public function getFilterAttributes($categoryId)
    {
        $lang = $this->request->lang ?? 'zh';
        $cacheKey = 'categoryAttribute_getFilterAttributes_' . $categoryId . '_' . $lang;
        
        $attributes = Cache::remember($cacheKey, function() use ($categoryId) {
            $attributes = SkCategoryAttribute::with('attribute')
                                            ->where('category_id', $categoryId)
                                            ->where('is_filter', 1)
                                            ->order('sort_order', 'asc')
                                            ->select();
            
            // 格式化返回结果，确保 attribute 名称正确
            $attributes->each(function($item) {
                if ($item->attribute) {
                    // 处理 attribute 的 field_values
                    $fieldValues = $item->attribute->field_values;
                    if (!is_array($fieldValues)) {
                        $fieldValues = json_decode($fieldValues, true) ?: [];
                    }
                    
                    // 确保 attribute 有正确的名称
                    $attrName = $fieldValues['attr_name'] ?? $item->attribute->title ?? '未命名属性';
                    $item->attribute->name = $attrName;
                    $item->attribute->title = $attrName;
                }
            });
            
            return $attributes;
        }, 3600);
        
        return $this->success($attributes);
    }
    
    /**
     * 获取指定分类的必填属性
     */
    public function getRequiredAttributes($categoryId)
    {
        $lang = $this->request->lang ?? 'zh';
        $cacheKey = 'categoryAttribute_getRequiredAttributes_' . $categoryId . '_' . $lang;
        
        $attributes = Cache::remember($cacheKey, function() use ($categoryId) {
            $attributes = SkCategoryAttribute::with('attribute')
                                            ->where('category_id', $categoryId)
                                            ->where('is_required', 1)
                                            ->order('sort_order', 'asc')
                                            ->select();
            
            // 格式化返回结果，确保 attribute 名称正确
            $attributes->each(function($item) {
                if ($item->attribute) {
                    // 处理 attribute 的 field_values
                    $fieldValues = $item->attribute->field_values;
                    if (!is_array($fieldValues)) {
                        $fieldValues = json_decode($fieldValues, true) ?: [];
                    }
                    
                    // 确保 attribute 有正确的名称
                    $attrName = $fieldValues['attr_name'] ?? $item->attribute->title ?? '未命名属性';
                    $item->attribute->name = $attrName;
                    $item->attribute->title = $attrName;
                }
            });
            
            return $attributes;
        }, 3600);
        
        return $this->success($attributes);
    }
}