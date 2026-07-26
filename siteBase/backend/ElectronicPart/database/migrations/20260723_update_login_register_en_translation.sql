-- ============================================================
-- 同步 Login/Register 英文文案为 Sign in/Sign up
-- 作用：防止 i18n 翻译流水线 export-to-frontend 覆盖前台 en-us.ts 中的手动修改
-- 执行日期：2026-07-23
-- ============================================================

UPDATE `sk_translation` SET `trans_value` = 'Signed in successfully' WHERE `lang_code` = 'en-US' AND `trans_key` = 'api.auth.login_success';
UPDATE `sk_translation` SET `trans_value` = 'Signed up successfully' WHERE `lang_code` = 'en-US' AND `trans_key` = 'api.auth.register_success';
UPDATE `sk_translation` SET `trans_value` = 'Please sign in first' WHERE `lang_code` = 'en-US' AND `trans_key` = 'api.order.login_required';

UPDATE `sk_translation` SET `trans_value` = 'Sign up' WHERE `lang_code` = 'en-US' AND `trans_key` = '注册天启芯账户';
UPDATE `sk_translation` SET `trans_value` = 'Sign up failed:' WHERE `lang_code` = 'en-US' AND `trans_key` = '注册失败:';
UPDATE `sk_translation` SET `trans_value` = 'Sign up failed, please try again' WHERE `lang_code` = 'en-US' AND `trans_key` = '注册失败，请重试';
UPDATE `sk_translation` SET `trans_value` = 'Signed up successfully' WHERE `lang_code` = 'en-US' AND `trans_key` = '注册成功';

UPDATE `sk_translation` SET `trans_value` = 'Signing in...' WHERE `lang_code` = 'en-US' AND `trans_key` = '登录中...';
UPDATE `sk_translation` SET `trans_value` = 'Sign in to view inventory' WHERE `lang_code` = 'en-US' AND `trans_key` = '登录以查看库存';
UPDATE `sk_translation` SET `trans_value` = 'Sign in to order' WHERE `lang_code` = 'en-US' AND `trans_key` = '登录以订购';
UPDATE `sk_translation` SET `trans_value` = 'By signing in, you agree to' WHERE `lang_code` = 'en-US' AND `trans_key` = '登录即表示您同意天启芯的';
UPDATE `sk_translation` SET `trans_value` = 'Sign in to view the shopping cart.' WHERE `lang_code` = 'en-US' AND `trans_key` = '登录后才能查看购物车';
UPDATE `sk_translation` SET `trans_value` = 'Sign in failed, please try again' WHERE `lang_code` = 'en-US' AND `trans_key` = '登录失败，请重试';
UPDATE `sk_translation` SET `trans_value` = 'Signed in successfully' WHERE `lang_code` = 'en-US' AND `trans_key` = '登录成功';
UPDATE `sk_translation` SET `trans_value` = 'Sign in to check inventory' WHERE `lang_code` = 'en-US' AND `trans_key` = '登录查看库存';

UPDATE `sk_translation` SET `trans_value` = 'Sign up' WHERE `lang_code` = 'en-US' AND `trans_key` = '立即注册';
UPDATE `sk_translation` SET `trans_value` = 'Sign in now' WHERE `lang_code` = 'en-US' AND `trans_key` = '立即登录';
UPDATE `sk_translation` SET `trans_value` = 'Remember your password? Sign in' WHERE `lang_code` = 'en-US' AND `trans_key` = '记住密码? 登录';
UPDATE `sk_translation` SET `trans_value` = 'Back to Sign in' WHERE `lang_code` = 'en-US' AND `trans_key` = '返回登录';
UPDATE `sk_translation` SET `trans_value` = 'Sign in' WHERE `lang_code` = 'en-US' AND `trans_key` = '去登录';
UPDATE `sk_translation` SET `trans_value` = 'Sign out' WHERE `lang_code` = 'en-US' AND `trans_key` = '退出登录';

UPDATE `sk_translation` SET `trans_value` = 'Sign in to order' WHERE `lang_code` = 'en-US' AND `trans_key` = 'product_ui_6_label';
