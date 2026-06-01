CREATE TABLE `kalyx_user_preferences` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `voice_notifications_enabled` tinyint(1) DEFAULT 1,
  `greeting_enabled` tinyint(1) DEFAULT 1,
  `reminder_frequency` enum('realtime','hourly','daily') DEFAULT 'realtime',
  `motivational_messages_enabled` tinyint(1) DEFAULT 1,
  `preferred_ai_personality` enum('friendly','professional','motivational') DEFAULT 'friendly',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `kalyx_user_preferences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

