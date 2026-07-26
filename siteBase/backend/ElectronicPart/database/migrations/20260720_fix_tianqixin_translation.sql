-- 修复首页“新产品”副标题中的品牌名称错别字：天后芯 -> 天启芯
-- 同时更新 sk_translation 中的原文 key 与各语言翻译值

SET NAMES utf8mb4;

-- 1. 统一把翻译主键从错别字改为正确写法
UPDATE sk_translation
SET trans_key = '天启芯生产线汇聚了普通整流二极管、快恢复整流管、高效整流管、超快恢复整流管、稳压二极管（双芯片）等产品。'
WHERE trans_key = '天后芯生产线汇聚了普通整流二极管、快恢复整流管、高效整流管、超快恢复整流管、稳压二极管（双芯片）等产品。';

-- 2. 更新中文翻译值
UPDATE sk_translation
SET trans_value = '天启芯生产线汇聚了普通整流二极管、快恢复整流管、高效整流管、超快恢复整流管、稳压二极管（双芯片）等产品。'
WHERE trans_key = '天启芯生产线汇聚了普通整流二极管、快恢复整流管、高效整流管、超快恢复整流管、稳压二极管（双芯片）等产品。'
  AND lang_code = 'zh-CN';

-- 3. 更新英文翻译值
UPDATE sk_translation
SET trans_value = 'Tianqixin production line covers ordinary rectifier diodes, fast recovery rectifiers, high-efficiency rectifiers, ultra-fast recovery rectifiers, zener diodes (dual chips) and other products.'
WHERE trans_key = '天启芯生产线汇聚了普通整流二极管、快恢复整流管、高效整流管、超快恢复整流管、稳压二极管（双芯片）等产品。'
  AND lang_code = 'en-US';

-- 4. 更新日文翻译值
UPDATE sk_translation
SET trans_value = '天启芯生産ラインは、一般整流ダイオード、高速回復整流器、高効率整流器、超高速回復整流器、ツェナーダイオード（デュアルチップ）などの製品をカバーしています。'
WHERE trans_key = '天启芯生产线汇聚了普通整流二极管、快恢复整流管、高效整流管、超快恢复整流管、稳压二极管（双芯片）等产品。'
  AND lang_code = 'ja-JP';

-- 5. 更新韩文翻译值
UPDATE sk_translation
SET trans_value = '톈치신 생산 라인은 일반 정류 다이오드, 고속 회복 정류기, 고효율 정류기, 초고속 회복 정류기, 제너 다이오드(듀얼 칩) 및 기타 제품을 포함합니다.'
WHERE trans_key = '天启芯生产线汇聚了普通整流二极管、快恢复整流管、高效整流管、超快恢复整流管、稳压二极管（双芯片）等产品。'
  AND lang_code = 'ko-KR';
