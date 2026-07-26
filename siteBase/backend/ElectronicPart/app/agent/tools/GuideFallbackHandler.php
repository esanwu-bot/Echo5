<?php
/**
 * 电子元器件商城 - 导购降级处理器
 * 文件说明：当LLM服务不可用时，使用规则匹配提供基础导购服务。
 */
namespace app\agent\tools;

use think\facade\Db;
use think\facade\Log;

/**
 * 导购降级处理器
 * 基于关键词匹配和模板回复，在LLM不可用时提供基础服务
 *
 * @package app\agent\tools
 */
class GuideFallbackHandler
{
    /**
     * @var string 当前语言
     */
    protected $lang = 'zh';

    /**
     * 构造函数
     *
     * @param string $lang 语言代码
     */
    public function __construct(string $lang = 'zh')
    {
        $this->lang = $lang;
    }

    /**
     * 降级处理入口
     * 根据用户消息匹配意图，返回规则化回复
     *
     * @access public
     * @param string $userMessage 用户消息
     * @return array 包含 content 和 tool_calls 的结果数组
     */
    public function handle(string $userMessage): array
    {
        $message = trim($userMessage);
        if (empty($message)) {
            return $this->reply($this->getText('empty_input'));
        }

        // 意图匹配
        $intent = $this->detectIntent($message);

        switch ($intent) {
            case 'stock':
                return $this->handleStockQuery($message);
            case 'price':
                return $this->handlePriceQuery($message);
            case 'product_search':
                return $this->handleProductSearch($message);
            case 'alternative':
                return $this->handleAlternative($message);
            case 'datasheet':
                return $this->handleDatasheet($message);
            case 'sample':
                return $this->handleSample($message);
            case 'greeting':
                return $this->reply($this->getText('greeting'));
            case 'help':
                return $this->reply($this->getText('help'));
            default:
                return $this->handleGeneralQuery($message);
        }
    }

