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
          },
        },
      },
    },
  });

  const tracks = collection.flatMap((c) =>
    c.release.tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist || c.release.artist,
      position: t.position,
      duration: t.duration,
      releaseId: c.release.id,
      releaseTitle: c.release.title,
      label: c.release.label,
    }))
  );

  tracks.sort((a, b) => a.artist.localeCompare(b.artist));

  return NextResponse.json(tracks);
}
