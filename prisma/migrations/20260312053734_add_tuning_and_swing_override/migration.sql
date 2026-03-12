-- AlterTable
ALTER TABLE "sections" ADD COLUMN     "tuning" INTEGER;

-- AlterTable
ALTER TABLE "user_section_overrides" ADD COLUMN     "tuning" INTEGER;

-- AlterTable
ALTER TABLE "user_track_preferences" ADD COLUMN     "swing_override" BOOLEAN;
