import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchDiscogs } from "@/lib/discogs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  const data = await searchDiscogs(q);
  const discogsIds = data.results.map((r) => r.id);

  // Find which of these releases already exist in our DB
  const existing = await prisma.release.findMany({
    where: { discogsId: { in: discogsIds } },
    select: { discogsId: true, coverArtUrl: true },
  });
  const existingMap = new Map(existing.map((r) => [r.discogsId, r.coverArtUrl]));

  // Also check which ones are in this user's collection
  const inCollection = await prisma.userCollection.findMany({
    where: {
      userId: session.user.id,
      release: { discogsId: { in: discogsIds } },
    },
    include: { release: { select: { discogsId: true } } },
  });
  const collectionIds = new Set(inCollection.map((c) => c.release.discogsId));

  const results = data.results.map((r) => ({
    id: r.id,
    title: r.title,
    year: r.year,
    thumb: r.thumb || r.cover_image || existingMap.get(r.id) || "",
    type: r.type,
    inDb: existingMap.has(r.id),
    inCollection: collectionIds.has(r.id),
  }));

  // Sort: in-DB results first, then the rest
  results.sort((a, b) => {
    if (a.inDb && !b.inDb) return -1;
    if (!a.inDb && b.inDb) return 1;
    return 0;
  });

  return NextResponse.json({ results });
}
