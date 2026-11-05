-- Run once before deploying the blog backend in production (synchronize is disabled).
CREATE TABLE IF NOT EXISTS `blog_articles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL,
  `slug` varchar(180) NOT NULL,
  `excerpt` text NOT NULL,
  `content` json NOT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'draft',
  `featured` tinyint NOT NULL DEFAULT 0,
  `cover` varchar(2048) DEFAULT NULL,
  `metaTitle` varchar(200) NOT NULL DEFAULT '',
  `metaDescription` text NOT NULL,
  `indexable` tinyint NOT NULL DEFAULT 1,
  `follow` tinyint NOT NULL DEFAULT 1,
  `publishedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), UNIQUE KEY `UQ_blog_slug` (`slug`), KEY `IDX_blog_status_created` (`status`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
