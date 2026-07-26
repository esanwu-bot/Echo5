<?php
/**
 * 电子元器件商城 - 横幅验证器
 * 文件说明：定义横幅数据的验证规则、错误提示与验证场景。
 */

namespace app\validate;

use think\Validate;

class SkBanner extends Validate
{
    protected $rule = [
        'title'    => 'require|max:200',
        'position' => 'require|max:50',
        'image'    => 'require',
        'link'     => 'max:500',
        'sort'     => 'integer|>=:0',
        'status'   => 'require|in:0,1',
    ];

    protected $message = [
        'title.require'    => '标题不能为空',
        'title.max'        => '标题最多200个字符',
        'position.require' => '位置不能为空',
        'position.max'     => '位置最多50个字符',
        'image.require'    => '图片不能为空',
        'link.max'         => '链接最多500个字符',
        'sort.integer'     => '排序必须是整数',
        'sort.>='          => '排序必须大于等于0',
        'status.require'   => '状态不能为空',
        'status.in'        => '状态值必须是0或1',
    ];

    protected $scene = [
        'save'   => ['title', 'position', 'image', 'link', 'sort', 'status'],
        'update' => ['title', 'position', 'image', 'link', 'sort', 'status'],
    ];
}
