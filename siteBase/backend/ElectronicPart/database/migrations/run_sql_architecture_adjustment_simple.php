<?php
/**
 * SQL架构调整执行脚本（简化版）
 * 按照元宝SQL架构调整方案执行数据库结构调整
 * 使用PDO直接连接数据库，不依赖ThinkPHP框架
 */

class SqlArchitectureAdjustment
{
    private $pdo;
    private $logFile;
    private $backupPath;
    private $errors = [];
    private $successSteps = [];
    private $config;

    public function __construct()
    {
        // 配置数据库连接参数（请根据实际情况修改）
        $this->config = [
            'host' => getenv('DB_HOST') ?: '127.0.0.1',
            'port' => getenv('DB_PORT') ?: 3306,
            'dbname' => getenv('DB_NAME') ?: 'semiconductor_db',
            'username' => getenv('DB_USER') ?: 'root',
            'password' => getenv('DB_PASS') ?: '',
            'charset' => 'utf8mb4'
        ];
        
        // 设置日志文件路径
        $this->logFile = __DIR__ . '/sql_architecture_adjustment_' . date('YmdHis') . '.log';
        
        // 设置备份路径
        $this->backupPath = __DIR__ . '/backups/';
        if (!is_dir($this->backupPath)) {
            mkdir($this->backupPath, 0755, true);
        }
        
        // 开始记录日志
        $this->log('SQL架构调整执行脚本开始执行');
        $this->log('当前目录: ' . getcwd());
        $this->log('脚本路径: ' . __FILE__);
        
        // 连接数据库
        $this->connectDatabase();
    }

    /**
     * 连接数据库
     */
    private function connectDatabase()
    {
        try {
            $dsn = "mysql:host={$this->config['host']};port={$this->config['port']};dbname={$this->config['dbname']};charset={$this->config['charset']}";
            $this->pdo = new PDO($dsn, $this->config['username'], $this->config['password']);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->log('数据库连接成功');
        } catch (PDOException $e) {
            $this->error('数据库连接失败: ' . $e->getMessage());
            die('数据库连接失败: ' . $e->getMessage());
        }
    }

    /**
     * 记录日志
     * @param string $message 日志内容
     * @param string $level 日志级别
     */
    private function log($message, $level = 'INFO')
    {
        $logLine = date('Y-m-d H:i:s') . ' [' . $level . '] ' . $message . "\n";
        
        // 写入日志文件
        if (file_put_contents($this->logFile, $logLine, FILE_APPEND) === false) {
            echo "日志写入失败: $this->logFile\n";
        }
        
        // 同时输出到标准输出，便于实时查看
        echo $logLine;
    }

    /**
     * 记录错误
     * @param string $message 错误信息
     */
    private function error($message)
    {
        $this->errors[] = $message;
        $this->log($message, 'ERROR');
    }

    /**
     * 执行SQL语句
     * @param string $sql SQL语句
     * @param string $step 执行步骤描述
     * @return bool 是否执行成功
     */
    private function executeSql($sql, $step)
    {
        try {
            $this->log("执行SQL: $step");
            $this->log("SQL语句: $sql");
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            
            $this->successSteps[] = $step;
            $this->log("执行成功: $step");
            return true;
        } catch (PDOException $e) {
            $errorMsg = "执行失败: $step - " . $e->getMessage();
            $this->error($errorMsg);
            return false;
        }
    }

