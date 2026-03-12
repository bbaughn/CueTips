-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "analysis_job_id" TEXT,
ADD COLUMN     "analysis_status" TEXT,
ADD COLUMN     "swing" BOOLEAN,
ADD COLUMN     "youtube_url" TEXT;
