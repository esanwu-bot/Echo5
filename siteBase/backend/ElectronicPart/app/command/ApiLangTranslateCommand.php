<?php
/**
 * 天启芯科技 - 前台API消息火山引擎批量翻译命令
 * 
 * 将 113 条硬编码中文 API message 通过火山引擎翻译为 en/ja/ko
 * 写入 sk_translation 表，供前端 i18next 加载
 * 
 * 用法:
 *   php think api:translate                        # 预览要翻译的消息
 *   php think api:translate --execute               # 执行翻译并入库
 *   php think api:translate --execute --lang=en     # 只翻译英文
 *   php think api:translate --sync               # 同步 sk_translation → sk_lang_code（getLang()可用）
 */
namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\input\Option;
use think\console\Output;
use think\facade\Db;

class ApiLangTranslateCommand extends Command
{
    /**
     * 113 条 API 消息 → i18n key 映射
     */
    protected $apiMessages = [
        // ===== 通用 =====
        'api.error.server_internal'      => '服务器内部错误，请稍后重试',
        'api.success'                    => 'success',
        
        // ===== 认证 =====
        'api.auth.login_success'         => '登录成功',
        'api.auth.register_success'      => '注册成功',
        'api.auth.logout_success'        => '退出成功',
        'api.auth.password_reset_success' => '密码重置成功',
        'api.auth.reset_email_sent'      => '重置密码邮件已发送',
        'api.auth.user_not_found'        => '用户不存在',
        'api.auth.email_not_registered'  => '该邮箱未注册',
        'api.auth.invalid_code'          => '验证码无效或已过期',
        'api.auth.too_many_requests'     => '您操作太频繁，请稍后再试',
        
        // ===== 订单 =====
        'api.order.login_required'       => '请先登录',
        'api.order.create_success'       => '订单创建成功',
        'api.order.cancel_success'       => '订单取消成功',
        'api.order.confirm_success'      => '订单确认成功',
        'api.order.not_found'            => '订单不存在',
        'api.order.invalid_id'           => '无效的订单ID',
        'api.order.address_not_found'    => '收货地址不存在',
        'api.order.invalid_cart_data'    => '无效的购物车商品数据',
        'api.order.product_not_found'    => '商品不存在或已下架',
        'api.order.insufficient_stock'   => '商品库存不足',
        'api.order.invalid_amount'       => '无效的订单金额',
        'api.order.only_pending_cancel'  => '只有待处理订单可以取消',
        'api.order.only_shipped_confirm' => '只有已发货订单可以确认',
        'api.order.list_failed'          => '获取订单列表失败',
        'api.order.detail_failed'        => '获取订单详情失败',
        'api.order.create_failed'        => '创建订单失败',
        'api.order.cancel_failed'        => '取消订单失败',
        'api.order.confirm_failed'       => '确认订单失败',

        // ===== 支付 =====
        'api.payment.create_success'     => '支付创建成功',
        'api.payment.create_failed'      => '支付创建失败',
        'api.payment.status_not_allowed' => '订单状态不允许支付',
        'api.payment.query_success'      => '查询成功',
        'api.payment.query_failed'       => '查询失败',

        // ===== 商品 =====
        'api.product.not_found'          => '商品不存在',
        'api.product.keyword_required'   => '搜索关键词不能为空',
        'api.product.export_developing'  => 'Excel 导出功能开发中',

        // ===== 购物车 =====
        'api.cart.get_success'           => '获取成功',
        'api.cart.add_success'           => '添加成功',
        'api.cart.add_failed'            => '添加失败',
        'api.cart.update_success'        => '更新成功',
        'api.cart.update_failed'         => '更新失败',
        'api.cart.delete_success'        => '删除成功',
        'api.cart.clear_success'         => '清空成功',
        'api.cart.product_unavailable'   => '商品不存在或已下架',
        'api.cart.insufficient_stock'    => '库存不足',
        'api.cart.item_not_found'        => '购物车项不存在',

        // ===== 地址 =====
        'api.address.unauthorized'       => '未授权',
        'api.address.not_found'          => '地址不存在',
        'api.address.create_success'     => '地址创建成功',
        'api.address.update_success'     => '地址更新成功',
        'api.address.delete_success'     => '地址删除成功',
        'api.address.default_update_success' => '默认地址更新成功',
        'api.address.default_not_found'  => '未找到默认地址',
        'api.validation.invalid_phone'   => '手机号格式不正确',

        // ===== 用户 =====
        'api.user.not_found'             => '用户不存在',
        'api.user.update_success'        => '更新成功',
        'api.user.no_data_to_update'     => '没有要更新的数据',
        'api.user.info_failed'           => '获取用户信息失败',
        'api.user.stats_failed'          => '获取订单统计失败',
        'api.user.orders_failed'         => '获取订单列表失败',
        'api.user.favorites_failed'      => '获取收藏列表失败',
        'api.user.favorites_not_implemented' => '收藏功能暂未实现',
        'api.user.inquiries_failed'      => '获取询盘列表失败',
        'api.user.inquiry_submit_failed' => '提交询盘失败',
        'api.user.inquiry_submit_success' => '询盘提交成功',
        'api.user.samples_failed'        => '获取样品申请列表失败',
        'api.user.sample_submit_failed'  => '提交样品申请失败',
        'api.user.sample_submit_success' => '样品申请提交成功',
        'api.user.addresses_failed'      => '获取收货地址列表失败',
        'api.user.address_add_failed'    => '添加收货地址失败',
        'api.user.address_update_failed' => '更新收货地址失败',
        'api.user.address_delete_failed' => '删除收货地址失败',
        'api.user.default_address_failed' => '设置默认地址失败',
        'api.user.update_failed'         => '更新用户信息失败',
        'api.user.get_failed'            => '获取失败，请稍后重试',

        // ===== 内容 =====
        'api.article.not_found'          => '文章不存在',
        'api.news.not_found'             => '新闻不存在',
        'api.training.not_found'         => '培训活动不存在',
        'api.document.not_found'         => '文档不存在或已下线',
        'api.document.empty_path'        => '文档文件路径为空',
        'api.document.file_unavailable'  => '文件不存在或无法访问',

        // ===== 业务 =====
        'api.business.quote_success'     => '报价申请提交成功',
        'api.business.sample_success'    => '样品申请提交成功',
        'api.job.resume_success'         => '简历提交成功',
        'api.job.not_found'              => '职位不存在',
        'api.message.required_fields'    => '姓名、邮箱、主题和内容不能为空',

        // ===== 分类/规格/字典 =====
        'api.category.not_found'         => '分类不存在',
        'api.spec.not_found'             => '规格不存在',
        'api.spec.already_exists'        => '该规格已存在',
        'api.dictionary.item_not_found'  => '项目不存在',
        'api.setting.invalid_group'      => '无效的设置分组',
        'api.search.keyword_required'    => '搜索关键词不能为空',

        // ===== 型号/供应商 =====
        'api.model.not_found'            => '型号不存在',
        'api.model.has_products'         => '该型号下有产品关联，无法删除',
        'api.supplier.not_found'         => '供应商不存在',
        'api.supplier.has_products'      => '该供应商下有产品关联，无法删除',
        'api.application.not_found'      => '应用不存在',
        'api.product_supplier.not_found' => '产品供应商关联不存在',

        // ===== 上传 =====
        'api.upload.success'             => '上传成功',
        'api.upload.no_file'             => '未上传文件',
        'api.upload.file_too_large'      => '文件太大，最大限制为50MB',
        'api.upload.unsupported_type'    => '不支持的文件类型，仅限: pdf, doc, docx, jpg, png, txt',

        // ===== 语言 =====
        'api.lang.success'               => '成功',
        'api.lang.not_found'             => '语言不存在',
        'api.lang.no_available'          => '没有可用的语言',

        // ===== CRUD 通用 =====
        'api.crud.create_success'        => '创建成功',
        'api.crud.update_success'        => '更新成功',
        'api.crud.delete_success'        => '删除成功',
        'api.crud.add_success'           => '添加成功',
        'api.crud.clear_success'         => '清空成功',
        'api.crud.get_success'           => '获取成功',
        'api.crud.batch_update_success'  => '批量更新成功',

        // ===== 校验 =====
        'api.validation.incomplete_params' => '参数不完整',
        'api.validation.data_invalid'      => '数据验证失败',
        'api.validation.data_not_found'    => '数据不存在',
    ];

