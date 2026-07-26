<?php
declare (strict_types = 1);

namespace app\model;

use think\Model;

class JobApplication extends Model
{
    protected $table = 'sk_job_apply';
    protected $pk = 'id';
    
    protected $schema = [
        'id' => 'int',
        'job_id' => 'int',
        'name' => 'string',
        'email' => 'string',
        'phone' => 'string',
        'resume_url' => 'string',
        'cover_letter' => 'text',
        'status' => 'string',
        'create_time' => 'int',
        'update_time' => 'int'
    ];
    
    protected $autoWriteTimestamp = false;
}