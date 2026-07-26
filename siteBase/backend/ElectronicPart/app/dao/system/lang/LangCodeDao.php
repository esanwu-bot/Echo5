<?php
namespace app\dao\system\lang;

use app\dao\BaseDao;
use app\model\system\lang\LangCode;

class LangCodeDao extends BaseDao
{
    protected function setModel(): string
    {
        return LangCode::class;
    }
}
