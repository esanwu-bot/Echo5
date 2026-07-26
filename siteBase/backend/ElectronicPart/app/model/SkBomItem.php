<?php
/**
 * 电子元器件商城 - BOM项目项模型
 * 文件说明：定义BOM项目项数据表结构与关联关系。
 * 数据表：sk_bom_items
 */

namespace app\model;

use think\Model;

class SkBomItem extends Model
{
    protected $table = 'sk_bom_items';
    protected $autoWriteTimestamp = true;

    public function project()
    {
        return $this->belongsTo(SkBomProject::class, 'project_id');
    }

    public function model()
    {
        return $this->belongsTo(SkProductModel::class, 'model_id');
    }
}
