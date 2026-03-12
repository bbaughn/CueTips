import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/collection/restore - wipe user's customizations for a release
// and re-import canonical data from Discogs
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { discogsId } = await req.json();
  if (!discogsId || typeof discogsId !== "number") {
    return NextResponse.json(
      { error: "discogsId (number) is required" },
      { status: 400 }
    );
  }

  const release = await prisma.release.findUnique({
    where: { discogsId },
    include: { tracks: { include: { sections: true } } },
  });

  if (!release) {
    return NextResponse.json({ error: "Release not found" }, { status: 404 });
  }

  const trackIds = release.tracks.map((t) => t.id);
  const sectionIds = release.tracks.flatMap((t) =>
    t.sections.map((s) => s.id)
  );

  // Delete all user-specific overrides for this release's tracks/sections
  await prisma.$transaction([
    prisma.userTrackPreference.deleteMany({
      where: { userId: session.user.id, trackId: { in: trackIds } },
    }),
    prisma.userSectionOverride.deleteMany({
      where: { userId: session.user.id, sectionId: { in: sectionIds } },
    }),
    prisma.trackTag.deleteMany({
      where: { userId: session.user.id, trackId: { in: trackIds } },
    }),
    prisma.releaseTag.deleteMany({
      where: { userId: session.user.id, releaseId: release.id },
    }),
  ]);

  return NextResponse.json({ success: true, releaseId: release.id });
}
