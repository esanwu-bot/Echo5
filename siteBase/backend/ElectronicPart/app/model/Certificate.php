<?php
declare (strict_types = 1);

namespace app\model;

use think\Model;


class Certificate extends Model
{
    
    protected $table = 'sk_certificate';
    protected $pk = 'id';
    
    protected $schema = [
        'id' => 'int',
        'cert_name' => 'string',
        'cert_image' => 'string',
        'description' => 'text',
        'sort' => 'int',
        'status' => 'int',
        'create_time' => 'int',
        'update_time' => 'int'
    ];
    
    protected $autoWriteTimestamp = false;
}