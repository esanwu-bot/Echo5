<?php

namespace app\validate;

use think\Validate;

class SkApplication extends Validate
{
    protected $rule = [
        'title'       => 'require|max:200',
        'slug'        => 'require|max:100',
        'description' => 'max:500',
        'content'     => 'require',
        'cover_image' => 'max:500',
        'sort'        => 'integer|>=:0',
        'status'      => 'require|in:0,1',
    ];

    protected $message = [
        'title.require'       => '标题不能为空',
        'title.max'           => '标题最多200个字符',
        'slug.require'        => 'URL别名不能为空',
        'slug.max'            => 'URL别名最多100个字符',
        'description.max'     => '描述最多500个字符',
        'content.require'     => '内容不能为空',
        'cover_image.max'     => '封面图片路径最多500个字符',
        'sort.integer'        => '排序必须是整数',
        'sort.>='             => '排序必须大于等于0',
        'status.require'      => '状态不能为空',
        'status.in'           => '状态值必须是0或1',
    ];

    protected $scene = [
        'save'   => ['title', 'slug', 'description', 'content', 'cover_image', 'sort', 'status'],
        'update' => ['title', 'slug', 'description', 'content', 'cover_image', 'sort', 'status'],
    ];
}