    /**
     * 获取多语言文本
     *
     * @access protected
     * @param string $key 文本键名
     * @return string
     */
    protected function getText(string $key): string
    {
        $texts = [
            'zh' => [
                'empty_input' => '请输入您需要查询的产品型号或描述您的需求。',
                'greeting' => "您好！我是MonaShop半导体导购助手，很高兴为您服务。\n\n我可以帮您：\n- **查询产品库存** — 输入型号，如：STM32F103C8T6 库存\n- **获取报价信息** — 输入型号+数量，如：STM32F103 报价 1000片\n- **推荐替代料** — 输入：推荐替代 STM32F103\n- **查找数据手册** — 输入：STM32F103 数据手册\n\n请问有什么可以帮您的？",
                'help' => "以下是我可以帮您做的事情：\n\n| 功能 | 示例 |\n|------|------|\n| 查库存 | STM32F103C8T6 有多少库存 |\n| 查价格 | STM32F103 报价 1000片 |\n| 搜产品 | 找一款3.3V的LDO |\n| 替代料 | 推荐GD32替代STM32F103 |\n| 数据手册 | STM32F103 数据手册 |\n| 样品申请 | 申请样品 STM32F103 |\n\n直接输入您的需求即可，我会尽力帮助您！",
                'stock_no_model' => "请提供您要查询的产品型号。\n\n例如：**STM32F103C8T6** 有多少库存？",
                'stock_not_found_prefix' => "❌ **找不到该型号库存信息**\n\n未在系统中找到型号 **",
                'stock_not_found_suffix' => "** 的产品。\n\n",
                'stock_recommendations' => "**为您推荐以下相似型号：**\n\n",
                'stock_table_header' => "| 型号 | 名称 | 品牌 | 库存 | 说明 |\n|------|------|------|------|------|\n",
                'stock_in_stock' => "✅ ",
                'stock_out_of_stock' => "❌ 缺货",
                'stock_similarity' => "参数相近",
                'stock_suggestions' => "**建议：**\n- 检查型号拼写是否正确\n- 尝试输入部分型号搜索，如只输入 **STM32F103**\n- 联系客服获取更详细的库存信息\n- 如需特定型号，可提交询价单，我们会为您寻找货源",
                'stock_query_result' => "查询到以下产品库存信息：\n\n",
                'stock_table_header2' => "| 型号 | 名称 | 品牌 | 库存状态 |\n|------|------|------|----------|\n",
                'stock_has_stock' => "✅ **有货**",
                'stock_no_stock' => "❌ **缺货**",
                'stock_normally_stocked' => ' 📌 常备料',
                'stock_disclaimer' => "> ⚠️ 库存数据实时变动，请以下单时为准。如需大批量采购，建议联系客服确认。",
                'price_no_model' => "请提供您要查询的产品型号。\n\n例如：**STM32F103C8T6** 报价 1000片",
                'price_not_found' => "抱歉，未找到型号 **",
                'price_not_found_suffix' => "** 的产品信息。",
                'price_info_prefix' => "**",
                'price_info_suffix' => "** 价格信息：\n\n",
                'price_table_header' => "| 起订量 | 单价 (USD) |\n|--------|------------|\n",
                'price_table_row' => "| ≥",
                'price_table_row_suffix' => " 片 | $",
                'price_table_row_end' => " |\n",
                'price_base_price' => "- **基础单价**：$",
                'price_base_price_suffix' => "/片\n",
                'price_quantity_quote' => "### ",
                'price_quantity_quote_suffix' => " 片报价\n",
                'price_unit_price' => "- **单价**：$",
                'price_unit_price_suffix' => "/片\n",
                'price_total_price' => "- **总价**：$",
                'price_bulk_tip' => "\n> 💡 大批量采购可联系客服获取更优惠价格。",
                'search_no_keyword' => '请告诉我您要搜索的产品型号或关键词。',
                'search_not_found' => "未找到与 **",
                'search_not_found_suffix' => "** 相关的产品。\n\n建议尝试其他关键词或联系客服。",
                'search_result_prefix' => "找到以下相关产品：\n\n",
                'search_table_header' => "| 型号 | 名称 | 品牌 | 封装 | 单价 | 库存 |\n|------|------|------|------|------|------|\n",
                'search_price_inquiry' => '询价',
                'search_out_of_stock' => '缺货',
                'search_more_info' => "如需了解更多详情，请告诉我具体型号。",
                'alt_no_model' => "请提供需要替代的产品型号。\n\n例如：推荐 **GD32** 替代 STM32F103",
                'alt_not_found' => "未找到型号 **",
                'alt_not_found_suffix' => "**，无法推荐替代料。",
                'alt_found_prefix' => "为 **",
                'alt_found_suffix' => "** 找到以下替代产品：\n\n",
                'alt_table_header' => "| 型号 | 名称 | 品牌 | 单价 | 库存 | 匹配说明 |\n|------|------|------|------|------|----------|\n",
                'alt_package_match' => '封装兼容',
                'alt_param_similar' => '参数相近',
                'alt_warning' => "> ⚠️ 替代料建议仅供参考，建议确认引脚兼容性和参数差异后再使用。",
                'alt_no_alternative' => "抱歉，暂未找到 **",
                'alt_no_alternative_suffix' => "** 的替代产品。\n\n建议联系客服，我们可以帮您寻找更多替代方案。",
                'ds_no_model' => '请提供产品型号，例如：STM32F103 数据手册',
                'ds_not_found' => "未找到型号 **",
                'ds_not_found_suffix' => "** 的产品信息。",
                'ds_found_prefix' => "**",
                'ds_found_suffix' => "** 数据手册：\n\n📎 [点击查看数据手册](",
                'ds_found_end' => ")\n\n如需更多技术资料，请联系客服。",
                'ds_doc_found_prefix' => "**",
                'ds_doc_found_suffix' => "** 数据手册：\n\n📎 [点击查看数据手册](",
                'ds_not_uploaded_prefix' => "**",
                'ds_not_uploaded_suffix' => "** 的数据手册暂未上传。\n\n建议：\n- 访问官网获取最新数据手册\n- 联系客服索取技术资料",
                'sample_request' => "好的，我可以帮您申请样品。\n\n请提供以下信息：\n1. **产品型号** — 您需要申请哪个型号的样品\n2. **申请数量** — 通常1-5片\n3. **联系方式** — 姓名和电话\n4. **用途说明** — 简述样品用途（选填）\n\n例如：申请样品 **STM32F103C8T6**，3片，用于项目评估。",
                'general_unavailable' => "感谢您的咨询！目前AI服务暂时不可用，我正在使用基础模式为您服务。\n\n您可以尝试以下方式提问：\n- 输入**产品型号**查询库存和价格\n- 说「**帮助**」查看完整功能列表\n- 说「**你好**」开始对话\n\n如需更智能的服务，请联系在线客服。",
                'stock_query_error' => '查询库存时遇到问题，请稍后重试。',
                'price_query_error' => '查询价格时遇到问题，请稍后重试。',
                'search_error' => '搜索时遇到问题，请稍后重试。',
                'alt_query_error' => '查询替代料时遇到问题，请稍后重试。',
                'ds_query_error' => '查询文档时遇到问题，请稍后重试。',
                'similar_reason_same_series' => '同系列',
                'similar_reason_same_brand' => '同品牌',
                'similar_reason_in_stock' => '有库存',
            ],
            'en' => [
                'empty_input' => 'Please enter the product model you need to query or describe your requirements.',
                'greeting' => "Hello! I am the MonaShop Semiconductor Shopping Assistant, glad to serve you.\n\nI can help you:\n- **Check Product Inventory** — Enter model, e.g.: STM32F103C8T6 stock\n- **Get Quote Information** — Enter model + quantity, e.g.: STM32F103 quote 1000 pcs\n- **Recommend Alternatives** — Enter: recommend alternative STM32F103\n- **Find Datasheet** — Enter: STM32F103 datasheet\n\nWhat can I help you with?",
                'help' => "Here is what I can help you with:\n\n| Function | Example |\n|------|------|\n| Check Stock | STM32F103C8T6 stock |\n| Check Price | STM32F103 quote 1000 pcs |\n| Search Products | Find a 3.3V LDO |\n| Alternatives | Recommend GD32 alternative to STM32F103 |\n| Datasheet | STM32F103 datasheet |\n| Sample Request | Request sample STM32F103 |\n\nJust enter your needs and I will do my best to help you!",
                'stock_no_model' => "Please provide the product model you want to query.\n\nFor example: **STM32F103C8T6** stock?",
                'stock_not_found_prefix' => "❌ **Stock Information Not Found**\n\nProduct with model **",
                'stock_not_found_suffix' => "** was not found in the system.\n\n",
                'stock_recommendations' => "**Recommended similar models for you:**\n\n",
                'stock_table_header' => "| Model | Name | Brand | Stock | Note |\n|------|------|------|------|------|\n",
                'stock_in_stock' => "✅ ",
                'stock_out_of_stock' => "❌ Out of Stock",
                'stock_similarity' => "Similar parameters",
                'stock_suggestions' => "**Suggestions:**\n- Check if the model spelling is correct\n- Try entering partial model search, e.g. just enter **STM32F103**\n- Contact customer service for more detailed stock information\n- If you need a specific model, you can submit a quote request and we will find the source for you",
                'stock_query_result' => "Found the following product stock information:\n\n",
                'stock_table_header2' => "| Model | Name | Brand | Stock Status |\n|------|------|------|----------|\n",
                'stock_has_stock' => "✅ **In Stock**",
                'stock_no_stock' => "❌ **Out of Stock**",
                'stock_normally_stocked' => ' 📌 Regular Stock',
                'stock_disclaimer' => "> ⚠️ Stock data changes in real-time, please refer to actual order placement. For bulk procurement, it is recommended to contact customer service for confirmation.",
                'price_no_model' => "Please provide the product model you want to query.\n\nFor example: **STM32F103C8T6** quote 1000 pcs",
                'price_not_found' => "Sorry, product information for model **",
                'price_not_found_suffix' => "** was not found.",
                'price_info_prefix' => "**",
                'price_info_suffix' => "** Price Information:\n\n",
                'price_table_header' => "| MOQ | Unit Price (USD) |\n|--------|------------|\n",
                'price_table_row' => "| ≥",
                'price_table_row_suffix' => " pcs | $",
                'price_table_row_end' => " |\n",
                'price_base_price' => "- **Base Unit Price**: $",
                'price_base_price_suffix' => "/pc\n",
                'price_quantity_quote' => "### ",
                'price_quantity_quote_suffix' => " pcs Quote\n",
                'price_unit_price' => "- **Unit Price**: $",
                'price_unit_price_suffix' => "/pc\n",
                'price_total_price' => "- **Total Price**: $",
                'price_bulk_tip' => "\n> 💡 For bulk procurement, you can contact customer service for better prices.",
                'search_no_keyword' => 'Please tell me the product model or keywords you want to search.',
                'search_not_found' => "No products related to **",
                'search_not_found_suffix' => "** were found.\n\nTry other keywords or contact customer service.",
                'search_result_prefix' => "Found the following related products:\n\n",
                'search_table_header' => "| Model | Name | Brand | Package | Unit Price | Stock |\n|------|------|------|------|------|------|\n",
                'search_price_inquiry' => 'Quote Required',
                'search_out_of_stock' => 'Out of Stock',
                'search_more_info' => "For more details, please tell me the specific model.",
                'alt_no_model' => "Please provide the product model that needs an alternative.\n\nFor example: Recommend **GD32** as alternative to STM32F103",
                'alt_not_found' => "Model **",
                'alt_not_found_suffix' => "** was not found, unable to recommend alternatives.",
                'alt_found_prefix' => "Found the following alternative products for **",
                'alt_found_suffix' => "**:\n\n",
                'alt_table_header' => "| Model | Name | Brand | Unit Price | Stock | Match Note |\n|------|------|------|------|------|----------|\n",
                'alt_package_match' => 'Package Compatible',
                'alt_param_similar' => 'Similar Parameters',
                'alt_warning' => "> ⚠️ Alternative recommendations are for reference only. Please confirm pin compatibility and parameter differences before use.",
                'alt_no_alternative' => "Sorry, no alternative products were found for **",
                'alt_no_alternative_suffix' => "**.\n\nPlease contact customer service, we can help you find more alternative solutions.",
                'ds_no_model' => 'Please provide the product model, e.g.: STM32F103 datasheet',
                'ds_not_found' => "Product information for model **",
                'ds_not_found_suffix' => "** was not found.",
                'ds_found_prefix' => "**",
                'ds_found_suffix' => "** Datasheet:\n\n📎 [Click to view datasheet](",
                'ds_found_end' => ")\n\nFor more technical materials, please contact customer service.",
                'ds_doc_found_prefix' => "**",
                'ds_doc_found_suffix' => "** Datasheet:\n\n📎 [Click to view datasheet](",
                'ds_not_uploaded_prefix' => "**",
                'ds_not_uploaded_suffix' => "** datasheet has not been uploaded yet.\n\nSuggestions:\n- Visit the official website for the latest datasheet\n- Contact customer service for technical materials",
                'sample_request' => "Sure, I can help you request samples.\n\nPlease provide the following information:\n1. **Product Model** — Which model sample do you need\n2. **Quantity** — Usually 1-5 pcs\n3. **Contact Info** — Name and phone number\n4. **Purpose** — Brief description of sample use (optional)\n\nFor example: Request sample **STM32F103C8T6**, 3 pcs, for project evaluation.",
                'general_unavailable' => "Thank you for your inquiry! The AI service is temporarily unavailable, and I am using basic mode to serve you.\n\nYou can try the following ways to ask:\n- Enter **product model** to check stock and price\n- Say **help** to view the full function list\n- Say **hello** to start a conversation\n\nFor smarter service, please contact online customer service.",
                'stock_query_error' => 'Encountered a problem while checking stock, please try again later.',
                'price_query_error' => 'Encountered a problem while checking price, please try again later.',
                'search_error' => 'Encountered a problem while searching, please try again later.',
                'alt_query_error' => 'Encountered a problem while querying alternatives, please try again later.',
                'ds_query_error' => 'Encountered a problem while querying documents, please try again later.',
                'similar_reason_same_series' => 'Same Series',
                'similar_reason_same_brand' => 'Same Brand',
                'similar_reason_in_stock' => 'In Stock',
            ],
            'ja' => [
                'empty_input' => '検索したい製品型番を入力するか、ご要件を説明してください。',
                'greeting' => "こんにちは！MonaShop半導体ショッピングアシスタントです。お手伝いできることがあれば喜んでお手伝いします。\n\n以下のことができます：\n- **製品在庫の確認** — 型番を入力してください。例：STM32F103C8T6 在庫\n- **見積もり情報の取得** — 型番+数量を入力してください。例：STM32F103 見積もり 1000個\n- **代替品の推薦** — 入力：STM32F103 の代替品を推薦\n- **データシートの検索** — 入力：STM32F103 データシート\n\n何かお手伝いできることはありますか？",
                'help' => "以下はお手伝いできることです：\n\n| 機能 | 例 |\n|------|------|\n| 在庫確認 | STM32F103C8T6 の在庫はありますか |\n| 価格確認 | STM32F103 見積もり 1000個 |\n| 製品検索 | 3.3VのLDOを探す |\n| 代替品 | GD32 を STM32F103 の代替品として推薦 |\n| データシート | STM32F103 データシート |\n| サンプル申請 | STM32F103 のサンプルを申請 |\n\n必要なことを直接入力してください。最善を尽くしてお手伝いします！",
                'stock_no_model' => "確認したい製品の型番を提供してください。\n\n例：**STM32F103C8T6** の在庫はありますか？",
                'stock_not_found_prefix' => "❌ **在庫情報が見つかりません**\n\n型番 **",
                'stock_not_found_suffix' => "** の製品はシステムに見つかりませんでした。\n\n",
                'stock_recommendations' => "**以下の類似型番を推薦します：**\n\n",
                'stock_table_header' => "| 型番 | 名称 | ブランド | 在庫 | 説明 |\n|------|------|------|------|------|\n",
                'stock_in_stock' => "✅ ",
                'stock_out_of_stock' => "❌ 在庫切れ",
                'stock_similarity' => "パラメータが類似",
                'stock_suggestions' => "**提案：**\n- 型番のスペルが正しいか確認してください\n- 部分型番で検索してみてください。例：**STM32F103**\n- 詳細な在庫情報についてはカスタマーサービスにお問い合わせください\n- 特定の型番が必要な場合は、見積もり依頼を提出してください。お手伝いします",
                'stock_query_result' => "以下の製品在庫情報が見つかりました：\n\n",
                'stock_table_header2' => "| 型番 | 名称 | ブランド | 在庫状況 |\n|------|------|------|----------|\n",
                'stock_has_stock' => "✅ **在庫あり**",
                'stock_no_stock' => "❌ **在庫切れ**",
                'stock_normally_stocked' => ' 📌 常備品',
                'stock_disclaimer' => "> ⚠️ 在庫データはリアルタイムで変動します。実際の注文時を基準としてください。大量調達の場合は、カスタマーサービスにご確認ください。",
                'price_no_model' => "確認したい製品の型番を提供してください。\n\n例：**STM32F103C8T6** 見積もり 1000個",
                'price_not_found' => "申し訳ありませんが、型番 **",
                'price_not_found_suffix' => "** の製品情報は見つかりませんでした。",
                'price_info_prefix' => "**",
                'price_info_suffix' => "** の価格情報：\n\n",
                'price_table_header' => "| 最小注文量 | 単価 (USD) |\n|--------|------------|\n",
                'price_table_row' => "| ≥",
                'price_table_row_suffix' => " 個 | $",
                'price_table_row_end' => " |\n",
                'price_base_price' => "- **基本単価**：$",
                'price_base_price_suffix' => "/個\n",
                'price_quantity_quote' => "### ",
                'price_quantity_quote_suffix' => " 個の見積もり\n",
                'price_unit_price' => "- **単価**：$",
                'price_unit_price_suffix' => "/個\n",
                'price_total_price' => "- **合計金額**：$",
                'price_bulk_tip' => "\n> 💡 大量調達の場合は、カスタマーサービスにお問い合わせいただくとよりお得な価格がございます。",
                'search_no_keyword' => '検索したい製品の型番またはキーワードを教えてください。',
                'search_not_found' => "**",
                'search_not_found_suffix' => "** に関連する製品は見つかりませんでした。\n\n他のキーワードを試すか、カスタマーサービスにお問い合わせください。",
                'search_result_prefix' => "以下の関連製品が見つかりました：\n\n",
                'search_table_header' => "| 型番 | 名称 | ブランド | パッケージ | 単価 | 在庫 |\n|------|------|------|------|------|------|\n",
                'search_price_inquiry' => '見積もり依頼',
                'search_out_of_stock' => '在庫切れ',
                'search_more_info' => "詳細については、具体的な型番を教えてください。",
                'alt_no_model' => "代替品が必要な製品の型番を提供してください。\n\n例：**GD32** を STM32F103 の代替品として推薦",
                'alt_not_found' => "型番 **",
                'alt_not_found_suffix' => "** は見つかりませんでした。代替品を推薦できません。",
                'alt_found_prefix' => "**",
                'alt_found_suffix' => "** の代替製品が見つかりました：\n\n",
                'alt_table_header' => "| 型番 | 名称 | ブランド | 単価 | 在庫 | マッチング説明 |\n|------|------|------|------|------|----------|\n",
                'alt_package_match' => 'パッケージ互換',
                'alt_param_similar' => 'パラメータ類似',
                'alt_warning' => "> ⚠️ 代替品の推薦は参考用です。使用前にピン互換性とパラメータの違いを確認することをお勧めします。",
                'alt_no_alternative' => "申し訳ありませんが、**",
                'alt_no_alternative_suffix' => "** の代替製品はまだ見つかっていません。\n\nカスタマーサービスにお問い合わせください。より多くの代替案をお探しします。",
                'ds_no_model' => '製品型番を提供してください。例：STM32F103 データシート',
                'ds_not_found' => "型番 **",
                'ds_not_found_suffix' => "** の製品情報は見つかりませんでした。",
                'ds_found_prefix' => "**",
                'ds_found_suffix' => "** のデータシート：\n\n📎 [データシートを表示](",
                'ds_found_end' => ")\n\nその他の技術資料については、カスタマーサービスにお問い合わせください。",
                'ds_doc_found_prefix' => "**",
                'ds_doc_found_suffix' => "** のデータシート：\n\n📎 [データシートを表示](",
                'ds_not_uploaded_prefix' => "**",
                'ds_not_uploaded_suffix' => "** のデータシートはまだアップロードされていません。\n\n提案：\n- 公式ウェブサイトで最新のデータシートを取得\n- カスタマーサービスに技術資料を請求",
                'sample_request' => "はい、サンプルの申請をお手伝いできます。\n\n以下の情報を提供してください：\n1. **製品型番** — どの型番のサンプルが必要ですか\n2. **申請数量** — 通常1-5個\n3. **連絡先** — お名前と電話番号\n4. **用途説明** — サンプルの用途を簡単に説明（任意）\n\n例：サンプル **STM32F103C8T6** を3個、プロジェクト評価用に申請。",
                'general_unavailable' => "お問い合わせありがとうございます！現在AIサービスは一時的に利用できません。基本モードでサービスを提供しています。\n\n以下の方法でお試しください：\n- **製品型番**を入力して在庫と価格を確認\n- 「**ヘルプ**」と言って完全な機能リストを表示\n- 「**こんにちは**」と言って会話を開始\n\nよりスマートなサービスが必要な場合は、オンラインカスタマーサービスにお問い合わせください。",
                'stock_query_error' => '在庫確認中に問題が発生しました。後でもう一度お試しください。',
                'price_query_error' => '価格確認中に問題が発生しました。後でもう一度お試しください。',
                'search_error' => '検索中に問題が発生しました。後でもう一度お試しください。',
                'alt_query_error' => '代替品の照会中に問題が発生しました。後でもう一度お試しください。',
                'ds_query_error' => '文書の照会中に問題が発生しました。後でもう一度お試しください。',
                'similar_reason_same_series' => '同シリーズ',
                'similar_reason_same_brand' => '同ブランド',
                'similar_reason_in_stock' => '在庫あり',
            ],
            'ko' => [
                'empty_input' => '검색하려는 제품 모델 번호를 입력하거나 요구 사항을 설명하십시오.',
                'greeting' => "안녕하세요! MonaShop 반도체 쇼핑 어시스턴트입니다. 기꺼이 도와드리겠습니다.\n\n다음을 도와드릴 수 있습니다:\n- **제품 재고 확인** — 모델 번호 입력, 예: STM32F103C8T6 재고\n- **견적 정보 얻기** — 모델 번호+수량 입력, 예: STM32F103 견적 1000개\n- **대체품 추천** — 입력: STM32F103 대체품 추천\n- **데이터시트 찾기** — 입력: STM32F103 데이터시트\n\n무엇을 도와드릴까요?",
                'help' => "다음은 제가 도와드릴 수 있는 것들입니다:\n\n| 기능 | 예시 |\n|------|------|\n| 재고 확인 | STM32F103C8T6 재고 |\n| 가격 확인 | STM32F103 견적 1000개 |\n| 제품 검색 | 3.3V LDO 찾기 |\n| 대체품 | GD32를 STM32F103의 대체품으로 추천 |\n| 데이터시트 | STM32F103 데이터시트 |\n| 샘플 신청 | STM32F103 샘플 신청 |\n\n필요한 것을 직접 입력하세요. 최선을 다해 도와드리겠습니다!",
                'stock_no_model' => "확인하려는 제품의 모델 번호를 제공하십시오.\n\n예: **STM32F103C8T6** 재고?",
                'stock_not_found_prefix' => "❌ **재고 정보를 찾을 수 없습니다**\n\n모델 번호 **",
                'stock_not_found_suffix' => "** 제품을 시스템에서 찾을 수 없습니다.\n\n",
                'stock_recommendations' => "**다음과 같은 유사 모델을 추천합니다:**\n\n",
                'stock_table_header' => "| 모델 | 이름 | 브랜드 | 재고 | 설명 |\n|------|------|------|------|------|\n",
                'stock_in_stock' => "✅ ",
                'stock_out_of_stock' => "❌ 품절",
                'stock_similarity' => "유사한 매개변수",
                'stock_suggestions' => "**제안:**\n- 모델 번호 철자가 올바른지 확인하십시오\n- 부분 모델 번호로 검색해 보십시오. 예: **STM32F103**\n- 자세한 재고 정보는 고객 서비스에 문의하십시오\n- 특정 모델이 필요한 경우 견적 요청을 제출하십시오. 저희가 공급처를 찾아드리겠습니다",
                'stock_query_result' => "다음 제품 재고 정보를 찾았습니다:\n\n",
                'stock_table_header2' => "| 모델 | 이름 | 브랜드 | 재고 상태 |\n|------|------|------|----------|\n",
                'stock_has_stock' => "✅ **재고 있음**",
                'stock_no_stock' => "❌ **품절**",
                'stock_normally_stocked' => ' 📌 정기 재고',
                'stock_disclaimer' => "> ⚠️ 재고 데이터는 실시간으로 변동됩니다. 실제 주문 시를 기준으로 하십시오. 대량 조달의 경우 고객 서비스에 확인하는 것이 좋습니다.",
                'price_no_model' => "확인하려는 제품의 모델 번호를 제공하십시오.\n\n예: **STM32F103C8T6** 견적 1000개",
                'price_not_found' => "죄송합니다. 모델 번호 **",
                'price_not_found_suffix' => "** 제품 정보를 찾을 수 없습니다.",
                'price_info_prefix' => "**",
                'price_info_suffix' => "** 가격 정보:\n\n",
                'price_table_header' => "| 최소 주문량 | 단가 (USD) |\n|--------|------------|\n",
                'price_table_row' => "| ≥",
                'price_table_row_suffix' => " 개 | $",
                'price_table_row_end' => " |\n",
                'price_base_price' => "- **기본 단가**: $",
                'price_base_price_suffix' => "/개\n",
                'price_quantity_quote' => "### ",
                'price_quantity_quote_suffix' => " 개 견적\n",
                'price_unit_price' => "- **단가**: $",
                'price_unit_price_suffix' => "/개\n",
                'price_total_price' => "- **총액**: $",
                'price_bulk_tip' => "\n> 💡 대량 조달의 경우 고객 서비스에 문의하시면 더 유리한 가격을 받으실 수 있습니다.",
                'search_no_keyword' => '검색하려는 제품의 모델 번호나 키워드를 알려주십시오.',
                'search_not_found' => "**",
                'search_not_found_suffix' => "** 관련 제품을 찾을 수 없습니다.\n\n다른 키워드를 시도하거나 고객 서비스에 문의하십시오.",
                'search_result_prefix' => "다음 관련 제품을 찾았습니다:\n\n",
                'search_table_header' => "| 모델 | 이름 | 브랜드 | 패키지 | 단가 | 재고 |\n|------|------|------|------|------|------|\n",
                'search_price_inquiry' => '견적 문의',
                'search_out_of_stock' => '품절',
                'search_more_info' => "자세한 내용은 구체적인 모델 번호를 알려주십시오.",
                'alt_no_model' => "대체품이 필요한 제품의 모델 번호를 제공하십시오.\n\n예: **GD32**를 STM32F103의 대체품으로 추천",
                'alt_not_found' => "모델 번호 **",
                'alt_not_found_suffix' => "**를 찾을 수 없어 대체품을 추천할 수 없습니다.",
                'alt_found_prefix' => "**",
                'alt_found_suffix' => "**의 대체 제품을 찾았습니다:\n\n",
                'alt_table_header' => "| 모델 | 이름 | 브랜드 | 단가 | 재고 | 매칭 설명 |\n|------|------|------|------|------|----------|\n",
                'alt_package_match' => '패키지 호환',
                'alt_param_similar' => '유사한 매개변수',
                'alt_warning' => "> ⚠️ 대체품 추천은 참고용입니다. 사용 전에 핀 호환성과 매개변수 차이를 확인하시기 바랍니다.",
                'alt_no_alternative' => "죄송합니다. **",
                'alt_no_alternative_suffix' => "**의 대체 제품을 아직 찾지 못했습니다.\n\n고객 서비스에 문의하십시오. 더 많은 대체 솔루션을 찾아드리겠습니다.",
                'ds_no_model' => '제품 모델 번호를 제공하십시오. 예: STM32F103 데이터시트',
                'ds_not_found' => "모델 번호 **",
                'ds_not_found_suffix' => "** 제품 정보를 찾을 수 없습니다.",
                'ds_found_prefix' => "**",
                'ds_found_suffix' => "** 데이터시트:\n\n📎 [데이터시트 보기](",
                'ds_found_end' => ")\n\n더 많은 기술 자료가 필요하면 고객 서비스에 문의하십시오.",
                'ds_doc_found_prefix' => "**",
                'ds_doc_found_suffix' => "** 데이터시트:\n\n📎 [데이터시트 보기](",
                'ds_not_uploaded_prefix' => "**",
                'ds_not_uploaded_suffix' => "** 데이터시트는 아직 업로드되지 않았습니다.\n\n제안:\n- 최신 데이터시트는 공식 웹사이트에서 확인\n- 기술 자료는 고객 서비스에 요청",
                'sample_request' => "네, 샘플 신청을 도와드리겠습니다.\n\n다음 정보를 제공해 주십시오:\n1. **제품 모델** — 어떤 모델의 샘플이 필요하십니까\n2. **신청 수량** — 보통 1-5개\n3. **연락처** — 이름과 전화번호\n4. **용도 설명** — 샘플 용도를 간단히 설명(선택)\n\n예: 샘플 **STM32F103C8T6** 3개, 프로젝트 평가용으로 신청.",
                'general_unavailable' => "문의해 주셔서 감사합니다! 현재 AI 서비스를 일시적으로 사용할 수 없습니다. 기본 모드로 서비스를 제공하고 있습니다.\n\n다음 방법으로 시도해 보십시오:\n- **제품 모델 번호**를 입력하여 재고와 가격 확인\n- **도움**이라고 말하여 전체 기능 목록 보기\n- **안녕하세요**라고 말하여 대화 시작\n\n더 스마트한 서비스가 필요하면 온라인 고객 서비스에 문의하십시오.",
                'stock_query_error' => '재고 확인 중 문제가 발생했습니다. 나중에 다시 시도하십시오.',
                'price_query_error' => '가격 확인 중 문제가 발생했습니다. 나중에 다시 시도하십시오.',
                'search_error' => '검색 중 문제가 발생했습니다. 나중에 다시 시도하십시오.',
                'alt_query_error' => '대체품 조회 중 문제가 발생했습니다. 나중에 다시 시도하십시오.',
                'ds_query_error' => '문서 조회 중 문제가 발생했습니다. 나중에 다시 시도하십시오.',
                'similar_reason_same_series' => '동일 시리즈',
                'similar_reason_same_brand' => '동일 브랜드',
                'similar_reason_in_stock' => '재고 있음',
            ],
        ];
        
        $langTexts = $texts[$this->lang] ?? $texts['zh'];
        return $langTexts[$key] ?? $texts['zh'][$key] ?? $key;
    }

