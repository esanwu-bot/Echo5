<?php
/**
 * Migration: Generate zh-CN translations for 171 products with English names
 * Categories: 运算放大器 (Op-Amps), 金属膜电阻 (Metal Film Resistors), 贴片电阻 (Chip Resistors)
 */
require __DIR__ . '/../../vendor/autoload.php';
$app = new \think\App();
$app->initialize();

$now = date('Y-m-d H:i:s');
$module = 'product';

// Get all products missing zh-CN name translation
$productIds = \think\facade\Db::name('sk_product')->column('id');
$transIds = \think\facade\Db::name('sk_translation')
    ->where('module', $module)
    ->where('field', 'name')
    ->where('lang_code', 'zh-CN')
    ->column('business_id');
$missing = array_diff($productIds, $transIds);

$products = \think\facade\Db::name('sk_product')
    ->alias('p')
    ->leftJoin('sk_category c', 'p.category_id = c.id')
    ->whereIn('p.id', $missing)
    ->field('p.id, p.name, p.description, p.category_id, c.name as category_name')
    ->select()->toArray();

// Translation functions
function translateOpAmpName(string $name): string {
    // Special named op-amps
    $specials = [
        'High Speed Op-Amp 100MHz' => '高速运算放大器 100MHz',
        'Precision Op-Amp Dual' => '精密双通道运放',
        'Quad Low Power Op-Amp' => '四通道低功耗运放',
        'High Output Current Op-Amp' => '高输出电流运放',
        'JFET Input Op-Amp' => 'JFET输入运放',
        'Rail-to-Rail I/O Op-Amp' => '轨到轨输入输出运放',
        'Audio Operational Amplifier' => '音频运算放大器',
    ];
    if (isset($specials[$name])) {
        return $specials[$name];
    }
    // Pattern: Op-Amp {freq} MHz {package}
    if (preg_match('/^Op-Amp\s+(\d+)\s*MHz\s+(.+)$/', $name, $m)) {
        return "运算放大器 {$m[1]}MHz {$m[2]}";
    }
    return "运算放大器 " . $name;
}

function translateMetalFilmName(string $name): string {
    // Pattern 1: {value} Metal Film Resistor {power}
    if (preg_match('/^(.+?)\s+Metal Film Resistor\s+(.+)$/u', $name, $m)) {
        return "{$m[1]} 金属膜电阻 {$m[2]}";
    }
    // Pattern 2: {value} {power}W Metal Film Resistor
    if (preg_match('/^(.+?)\s+([\d.\/]+W)\s+Metal Film Resistor$/u', $name, $m)) {
        return "{$m[1]} {$m[2]} 金属膜电阻";
    }
    return "金属膜电阻 " . $name;
}

function translateChipResistorName(string $name): string {
    // Special cases
    if ($name === '0805 0Ω Jumper') return '0805 0Ω 跳线电阻';
    if (preg_match('/^(\d+)\s+(.+?)\s+Current Sense$/u', $name, $m)) {
        return "{$m[1]} {$m[2]} 电流检测电阻";
    }
    // Pattern: {package} {value} Chip Resistor
    if (preg_match('/^(\d+)\s+(.+?)\s+Chip Resistor$/u', $name, $m)) {
        return "{$m[1]} {$m[2]} 贴片电阻";
    }
    return "贴片电阻 " . $name;
}

