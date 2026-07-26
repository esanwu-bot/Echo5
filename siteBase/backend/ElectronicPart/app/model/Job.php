<?php
declare (strict_types = 1);

namespace app\model;

use think\Model;

class Job extends Model
{
    protected $table = 'sk_job';
    protected $pk = 'id';
    
    protected $schema = [
        'id' => 'int',
        'job_title' => 'string',
        'department' => 'string',
        'location' => 'string',
        'job_type' => 'string',
        'salary_range' => 'string',
        'requirements' => 'text',
        'responsibilities' => 'text',
        'status' => 'string',
        'create_time' => 'int',
        'update_time' => 'int'
    ];
    
    protected $autoWriteTimestamp = false;
}