    /**
     * 意图检测
     *
     * @access private
     * @param string $message 用户消息
     * @return string 意图类型
     */
    private function detectIntent(string $message): string
    {
        $msg = strtolower($message);

        // 问候
        if (preg_match('/^(你好|hi|hello|hey|嗨|在吗|在不在|こんにちは|안녕)/', $msg)) {
            return 'greeting';
        }

        // 帮助
        if (preg_match('/(帮助|help|你能做什么|功能|怎么用|使用说明|ヘルプ|도움)/', $msg)) {
            return 'help';
        }

        // 库存查询
        if (preg_match('/(库存|有货|存货|stock|available|有多少|在庫|재고)/', $msg)) {
            return 'stock';
        }

        // 价格/报价
        if (preg_match('/(报价|价格|多少钱|price|cost|费用|单价|価格|見積もり|가격|견적)/', $msg)) {
            return 'price';
        }

        // 替代推荐
        if (preg_match('/(替代|代替|compatible|replacement|替换|pin.*to.*pin|代替品|대체)/', $msg)) {
            return 'alternative';
        }

        // 数据手册
        if (preg_match('/(数据手册|datasheet|手册|文档|规格书|データシート|マニュアル|문서)/', $msg)) {
            return 'datasheet';
        }

        // 样品申请
        if (preg_match('/(样品|sample|申请.*样|免费.*样|サンプル|샘플)/', $msg)) {
            return 'sample';
        }

        // 产品搜索（包含型号特征或产品关键词）
        if (preg_match('/(STM32|GD32|ESP32|CH340|LM317|AMS1117|NE555|ATmega|PIC|Arduino|LDO|MOSFET|MCU|传感器|电容|电阻|电感|二极管|三极管|运放)/i', $msg)) {
            return 'product_search';
        }

        return 'general';
    }

