import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcHourMinute } from "@/lib/hour-minute";

// GET /api/track/[id] - track detail with user overrides merged
// NOTE: Prisma + PrismaPg adapter has a bug where multiple top-level
// includes in a single query cause ~10s delays. We use sequential
// separate queries as a workaround.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  const track = await prisma.track.findUnique({
    where: { id },
    include: { release: true },
  });

  if (!track) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sections = await prisma.section.findMany({
    where: { trackId: id },
    orderBy: { ordinal: "asc" },
    include: { userOverrides: { where: { userId } } },
  });

  const trackPref = await prisma.userTrackPreference.findFirst({
    where: { trackId: id, userId },
  });

  const firstSection = sections[0] ?? null;
  const lastSection =
    sections.length > 1 ? sections[sections.length - 1] : null;
  const firstOverride = firstSection?.userOverrides[0] ?? null;

  // Canonical values from analysis
  const canonicalKey = firstSection?.key ?? null;
  let canonicalRoot: string | null = null;
  let canonicalMode: string | null = null;
  if (canonicalKey) {
    const parts = canonicalKey.split(" ");
    canonicalRoot = parts[0] ?? null;
    canonicalMode = parts[1] ?? null;
  }

  // Effective values: override wins if the override row exists
  let effectiveBpm = firstSection?.bpm ?? null;
  let effectiveRoot = canonicalRoot;
  let effectiveMode = canonicalMode;
  let effectiveTuning = firstSection?.tuning ?? null;

  if (firstOverride) {
    if (firstOverride.bpm !== null) effectiveBpm = firstOverride.bpm;
    if (firstOverride.key !== undefined) {
      if (firstOverride.key === null) {
        effectiveRoot = null;
        effectiveMode = null;
      } else {
        const parts = firstOverride.key.split(" ");
        effectiveRoot = parts[0] ?? null;
        effectiveMode = parts[1] ?? null;
      }
    }
    if (firstOverride.tuning !== null) effectiveTuning = firstOverride.tuning;
  }

  // Calculate effective hour/minute from effective values
  const effectiveHm = calcHourMinute(effectiveBpm, effectiveRoot, effectiveMode, effectiveTuning);

  return NextResponse.json({
    id: track.id,
    title: track.title,
    artist: track.artist || track.release.artist,
    position: track.position,
    duration: track.duration,
    youtubeUrl: track.youtubeUrl,
    analysisStatus: track.analysisStatus,
    releaseId: track.release.id,
    releaseTitle: track.release.title,
    releaseArtist: track.release.artist,
    coverArtUrl: track.release.coverArtUrl,
    canonical: {
      bpm: firstSection?.bpm ?? null,
      root: canonicalRoot,
      mode: canonicalMode,
      tuning: firstSection?.tuning ?? null,
      hour: firstSection?.hour ?? null,
      minute: firstSection?.minute ?? null,
      barsPercussion: track.barsPercussion,
      swing: track.swing,
    },
    bpm: effectiveBpm,
    root: effectiveRoot,
    mode: effectiveMode,
    tuning: effectiveTuning,
    hour: effectiveHm?.hour ?? null,
    minute: effectiveHm?.minute ?? null,
    endBpm: lastSection?.bpm ?? null,
    endKey: lastSection?.key ?? null,
    endHour: lastSection?.hour ?? null,
    endMinute: lastSection?.minute ?? null,
    barsPercussion: trackPref?.barsPercussionOverride ?? track.barsPercussion,
    swing: trackPref?.swingOverride ?? track.swing,
    hasOverrides: !!(trackPref || firstOverride),
    firstSectionId: firstSection?.id ?? null,
  });
}

// PUT /api/track/[id] - save user overrides for this track
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { bpm, root, mode, tuning, barsPercussion, swing } = body;
  let { firstSectionId } = body;

  // If no section exists yet, create one so we have somewhere to store overrides
  if (!firstSectionId) {
    const section = await prisma.section.create({
      data: {
        trackId: id,
        name: "Section 1",
        ordinal: 0,
      },
    });
    firstSectionId = section.id;
  }

  // Save track-level overrides
  await prisma.userTrackPreference.upsert({
    where: { userId_trackId: { userId: session.user.id, trackId: id } },
    create: {
      userId: session.user.id,
      trackId: id,
      barsPercussionOverride: barsPercussion != null ? barsPercussion : null,
      swingOverride: swing != null ? swing : null,
    },
    update: {
      barsPercussionOverride: barsPercussion != null ? barsPercussion : null,
      swingOverride: swing != null ? swing : null,
    },
  });

  // Save section-level overrides
  const isNoKey = !root || root === "none";
  const keyStr = isNoKey ? null : (mode ? `${root} ${mode}` : root);
  const overrideTuning = isNoKey ? null : (tuning != null ? tuning : null);
  const hm = calcHourMinute(
    bpm ?? null,
    isNoKey ? null : root,
    isNoKey ? null : mode,
    overrideTuning,
  );

  await prisma.userSectionOverride.upsert({
    where: {
      userId_sectionId: { userId: session.user.id, sectionId: firstSectionId },
    },
    create: {
      userId: session.user.id,
      sectionId: firstSectionId,
      bpm: bpm != null ? bpm : null,
      key: keyStr,
      tuning: overrideTuning,
      hour: hm?.hour ?? null,
      minute: hm?.minute ?? null,
    },
    update: {
      bpm: bpm != null ? bpm : null,
      key: keyStr,
      tuning: overrideTuning,
      hour: hm?.hour ?? null,
      minute: hm?.minute ?? null,
    },
  });

  return NextResponse.json({ success: true });
}
