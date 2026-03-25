import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJobStatus, getJobResult } from "@/lib/qanalyzer";
import { calcHourMinuteFromKeyString } from "@/lib/hour-minute";

// POST /api/analysis/poll - check pending analysis jobs and save results
// Returns summary of what was updated
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all tracks in user's collection with pending analysis
  const collection = await prisma.userCollection.findMany({
    where: { userId: session.user.id },
    include: {
      release: {
        include: {
          tracks: {
            where: {
              analysisJobId: { not: null },
              analysisStatus: { in: ["queued", "running"] },
            },
          },
        },
      },
    },
  });

  const pendingTracks = collection.flatMap((c) => c.release.tracks);
  let completed = 0;
  let failed = 0;
  let stillPending = 0;

  for (const track of pendingTracks) {
    if (!track.analysisJobId) continue;

    try {
      const status = await getJobStatus(track.analysisJobId);

      if (status.status === "succeeded") {
        const result = await getJobResult(track.analysisJobId);
        const g = result.result.global;
        const sections = result.result.sections;

        // Delete existing sections and create new ones from analysis
        await prisma.section.deleteMany({ where: { trackId: track.id } });
        await prisma.section.createMany({
          data: sections.map((s, i) => {
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

        // Update track with global stats only after sections are saved
        await prisma.track.update({
          where: { id: track.id },
          data: {
            barsPercussion: g.bars_percussion_rounded,
            noDrums: g.no_drums ?? false,
            swing: g.swing,
            analysisStatus: "succeeded",
          },
        });

        completed++;
      } else if (status.status === "failed") {
        await prisma.track.update({
          where: { id: track.id },
          data: {
            analysisStatus: "failed",
          },
        });
        failed++;
      } else {
        // Still queued or running
        await prisma.track.update({
          where: { id: track.id },
          data: { analysisStatus: status.status },
        });
        stillPending++;
      }
    } catch (err) {
      console.error(`Poll failed for track ${track.id}:`, err);
      await prisma.track.update({
        where: { id: track.id },
        data: { analysisStatus: "error" },
      }).catch(() => {});
      failed++;
    }
  }

  return NextResponse.json({ completed, failed, stillPending });
}