    /**
     * 目标语言映射: lang_code → 火山引擎语言代码
     */
    protected $targetLangs = [
        'en-US' => 'en',
        'ja-JP' => 'ja',
        'ko-KR' => 'ko',
    ];

    protected function configure()
    {
        $this->setName('api:translate')
            ->setDescription('将 113 条前台 API 消息通过火山引擎翻译并写入 sk_translation')
            ->addOption('execute', 'x', Option::VALUE_NONE, '执行翻译并入库（默认预览）')
            ->addOption('lang', 'l', Option::VALUE_OPTIONAL, '指定目标语言(en/ja/ko)，默认翻译全部')
            ->addOption('force', 'f', Option::VALUE_NONE, '强制重新翻译（覆盖已存在记录）')
            ->addOption('sync', 's', Option::VALUE_NONE, '同步 sk_translation → sk_lang_code（供 getLang() 使用）');
    }

    protected function execute(Input $input, Output $output)
    {
        $execute = $input->getOption('execute');
        $force   = $input->getOption('force');
        $lang    = $input->getOption('lang');
        $sync    = $input->getOption('sync');

        // --sync 模式：同步 sk_translation → sk_lang_code
        if ($sync) {
            $this->syncToLangCode($output);
            return;
        }

        $output->writeln('╔══════════════════════════════════════════╗');
        $output->writeln('║   前台 API 消息火山引擎批量翻译          ║');
        $output->writeln('╚══════════════════════════════════════════╝');
        $output->writeln('');

        // 目标语言筛选
        $langsToTranslate = $this->targetLangs;
        if ($lang) {
            $filtered = [];
            foreach ($langsToTranslate as $code => $volcCode) {
                if (strpos($code, $lang) === 0 || $volcCode === $lang) {
                    $filtered[$code] = $volcCode;
                }
            }
            $langsToTranslate = $filtered;
            if (empty($langsToTranslate)) {
                $output->writeln("<error>不支持的语言: {$lang}，支持: en/ja/ko</error>");
                return;
            }
        }

        $output->writeln("待翻译消息数: <info>" . count($this->apiMessages) . "</info>");
        $output->writeln("目标语言: <info>" . implode(', ', array_keys($langsToTranslate)) . "</info>");
        $output->writeln("");

        if (!$execute) {
            $output->writeln("预览模式（加 --execute 执行翻译）:");
            $output->writeln("  php think api:translate --execute");
            if (null === $lang) {
                $output->writeln("  php think api:translate --execute --lang=en");
                $output->writeln("  php think api:translate --execute --force");
            }
            $output->writeln("");

            // 预览前10条
            $i = 0;
            foreach ($this->apiMessages as $key => $chinese) {
                if ($i >= 10) {
                    $output->writeln("  ... 共 " . count($this->apiMessages) . " 条");
                    break;
                }
                $output->writeln("  [{$key}] {$chinese}");
                $i++;
            }
            return;
        }

        // === 执行翻译 ===
        $volcService = new \app\service\VolcTranslateService();
        if (!$volcService->isConfigured()) {
            $output->writeln("<error>火山引擎 API 密钥未配置，请在 .env 中设置 VOLC_ACCESS_KEY_ID 和 VOLC_SECRET_ACCESS_KEY</error>");
            return;
        }

        // 收集所有中文文本
        $chineseTexts = array_values($this->apiMessages);
        $keys = array_keys($this->apiMessages);
        $total = count($chineseTexts);

        foreach ($langsToTranslate as $langCode => $volcLang) {
            $output->writeln("═══════ 翻译至: {$langCode} (火山引擎代码: {$volcLang}) ═══════");

            // 统计已存在的记录数
            $existingCount = Db::table('sk_translation')
                ->where('lang_code', $langCode)
                ->where('module', 'api')
                ->whereIn('trans_key', $keys)
                ->count();

            if ($existingCount > 0 && !$force) {
                $output->writeln("  已有 <info>{$existingCount}</info> 条翻译存在（跳过，加 --force 强制重新翻译）");
                
                // 找出缺失的
                $existingKeys = Db::table('sk_translation')
                    ->where('lang_code', $langCode)
                    ->where('module', 'api')
                    ->whereIn('trans_key', $keys)
                    ->column('trans_key');
                
                $missingIndices = [];
                foreach ($keys as $i => $key) {
                    if (!in_array($key, $existingKeys)) {
                        $missingIndices[] = $i;
                    }
                }
                
                if (empty($missingIndices)) {
                    $output->writeln("  所有翻译已存在，无需翻译");
                    continue;
                }
                
                $textsToTranslate = [];
                $keyMap = [];
                foreach ($missingIndices as $idx) {
                    $textsToTranslate[] = $chineseTexts[$idx];
                    $keyMap[] = $keys[$idx];
                }
                
                $output->writeln("  缺失 <comment>" . count($textsToTranslate) . "</comment> 条，准备翻译");
                
                // 翻译缺失部分
                $this->batchTranslateAndInsert($volcService, $textsToTranslate, $keyMap, $langCode, $volcLang, $output);
            } else {
                if ($force && $existingCount > 0) {
                    // 删除已有记录
                    Db::table('sk_translation')
                        ->where('lang_code', $langCode)
                        ->where('module', 'api')
                        ->whereIn('trans_key', $keys)
                        ->delete();
                    $output->writeln("  已删除 <comment>{$existingCount}</comment> 条旧记录（force模式）");
                }
                
                // 批量翻译全部
                $this->batchTranslateAndInsert($volcService, $chineseTexts, $keys, $langCode, $volcLang, $output);
            }
        }

        // 插入中文原文
        $zhKeys = Db::table('sk_translation')
            ->where('lang_code', 'zh-CN')
            ->where('module', 'api')
            ->whereIn('trans_key', $keys)
            ->column('trans_key');
        
        $zhInsertCount = 0;
        foreach ($keys as $i => $key) {
            if (!in_array($key, $zhKeys)) {
                Db::table('sk_translation')->insert([
                    'lang_code' => 'zh-CN',
                    'trans_key' => $key,
                    'trans_value' => $chineseTexts[$i],
                    'module' => 'api',
                    'create_time' => date('Y-m-d H:i:s'),
                    'update_time' => date('Y-m-d H:i:s'),
                ]);
                $zhInsertCount++;
            }
        }
        $output->writeln("中文原文: 已插入 <info>{$zhInsertCount}</info> 条（跳过已存在）");

        $output->writeln("");
        $output->writeln("<info>✓ 翻译完成！</info>");
        $output->writeln("");
        $output->writeln("执行以下命令验证:");
        $output->writeln("  SELECT lang_code, COUNT(*) AS cnt FROM sk_translation WHERE module='api' GROUP BY lang_code;");
    }

