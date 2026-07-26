<?php
declare (strict_types = 1);

namespace app\model;

use think\Model;


class About extends Model
{
    
    protected $table = 'sk_about';
    protected $pk = 'id';
    
    protected $schema = [
        'id' => 'int',
        'type' => 'string',
        'title' => 'string',
        'content' => 'text',
        'images' => 'text',
        'sort' => 'int',
        'status' => 'int',
        'create_time' => 'int',
        'update_time' => 'int'
    ];
    
    protected $autoWriteTimestamp = false;
    protected $json = ['images'];
}