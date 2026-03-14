-- AlterTable: users - add emailHash for lookup, drop unique on email (email still stored, now encrypted)
ALTER TABLE `users` DROP INDEX `users_email_key`;
ALTER TABLE `users` ADD COLUMN `emailHash` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `users_emailHash_key` ON `users`(`emailHash`);

-- AlterTable: password_resets - add tokenHash for lookup, token becomes optional
ALTER TABLE `password_resets` ADD COLUMN `tokenHash` VARCHAR(191) NULL;
ALTER TABLE `password_resets` MODIFY COLUMN `token` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `password_resets_tokenHash_key` ON `password_resets`(`tokenHash`);

-- AlterTable: mfa_codes - add codeHash, code becomes optional
ALTER TABLE `mfa_codes` ADD COLUMN `codeHash` VARCHAR(191) NULL;
ALTER TABLE `mfa_codes` MODIFY COLUMN `code` VARCHAR(191) NULL;