    /**
     * 处理库存查询
     *
     * @access private
     * @param string $message 用户消息
     * @return array
     */
    private function handleStockQuery(string $message): array
    {
        // 提取型号
        $modelNumber = $this->extractModelNumber($message);

        if (empty($modelNumber)) {
            return $this->reply($this->getText('stock_no_model'));
        }

        try {
            $product = Db::name('product')
                ->where('product_code', 'like', "%{$modelNumber}%")
                ->whereOr('model_number', 'like', "%{$modelNumber}%")
                ->whereOr('name', 'like', "%{$modelNumber}%")
                ->where('is_on_sale', 1)
                ->field('id, product_code, name, model_number, stock, normally_stocked, brand')
                ->limit(5)
                ->select()
                ->toArray();

            if (empty($product)) {
                // 未找到该型号，推荐相似型号
                $recommendations = $this->getSimilarProducts($modelNumber);
                
                $reply = $this->getText('stock_not_found_prefix') . $modelNumber . $this->getText('stock_not_found_suffix');
                
                if (!empty($recommendations)) {
                    $reply .= $this->getText('stock_recommendations');
                    $reply .= $this->getText('stock_table_header');
                    foreach ($recommendations as $rec) {
                        $stockStatus = $rec['stock'] > 0 ? $this->getText('stock_in_stock') . $rec['stock'] . "pcs" : $this->getText('stock_out_of_stock');
                        $similarity = $rec['similarity_reason'] ?? $this->getText('stock_similarity');
                        $reply .= "| {$rec['product_code']} | {$rec['name']} | {$rec['brand']} | {$stockStatus} | {$similarity} |\n";
                    }
                    $reply .= "\n";
                }
                
                $reply .= $this->getText('stock_suggestions');
                
                return $this->reply($reply);
            }

            $lines = [];
            foreach ($product as $p) {
                $stockStatus = $p['stock'] > 0
                    ? $this->getText('stock_has_stock') . " ({$p['stock']} pcs)"
                    : $this->getText('stock_no_stock');
                $normallyStocked = $p['normally_stocked'] ? $this->getText('stock_normally_stocked') : '';
                $lines[] = "| {$p['product_code']} | {$p['name']} | {$p['brand']} | {$stockStatus}{$normallyStocked} |";
            }

            $header = $this->getText('stock_table_header2');
            $sep = "|------|------|------|----------|";

            return $this->reply(
                $this->getText('stock_query_result') .
                $header . $sep . "\n" .
                implode("\n", $lines) . "\n\n" .
                $this->getText('stock_disclaimer')
            );
        } catch (\Throwable $e) {
            Log::error('降级库存查询失败: ' . $e->getMessage());
            return $this->reply($this->getText('stock_query_error'));
        }
    }

