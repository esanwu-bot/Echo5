<?php
/**
 * Migration: Add product detail UI translations to sk_translation
 * Module: product_ui, field: label
 */
require __DIR__ . '/../../vendor/autoload.php';
$app = new \think\App();
$app->initialize();

$now = date('Y-m-d H:i:s');
$module = 'product_ui';

// business_id => [lang => value]
$labels = [
    1  => ['zh-CN' => '数据手册',       'en-US' => 'Datasheet',           'ja-JP' => 'データシート',         'ko-KR' => '데이터시트'],
    2  => ['zh-CN' => '评估模块',       'en-US' => 'Evaluation Module',    'ja-JP' => '評価モジュール',       'ko-KR' => '평가 모듈'],
    3  => ['zh-CN' => '的电气特性、典型应用、绝对最大额定值等详细信息',
           'en-US' => 'Electrical characteristics, typical applications, absolute maximum ratings and more',
           'ja-JP' => '電気的特性、代表的なアプリケーション、絶対最大定格などの詳細情報',
           'ko-KR' => '전기적 특성, 전형적인 응용, 절대 최대 정격 등 상세 정보'],
    4  => ['zh-CN' => '评估模块 (EVM) 性能演示套件 (PDK) 是用于评估',
           'en-US' => 'Evaluation Module (EVM) Performance Demonstration Kit (PDK) for evaluating',
           'ja-JP' => '評価モジュール（EVM）性能デモキット（PDK）は',
           'ko-KR' => '평가 모듈 (EVM) 성능 데모 키트 (PDK)는'],
    5  => ['zh-CN' => '的平台',         'en-US' => ' platform',            'ja-JP' => 'を評価するプラットフォーム', 'ko-KR' => '를 평가하기 위한 플랫폼'],
    6  => ['zh-CN' => '登录以订购',     'en-US' => 'Log in to order',      'ja-JP' => 'ログインして注文',     'ko-KR' => '로그인하여 주문'],
    7  => ['zh-CN' => 'FPGA 示例代码',  'en-US' => 'FPGA Example Code',    'ja-JP' => 'FPGAサンプルコード',   'ko-KR' => 'FPGA 예제 코드'],
    8  => ['zh-CN' => '的 FPGA 接口示例代码',
           'en-US' => ' FPGA interface example code',
           'ja-JP' => ' のFPGAインターフェースサンプルコード',
           'ko-KR' => '의 FPGA 인터페이스 예제 코드'],
    9  => ['zh-CN' => '下载示例',       'en-US' => 'Download Example',     'ja-JP' => 'サンプルをダウンロード', 'ko-KR' => '예제 다운로드'],
    10 => ['zh-CN' => '模拟工程师计算器','en-US' => 'Analog Engineer Calculator','ja-JP' => 'アナログエンジニア計算ツール','ko-KR' => '아날로그 엔지니어 계산기'],
    11 => ['zh-CN' => '用于模拟电路设计计算的在线/离线工具',
           'en-US' => 'Online/offline tool for analog circuit design calculations',
           'ja-JP' => 'アナログ回路設計計算用のオンライン/オフラインツール',
           'ko-KR' => '아날로그 회로 설계 계산을 위한 온라인/오프라인 도구'],
    12 => ['zh-CN' => '封装模型',       'en-US' => 'Package Model',        'ja-JP' => 'パッケージモデル',     'ko-KR' => '패키지 모델'],
    13 => ['zh-CN' => '下载模型',       'en-US' => 'Download Model',       'ja-JP' => 'モデルをダウンロード', 'ko-KR' => '모델 다운로드'],
    14 => ['zh-CN' => '管装',           'en-US' => 'Tube',                 'ja-JP' => 'チューブ',            'ko-KR' => '튜브'],
    15 => ['zh-CN' => '周',             'en-US' => 'weeks',                'ja-JP' => '週間',                'ko-KR' => '주'],
    16 => ['zh-CN' => '天',             'en-US' => 'days',                 'ja-JP' => '日',                  'ko-KR' => '일'],
    17 => ['zh-CN' => '我们的质量方针：为全球客户提供高性能、高可靠性、高性价比的半导体产品与解决方案',
           'en-US' => 'Our quality policy: providing high-performance, high-reliability, and cost-effective semiconductor products and solutions for global customers',
           'ja-JP' => '品質方針：グローバルなお客様に高性能・高信頼性・高コストパフォーマンスの半導体製品とソリューションを提供します',
           'ko-KR' => '품질 방침: 글로벌 고객에게 고성능, 고신뢰성, 가성비 높은 반도체 제품과 솔루션을 제공합니다'],
    18 => ['zh-CN' => '首页',           'en-US' => 'Home',                 'ja-JP' => 'ホーム',              'ko-KR' => '홈'],
    19 => ['zh-CN' => '产品',           'en-US' => 'Products',             'ja-JP' => '製品',                'ko-KR' => '제품'],
];

$insertCount = 0;
$updateCount = 0;
$skipCount = 0;

foreach ($labels as $bizId => $langMap) {
    foreach ($langMap as $langCode => $value) {
        $transKey = "{$module}_{$bizId}_label";
        
        $exists = \think\facade\Db::name('sk_translation')
            ->where('module', $module)
            ->where('business_id', $bizId)
            ->where('lang_code', $langCode)
            ->where('field', 'label')
            ->find();
        
        if ($exists) {
            if ($exists['trans_value'] !== $value) {
                \think\facade\Db::name('sk_translation')
                    ->where('id', $exists['id'])
                    ->update(['trans_value' => $value, 'update_time' => $now]);
                echo "UPDATE: biz={$bizId} [{$langCode}] => {$value}\n";
                $updateCount++;
            } else {
                $skipCount++;
            }
        } else {
            \think\facade\Db::name('sk_translation')->insert([
                'lang_code'     => $langCode,
                'trans_key'     => $transKey,
                'trans_value'   => $value,
                'module'        => $module,
                'business_id'   => $bizId,
                'field'         => 'label',
                'is_auto'       => 0,
                'is_translated' => 1,
                'source_lang'   => 'zh-CN',
                'create_time'   => $now,
                'update_time'   => $now,
                'type'          => 1,
            ]);
            $insertCount++;
        }
    }
}

\think\facade\Cache::clear();
echo "\nDone! Inserted: {$insertCount}, Updated: {$updateCount}, Skipped: {$skipCount}. Cache cleared.\n";
