/*
SQLyog Ultimate v10.00 Beta1
MySQL - 5.7.26 : Database - semiconductor_db
*********************************************************************
*/


/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`semiconductor_db` /*!40100 DEFAULT CHARACTER SET utf8 COLLATE utf8_unicode_ci */;

USE `semiconductor_db`;

/*Table structure for table `sk_product_models` */

DROP TABLE IF EXISTS `sk_product_models`;

CREATE TABLE `sk_product_models` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `model_code` varchar(100) NOT NULL COMMENT '型号编码',
  `model_name` varchar(200) NOT NULL COMMENT '型号名称',
  `category_id` int(11) DEFAULT NULL COMMENT '分类ID',
  `brand_id` int(11) DEFAULT NULL COMMENT '品牌ID',
  `series` varchar(100) DEFAULT NULL COMMENT '系列',
  `package_type` varchar(50) DEFAULT NULL COMMENT '封装类型',
  `datasheet_url` varchar(500) DEFAULT NULL COMMENT '数据手册链接',
  `description` text COMMENT '描述',
  `status` varchar(20) DEFAULT 'Active' COMMENT '状态',
  -- 新增字段：订购和质量相关
  `pin_count` int(11) DEFAULT 0 COMMENT '引脚数量',
  `stock` int(11) DEFAULT 0 COMMENT '库存数量',
  `packaging_spec` varchar(100) DEFAULT NULL COMMENT '包装规格',
  `operating_temperature` varchar(50) DEFAULT NULL COMMENT '工作温度范围',
  `material_type` varchar(50) DEFAULT NULL COMMENT '材料类型',
  `pin_plating` varchar(50) DEFAULT NULL COMMENT '引脚镀层',
  `moq` int(11) DEFAULT 1 COMMENT '最小起订量',
  `lead_time` int(11) DEFAULT 0 COMMENT '交期(天)',
  `created_at` datetime DEFAULT NULL COMMENT '创建时间',
  `updated_at` datetime DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_model_code` (`model_code`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_brand_id` (`brand_id`),
  KEY `idx_status` (`status`),
  KEY `idx_model_stock` (`stock`),
  CONSTRAINT `fk_model_brand` FOREIGN KEY (`brand_id`) REFERENCES `sk_brands` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COMMENT='型号管理表';

/*Data for the table `sk_product_models` */

insert  into `sk_product_models`(`id`,`model_code`,`model_name`,`category_id`,`brand_id`,`series`,`package_type`,`datasheet_url`,`description`,`status`,`pin_count`,`stock`,`packaging_spec`,`operating_temperature`,`material_type`,`pin_plating`,`moq`,`lead_time`,`created_at`,`updated_at`) values 
(1,'PMU101-XX','PMU101系列',1,1,'PMU100','QFN-16','/datasheets/pmu101.pdf','高效率电源管理芯片','Active',16,5000,'Tube: 100pcs/tube','-40 to 125','量产','NIPDAU',100,8,'2025-12-19 10:00:00','2025-12-19 10:00:00'),
(2,'LDO005-XX','LDO005系列',1,1,'LDO000','SOT-23','/datasheets/ldo005.pdf','低功耗线性稳压器','Active',3,3000,'Tape: 3000pcs/reel','-40 to 125','量产','NIPDAU',100,5,'2025-12-19 10:00:00','2025-12-19 10:00:00'),
(3,'RC0402','RC0402',3,1,NULL,NULL,NULL,'RC0402','0',0,0,NULL,NULL,NULL,NULL,1,0,'2025-12-19 11:28:53','2025-12-19 11:28:53'),
(4,'MFR25','MFR-25',4,2,NULL,NULL,NULL,'MFR-25','0',0,0,NULL,NULL,NULL,NULL,1,0,'2025-12-19 11:31:22','2025-12-19 11:31:22'),
(5,'RW5W','RW-5W',6,3,NULL,NULL,NULL,'RW-5W','0',0,0,NULL,NULL,NULL,NULL,1,0,'2025-12-19 11:31:24','2025-12-19 11:31:24'),
(6,'PFR1206','PFR-1206',7,4,NULL,NULL,NULL,'PFR-1206','0',0,0,NULL,NULL,NULL,NULL,1,0,'2025-12-19 11:31:25','2025-12-19 11:31:25'),
(7,'3296W','3296W',8,5,NULL,NULL,NULL,'3296W','0',0,0,NULL,NULL,NULL,NULL,1,0,'2025-12-19 11:31:27','2025-12-19 11:31:27');

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