    /**
     * 处理价格查询
     *
     * @access private
     * @param string $message 用户消息
     * @return array
     */
    private function handlePriceQuery(string $message): array
    {
        $modelNumber = $this->extractModelNumber($message);
        $quantity = $this->extractQuantity($message);

        if (empty($modelNumber)) {
            return $this->reply($this->getText('price_no_model'));
        }

        try {
            $product = Db::name('product')
                ->where('product_code', 'like', "%{$modelNumber}%")
                ->whereOr('model_number', 'like', "%{$modelNumber}%")
                ->where('is_on_sale', 1)
                ->field('id, product_code, name, model_number, price, brand')
                ->find();

            if (!$product) {
                return $this->reply($this->getText('price_not_found') . $modelNumber . $this->getText('price_not_found_suffix'));
            }

            // 查询阶梯价格
            $priceBreaks = Db::name('product_price_break')
                ->where('product_id', $product['id'])
                ->order('min_quantity', 'asc')
                ->select()
                ->toArray();

            $reply = $this->getText('price_info_prefix') . $product['product_code'] . $this->getText('price_info_suffix');

            if (!empty($priceBreaks)) {
                $reply .= $this->getText('price_table_header');
                foreach ($priceBreaks as $break) {
                    $reply .= $this->getText('price_table_row') . $break['min_quantity'] . $this->getText('price_table_row_suffix') . $break['price'] . $this->getText('price_table_row_end');
                }
                $reply .= "\n";
            }

            if ($product['price']) {
                $reply .= $this->getText('price_base_price') . $product['price'] . $this->getText('price_base_price_suffix');
            }

            if ($quantity > 0) {
                // 计算对应阶梯价
                $unitPrice = $product['price'];
                foreach ($priceBreaks as $break) {
                    if ($quantity >= $break['min_quantity']) {
                        $unitPrice = $break['price'];
                    }
                }
                $total = $unitPrice * $quantity;
                $reply .= "\n---\n";
                $reply .= $this->getText('price_quantity_quote') . $quantity . $this->getText('price_quantity_quote_suffix');
                $reply .= $this->getText('price_unit_price') . $unitPrice . $this->getText('price_unit_price_suffix');
                $reply .= $this->getText('price_total_price') . number_format($total, 2) . "\n";
            }

            $reply .= $this->getText('price_bulk_tip');

            return $this->reply($reply);
        } catch (\Throwable $e) {
            Log::error('降级价格查询失败: ' . $e->getMessage());
            return $this->reply($this->getText('price_query_error'));
        }
    }

