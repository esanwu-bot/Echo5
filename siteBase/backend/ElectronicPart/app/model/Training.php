<?php
declare (strict_types = 1);

namespace app\model;

use think\Model;


class Training extends Model
{
    
    protected $table = 'sk_training';
    protected $pk = 'id';
    
    protected $schema = [
        'id' => 'int',
        'title' => 'string',
        'description' => 'text',
        'content' => 'text',
        'cover_image' => 'string',
        'start_time' => 'int',
        'end_time' => 'int',
        'location' => 'string',
        'capacity' => 'int',
        'registered' => 'int',
        'status' => 'int',
        'create_time' => 'int',
        'update_time' => 'int'
    ];
    
    protected $autoWriteTimestamp = false;
}