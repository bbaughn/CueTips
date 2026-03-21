import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findYoutubeUrl } from "@/lib/youtube";
import { submitAnalysis } from "@/lib/qanalyzer";

// POST /api/admin/reanalyze - re-submit analysis for tracks that failed or errored
// Body: { releaseId?: string } — if provided, only reanalyze tracks from that release.
//       Otherwise, reanalyze all failed/errored tracks in the user's collection.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { releaseId } = body;

  // Find tracks needing reanalysis in user's collection
  const collection = await prisma.userCollection.findMany({
    where: {
      userId: session.user.id,
      ...(releaseId ? { releaseId } : {}),
    },
    include: {
      release: {
        include: {
          tracks: {
            where: {
              OR: [
                { analysisStatus: { in: ["error", "failed", "no_youtube", "queued"] } },
                { analysisStatus: null },
              ],
            },
          },
        },
      },
    },
  });

  const tracks = collection.flatMap((c) => ({
    tracks: c.release.tracks,
    releaseArtist: c.release.artist,
  })).flatMap((r) => r.tracks.map((t) => ({ ...t, releaseArtist: r.releaseArtist })));

  let queued = 0;
  let skipped = 0;

  for (const track of tracks) {
    try {
      let ytUrl = track.youtubeUrl;

      // If no YouTube URL, try finding one
      if (!ytUrl) {
        const artist = track.artist || track.releaseArtist;
        ytUrl = await findYoutubeUrl(artist, track.title);
        if (!ytUrl) {
          await prisma.track.update({
            where: { id: track.id },
            data: { analysisStatus: "no_youtube" },
          });
          skipped++;
          continue;
        }
        await prisma.track.update({
          where: { id: track.id },
          data: { youtubeUrl: ytUrl },
        });
      }

      // Submit to QAnalyzer
      const job = await submitAnalysis(ytUrl);
      await prisma.track.update({
        where: { id: track.id },
        data: {
          analysisJobId: job.job_id,
          analysisStatus: "queued",
        },
      });
      queued++;
    } catch (err) {
      console.error(`Reanalyze failed for track ${track.id}:`, err);
      skipped++;
    }
  }

  return NextResponse.json({ queued, skipped, total: tracks.length });
}