    /**
     * 数据库备份（简化版）
     * @return bool 是否备份成功
     */
    public function backupDatabase()
    {
        $this->log('开始备份数据库');
        
        try {
            // 获取所有表
            $tables = [];
            $stmt = $this->pdo->query('SHOW TABLES');
            while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
                $tables[] = $row[0];
            }
            
            $backupContent = "-- 数据库备份\n";
            $backupContent .= "-- 备份时间: " . date('Y-m-d H:i:s') . "\n\n";
            
            foreach ($tables as $table) {
                $this->log("备份表: $table");
                
                // 获取表结构
                $stmt = $this->pdo->query("SHOW CREATE TABLE `$table`");
                $createTable = $stmt->fetch(PDO::FETCH_ASSOC);
                $backupContent .= "\nDROP TABLE IF EXISTS `$table`;\n";
                $backupContent .= $createTable['Create Table'] . ";\n\n";
                
                // 获取表数据
                $stmt = $this->pdo->query("SELECT * FROM `$table`");
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                if (!empty($rows)) {
                    $columns = array_keys($rows[0]);
                    $columnsStr = '`' . implode('`, `', $columns) . '`';
                    
                    foreach ($rows as $row) {
                        $values = [];
                        foreach ($row as $value) {
                            $values[] = $this->pdo->quote($value);
                        }
                        $valuesStr = implode(', ', $values);
                        $backupContent .= "INSERT INTO `$table` ($columnsStr) VALUES ($valuesStr);\n";
                    }
                    $backupContent .= "\n";
                }
            }
            
            $backupFile = $this->backupPath . 'database_backup_' . date('YmdHis') . '.sql';
            file_put_contents($backupFile, $backupContent);
            $this->log("数据库备份成功，备份文件: $backupFile");
            return true;
        } catch (Exception $e) {
            $this->error("数据库备份失败: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 清理冗余表
     * @return bool 是否执行成功
     */
    public function cleanRedundantTables()
    {
        $this->log('开始清理冗余表');
        
        // 定义要删除的冗余表
        $redundantTables = [
            'sk_brand',
            'sk_categories',
            'sk_subcategory'
        ];
        
        try {
            foreach ($redundantTables as $table) {
                // 检查表是否存在
                $stmt = $this->pdo->query("SHOW TABLES LIKE '$table'");
                if ($stmt->rowCount() > 0) {
                    $sql = "DROP TABLE IF EXISTS `$table`";
                    $this->executeSql($sql, "删除冗余表 $table");
                } else {
                    $this->log("表 $table 不存在，跳过删除");
                }
            }
            
            $this->log('清理冗余表完成');
            return true;
        } catch (Exception $e) {
            $this->error("清理冗余表失败: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 重构分类表结构
     * @return bool 是否执行成功
     */
    public function reconstructCategoryTable()
    {
        $this->log('开始重构分类表结构');
        
        try {
            // 1. 增强分类表结构
            $sql = "ALTER TABLE `sk_category` 
MODIFY COLUMN `id` int(11) NOT NULL AUTO_INCREMENT FIRST,
MODIFY COLUMN `parent_id` int(11) NOT NULL DEFAULT 0 COMMENT '父级ID，0为根分类',
ADD COLUMN `level` tinyint(1) NOT NULL DEFAULT 1 COMMENT '层级：1-一级，2-二级，3-三级',
ADD COLUMN `path` varchar(255) NOT NULL DEFAULT '' COMMENT '分类路径（如：1/101/1001）',
ADD COLUMN `is_leaf` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否末级分类',
ADD COLUMN `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT '排序',
ADD COLUMN `image` varchar(255) DEFAULT NULL COMMENT '分类图片',
ADD COLUMN `seo_title` varchar(255) DEFAULT NULL COMMENT 'SEO标题',
ADD COLUMN `seo_keywords` varchar(255) DEFAULT NULL COMMENT 'SEO关键词',
ADD COLUMN `seo_description` text COMMENT 'SEO描述',
ADD COLUMN `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
ADD COLUMN `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'";
            $this->executeSql($sql, "增强分类表结构");
            
            // 2. 创建分类路径索引
            $indexes = [
                "CREATE INDEX idx_category_path ON sk_category(path)",
                "CREATE INDEX idx_category_parent ON sk_category(parent_id)",
                "CREATE INDEX idx_category_level ON sk_category(level)"
            ];
            
            foreach ($indexes as $indexSql) {
                $this->executeSql($indexSql, "创建分类索引");
            }
            
            $this->log('重构分类表结构完成');
            return true;
        } catch (Exception $e) {
            $this->error("重构分类表结构失败: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 创建属性管理系统
     * @return bool 是否执行成功
     */
    public function createAttributeSystem()
    {
        $this->log('开始创建属性管理系统');
        
        try {
            // 1. 创建分类-属性关联表
            $sql = "CREATE TABLE IF NOT EXISTS `sk_category_attribute` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category_id` int(11) NOT NULL COMMENT '分类ID',
  `attribute_id` int(11) NOT NULL COMMENT '属性ID',
  `is_required` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否必填',
  `is_filter` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否作为筛选条件',
  `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT '排序',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_category_attribute` (`category_id`, `attribute_id`),
  KEY `idx_category` (`category_id`),
  KEY `idx_attribute` (`attribute_id`)
) ENGINE=InnoDB COMMENT='分类-属性关联表'";
            $this->executeSql($sql, "创建分类-属性关联表");
            
            // 2. 创建属性定义表
            $sql = "CREATE TABLE IF NOT EXISTS `sk_attribute` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT '属性名称',
  `code` varchar(50) NOT NULL COMMENT '属性编码',
  `type` enum('text','number','select','checkbox','range') NOT NULL DEFAULT 'text' COMMENT '属性类型',
  `data_type` enum('string','number','boolean') NOT NULL DEFAULT 'string' COMMENT '数据类型',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `options` text COMMENT '选项值（JSON格式，用于select/checkbox类型）',
  `is_system` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否系统属性',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态',
  `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT '排序',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_attribute_code` (`code`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB COMMENT='属性定义表'";
            $this->executeSql($sql, "创建属性定义表");
            
            // 3. 创建产品属性值表
            $sql = "CREATE TABLE IF NOT EXISTS `sk_product_attribute` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL COMMENT '产品ID',
  `attribute_id` int(11) NOT NULL COMMENT '属性ID',
  `attribute_value` text NOT NULL COMMENT '属性值',
  `numeric_value` decimal(15,6) DEFAULT NULL COMMENT '数值型属性的数值（用于范围查询）',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_product_attribute` (`product_id`, `attribute_id`),
  KEY `idx_product` (`product_id`),
  KEY `idx_attribute` (`attribute_id`),
  KEY `idx_numeric_value` (`numeric_value`)
) ENGINE=InnoDB COMMENT='产品属性值表'";
            $this->executeSql($sql, "创建产品属性值表");
            
            $this->log('创建属性管理系统完成');
            return true;
        } catch (Exception $e) {
            $this->error("创建属性管理系统失败: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 增强品牌表结构
     * @return bool 是否执行成功
     */
    public function enhanceBrandTable()
    {
        $this->log('开始增强品牌表结构');
        
        try {
            // 1. 增强品牌表结构
            $sql = "ALTER TABLE `sk_brands` 
MODIFY COLUMN `id` int(11) NOT NULL AUTO_INCREMENT FIRST,
ADD COLUMN `parent_id` int(11) DEFAULT 0 COMMENT '父品牌ID',
ADD COLUMN `logo` varchar(500) DEFAULT NULL COMMENT '品牌Logo',
ADD COLUMN `description` text COMMENT '品牌描述',
ADD COLUMN `country` varchar(50) DEFAULT NULL COMMENT '国家',
ADD COLUMN `established_year` int(4) DEFAULT NULL COMMENT '成立年份',
ADD COLUMN `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT '排序',
ADD COLUMN `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
ADD COLUMN `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'";
            $this->executeSql($sql, "增强品牌表结构");
            
            // 2. 添加索引
            $indexes = [
                "CREATE INDEX idx_brand_status ON sk_brands(status)",
                "CREATE INDEX idx_brand_parent ON sk_brands(parent_id)"
            ];
            
            foreach ($indexes as $indexSql) {
                $this->executeSql($indexSql, "为品牌表添加索引");
            }
            
            $this->log('增强品牌表结构完成');
            return true;
        } catch (Exception $e) {
            $this->error("增强品牌表结构失败: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 重构产品-型号关系
     * @return bool 是否执行成功
     */
    public function reconstructProductModelRelation()
    {
        $this->log('开始重构产品-型号关系');
        
        try {
            // 1. 增强产品型号表
            $sql = "ALTER TABLE `sk_product_models` 
MODIFY COLUMN `id` int(11) NOT NULL AUTO_INCREMENT FIRST,
ADD COLUMN `model_name_en` varchar(200) DEFAULT NULL COMMENT '型号英文名',
ADD COLUMN `series` varchar(100) DEFAULT NULL COMMENT '产品系列',
ADD COLUMN `package_type` varchar(50) DEFAULT NULL COMMENT '封装类型',
ADD COLUMN `operating_voltage` varchar(50) DEFAULT NULL COMMENT '工作电压',
ADD COLUMN `operating_temperature` varchar(50) DEFAULT NULL COMMENT '工作温度',
ADD COLUMN `pin_count` int(11) DEFAULT 0 COMMENT '引脚数量',
ADD COLUMN `rohs_compliant` tinyint(1) DEFAULT 0 COMMENT 'RoHS合规',
ADD COLUMN `status` varchar(20) DEFAULT 'Active' COMMENT '状态',
ADD COLUMN `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT '排序',
ADD COLUMN `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
ADD COLUMN `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'";
            $this->executeSql($sql, "增强产品型号表");
            
            // 2. 重构产品表（简化版：不删除现有字段，只添加新字段）
            $sql = "ALTER TABLE `sk_product`
ADD COLUMN `category_id_new` int(11) NOT NULL DEFAULT 1 COMMENT '末级分类ID',
ADD COLUMN `brand_id` int(11) NOT NULL DEFAULT 1 COMMENT '品牌ID',
ADD COLUMN `model_id_new` int(11) DEFAULT NULL COMMENT '型号ID',
ADD COLUMN `product_series` varchar(100) DEFAULT NULL COMMENT '产品系列',
ADD COLUMN `is_new` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否新品',
ADD COLUMN `is_hot` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否热销',
ADD COLUMN `weight` decimal(8,3) DEFAULT NULL COMMENT '重量(g)',
ADD COLUMN `dimensions` varchar(100) DEFAULT NULL COMMENT '尺寸(LxWxH)',
ADD COLUMN `warranty_period` int(11) DEFAULT NULL COMMENT '质保期(月)'";
            $this->executeSql($sql, "增强产品表结构");
            
            // 3. 添加索引
            $indexes = [
                "CREATE INDEX idx_product_category_new ON sk_product(category_id_new)",
                "CREATE INDEX idx_product_brand ON sk_product(brand_id)",
                "CREATE INDEX idx_product_model_new ON sk_product(model_id_new)",
                "CREATE INDEX idx_product_status ON sk_product(status)"
            ];
            
            foreach ($indexes as $indexSql) {
                $this->executeSql($indexSql, "为产品表添加索引");
            }
            
            $this->log('重构产品-型号关系完成');
            return true;
        } catch (Exception $e) {
            $this->error("重构产品-型号关系失败: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 增强库存管理系统
     * @return bool 是否执行成功
     */
    public function enhanceInventorySystem()
    {
        $this->log('开始增强库存管理系统');
        
        try {
            // 1. 增强库存表结构（简化版：只添加新字段，不修改现有字段）
            $sql = "ALTER TABLE `sk_inventory`
ADD COLUMN `warehouse_id` int(11) NOT NULL DEFAULT 1 COMMENT '仓库ID',
ADD COLUMN `batch_number` varchar(50) DEFAULT NULL COMMENT '批次号',
ADD COLUMN `shelf_life` int(11) DEFAULT NULL COMMENT '保质期(天)',
ADD COLUMN `production_date` date DEFAULT NULL COMMENT '生产日期',
ADD COLUMN `expiry_date` date DEFAULT NULL COMMENT '过期日期',
ADD COLUMN `cost_price` decimal(10,2) DEFAULT NULL COMMENT '成本价',
ADD COLUMN `stock_status` enum('normal','warning','danger') NOT NULL DEFAULT 'normal' COMMENT '库存状态'";
            $this->executeSql($sql, "增强库存表结构");
            
            // 2. 添加索引
            $indexes = [
                "CREATE INDEX idx_inventory_product ON sk_inventory(product_id)",
                "CREATE INDEX idx_inventory_warehouse ON sk_inventory(warehouse_id)",
                "CREATE INDEX idx_inventory_batch ON sk_inventory(batch_number)"
            ];
            
            foreach ($indexes as $indexSql) {
                $this->executeSql($indexSql, "为库存表添加索引");
            }
            
            $this->log('增强库存管理系统完成');
            return true;
        } catch (Exception $e) {
            $this->error("增强库存管理系统失败: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 初始化系统数据
     * @return bool 是否执行成功
     */
    public function initializeSystemData()
    {
        $this->log('开始初始化系统数据');
        
        try {
            // 1. 插入系统属性示例
            $sql = "INSERT INTO `sk_attribute` (`name`, `code`, `type`, `data_type`, `unit`, `is_system`) VALUES
('工作电压', 'operating_voltage', 'range', 'number', 'V', 1),
('工作温度', 'operating_temperature', 'range', 'number', '°C', 1),
('封装类型', 'package_type', 'select', 'string', NULL, 1),
('引脚数量', 'pin_count', 'range', 'number', 'pin', 1),
('RoHS合规', 'rohs_compliant', 'select', 'boolean', NULL, 1)";
            $this->executeSql($sql, "插入系统属性示例");
            
            // 2. 插入分类示例（三级结构）
            $sql = "INSERT INTO `sk_category` (`parent_id`, `name`, `level`, `path`, `is_leaf`, `sort_order`) VALUES
(0, '半导体', 1, '1', 0, 10),
(1, '二极管', 2, '1/2', 0, 20),
(2, '肖特基二极管', 3, '1/2/3', 1, 30),
(2, '稳压二极管', 3, '1/2/4', 1, 40),
(0, '电阻', 1, '5', 0, 50),
(5, '贴片电阻', 2, '5/6', 1, 60)";
            $this->executeSql($sql, "插入分类示例");
            
            $this->log('初始化系统数据完成');
            return true;
        } catch (Exception $e) {
            $this->error("初始化系统数据失败: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 数据验证
     * @return bool 是否验证通过
     */
    public function verifyData()
    {
        $this->log('开始数据验证');
        
        try {
            // 1. 验证三级分类结构
            $this->log('验证三级分类结构');
            $stmt = $this->pdo->query("SELECT level, COUNT(*) as count FROM sk_category GROUP BY level");
            $levelCount = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->log("分类层级统计:");
            foreach ($levelCount as $row) {
                $this->log("  - 第 {$row['level']} 级分类: {$row['count']} 个");
            }
            
            // 2. 验证属性系统
            $this->log('验证属性系统');
            $stmt = $this->pdo->query("SELECT COUNT(*) as count FROM sk_attribute");
            $attributes = $stmt->fetch(PDO::FETCH_ASSOC);
            $this->log("属性数量: {$attributes['count']} 个");
            
            // 3. 验证品牌表结构
            $this->log('验证品牌表结构');
            $stmt = $this->pdo->query("SELECT COUNT(*) as count FROM sk_brands");
            $brands = $stmt->fetch(PDO::FETCH_ASSOC);
            $this->log("品牌数量: {$brands['count']} 个");
            
            // 4. 验证产品表结构
            $this->log('验证产品表结构');
            $stmt = $this->pdo->query("SELECT COUNT(*) as count FROM sk_product");
            $products = $stmt->fetch(PDO::FETCH_ASSOC);
            $this->log("产品数量: {$products['count']} 个");
            
            // 5. 验证库存表结构
            $this->log('验证库存表结构');
            $stmt = $this->pdo->query("SELECT COUNT(*) as count FROM sk_inventory");
            $inventory = $stmt->fetch(PDO::FETCH_ASSOC);
            $this->log("库存记录数量: {$inventory['count']} 个");
            
            $this->log('数据验证完成');
            return true;
        } catch (Exception $e) {
            $this->error("数据验证失败: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 执行完整的架构调整
     */
    public function execute()
    {
        try {
            $this->log('=== SQL架构调整开始 ===');
            
            // 1. 备份数据库
            if (!$this->backupDatabase()) {
                $this->error('数据库备份失败，脚本终止执行');
                return false;
            }
            
            // 2. 清理冗余表
            if (!$this->cleanRedundantTables()) {
                $this->error('清理冗余表失败，脚本终止执行');
                return false;
            }
            
            // 3. 重构分类表结构
            if (!$this->reconstructCategoryTable()) {
                $this->error('重构分类表结构失败，脚本终止执行');
                return false;
            }
            
            // 4. 创建属性管理系统
            if (!$this->createAttributeSystem()) {
                $this->error('创建属性管理系统失败，脚本终止执行');
                return false;
            }
            
            // 5. 增强品牌表结构
            if (!$this->enhanceBrandTable()) {
                $this->error('增强品牌表结构失败，脚本终止执行');
                return false;
            }
            
            // 6. 重构产品-型号关系
            if (!$this->reconstructProductModelRelation()) {
                $this->error('重构产品-型号关系失败，脚本终止执行');
                return false;
            }
            
            // 7. 增强库存管理系统
            if (!$this->enhanceInventorySystem()) {
                $this->error('增强库存管理系统失败，脚本终止执行');
                return false;
            }
            
            // 8. 初始化系统数据
            if (!$this->initializeSystemData()) {
                $this->error('初始化系统数据失败，脚本终止执行');
                return false;
            }
            
            // 9. 数据验证
            if (!$this->verifyData()) {
                $this->error('数据验证失败，脚本终止执行');
                return false;
            }
            
            $this->log('=== SQL架构调整执行成功 ===');
            $this->log('执行成功的步骤：');
            foreach ($this->successSteps as $step) {
                $this->log("  - $step");
            }
            
            if (empty($this->errors)) {
                $this->log('没有错误发生');
            } else {
                $this->log('执行过程中出现的错误：');
                foreach ($this->errors as $error) {
                    $this->log("  - $error");
                }
            }
            
            return true;
        } catch (Exception $e) {
            $this->error('执行过程中发生异常：' . $e->getMessage());
            $this->log('=== SQL架构调整执行失败 ===');
            return false;
        }
    }
}

// 执行脚本
if (basename(__FILE__) == basename($_SERVER['PHP_SELF'])) {
    $adjustment = new SqlArchitectureAdjustment();
    $adjustment->execute();
}