    /**
     * 批量翻译并入库（分批次，每批最多10条）
     */
    protected function batchTranslateAndInsert($volcService, array $texts, array $keys, string $langCode, string $volcLang, Output $output)
    {
        // 火山引擎批量翻译一次最多10条
        $batchSize = 10;
        $total = count($texts);
        $inserted = 0;
        
        for ($offset = 0; $offset < $total; $offset += $batchSize) {
            $batchTexts = array_slice($texts, $offset, $batchSize);
            $batchKeys = array_slice($keys, $offset, $batchSize);
            
            $output->write("  翻译批次 " . (int)($offset / $batchSize + 1) . "/" . (int)ceil($total / $batchSize) . " ... ");
            
            $result = $volcService->translateBatch($batchTexts, $volcLang);
            
            if (isset($result['error'])) {
                $output->writeln("<error>失败: {$result['error']}</error>");
                continue;
            }
            
            if (!isset($result['TranslationList'])) {
                $output->writeln("<error>响应格式异常</error>");
                continue;
            }
            
            $now = date('Y-m-d H:i:s');
            $insertData = [];
            
            foreach ($result['TranslationList'] as $idx => $item) {
                $translated = $item['Translation'] ?? $batchTexts[$idx];
                $insertData[] = [
                    'lang_code' => $langCode,
                    'trans_key' => $batchKeys[$idx],
                    'trans_value' => $translated,
                    'module' => 'api',
                    'create_time' => $now,
                    'update_time' => $now,
                ];
            }
            
            // 批量插入
            Db::table('sk_translation')->insertAll($insertData);
            $inserted += count($insertData);
            
            $output->writeln("<info>✓ {$inserted}/{$total}</info>");
            
            // 火山引擎有 QPS 限制，稍微停一下
            if ($offset + $batchSize < $total) {
                usleep(200000); // 200ms
            }
        }
    }

