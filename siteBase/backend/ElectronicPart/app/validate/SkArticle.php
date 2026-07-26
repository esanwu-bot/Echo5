<?php
/**
 * 电子元器件商城 - 文章验证器
 * 文件说明：定义文章数据的验证规则、错误提示与验证场景。
 */

namespace app\validate;

use think\Validate;

class SkArticle extends Validate
{
    protected $rule = [
        'title'        => 'require|max:200',
        'category_id'  => 'integer',
        'summary'      => 'max:500',
        'content'      => 'require',
        'author'       => 'max:50',
        'cover_image'  => 'max:500',
        'status'       => 'require|in:0,1',
        'publish_time' => 'date',
    ];

    protected $message = [
        'title.require'       => '标题不能为空',
        'title.max'           => '标题最多200个字符',
        'category_id.integer' => '分类ID必须是整数',
        'summary.max'         => '摘要最多500个字符',
        'content.require'     => '内容不能为空',
        'author.max'          => '作者最多50个字符',
        'cover_image.max'     => '封面图片路径最多500个字符',
        'status.require'      => '状态不能为空',
        'status.in'           => '状态值必须是0或1',
        'publish_time.date'   => '发布时间格式不正确',
    ];

    protected $scene = [
        'save'   => ['title', 'category_id', 'summary', 'content', 'author', 'cover_image', 'status', 'publish_time'],
        'update' => ['title', 'category_id', 'summary', 'content', 'author', 'cover_image', 'status', 'publish_time'],
    ];
}
