import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/collection/tracks - list all tracks across user's collection
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const collection = await prisma.userCollection.findMany({
    where: { userId: session.user.id },
    include: {
      release: {
        include: {
          tracks: {
            orderBy: { position: "asc" },
            include: {
              sections: {
                orderBy: { ordinal: "asc" },
              },
            },
          },
        },
      },
    },
  });

  const tracks = collection.flatMap((c) =>
    c.release.tracks.map((t) => {
      const firstSection = t.sections[0] ?? null;
      const lastSection =
        t.sections.length > 1 ? t.sections[t.sections.length - 1] : null;

      return {
        id: t.id,
        title: t.title,
        artist: t.artist || c.release.artist,
        position: t.position,
        duration: t.duration,
        releaseId: c.release.id,
        releaseTitle: c.release.title,
        label: c.release.label,
        coverArtUrl: c.release.coverArtUrl,
        analysisStatus: t.analysisStatus,
        bpm: firstSection?.bpm ?? null,
        key: firstSection?.key ?? null,
        endBpm: lastSection?.bpm ?? null,
        endKey: lastSection?.key ?? null,
      };
    })
  );

  tracks.sort((a, b) => a.artist.localeCompare(b.artist));

  return NextResponse.json(tracks);
}
