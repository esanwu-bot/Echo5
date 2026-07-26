<?php
/**
 * Migration: Link filter attributes to ALL categories that have products
 * and ensure filter-specific attributes are linked
 */
require __DIR__ . '/../../vendor/autoload.php';
$app = new \think\App();
$app->initialize();

$now = date('Y-m-d H:i:s');

// Get all filter attribute IDs
$filterNames = ['封装类型', '通道数', '增益带宽', '压摆率', '电源电压'];
$filterAttrIds = [];
foreach ($filterNames as $name) {
    $id = \think\facade\Db::name('sk_attribute')->where('name', $name)->value('id');
    if ($id) {
        $filterAttrIds[$name] = $id;
    } else {
        echo "WARN: attribute '{$name}' not found in sk_attribute\n";
    }
}
echo "Filter attribute IDs: " . json_encode($filterAttrIds) . "\n\n";

// Get all categories that have products
$catIds = \think\facade\Db::name('sk_product')
    ->where('is_on_sale', 1)
    ->where('category_id', '>', 0)
    ->group('category_id')
    ->column('category_id');

echo "Categories with products: " . implode(', ', $catIds) . "\n\n";

// Link filter attributes to all categories that have products
foreach ($catIds as $catId) {
    $catName = \think\facade\Db::name('sk_category')->where('id', $catId)->value('name');
    foreach ($filterAttrIds as $name => $attrId) {
        $exists = \think\facade\Db::name('sk_category_attribute')
            ->where('category_id', $catId)
            ->where('attribute_id', $attrId)
            ->find();
        
        if ($exists) {
            echo "SKIP: cat {$catId} ({$catName}) <-> attr {$attrId} ({$name}) - already linked\n";
        } else {
            \think\facade\Db::name('sk_category_attribute')->insert([
                'category_id'  => $catId,
                'attribute_id' => $attrId,
                'is_required'  => 0,
                'is_filter'    => 1,
                'sort_order'   => 50 + array_search($attrId, array_values($filterAttrIds)),
                'create_time'  => $now,
            ]);
            echo "INSERT: cat {$catId} ({$catName}) <-> attr {$attrId} ({$name})\n";
        }
    }
}

\think\facade\Cache::clear();
echo "\nDone! Cache cleared.\n";
