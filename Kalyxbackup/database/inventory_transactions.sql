CREATE TABLE `inventory_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `item_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `transaction_type` enum('in','out') NOT NULL,
  `quantity` int(11) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `transaction_date` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_item_id` (`item_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `inventory_transactions_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `it_inventory` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `inventory_transactions` VALUES ('1', '1', '5', 'in', '4', 'Initial Stock', '2026-04-28 22:16:51');
INSERT INTO `inventory_transactions` VALUES ('2', '2', '5', 'in', '4', 'Initial Stock', '2026-04-28 22:17:41');
INSERT INTO `inventory_transactions` VALUES ('3', '1', '5', 'out', '1', 'Send to Bataan Warehouse 01 C/O Sir Mark', '2026-04-30 00:46:47');
INSERT INTO `inventory_transactions` VALUES ('4', '3', '5', 'in', '1', 'Initial Stock', '2026-05-08 08:01:09');
INSERT INTO `inventory_transactions` VALUES ('5', '2', '5', 'out', '2', 'requested by Bataan Warehouse C/O Miss Cristine Cruto', '2026-05-12 19:04:10');
INSERT INTO `inventory_transactions` VALUES ('6', '4', '5', 'in', '1', 'Initial Stock', '2026-05-12 19:10:23');
INSERT INTO `inventory_transactions` VALUES ('7', '5', '5', 'in', '5', 'Initial Stock', '2026-05-12 19:38:14');
INSERT INTO `inventory_transactions` VALUES ('8', '5', '5', 'out', '1', 'Requested by Sir LF from Molex', '2026-05-28 01:53:41');
