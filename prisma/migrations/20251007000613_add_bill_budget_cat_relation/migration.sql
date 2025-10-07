-- AlterTable
ALTER TABLE `bills` ADD COLUMN `budgetCategoryId` VARCHAR(191) NULL;

-- AddForeignKey
SET @constraint_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE
        CONSTRAINT_SCHEMA = DATABASE() AND
        CONSTRAINT_NAME = 'bills_budgetCategoryId_fkey' AND
        CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @sql = IF(@constraint_exists = 0, 
    'ALTER TABLE `bills` ADD CONSTRAINT `bills_budgetCategoryId_fkey` FOREIGN KEY (`budgetCategoryId`) REFERENCES `budget_categories`(`id`) ON DELETE SET NULL CASCADE ON UPDATE CASCADE',
    'SELECT "Constraint bills_budgetCategoryId_fkey already exists" as message'
);