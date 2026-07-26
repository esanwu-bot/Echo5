<?php
/**
 * 电子元器件商城 - 询盘模型
 * 文件说明：定义询盘数据表结构与关联关系。
 * 数据表：sk_inquiries
 */

namespace app\model;

use think\Model;

class SkInquiry extends Model
{
    protected $table = 'sk_inquiries';
    protected $autoWriteTimestamp = true;

    public function items()
    {
        return $this->hasMany(SkInquiryItem::class, 'inquiry_id');
    }
}
