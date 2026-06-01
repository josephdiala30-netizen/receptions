CREATE TABLE `kalyx_interactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `interaction_type` varchar(50) NOT NULL COMMENT 'greeting, notification, reminder, help',
  `message` text NOT NULL,
  `task_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_interaction_type` (`interaction_type`),
  KEY `idx_created_at` (`created_at`),
  KEY `task_id` (`task_id`),
  CONSTRAINT `kalyx_interactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `kalyx_interactions_ibfk_2` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