    /**
     * 处理产品搜索
     *
     * @access private
     * @param string $message 用户消息
     * @return array
     */
    private function handleProductSearch(string $message): array
    {
        $keyword = $this->extractModelNumber($message);
        if (empty($keyword)) {
            $keyword = preg_replace('/(找|搜索|查询|有没有|推荐一款|求|需要|要|想买|探す|検索|찾다|검색)/', '', $message);
            $keyword = trim($keyword);
        }

        if (empty($keyword)) {
            return $this->reply($this->getText('search_no_keyword'));
        }

        try {
            $products = Db::name('product')
                ->where('is_on_sale', 1)
                ->where(function($q) use ($keyword) {
                    $q->where('product_code', 'like', "%{$keyword}%")
                      ->whereOr('model_number', 'like', "%{$keyword}%")
                      ->whereOr('name', 'like', "%{$keyword}%")
                      ->whereOr('brand', 'like', "%{$keyword}%");
                })
                ->field('id, product_code, name, model_number, brand, price, stock, package_type')
                ->order('views', 'desc')
                ->limit(5)
                ->select()
                ->toArray();

            if (empty($products)) {
                return $this->reply($this->getText('search_not_found') . $keyword . $this->getText('search_not_found_suffix'));
            }

            $lines = [];
            foreach ($products as $p) {
                $price = $p['price'] ? "${$p['price']}" : $this->getText('search_price_inquiry');
                $stock = $p['stock'] > 0 ? "{$p['stock']}pcs" : $this->getText('search_out_of_stock');
                $lines[] = "| {$p['product_code']} | {$p['name']} | {$p['brand']} | {$p['package_type']} | {$price} | {$stock} |";
            }

            return $this->reply(
                $this->getText('search_result_prefix') .
                $this->getText('search_table_header') .
                implode("\n", $lines) . "\n\n" .
                $this->getText('search_more_info')
            );
        } catch (\Throwable $e) {
            Log::error('降级产品搜索失败: ' . $e->getMessage());
            return $this->reply($this->getText('search_error'));
        }
    }