function translateDescription(string $desc, string $zhName, string $category): string {
    if (empty($desc)) return '';
    
    // Common description patterns
    $replacements = [
        'High speed operational amplifier for video applications.' => '用于视频应用的高速运算放大器。',
        'Low noise precision dual op-amp.' => '低噪声精密双通道运放。',
        'Quad low power op-amp for battery powered devices.' => '用于电池供电设备的四通道低功耗运放。',
        'High current drive capability.' => '高电流驱动能力。',
        'JFET input for high impedance applications.' => 'JFET输入，适用于高阻抗应用。',
        'Rail-to-rail input and output.' => '轨到轨输入和输出。',
        'Low distortion audio op-amp.' => '低失真音频运算放大器。',
        'Mock Op-Amp for pagination test.' => '模拟运算放大器（分页测试用）。',
        'Mock Chip Resistor.' => '模拟贴片电阻。',
        'Mock Metal Film Resistor.' => '模拟金属膜电阻。',
    ];
    
    if (isset($replacements[$desc])) {
        return $replacements[$desc];
    }
    
    // Pattern-based translation for resistor descriptions
    // e.g., "1kΩ ±1% 0.25W Metal Film Resistor."
    if (preg_match('/^([\d.]+[kMΩ]+)\s+±([\d.]+%)\s+([\d.]+W)\s+Metal Film Resistor\.?$/', $desc, $m)) {
        return "{$m[1]} ±{$m[2]} {$m[3]} 金属膜电阻。";
    }
    if (preg_match('/^([\d.]+[kMΩ]+)\s+±([\d.]+%)\s+([\d.]+W)\s+Precision Metal Film Resistor\.?$/', $desc, $m)) {
        return "{$m[1]} ±{$m[2]} {$m[3]} 精密金属膜电阻。";
    }
    // Chip resistor descriptions
    // e.g., "Thick film chip resistor 0402 10kΩ."
    if (preg_match('/^Thick film chip resistor\s+(\d+)\s+([\d.]+[kMΩ]+)\.?$/', $desc, $m)) {
        return "厚膜贴片电阻 {$m[1]} {$m[2]}。";
    }
    if (preg_match('/^Automotive grade\s+(\d+)\s+([\d.]+[kMΩ]+)\s+resistor\.?$/', $desc, $m)) {
        return "车规级 {$m[1]} {$m[2]} 电阻。";
    }
    if (preg_match('/^Zero ohm jumper resistor\s+(\d+)\.?$/', $desc, $m)) {
        return "{$m[1]} 零欧姆跳线电阻。";
    }
    if (preg_match('/^Low resistance current sensing resistor\s+([\d.]+[kMΩ]+)\.?$/', $desc, $m)) {
        return "{$m[1]} 低阻值电流检测电阻。";
    }
    
    return $desc; // fallback to original
}

$insertCount = 0;
$descCount = 0;

foreach ($products as $p) {
    $id = $p['id'];
    $name = $p['name'];
    $desc = $p['description'] ?? '';
    $category = $p['category_name'] ?? '';
    
    // Translate name
    $zhName = '';
    if ($category === '运算放大器') {
        $zhName = translateOpAmpName($name);
    } elseif ($category === '金属膜电阻') {
        $zhName = translateMetalFilmName($name);
    } elseif ($category === '贴片电阻') {
        $zhName = translateChipResistorName($name);
    }
    
    if (empty($zhName) || $zhName === $name) {
        echo "SKIP: ID={$id} name={$name} (no translation generated)\n";
        continue;
    }
    
    // Insert name translation
    $transKey = "product_{$id}_name";
    \think\facade\Db::name('sk_translation')->insert([
        'lang_code'     => 'zh-CN',
        'trans_key'     => $transKey,
        'trans_value'   => $zhName,
        'module'        => $module,
        'business_id'   => $id,
        'field'         => 'name',
        'is_auto'       => 1,
        'is_translated' => 1,
        'source_lang'   => 'en-US',
        'create_time'   => $now,
        'update_time'   => $now,
        'type'          => 1,
    ]);
    $insertCount++;
    
    // Insert description translation
    $zhDesc = translateDescription($desc, $zhName, $category);
    if (!empty($zhDesc) && $zhDesc !== $desc) {
        $descKey = "product_{$id}_description";
        \think\facade\Db::name('sk_translation')->insert([
            'lang_code'     => 'zh-CN',
            'trans_key'     => $descKey,
            'trans_value'   => $zhDesc,
            'module'        => $module,
            'business_id'   => $id,
            'field'         => 'description',
            'is_auto'       => 1,
            'is_translated' => 1,
            'source_lang'   => 'en-US',
            'create_time'   => $now,
            'update_time'   => $now,
            'type'          => 1,
        ]);
        $descCount++;
    }
}

echo "\nInserted: {$insertCount} name translations, {$descCount} description translations\n";

// Now fix applyLocalizedFields and mapItem to NOT skip zh-CN
echo "\nDone! Now fix BaseController and I18nService to look up zh-CN translations.\n";

\think\facade\Cache::clear();
echo "Cache cleared.\n";
