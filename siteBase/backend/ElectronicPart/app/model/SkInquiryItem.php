<?php
/**
 * 电子元器件商城 - 询盘项目项模型
 * 文件说明：定义询盘项目项数据表结构与关联关系。
 * 数据表：sk_inquiry_items
 */

namespace app\model;

use think\Model;

class SkInquiryItem extends Model
{
    protected $table = 'sk_inquiry_items';
    protected $autoWriteTimestamp = true;

    public function inquiry()
    {
        return $this->belongsTo(SkInquiry::class, 'inquiry_id');
    }

    public function model()
    {
        return $this->belongsTo(SkProductModel::class, 'model_id');
    }
}
