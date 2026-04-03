-- AlterTable
ALTER TABLE `users` ADD COLUMN `roundupSavingsAccountId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `accounts` ADD COLUMN `roundUpOnExpenditure` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `accounts` ADD COLUMN `doesRoundupSave` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `account_transactions` ADD COLUMN `transferPairId` VARCHAR(191) NULL;
ALTER TABLE `account_transactions` ADD COLUMN `counterpartyAccountId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_roundupSavingsAccountId_key` ON `users`(`roundupSavingsAccountId`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_roundupSavingsAccountId_fkey` FOREIGN KEY (`roundupSavingsAccountId`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
