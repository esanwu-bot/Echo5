<?php
/**
 * 电子元器件商城 - BOM项目模型
 * 文件说明：定义BOM项目数据表结构与关联关系。
 * 数据表：sk_bom_projects
 */

namespace app\model;

use think\Model;

class SkBomProject extends Model
{
    protected $table = 'sk_bom_projects';
    protected $autoWriteTimestamp = true;

    public function items()
    {
        return $this->hasMany(SkBomItem::class, 'project_id');
    }
}
