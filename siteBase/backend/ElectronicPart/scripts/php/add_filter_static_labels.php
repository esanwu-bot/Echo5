<?php
/**
 * Migration: Add static filter label translations
 * For labels that aren't sk_attribute records (产品分类, 品牌, 价格)
 */
require __DIR__ . '/../../vendor/autoload.php';
$app = new \think\App();
$app->initialize();

$now = date('Y-m-d H:i:s');
$module = 'param_filter';

$labels = [
    1 => [
        'zh-CN' => '产品分类',
        'en-US' => 'Product Classification',
        'ja-JP' => '製品分類',
        'ko-KR' => '제품 분류',
    ],
    2 => [
        'zh-CN' => '品牌',
        'en-US' => 'Brand',
        'ja-JP' => 'ブランド',
        'ko-KR' => '브랜드',
    ],
    3 => [
        'zh-CN' => '价格',
        'en-US' => 'Price',
        'ja-JP' => '価格',
        'ko-KR' => '가격',
    ],
];

foreach ($labels as $bizId => $langMap) {
    foreach ($langMap as $langCode => $value) {
        $transKey = "{$module}_{$bizId}_name";
        
        $exists = \think\facade\Db::name('sk_translation')
            ->where('module', $module)
            ->where('business_id', $bizId)
            ->where('lang_code', $langCode)
            ->where('field', 'name')
            ->find();
        
        if ($exists) {
            if ($exists['trans_value'] !== $value) {
                \think\facade\Db::name('sk_translation')
                    ->where('id', $exists['id'])
                    ->update(['trans_value' => $value, 'update_time' => $now]);
                echo "UPDATE: biz={$bizId} [{$langCode}] => {$value}\n";
            } else {
                echo "SKIP (same): biz={$bizId} [{$langCode}] => {$value}\n";
            }
        } else {
            \think\facade\Db::name('sk_translation')->insert([
                'lang_code'     => $langCode,
                'trans_key'     => $transKey,
                'trans_value'   => $value,
                'module'        => $module,
                'business_id'   => $bizId,
                'field'         => 'name',
                'is_auto'       => 0,
                'is_translated' => 1,
                'source_lang'   => 'zh-CN',
                'create_time'   => $now,
                'update_time'   => $now,
                'type'          => 1,
            ]);
            echo "INSERT: biz={$bizId} [{$langCode}] => {$value}\n";
        }
    }
}

\think\facade\Cache::clear();
echo "\nDone! Cache cleared.\n";