    /**
     * 同步 sk_translation(module='api') → sk_lang_code
     * 使 getLang() 函数能直接返回翻译后的 API message
     */
    protected function syncToLangCode(Output $output)
    {
        $output->writeln('╔══════════════════════════════════════════╗');
        $output->writeln('║   同步 sk_translation → sk_lang_code     ║');
        $output->writeln('╚══════════════════════════════════════════╝');
        $output->writeln('');

        // 语言码 → sk_lang_type.id 映射
        $typeMap = Db::table('sk_lang_type')
            ->where('is_del', 0)
            ->where('status', 1)
            ->column('id', 'file_name');

        $output->writeln('语言类型映射:');
        foreach ($typeMap as $fn => $tid) {
            $output->writeln("  {$fn} → type_id={$tid}");
        }
        $output->writeln('');

        // 读取模块 'api' 下的所有 sk_translation 记录
        $records = Db::table('sk_translation')
            ->where('module', 'api')
            ->select();

        if ($records->isEmpty()) {
            $output->writeln('<error>sk_translation 表中无 module=api 的记录，请先执行 php think api:translate --execute</error>');
            return;
        }

        // 按翻译key分组
        $grouped = [];
        foreach ($records as $row) {
            $key = $row['trans_key'];
            if (!isset($grouped[$key])) {
                $grouped[$key] = [];
            }
            $grouped[$key][] = $row;
        }

        $output->writeln('sk_translation 分组: <info>' . count($grouped) . '</info> 个翻译键');
        $output->writeln('');

        // 获取当前最大 code
        $maxCodeRow = Db::query("SELECT MAX(CAST(code AS UNSIGNED)) AS max_code FROM sk_lang_code WHERE code REGEXP '^[0-9]+$'");
        $startCode = (int)($maxCodeRow[0]['max_code'] ?? 0);
        if ($startCode < 200000) {
            $startCode = 199999;
        }
        $output->writeln("起始 code: <info>" . ($startCode + 1) . "</info>");
        $output->writeln('');

        // 统计
        $inserted = 0;
        $skipped = 0;

        foreach ($grouped as $transKey => $rows) {
            $code = ++$startCode;
            $remarks = '';

            // 取 zh-CN 记录的 trans_value 作为 remarks（中文原文）
            foreach ($rows as $row) {
                if ($row['lang_code'] === 'zh-CN') {
                    $remarks = $row['trans_value'];
                    break;
                }
            }

            if (empty($remarks)) {
                $remarks = $transKey;
            }

            // 为每种语言插入 sk_lang_code
            foreach ($rows as $row) {
                $langCode = $row['lang_code'];

                // 语言码映射到 type_id
                $typeId = null;
                $langFile = str_replace('-', '_', strtolower($langCode));
                if (isset($typeMap[$langCode])) {
                    $typeId = $typeMap[$langCode];
                } elseif (isset($typeMap[$langFile])) {
                    $typeId = $typeMap[$langFile];
                }

                if (!$typeId) {
                    // 尝试模糊匹配
                    foreach ($typeMap as $fn => $tid) {
                        if (strpos($langFile, $fn) !== false || strpos($fn, $langFile) !== false) {
                            $typeId = $tid;
                            break;
                        }
                    }
                }

                if (!$typeId) {
                    // 兜底：zh→1, en→2, ja→3, ko→4
                    $shortCode = substr($langCode, 0, 2);
                    $fallbackMap = ['zh' => 1, 'en' => 2, 'ja' => 3, 'ko' => 4];
                    $typeId = $fallbackMap[$shortCode] ?? 1;
                }

                // 检查是否已存在
                $exists = Db::table('sk_lang_code')
                    ->where('type_id', $typeId)
                    ->where('code', $code)
                    ->find();

                if ($exists) {
                    $skipped++;
                    continue;
                }

                Db::table('sk_lang_code')->insert([
                    'type_id' => $typeId,
                    'code' => (string)$code,
                    'remarks' => $remarks,
                    'lang_explain' => $row['trans_value'],
                    'is_admin' => 2, // 2=用户前端
                    'create_time' => date('Y-m-d H:i:s'),
                    'update_time' => date('Y-m-d H:i:s'),
                ]);
                $inserted++;
            }
        }

        $output->writeln('');
        $output->writeln("同步完成:");
        $output->writeln("  插入 <info>{$inserted}</info> 条");
        $output->writeln("  跳过 <comment>{$skipped}</comment> 条（已存在）");
        $output->writeln('');

        // 清除 Redis 缓存
        try {
            \think\facade\Cache::delete('sys_lang_source_map');
            \think\facade\Cache::delete('lang_type_data');
            \think\facade\Cache::delete('range_name');
            // 清除所有 lang_* 缓存
            foreach ($typeMap as $fn => $tid) {
                \think\facade\Cache::delete('type_id_' . $fn);
                $langStr = 'lang_' . str_replace('-', '_', $fn);
                \think\facade\Cache::delete($langStr);
            }
            $output->writeln('<info>✓ Redis 缓存已清除（下次访问自动重建）</info>');
        } catch (\Throwable $e) {
            $output->writeln('<comment>Redis 缓存清除失败: ' . $e->getMessage() . '</comment>');
        }
    }
}
