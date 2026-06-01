CREATE TABLE `call_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `caller_name` varchar(255) NOT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `call_type` enum('incoming','outgoing') DEFAULT 'incoming',
  `purpose` text DEFAULT NULL,
  `person_concerned` varchar(255) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `call_datetime` datetime DEFAULT NULL,
  `duration` varchar(20) DEFAULT NULL,
  `status` enum('completed','missed','callback_required') DEFAULT 'completed',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_call_type` (`call_type`),
  KEY `idx_call_datetime` (`call_datetime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

