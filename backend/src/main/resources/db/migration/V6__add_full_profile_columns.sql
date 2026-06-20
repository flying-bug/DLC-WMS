ALTER TABLE `USERS`
ADD COLUMN `id_card` VARCHAR(20) NULL AFTER `address`,
ADD COLUMN `dob` DATE NULL AFTER `id_card`,
ADD COLUMN `gender` VARCHAR(10) NULL AFTER `dob`,
ADD COLUMN `start_date` DATE NULL AFTER `gender`,
ADD COLUMN `position` VARCHAR(50) NULL AFTER `start_date`,
ADD COLUMN `department` VARCHAR(50) NULL AFTER `position`;