    /**
     * 处理替代推荐
     *
     * @access private
     * @param string $message 用户消息
     * @return array
     */
    private function handleAlternative(string $message): array
    {
        $modelNumber = $this->extractModelNumber($message);

        if (empty($modelNumber)) {
            return $this->reply($this->getText('alt_no_model'));
        }

        try {
            $original = Db::name('product')
                ->where('product_code', 'like', "%{$modelNumber}%")
                ->whereOr('model_number', 'like', "%{$modelNumber}%")
                ->where('is_on_sale', 1)
                ->field('id, product_code, name, model_number, brand, package_type, pin_count, category_fk_id')
                ->find();

            if (!$original) {
                return $this->reply($this->getText('alt_not_found') . $modelNumber . $this->getText('alt_not_found_suffix'));
            }

            // 查找同分类下有库存的产品
            $alternatives = Db::name('product')
                ->where('category_fk_id', $original['category_fk_id'])
                ->where('id', '<>', $original['id'])
                ->where('is_on_sale', 1)
                ->where('stock', '>', 0)
                ->when($original['package_type'], function($q) use ($original) {
                    $q->where('package_type', $original['package_type']);
                })
                ->field('id, product_code, name, model_number, brand, price, stock, package_type')
                ->order('stock', 'desc')
                ->limit(5)
                ->select()
                ->toArray();

            if (empty($alternatives)) {
                return $this->reply(
                    $this->getText('alt_no_alternative') . $original['product_code'] . $this->getText('alt_no_alternative_suffix')
                );
            }

            $lines = [];
            foreach ($alternatives as $alt) {
                $matchReason = [];
                if ($alt['package_type'] === $original['package_type']) {
                    $matchReason[] = $this->getText('alt_package_match');
                }
                $lines[] = "| {$alt['product_code']} | {$alt['name']} | {$alt['brand']} | ${$alt['price']} | {$alt['stock']}pcs | " . (implode('、', $matchReason) ?: $this->getText('alt_param_similar')) . " |";
            }

            return $this->reply(
                $this->getText('alt_found_prefix') . $original['product_code'] . $this->getText('alt_found_suffix') .
                $this->getText('alt_table_header') .
                implode("\n", $lines) . "\n\n" .
                $this->getText('alt_warning')
            );
        } catch (\Throwable $e) {
            Log::error('降级替代推荐失败: ' . $e->getMessage());
            return $this->reply($this->getText('alt_query_error'));
        }
    }

    /**
     * 处理数据手册查询
     *
     * @access private
     * @param string $message 用户消息
     * @return array
     */
    private function handleDatasheet(string $message): array
    {
        $modelNumber = $this->extractModelNumber($message);

        if (empty($modelNumber)) {
            return $this->reply($this->getText('ds_no_model'));
        }

        try {
            $product = Db::name('product')
                ->where('product_code', 'like', "%{$modelNumber}%")
                ->whereOr('model_number', 'like', "%{$modelNumber}%")
                ->where('is_on_sale', 1)
                ->field('id, product_code, name, model_number, datasheet_url')
                ->find();

            if (!$product) {
                return $this->reply($this->getText('ds_not_found') . $modelNumber . $this->getText('ds_not_found_suffix'));
            }

            if (!empty($product['datasheet_url'])) {
                return $this->reply(
                    $this->getText('ds_found_prefix') . $product['product_code'] . $this->getText('ds_found_suffix') . $product['datasheet_url'] . $this->getText('ds_found_end')
                );
            }

            // 尝试从文档表查找
            $doc = Db::name('document')
                ->where('product_id', $product['id'])
                ->where('type', 'datasheet')
                ->find();

            if ($doc && !empty($doc['url'])) {
                return $this->reply(
                    $this->getText('ds_doc_found_prefix') . $product['product_code'] . $this->getText('ds_doc_found_suffix') . $doc['url'] . ")"
                );
            }

            return $this->reply(
                $this->getText('ds_not_uploaded_prefix') . $product['product_code'] . $this->getText('ds_not_uploaded_suffix')
            );
        } catch (\Throwable $e) {
            Log::error('降级文档查询失败: ' . $e->getMessage());
            return $this->reply($this->getText('ds_query_error'));
        }
    }

