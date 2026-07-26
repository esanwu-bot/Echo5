/**
 * 前台 API message → i18n key 映射表
 * 
 * 后端 API 返回的 message 是硬编码中文原文，前端需要查表后通过 i18next 翻译成当前语言。
 * 翻译数据已通过火山引擎写入 sk_translation 表，经 /api/v1/translations/:lng 加载。
 * 
 * 使用方式: axios 拦截器中查表 → i18n.t(key) 替换 message
 */

export const API_MESSAGE_MAP: Record<string, string> = {
  // ===== 通用 =====
  '服务器内部错误，请稍后重试': 'api.error.server_internal',
  'success': 'api.success',
  '成功': 'api.lang.success',

  // ===== 认证 =====
  '登录成功': 'api.auth.login_success',
  '注册成功': 'api.auth.register_success',
  '退出成功': 'api.auth.logout_success',
  '密码重置成功': 'api.auth.password_reset_success',
  '重置密码邮件已发送': 'api.auth.reset_email_sent',
  '用户不存在': 'api.auth.user_not_found',
  '该邮箱未注册': 'api.auth.email_not_registered',
  '验证码无效或已过期': 'api.auth.invalid_code',
  '您操作太频繁，请稍后再试': 'api.auth.too_many_requests',

  // ===== 订单 =====
  '请先登录': 'api.order.login_required',
  '订单创建成功': 'api.order.create_success',
  '订单取消成功': 'api.order.cancel_success',
  '订单确认成功': 'api.order.confirm_success',
  '订单不存在': 'api.order.not_found',
  '无效的订单ID': 'api.order.invalid_id',
  '收货地址不存在': 'api.order.address_not_found',
  '无效的购物车商品数据': 'api.order.invalid_cart_data',
  '商品不存在或已下架': 'api.order.product_not_found',
  '商品库存不足': 'api.order.insufficient_stock',
  '无效的订单金额': 'api.order.invalid_amount',
  '只有待处理订单可以取消': 'api.order.only_pending_cancel',
  '只有已发货订单可以确认': 'api.order.only_shipped_confirm',
  '获取订单列表失败': 'api.order.list_failed',
  '获取订单详情失败': 'api.order.detail_failed',
  '创建订单失败': 'api.order.create_failed',
  '取消订单失败': 'api.order.cancel_failed',
  '确认订单失败': 'api.order.confirm_failed',

  // ===== 支付 =====
  '支付创建成功': 'api.payment.create_success',
  '支付创建失败': 'api.payment.create_failed',
  '订单状态不允许支付': 'api.payment.status_not_allowed',
  '查询成功': 'api.payment.query_success',
  '查询失败': 'api.payment.query_failed',

  // ===== 商品 =====
  '商品不存在': 'api.product.not_found',
  '搜索关键词不能为空': 'api.product.keyword_required',
  'Excel 导出功能开发中': 'api.product.export_developing',

  // ===== 购物车 =====
  '获取成功': 'api.crud.get_success',
  '添加成功': 'api.crud.add_success',
  '添加失败': 'api.cart.add_failed',
  '更新成功': 'api.crud.update_success',
  '更新失败': 'api.cart.update_failed',
  '删除成功': 'api.crud.delete_success',
  '清空成功': 'api.crud.clear_success',
  '库存不足': 'api.cart.insufficient_stock',
  '购物车项不存在': 'api.cart.item_not_found',

  // ===== 地址 =====
  '未授权': 'api.address.unauthorized',
  '地址不存在': 'api.address.not_found',
  '地址创建成功': 'api.address.create_success',
  '地址更新成功': 'api.address.update_success',
  '地址删除成功': 'api.address.delete_success',
  '默认地址更新成功': 'api.address.default_update_success',
  '未找到默认地址': 'api.address.default_not_found',
  '手机号格式不正确': 'api.validation.invalid_phone',

  // ===== 用户 =====
  '没有要更新的数据': 'api.user.no_data_to_update',
  '获取用户信息失败': 'api.user.info_failed',
  '获取订单统计失败': 'api.user.stats_failed',
  '获取收藏列表失败': 'api.user.favorites_failed',
  '收藏功能暂未实现': 'api.user.favorites_not_implemented',
  '获取询盘列表失败': 'api.user.inquiries_failed',
  '提交询盘失败': 'api.user.inquiry_submit_failed',
  '询盘提交成功': 'api.user.inquiry_submit_success',
  '获取样品申请列表失败': 'api.user.samples_failed',
  '提交样品申请失败': 'api.user.sample_submit_failed',
  '样品申请提交成功': 'api.business.sample_success',
  '获取收货地址列表失败': 'api.user.addresses_failed',
  '添加收货地址失败': 'api.user.address_add_failed',
  '更新收货地址失败': 'api.user.address_update_failed',
  '删除收货地址失败': 'api.user.address_delete_failed',
  '设置默认地址失败': 'api.user.default_address_failed',
  '更新用户信息失败': 'api.user.update_failed',
  '获取失败，请稍后重试': 'api.user.get_failed',

  // ===== 内容 =====
  '文章不存在': 'api.article.not_found',
  '新闻不存在': 'api.news.not_found',
  '培训活动不存在': 'api.training.not_found',
  '文档不存在或已下线': 'api.document.not_found',
  '文档文件路径为空': 'api.document.empty_path',
  '文件不存在或无法访问': 'api.document.file_unavailable',

  // ===== 业务 =====
  '报价申请提交成功': 'api.business.quote_success',
  '简历提交成功': 'api.job.resume_success',
  '职位不存在': 'api.job.not_found',
  '姓名、邮箱、主题和内容不能为空': 'api.message.required_fields',

  // ===== 分类/规格/字典 =====
  '分类不存在': 'api.category.not_found',
  '规格不存在': 'api.spec.not_found',
  '该规格已存在': 'api.spec.already_exists',
  '项目不存在': 'api.dictionary.item_not_found',
  '无效的设置分组': 'api.setting.invalid_group',

  // ===== 型号/供应商 =====
  '型号不存在': 'api.model.not_found',
  '该型号下有产品关联，无法删除': 'api.model.has_products',
  '供应商不存在': 'api.supplier.not_found',
  '该供应商下有产品关联，无法删除': 'api.supplier.has_products',
  '应用不存在': 'api.application.not_found',
  '产品供应商关联不存在': 'api.product_supplier.not_found',

  // ===== 上传 =====
  '上传成功': 'api.upload.success',
  '未上传文件': 'api.upload.no_file',
  '文件太大，最大限制为50MB': 'api.upload.file_too_large',
  '不支持的文件类型，仅限: pdf, doc, docx, jpg, png, txt': 'api.upload.unsupported_type',

  // ===== 语言 =====
  '语言不存在': 'api.lang.not_found',
  '没有可用的语言': 'api.lang.no_available',

  // ===== 校验 =====
  '参数不完整': 'api.validation.incomplete_params',
  '数据验证失败': 'api.validation.data_invalid',
  '数据不存在': 'api.validation.data_not_found',
};
