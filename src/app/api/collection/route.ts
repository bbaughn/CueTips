import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDiscogsRelease } from "@/lib/discogs";

// GET /api/collection - list user's releases alphabetically
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const collection = await prisma.userCollection.findMany({
    where: { userId: session.user.id },
    include: {
      release: {
        include: { tracks: true },
      },
    },
    orderBy: { release: { artist: "asc" } },
  });

  const releases = collection.map((c) => ({
    ...c.release,
    addedAt: c.addedAt,
  }));

  return NextResponse.json(releases);
}

// POST /api/collection - add a release by discogs ID
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

  // Check if release already exists in our DB
  let release = await prisma.release.findUnique({
    where: { discogsId },
  });

  if (!release) {
    // Fetch from Discogs and create
    const discogs = await getDiscogsRelease(discogsId);
    const artistName = discogs.artists?.map((a) => a.name).join(", ") || "Unknown";
    const coverArt =
      discogs.images?.find((i) => i.type === "primary")?.uri ??
      discogs.images?.[0]?.uri ??
      null;
    const label = discogs.labels?.[0]?.name ?? null;
    const catNo = discogs.labels?.[0]?.catno ?? null;

    release = await prisma.release.create({
      data: {
        discogsId,
        title: discogs.title,
        artist: artistName,
        year: discogs.year || null,
        coverArtUrl: coverArt,
        label,
        catNo,
        tracks: {
          create: discogs.tracklist
            .filter((t) => t.position) // skip headings
            .map((t) => ({
              title: t.title,
              artist: t.artists?.map((a) => a.name).join(", ") || null,
              position: t.position,
              duration: t.duration || null,
            })),
        },
      },
    });
  }

  // Link to user's collection (upsert to avoid duplicates)
  await prisma.userCollection.upsert({
    where: {
      userId_releaseId: {
        userId: session.user.id,
        releaseId: release.id,
      },
    },
    create: {
      userId: session.user.id,
      releaseId: release.id,
    },
    update: {},
  });

  return NextResponse.json({ success: true, releaseId: release.id });
}
