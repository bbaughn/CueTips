import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findYoutubeUrl } from "@/lib/youtube";
import { submitAnalysis, getJobResult } from "@/lib/qanalyzer";
import { calcHourMinuteFromKeyString } from "@/lib/hour-minute";

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

      // Submit to QAnalyzer — may return existing succeeded result
      const job = await submitAnalysis(ytUrl);

      if (job.status === "succeeded") {
        // Results already available — fetch and save immediately
        const result = await getJobResult(job.job_id);
        const g = result.result.global;
        const sections = result.result.sections;

        await prisma.section.deleteMany({ where: { trackId: track.id } });
        await prisma.section.createMany({
          data: sections.map((s: { tempo_bpm_rounded?: number | null; tempo_bpm: number | null; key: string | null; mode: string | null; tuning?: number | null }, i: number) => {
            const bpm = s.tempo_bpm_rounded ?? s.tempo_bpm;
            const key = s.key && s.mode ? `${s.key} ${s.mode}` : s.key;
            const rawTuning = s.tuning ?? null;
            const tuning = rawTuning != null ? Math.round(rawTuning / 25) * 25 : null;
            const hm = calcHourMinuteFromKeyString(bpm, key, tuning);
            return {
              trackId: track.id,
              name: `Section ${i + 1}`,
              bpm,
              key,
              tuning,
              hour: hm?.hour ?? null,
              minute: hm?.minute ?? null,
              ordinal: i,
            };
          }),
        });

        await prisma.track.update({
          where: { id: track.id },
          data: {
            analysisJobId: job.job_id,
            barsPercussion: g.bars_percussion_rounded,
            noDrums: g.no_drums ?? false,
            swing: g.swing,
            analysisStatus: "succeeded",
          },
        });
        queued++; // count as processed
      } else {
        await prisma.track.update({
          where: { id: track.id },
          data: {
            analysisJobId: job.job_id,
            analysisStatus: "queued",
          },
        });
        queued++;
      }
    } catch (err) {
      console.error(`Reanalyze failed for track ${track.id}:`, err);
      skipped++;
    }
  }

  return NextResponse.json({ queued, skipped, total: tracks.length });
}
