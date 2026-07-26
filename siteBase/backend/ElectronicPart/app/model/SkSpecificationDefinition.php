<?php

namespace app\model;

use think\Model;

class SkSpecificationDefinition extends Model
{
    protected $table = 'sk_specification_definition';

    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = false;

    protected $type = [
        'id' => 'integer',
    ];

    // products that reference this spec (if needed)
    public function productSpecs()
    {
        return $this->hasMany(SkProductSpec::class, 'spec_id');
    }
}
