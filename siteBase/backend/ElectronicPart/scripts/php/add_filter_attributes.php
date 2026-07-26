<?php
/**
 * Migration: Add missing filter attributes and translations
 * Run once to populate sk_attribute and sk_translation for parametric search filters
 */
require __DIR__ . '/../../vendor/autoload.php';
$app = new \think\App();
$app->initialize();

$now = date('Y-m-d H:i:s');

// ==========================================
// 1. Insert missing attributes into sk_attribute
// ==========================================
$newAttributes = [
    ['name' => '通道数',   'code' => 'channels',     'type' => 'number', 'data_type' => 'number', 'unit' => '',     'status' => 1, 'sort_order' => 20],
    ['name' => '增益带宽', 'code' => 'gain_bandwidth','type' => 'number', 'data_type' => 'number', 'unit' => 'MHz',  'status' => 1, 'sort_order' => 21],
    ['name' => '压摆率',   'code' => 'slew_rate',    'type' => 'number', 'data_type' => 'number', 'unit' => 'V/µs', 'status' => 1, 'sort_order' => 22],
    ['name' => '电源电压', 'code' => 'supply_voltage','type' => 'number', 'data_type' => 'number', 'unit' => 'V',    'status' => 1, 'sort_order' => 23],
];

$insertedIds = [];
foreach ($newAttributes as $attr) {
    // Check if already exists by code
    $existing = \think\facade\Db::name('sk_attribute')->where('code', $attr['code'])->find();
    if ($existing) {
        $insertedIds[$attr['name']] = $existing['id'];
        echo "SKIP (exists): {$attr['name']} => id={$existing['id']}\n";
        continue;
    }
    
    $attr['create_time'] = $now;
    $attr['update_time'] = $now;
    $id = \think\facade\Db::name('sk_attribute')->insertGetId($attr);
    $insertedIds[$attr['name']] = $id;
    echo "INSERT: {$attr['name']} => id={$id}\n";
}

// ==========================================
// 2. Insert translations for ALL filter-related attributes
// ==========================================
// Translations map: Chinese name => [lang => translated name]
$translations = [
    // Existing attributes used in filters
    '封装类型' => [
        'en-US' => 'Package Type',
        'ja-JP' => 'パッケージタイプ',
        'ko-KR' => '패키지 유형',
    ],
    // Newly added attributes
    '通道数' => [
        'en-US' => 'Number of Channels',
        'ja-JP' => 'チャンネル数',
        'ko-KR' => '채널 수',
    ],
    '增益带宽' => [
        'en-US' => 'Gain Bandwidth',
        'ja-JP' => '利得帯域幅',
        'ko-KR' => '이득 대역폭',
    ],
    '压摆率' => [
        'en-US' => 'Slew Rate',
        'ja-JP' => 'スルーレート',
        'ko-KR' => '슬루율',
    ],
    '电源电压' => [
        'en-US' => 'Supply Voltage',
        'ja-JP' => '電源電圧',
        'ko-KR' => '전원 전압',
    ],
];

// Also ensure existing attribute #3 (封装类型) has correct translations
$insertedIds['封装类型'] = 3;

foreach ($translations as $zhName => $langMap) {
    $attrId = $insertedIds[$zhName] ?? null;
    if (!$attrId) {
        echo "WARN: No ID found for {$zhName}, skipping translations\n";
        continue;
    }
    
    foreach ($langMap as $langCode => $transValue) {
        // Check if translation already exists
        $exists = \think\facade\Db::name('sk_translation')
            ->where('module', 'attribute')
            ->where('business_id', $attrId)
            ->where('lang_code', $langCode)
            ->where('field', 'name')
            ->find();
        
        if ($exists) {
            // Update if value differs
            if ($exists['trans_value'] !== $transValue) {
                \think\facade\Db::name('sk_translation')
                    ->where('id', $exists['id'])
                    ->update(['trans_value' => $transValue, 'update_time' => $now]);
                echo "UPDATE trans: attr {$attrId} [{$langCode}] => {$transValue}\n";
            } else {
                echo "SKIP trans (same): attr {$attrId} [{$langCode}] => {$transValue}\n";
            }
        } else {
            $transKey = "attribute_{$attrId}_name";
            \think\facade\Db::name('sk_translation')->insert([
                'lang_code'     => $langCode,
                'trans_key'     => $transKey,
                'trans_value'   => $transValue,
                'module'        => 'attribute',
                'business_id'   => $attrId,
                'field'         => 'name',
                'is_auto'       => 0,
                'is_translated' => 1,
                'source_lang'   => 'zh-CN',
                'create_time'   => $now,
                'update_time'   => $now,
                'type'          => 1,
            ]);
            echo "INSERT trans: attr {$attrId} [{$langCode}] => {$transValue}\n";
        }
    }
}

// ==========================================
// 3. Link attributes to category 109 (and other op-amp categories if needed)
// ==========================================
$categoryIds = [109]; // Add more category IDs as needed

// Get all filter attribute IDs
$filterAttrIds = [];
foreach (['封装类型', '通道数', '增益带宽', '压摆率', '电源电压'] as $name) {
    if (isset($insertedIds[$name])) {
        $filterAttrIds[] = $insertedIds[$name];
    }
}

foreach ($categoryIds as $catId) {
    foreach ($filterAttrIds as $sort => $attrId) {
        $exists = \think\facade\Db::name('sk_category_attribute')
            ->where('category_id', $catId)
            ->where('attribute_id', $attrId)
            ->find();
        
        if ($exists) {
            echo "SKIP link: cat {$catId} <-> attr {$attrId} (already linked)\n";
        } else {
            \think\facade\Db::name('sk_category_attribute')->insert([
                'category_id'  => $catId,
                'attribute_id' => $attrId,
                'is_required'  => 0,
                'is_filter'    => 1,
                'sort_order'   => $sort,
                'create_time'  => $now,
            ]);
            echo "INSERT link: cat {$catId} <-> attr {$attrId}\n";
        }
    }
}

// Clear cache so changes take effect
\think\facade\Cache::clear();
echo "\nDone! Cache cleared.\n";
