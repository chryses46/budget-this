-- AlterTable
ALTER TABLE `accounts` 
    ADD COLUMN `balance` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `isMain` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `plaidAccountId` VARCHAR(191) NULL,
    MODIFY `institution` VARCHAR(191) NULL,
    MODIFY `institutionId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `bills` 
    ADD COLUMN `isPaid` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `paidAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `budget_categories` 
    ADD COLUMN `accountId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS `account_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bills` ADD CONSTRAINT `bills_budgetCategoryId_fkey` FOREIGN KEY (`budgetCategoryId`) REFERENCES `budget_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_categories` ADD CONSTRAINT `budget_categories_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mfa_codes` ADD CONSTRAINT `mfa_codes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_transactions` ADD CONSTRAINT `account_transactions_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_transactions` ADD CONSTRAINT `account_transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
