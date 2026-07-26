<?php
/**
 * 电子元器件商城 - 多语言 Trait
 * 文件说明：为模型提供多语言字段处理能力，支持字段本地化与数据转换。
 */

namespace app\traits;

trait MultiLanguageTrait
{
    /**
     * 从模型原始数据中读取字段，避免与 Model 内部属性同名时取错值。
     * @param string $field
     * @return mixed|null
     */
    protected function getFieldRawValue(string $field)
    {
        if (method_exists($this, 'getData')) {
            $data = $this->getData();
            if (array_key_exists($field, $data)) {
                return $data[$field];
            }
        }

        return $this->$field ?? null;
    }

    /**
     * 获取语言代码映射（子类可覆盖）
     * @return array
     */
    protected function getLangCodeMapping(): array
    {
        if (property_exists($this, 'langCodeMapping')) {
            return $this->langCodeMapping;
        }

        return [
            'zh' => 'zh_hans',
            'ja' => 'jp',
            'ko' => 'kr',
        ];
    }

    /**
     * 获取多语言字段值
     * @param string $field 字段基础名
     * @param string $lang 语言代码
     * @return mixed
     */
    public function getLocalizedField(string $field, string $lang)
    {
        $mapping = $this->getLangCodeMapping();
        $dbLang = $mapping[$lang] ?? $lang;

        $candidateFields = [];

        // 简体中文默认优先读取 *_zh_hans，没有值再回退到基础字段。
        if ($lang === 'zh') {
            $candidateFields[] = $field . '_zh_hans';
        }

        if (!empty($dbLang)) {
            $candidateFields[] = $field . '_' . $dbLang;
        }

        foreach (array_unique($candidateFields) as $langField) {
            $value = $this->getFieldRawValue($langField);
            if ($value !== null && $value !== '') {
                return $value;
            }
        }

        return $this->getFieldRawValue($field) ?? '';
    }

    /**
     * 转换为本地化数组
     * @param string $lang 语言代码
     * @param array $localizedFields 需要本地化的字段列表
     * @return array
     */
    public function toLocalizedArray(string $lang, array $localizedFields = []): array
    {
        $data = $this->toArray();

        foreach ($localizedFields as $field) {
            $data[$field] = $this->getLocalizedField($field, $lang);

            foreach (['_en', '_ja', '_ko', '_zh_hans', '_zh_hant', '_jp', '_kr'] as $suffix) {
                unset($data[$field . $suffix]);
            }
        }

        return $data;
    }

    /**
     * 批量本地化数据集合
     * @param array|\think\Collection $collection 数据集合
     * @param string $lang 语言代码
     * @param array $localizedFields 需要本地化的字段列表
     * @return array
     */
    public static function localizeCollection($collection, string $lang, array $localizedFields = []): array
    {
        $result = [];

        foreach ($collection as $item) {
            if (method_exists($item, 'toLocalizedArray')) {
                $result[] = $item->toLocalizedArray($lang, $localizedFields);
            } else {
                $result[] = is_object($item) ? $item->toArray() : $item;
            }
        }

        return $result;
    }
}
