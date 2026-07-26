<?php
namespace app\dao\system\lang;

use app\dao\BaseDao;
use app\model\system\lang\LangCountry;

class LangCountryDao extends BaseDao
{
    protected function setModel(): string
    {
        return LangCountry::class;
    }
}
