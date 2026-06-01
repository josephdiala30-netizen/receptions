CREATE TABLE `it_inventory` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `item_type` enum('computer','laptop','printer','monitor','network_device','software','other') DEFAULT 'computer',
  `brand` varchar(100) DEFAULT NULL,
  `model` varchar(100) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `asset_tag` varchar(50) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `status` enum('active','inactive','maintenance','disposed') DEFAULT 'active',
  `purchase_date` date DEFAULT NULL,
  `warranty_expiry` date DEFAULT NULL,
  `assigned_to` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `quantity` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_item_type` (`item_type`),
  KEY `idx_status` (`status`),
  KEY `idx_location` (`location`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `it_inventory` VALUES ('1', '5', 'Sharp Toner', 'printer', 'Sharp Copier', 'FT-300', '', '', 'IT Server Room', 'IT', 'active', '2026-04-29', '0000-00-00', 'Joseph Diala', 'Stocks for AGX Clark', '3', '2026-04-28 22:16:51', '2026-04-30 00:46:47');
INSERT INTO `it_inventory` VALUES ('2', '5', 'Canon Toner', 'printer', 'Canon Laser Printer', 'CF283X', '', '', 'IT Server Room', 'IT', 'active', '2026-04-29', '0000-00-00', 'Joseph Diala', 'Stock for All', '2', '2026-04-28 22:17:41', '2026-05-12 19:04:10');
INSERT INTO `it_inventory` VALUES ('3', '5', 'Lenovo Laptop', 'laptop', 'Lenovo', 'ThinkBook 14-IML', 'LR0ETL1A', 'N/A', 'Server Room', 'IT', 'active', '0000-00-00', '0000-00-00', '', 'Used / Spared laptop for OJT use', '1', '2026-05-08 08:01:09', '2026-05-12 19:08:02');
INSERT INTO `it_inventory` VALUES ('4', '5', 'Lenovo Laptop', 'laptop', 'Lenovo', 'Thinkpad E408', 'PF-1HEGJ3', 'N/A', 'Server Room', 'IT', 'active', '0000-00-00', '0000-00-00', '', 'Service unit used for OJTs', '1', '2026-05-12 19:10:23', '2026-05-12 19:10:23');
INSERT INTO `it_inventory` VALUES ('5', '5', 'Maintenance Box', 'other', 'Epson', 'T04D1', 'N/A', 'N/A', 'IT Office', 'IT', 'active', '2026-05-13', '0000-00-00', 'Joseph Diala', 'Epson Maintenance Box', '4', '2026-05-12 19:38:14', '2026-05-28 01:53:41');
