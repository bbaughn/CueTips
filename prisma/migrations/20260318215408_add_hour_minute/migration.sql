-- AlterTable
ALTER TABLE "sections" ADD COLUMN     "hour" INTEGER,
ADD COLUMN     "minute" INTEGER;

-- AlterTable
ALTER TABLE "user_section_overrides" ADD COLUMN     "hour" INTEGER,
ADD COLUMN     "minute" INTEGER;