    /**
     * 处理样品申请
     *
     * @access private
     * @param string $message 用户消息
     * @return array
     */
    private function handleSample(string $message): array
    {
        return $this->reply($this->getText('sample_request'));
    }

    /**
     * 处理通用查询
     *
     * @access private
     * @param string $message 用户消息
     * @return array
     */
    private function handleGeneralQuery(string $message): array
    {
        return $this->reply($this->getText('general_unavailable'));
    }

    /**
     * 提取型号
     *
     * @access private
     * @param string $message 用户消息
     * @return string
     */
    private function extractModelNumber(string $message): string
    {
        // 清理消息，移除常见干扰词
        $cleanMessage = preg_replace('/(有多少库存|库存|报价|价格|数据手册|样品|申请|推荐|替代|兼容|在庫|価格|見積もり|データシート|サンプル|재고|가격|견적|데이터시트|샘플)/', '', $message);
        $cleanMessage = trim($cleanMessage);
        
        // 匹配常见电子元器件型号格式 - 按优先级排序
        $patterns = [
            // STM32F103C8T6, STM32F407VGT6 等完整型号
            '/\b(STM32[A-Z]?\d{3,4}[A-Z]{0,3}\d{0,2}[A-Z]\d[A-Z]?)\b/i',
            // GD32F103C8T6, GD32F407VGT6 等
            '/\b(GD32[A-Z]?\d{3,4}[A-Z]{0,3}\d{0,2}[A-Z]\d[A-Z]?)\b/i',
            // ESP32系列
            '/\b(ESP32[-_]?[A-Z]?\d*[A-Z]*)\b/i',
            // CH340系列
            '/\b(CH\d{3}[A-Z]?)\b/i',
            // LM系列
            '/\b(LM\d{3}[A-Z]?)\b/i',
            // AMS系列
            '/\b(AMS\d{3,4}[A-Z]?)\b/i',
            // ATmega系列
            '/\b(ATmega\d{2,4}[A-Z]?)\b/i',
            // PIC系列
            '/\b(PIC\d{2,4}[A-Z]{0,3}\d{0,4}[A-Z]?)\b/i',
            // NE系列
            '/\b(NE\d{3}[A-Z]?)\b/i',
            // 通用型号格式
            '/\b([A-Z]{2,6}\d{2,6}[A-Z]{0,4}\d{0,3}[A-Z]{0,2})\b/i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $cleanMessage, $matches)) {
                return strtoupper(trim($matches[1]));
            }
        }

        return '';
    }

    /**
     * 提取数量
     *
     * @access private
     * @param string $message 用户消息
     * @return int
     */
    private function extractQuantity(string $message): int
    {
        if (preg_match('/(\d+)\s*(片|个|pcs|件|K|個|개)/i', $message, $matches)) {
            $qty = (int) $matches[1];
            $unit = strtoupper($matches[2]);
            if ($unit === 'K') {
                $qty *= 1000;
            }
            return $qty;
        }
        return 0;
    }

    /**
     * 获取相似产品推荐
     * 当找不到精确匹配时，根据型号前缀、品牌、分类推荐相似产品
     *
     * @access private
     * @param string $modelNumber 用户查询的型号
     * @param int $limit 推荐数量
     * @return array
     */
    private function getSimilarProducts(string $modelNumber, int $limit = 5): array
    {
        try {
            // 提取型号前缀（如 STM32F103C8T6 -> STM32F103）
            $prefix = preg_replace('/[A-Z]\d+$/', '', $modelNumber); // 去掉末尾的封装代码
            $prefix = preg_replace('/\d+$/', '', $prefix); // 再尝试去掉数字
            $brand = $this->extractBrand($modelNumber);
            
            $query = Db::name('product')
                ->where('is_on_sale', 1)
                ->field('id, product_code, name, model_number, brand, stock, package_type');
            
            // 优先匹配相同前缀的产品
            if (!empty($prefix) && strlen($prefix) >= 3) {
                $query->where(function($q) use ($prefix, $modelNumber) {
                    $q->where('product_code', 'like', "{$prefix}%")
                      ->whereOr('model_number', 'like', "{$prefix}%");
                });
            } else {
                // 没有有效前缀，按品牌匹配
                $query->where(function($q) use ($modelNumber) {
                    $q->where('product_code', 'like', "%{$modelNumber}%")
                      ->whereOr('model_number', 'like', "%{$modelNumber}%");
                });
            }
            
            // 排除完全匹配的（已经确认没有了）
            $query->where('product_code', '<>', $modelNumber)
                  ->where('model_number', '<>', $modelNumber);
            
            $products = $query->order('stock', 'desc')
                ->limit($limit)
                ->select()
                ->toArray();
            
            // 添加相似度说明
            foreach ($products as &$product) {
                $reasons = [];
                
                // 判断相似性原因
                if (!empty($prefix) && (strpos($product['product_code'], $prefix) === 0 || strpos($product['model_number'], $prefix) === 0)) {
                    $reasons[] = $this->getText('similar_reason_same_series');
                }
                if ($brand && $product['brand'] === $brand) {
                    $reasons[] = $this->getText('similar_reason_same_brand');
                }
                if ($product['stock'] > 0) {
                    $reasons[] = $this->getText('similar_reason_in_stock');
                }
                
                $product['similarity_reason'] = !empty($reasons) ? implode('、', $reasons) : $this->getText('stock_similarity');
            }
            
            return $products;
        } catch (\Throwable $e) {
            Log::error('获取相似产品失败: ' . $e->getMessage());
            return [];
        }
    }
    
    /**
     * 提取品牌
     *
     * @access private
     * @param string $modelNumber 型号
     * @return string
     */
    private function extractBrand(string $modelNumber): string
    {
        $brandMap = [
            'STM32' => 'ST',
            'GD32' => 'GigaDevice',
            'CH340' => 'WCH',
            'ESP32' => 'Espressif',
            'LM317' => 'TI',
            'AMS1117' => 'AMS',
            'ATmega' => 'Microchip',
            'PIC' => 'Microchip',
            'NE555' => 'TI',
            'PCF' => 'NXP',
            'SHT' => 'Sensirion',
            'BMP' => 'Bosch',
            'MPU' => 'InvenSense',
        ];
        
        foreach ($brandMap as $prefix => $brand) {
            if (stripos($modelNumber, $prefix) === 0) {
                return $brand;
            }
        }
        
        return '';
    }

    /**
     * 构建回复
     *
     * @access private
     * @param string $content 回复内容
     * @return array
     */
    private function reply(string $content): array
    {
        return [
            'success' => true,
            'content' => $content,
            'tool_calls' => [],
            'fallback' => true,
        ];
    }
}
