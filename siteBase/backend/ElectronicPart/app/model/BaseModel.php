<?php
/**
 * 电子元器件商城 - 模型基类
 * 文件说明：提供ThinkPHP 6模型缺少的便捷方法（如isDirty），供所有业务模型继承。
 */

namespace app\model;

use think\Model;

abstract class BaseModel extends Model
{
    /**
     * 判断指定字段是否已被修改（类似Laravel的isDirty）
     * @param string|null $field 字段名，null时返回所有已修改字段
     * @return bool|array 指定字段是否修改 / 所有已修改字段的差异
     */
    public function isDirty(string $field = null)
    {
        $origin = $this->getOrigin();
        $data = $this->getData();

        if ($field === null) {
            $dirty = [];
            foreach ($data as $key => $value) {
                if (!array_key_exists($key, $origin) || $origin[$key] !== $value) {
                    $dirty[$key] = $value;
                }
            }
            return $dirty;
        }

        return ($origin[$field] ?? null) !== ($data[$field] ?? null);
    }
}
