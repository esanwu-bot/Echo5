<?php
/**
 * Database Migration Script for Multi-language Expansion
 * Adds _en, _ja, _ko columns to various business tables.
 */

// Load .env file
function loadEnv($path) {
    if (!file_exists($path)) return false;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        putenv(trim($name) . '=' . trim($value));
    }
    return true;
}

$envPath = __DIR__ . '/../.env';
if (!loadEnv($envPath)) {
    die("Error: .env file not found at $envPath\n");
}

$host = getenv('DATABASE_HOSTNAME');
$db   = getenv('DATABASE_DATABASE');
$user = getenv('DATABASE_USERNAME');
$pass = getenv('DATABASE_PASSWORD');
$port = getenv('DATABASE_HOSTPORT') ?: '3306';
$charset = getenv('DATABASE_CHARSET') ?: 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;port=$port;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    echo "Connected to database $db successfully.\n";
} catch (\PDOException $e) {
    die("Connection failed: " . $e->getMessage() . "\n");
}

function addColumn($pdo, $db, $table, $column, $definition) {
    // Check if column exists using information_schema
    $stmt = $pdo->prepare("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?");
    $stmt->execute([$db, $table, $column]);
    if ($stmt->fetch()) {
        echo "Column `$column` already exists in `$table`. Skipping.\n";
        return;
    }

    try {
        $pdo->exec("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
        echo "Successfully added `$column` to `$table`.\n";
    } catch (\PDOException $e) {
        echo "Error adding `$column` to `$table`: " . $e->getMessage() . "\n";
    }
}

// 1. sk_product
addColumn($pdo, $db, 'sk_product', 'name_ja', "VARCHAR(255) DEFAULT NULL COMMENT '产品名称(日语)' AFTER `name_en` ");
addColumn($pdo, $db, 'sk_product', 'name_ko', "VARCHAR(255) DEFAULT NULL COMMENT '产品名称(韩语)' AFTER `name_ja` ");
addColumn($pdo, $db, 'sk_product', 'description_ja', "TEXT DEFAULT NULL COMMENT '产品描述(日语)' AFTER `description_en` ");
addColumn($pdo, $db, 'sk_product', 'description_ko', "TEXT DEFAULT NULL COMMENT '产品描述(韩语)' AFTER `description_ja` ");

// 2. sk_category
addColumn($pdo, $db, 'sk_category', 'name_ja', "VARCHAR(255) DEFAULT NULL COMMENT '分类名称(日语)' AFTER `name_en` ");
addColumn($pdo, $db, 'sk_category', 'name_ko', "VARCHAR(255) DEFAULT NULL COMMENT '分类名称(韩语)' AFTER `name_ja` ");
addColumn($pdo, $db, 'sk_category', 'description_en', "TEXT DEFAULT NULL COMMENT '分类描述(英文)' AFTER `name_ko` ");
addColumn($pdo, $db, 'sk_category', 'description_ja', "TEXT DEFAULT NULL COMMENT '分类描述(日语)' AFTER `description_en` ");
addColumn($pdo, $db, 'sk_category', 'description_ko', "TEXT DEFAULT NULL COMMENT '分类描述(韩语)' AFTER `description_ja` ");

// 3. sk_brands
addColumn($pdo, $db, 'sk_brands', 'name_en', "VARCHAR(255) DEFAULT NULL COMMENT '品牌名称(英文)' AFTER `brand_name` ");
addColumn($pdo, $db, 'sk_brands', 'name_ja', "VARCHAR(255) DEFAULT NULL COMMENT '品牌名称(日语)' AFTER `name_en` ");
addColumn($pdo, $db, 'sk_brands', 'name_ko', "VARCHAR(255) DEFAULT NULL COMMENT '品牌名称(韩语)' AFTER `name_ja` ");
addColumn($pdo, $db, 'sk_brands', 'description_en', "TEXT DEFAULT NULL COMMENT '品牌描述(英文)' AFTER `description` ");
addColumn($pdo, $db, 'sk_brands', 'description_ja', "TEXT DEFAULT NULL COMMENT '品牌描述(日语)' AFTER `description_en` ");
addColumn($pdo, $db, 'sk_brands', 'description_ko', "TEXT DEFAULT NULL COMMENT '品牌描述(韩语)' AFTER `description_ja` ");

// 4. sk_article
addColumn($pdo, $db, 'sk_article', 'title_ja', "VARCHAR(255) DEFAULT NULL COMMENT '标题(日语)' AFTER `title_en` ");
addColumn($pdo, $db, 'sk_article', 'title_ko', "VARCHAR(255) DEFAULT NULL COMMENT '标题(韩语)' AFTER `title_ja` ");
addColumn($pdo, $db, 'sk_article', 'content_ja', "LONGTEXT DEFAULT NULL COMMENT '内容(日语)' AFTER `content_en` ");
addColumn($pdo, $db, 'sk_article', 'content_ko', "LONGTEXT DEFAULT NULL COMMENT '内容(韩语)' AFTER `content_ja` ");
addColumn($pdo, $db, 'sk_article', 'summary_en', "TEXT DEFAULT NULL COMMENT '摘要(英文)' AFTER `summary` ");
addColumn($pdo, $db, 'sk_article', 'summary_ja', "TEXT DEFAULT NULL COMMENT '摘要(日语)' AFTER `summary_en` ");
addColumn($pdo, $db, 'sk_article', 'summary_ko', "TEXT DEFAULT NULL COMMENT '摘要(韩语)' AFTER `summary_ja` ");

// 5. sk_banner
addColumn($pdo, $db, 'sk_banner', 'title_ja', "VARCHAR(255) DEFAULT NULL COMMENT '标题(日语)' AFTER `title_en` ");
addColumn($pdo, $db, 'sk_banner', 'title_ko', "VARCHAR(255) DEFAULT NULL COMMENT '标题(韩语)' AFTER `title_ja` ");
addColumn($pdo, $db, 'sk_banner', 'subtitle_en', "VARCHAR(255) DEFAULT NULL COMMENT '副标题(英文)' AFTER `subtitle` ");
addColumn($pdo, $db, 'sk_banner', 'subtitle_ja', "VARCHAR(255) DEFAULT NULL COMMENT '副标题(日语)' AFTER `subtitle_en` ");
addColumn($pdo, $db, 'sk_banner', 'subtitle_ko', "VARCHAR(255) DEFAULT NULL COMMENT '副标题(韩语)' AFTER `subtitle_ja` ");
addColumn($pdo, $db, 'sk_banner', 'description_en', "TEXT DEFAULT NULL COMMENT '描述(英文)' AFTER `description` ");
addColumn($pdo, $db, 'sk_banner', 'description_ja', "TEXT DEFAULT NULL COMMENT '描述(日语)' AFTER `description_en` ");
addColumn($pdo, $db, 'sk_banner', 'description_ko', "TEXT DEFAULT NULL COMMENT '描述(韩语)' AFTER `description_ja` ");

// 6. sk_news
addColumn($pdo, $db, 'sk_news', 'title_ja', "VARCHAR(255) DEFAULT NULL COMMENT '标题(日语)' AFTER `title_en` ");
addColumn($pdo, $db, 'sk_news', 'title_ko', "VARCHAR(255) DEFAULT NULL COMMENT '标题(韩语)' AFTER `title_ja` ");
addColumn($pdo, $db, 'sk_news', 'content_ja', "LONGTEXT DEFAULT NULL COMMENT '内容(日语)' AFTER `content_en` ");
addColumn($pdo, $db, 'sk_news', 'content_ko', "LONGTEXT DEFAULT NULL COMMENT '内容(韩语)' AFTER `content_ja` ");
addColumn($pdo, $db, 'sk_news', 'summary_en', "TEXT DEFAULT NULL COMMENT '摘要(英文)' AFTER `summary` ");
addColumn($pdo, $db, 'sk_news', 'summary_ja', "TEXT DEFAULT NULL COMMENT '摘要(日语)' AFTER `summary_en` ");
addColumn($pdo, $db, 'sk_news', 'summary_ko', "TEXT DEFAULT NULL COMMENT '摘要(韩语)' AFTER `summary_ja` ");

// 7. sk_training
addColumn($pdo, $db, 'sk_training', 'title_ja', "VARCHAR(255) DEFAULT NULL COMMENT '标题(日语)' AFTER `title_en` ");
addColumn($pdo, $db, 'sk_training', 'title_ko', "VARCHAR(255) DEFAULT NULL COMMENT '标题(韩语)' AFTER `title_ja` ");
addColumn($pdo, $db, 'sk_training', 'description_en', "TEXT DEFAULT NULL COMMENT '描述(英文)' AFTER `description` ");
addColumn($pdo, $db, 'sk_training', 'description_ja', "TEXT DEFAULT NULL COMMENT '描述(日语)' AFTER `description_en` ");
addColumn($pdo, $db, 'sk_training', 'description_ko', "TEXT DEFAULT NULL COMMENT '描述(韩语)' AFTER `description_ja` ");
addColumn($pdo, $db, 'sk_training', 'content_en', "LONGTEXT DEFAULT NULL COMMENT '内容(英文)' AFTER `content` ");
addColumn($pdo, $db, 'sk_training', 'content_ja', "LONGTEXT DEFAULT NULL COMMENT '内容(日语)' AFTER `content_en` ");
addColumn($pdo, $db, 'sk_training', 'content_ko', "LONGTEXT DEFAULT NULL COMMENT '内容(韩语)' AFTER `content_ja` ");

// 8. sk_about
addColumn($pdo, $db, 'sk_about', 'title_ja', "VARCHAR(255) DEFAULT NULL COMMENT '标题(日语)' AFTER `title_en` ");
addColumn($pdo, $db, 'sk_about', 'title_ko', "VARCHAR(255) DEFAULT NULL COMMENT '标题(韩语)' AFTER `title_ja` ");
addColumn($pdo, $db, 'sk_about', 'content_ja', "LONGTEXT DEFAULT NULL COMMENT '内容(日语)' AFTER `content_en` ");
addColumn($pdo, $db, 'sk_about', 'content_ko', "LONGTEXT DEFAULT NULL COMMENT '内容(韩语)' AFTER `content_ja` ");

// 9. sk_certificate
addColumn($pdo, $db, 'sk_certificate', 'cert_name_en', "VARCHAR(255) DEFAULT NULL COMMENT '证书名称(英文)' AFTER `cert_name` ");
addColumn($pdo, $db, 'sk_certificate', 'cert_name_ja', "VARCHAR(255) DEFAULT NULL COMMENT '证书名称(日语)' AFTER `cert_name_en` ");
addColumn($pdo, $db, 'sk_certificate', 'cert_name_ko', "VARCHAR(255) DEFAULT NULL COMMENT '证书名称(韩语)' AFTER `cert_name_ja` ");
addColumn($pdo, $db, 'sk_certificate', 'description_en', "TEXT DEFAULT NULL COMMENT '描写(英文)' AFTER `description` ");
addColumn($pdo, $db, 'sk_certificate', 'description_ja', "TEXT DEFAULT NULL COMMENT '描写(日语)' AFTER `description_en` ");
addColumn($pdo, $db, 'sk_certificate', 'description_ko', "TEXT DEFAULT NULL COMMENT '描写(韩语)' AFTER `description_ja` ");

// 10. sk_faq
addColumn($pdo, $db, 'sk_faq', 'question_en', "TEXT DEFAULT NULL COMMENT '问题(英文)' AFTER `question` ");
addColumn($pdo, $db, 'sk_faq', 'question_ja', "TEXT DEFAULT NULL COMMENT '问题(日语)' AFTER `question_en` ");
addColumn($pdo, $db, 'sk_faq', 'question_ko', "TEXT DEFAULT NULL COMMENT '问题(韩语)' AFTER `question_ja` ");
addColumn($pdo, $db, 'sk_faq', 'answer_en', "TEXT DEFAULT NULL COMMENT '回答(英文)' AFTER `answer` ");
addColumn($pdo, $db, 'sk_faq', 'answer_ja', "TEXT DEFAULT NULL COMMENT '回答(日语)' AFTER `answer_en` ");
addColumn($pdo, $db, 'sk_faq', 'answer_ko', "TEXT DEFAULT NULL COMMENT '回答(韩语)' AFTER `answer_ja` ");

// 11. sk_document
addColumn($pdo, $db, 'sk_document', 'title_en', "VARCHAR(255) DEFAULT NULL COMMENT '标题(英文)' AFTER `title` ");
addColumn($pdo, $db, 'sk_document', 'title_ja', "VARCHAR(255) DEFAULT NULL COMMENT '标题(日语)' AFTER `title_en` ");
addColumn($pdo, $db, 'sk_document', 'title_ko', "VARCHAR(255) DEFAULT NULL COMMENT '标题(韩语)' AFTER `title_ja` ");
addColumn($pdo, $db, 'sk_document', 'content_en', "LONGTEXT DEFAULT NULL COMMENT '内容(英文)' AFTER `content` ");
addColumn($pdo, $db, 'sk_document', 'content_ja', "LONGTEXT DEFAULT NULL COMMENT '内容(日语)' AFTER `content_en` ");
addColumn($pdo, $db, 'sk_document', 'content_ko', "LONGTEXT DEFAULT NULL COMMENT '内容(韩语)' AFTER `content_ja` ");

echo "Migration script execution finished.\n";
