<?php
require __DIR__ . '/../../vendor/autoload.php';
$app = new \think\App();
$app->initialize();

// 1. Find all categories that have products
$cats = \think\facade\Db::name('sk_product')
    ->where('is_on_sale', 1)
    ->group('category_id')
    ->field('category_id, COUNT(*) as cnt')
    ->select()
    ->toArray();

echo "Categories with products:\n";
$catIds = [];
foreach ($cats as $c) {
    $catName = \think\facade\Db::name('sk_category')->where('id', $c['category_id'])->value('name');
    $catIds[] = $c['category_id'];
    echo "  cat {$c['category_id']} ({$catName}): {$c['cnt']} products\n";
}

// 2. Check which categories already have sk_category_attribute links
echo "\nCategory-attribute links:\n";
foreach ($catIds as $catId) {
    $links = \think\facade\Db::name('sk_category_attribute')
        ->where('category_id', $catId)
        ->where('is_filter', 1)
        ->select()
        ->toArray();
    $attrNames = [];
    foreach ($links as $l) {
        $name = \think\facade\Db::name('sk_attribute')->where('id', $l['attribute_id'])->value('name');
        $attrNames[] = $name;
    }
    echo "  cat {$catId}: " . (empty($attrNames) ? '(no links)' : implode(', ', $attrNames)) . "\n";
}

// 3. Check brand translations
echo "\nBrands:\n";
$brands = \think\facade\Db::name('sk_brands')->select()->toArray();
foreach ($brands as $b) {
    echo "  id={$b['id']}, brand_name={$b['brand_name']}\n";
}

// 4. Check brand translations in sk_translation
echo "\nBrand translations:\n";
$brandTrans = \think\facade\Db::name('sk_translation')
    ->where('module', 'brand')
    ->select()
    ->toArray();
foreach ($brandTrans as $t) {
    echo "  biz={$t['business_id']}, lang={$t['lang_code']}, field={$t['field']}, value={$t['trans_value']}\n";
}
if (empty($brandTrans)) {
    echo "  (no brand translations found)\n";
}

// 5. Check sk_brands table structure
$cols = \think\facade\Db::query("SHOW COLUMNS FROM sk_brands");
echo "\nsk_brands columns:\n";
foreach ($cols as $c) {
    echo "  {$c['Field']} ({$c['Type']})\n";
}
