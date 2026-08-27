CREATE INDEX `idx_appointments_date_status` ON `appointments` (`date`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_availability_slot` ON `availability` (`date`,`time`);--> statement-breakpoint
CREATE INDEX `idx_reviews_status_created` ON `reviews` (`status`,`created_at`);