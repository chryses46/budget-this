-- AlterTable: add accountId to bills (link bill to account for payment deductions)
ALTER TABLE `bills` ADD COLUMN `accountId` VARCHAR(191) NULL;

-- Backfill: set accountId to user's main account for existing bills where accountId is null.
-- This only updates the bill row; no account_transactions are created and no balances are changed.
-- Already-paid bills simply get an accountId assigned for future reference; no deduction occurs.
UPDATE `bills` `b`
INNER JOIN `accounts` `a` ON `a`.`userId` = `b`.`userId` AND `a`.`isMain` = true
SET `b`.`accountId` = `a`.`id`
WHERE `b`.`accountId` IS NULL;

-- AddForeignKey
ALTER TABLE `bills` ADD CONSTRAINT `bills_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
