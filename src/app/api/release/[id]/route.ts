import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const release = await prisma.release.findUnique({
    where: { id },
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
  });

  if (!release) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tracks = release.tracks.map((t) => {
    const firstSection = t.sections[0] ?? null;
    const lastSection =
      t.sections.length > 1 ? t.sections[t.sections.length - 1] : null;

    return {
      id: t.id,
      title: t.title,
      artist: t.artist || release.artist,
      position: t.position,
      duration: t.duration,
      youtubeUrl: t.youtubeUrl,
      analysisStatus: t.analysisStatus,
      bpm: firstSection?.bpm ?? null,
      key: firstSection?.key ?? null,
      hour: firstSection?.hour ?? null,
      minute: firstSection?.minute ?? null,
      tuning: firstSection?.tuning ?? null,
      endBpm: lastSection?.bpm ?? null,
      endKey: lastSection?.key ?? null,
      endHour: lastSection?.hour ?? null,
      endMinute: lastSection?.minute ?? null,
    };
  });

  return NextResponse.json({
    id: release.id,
    title: release.title,
    artist: release.artist,
    year: release.year,
    label: release.label,
    catNo: release.catNo,
    coverArtUrl: release.coverArtUrl,
    tracks,
  });
}
