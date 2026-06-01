CREATE TABLE `maintenance_schedules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `equipment_name` varchar(255) NOT NULL,
  `maintenance_date` date DEFAULT NULL,
  `maintenance_type` enum('regular','corrective','preventive','special') DEFAULT 'regular',
  `technician` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `spare_parts` text DEFAULT NULL,
  `next_maintenance_date` date DEFAULT NULL,
  `status` enum('pending','in_progress','completed','cancelled') DEFAULT 'pending',
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_maintenance_date` (`maintenance_date`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `maintenance_schedules` VALUES ('1', '5', 'Printer', '2026-03-06', 'regular', 'Joseph Diala', 'Cleaning and resetting ink pad', 'N/A', '2026-06-05', 'completed', 'Units is working and tested', '2026-03-02 19:03:12', '2026-03-04 20:52:36');
INSERT INTO `maintenance_schedules` VALUES ('2', '5', 'Epson L5290', '2026-04-15', 'corrective', 'Joseph Diala', 'The printer\'s wasted ink is leaking from the ink absorber, the printer needs to be replaced and maintained.', 'Ink Absorber pad', '0000-00-00', 'completed', 'Units is working and tested good', '2026-04-14 20:35:06', '2026-04-14 20:35:06');
INSERT INTO `maintenance_schedules` VALUES ('3', '5', 'Epson L6270', '2026-04-20', 'corrective', 'Joseph Diala / John Richard', 'I checked the printout and also inspected the printer\'s interior to see if there were any scattered inks on the printer\'s chassis. So far it\'s ok, the only problem I see is that its maintenance box is almost full.', 'Replace maintenance box tha unit is working and tested good', '2026-05-07', 'completed', 'Replace for maintenance box', '2026-04-20 01:28:35', '2026-05-10 18:51:28');
INSERT INTO `maintenance_schedules` VALUES ('4', '5', 'Sharp Copier', '2026-05-28', 'corrective', 'Joseph Diala', 'Check why the copier always misfeeds in tray 1.', 'Paper feed roller, separate roller and pickup roller', '0000-00-00', 'completed', 'Replace Paper feed roller, separate roller and pickup roller', '2026-05-27 20:19:03', '2026-05-28 01:50:28');
