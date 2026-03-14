-- AlterTable
ALTER TABLE `expenditures` ADD COLUMN `accountId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `expenditures` ADD CONSTRAINT `expenditures_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
