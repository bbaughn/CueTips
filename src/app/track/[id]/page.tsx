"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

const ROOT_NOTES = [
  "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B",
];
const MODES = ["major", "minor", "dorian"];

interface TrackDetail {
  id: string;
  title: string;
  artist: string;
  position: string | null;
  duration: string | null;
  youtubeUrl: string | null;
  analysisStatus: string | null;
  releaseId: string;
  releaseTitle: string;
  releaseArtist: string;
  coverArtUrl: string | null;
  canonical: {
    bpm: number | null;
    root: string | null;
    mode: string | null;
    tuning: number | null;
    barsPercussion: number | null;
    swing: boolean | null;
  };
  bpm: number | null;
  root: string | null;
  mode: string | null;
  tuning: number | null;
  barsPercussion: number | null;
  swing: boolean | null;
  hasOverrides: boolean;
  firstSectionId: string | null;
}

function nearestMultipleOf25(value: number, direction: "up" | "down"): number {
  if (direction === "up") {
    const next = Math.ceil((value + 1) / 25) * 25;
    return Math.min(next, 100);
  } else {
    const prev = Math.floor((value - 1) / 25) * 25;
    return Math.max(prev, -100);
  }
}

function youtubeEmbedUrl(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export default function TrackPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editBpm, setEditBpm] = useState<number | null>(null);
  const [editRoot, setEditRoot] = useState<string>("none");
  const [editMode, setEditMode] = useState<string>("major");
  const [editTuning, setEditTuning] = useState<number>(0);
  const [editBarsPercussion, setEditBarsPercussion] = useState<number | null>(
    null
  );
  const [editSwing, setEditSwing] = useState<boolean>(false);

  useEffect(() => {
    fetch(`/api/track/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setTrack(data);
        setLoading(false);
      });
  }, [id]);

  function enterEditMode() {
    if (!track) return;
    setEditBpm(track.bpm);
    setEditRoot(track.root || "none");
    setEditMode(track.mode || "major");
    setEditTuning(track.tuning ?? 0);
    setEditBarsPercussion(track.barsPercussion);
    setEditSwing(track.swing ?? false);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function saveEdit() {
    if (!track) return;
    setSaving(true);
    const res = await fetch(`/api/track/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bpm: editBpm,
        root: editRoot,
        mode: editRoot === "none" ? null : editMode,
        tuning: editRoot === "none" ? null : editTuning,
        barsPercussion: editBarsPercussion,
        swing: editSwing,
        firstSectionId: track.firstSectionId,
      }),
    });
    if (res.ok) {
      // Reload track data
      const r = await fetch(`/api/track/${id}`);
      if (r.ok) setTrack(await r.json());
      setEditing(false);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-500">Track not found</p>
      </div>
    );
  }

  const pending =
    track.analysisStatus === "queued" || track.analysisStatus === "running";
  const embedUrl = track.youtubeUrl
    ? youtubeEmbedUrl(track.youtubeUrl)
    : null;
  const noKey = editing ? editRoot === "none" : !track.root;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800">
        <div className="max-w-5xl mx-auto p-6">
          <button
            onClick={() => router.push(`/release/${track.releaseId}`)}
            className="text-zinc-400 hover:text-white transition text-sm mb-6 block"
          >
            &larr; Back to {track.releaseTitle}
          </button>
          <div className="flex gap-6 items-start">
            <div className="shrink-0">
              {track.coverArtUrl ? (
                <Image
                  src={track.coverArtUrl}
                  alt=""
                  width={120}
                  height={120}
                  className="w-30 h-30 rounded-lg object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-30 h-30 rounded-lg bg-zinc-900" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold truncate">{track.title}</h1>
              <p className="text-xl text-zinc-300 mt-1">{track.artist}</p>
              {track.position && (
                <p className="text-sm text-zinc-500 mt-1">
                  Track {track.position}
                </p>
              )}
            </div>
            <div className="shrink-0">
              {editing ? (
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="px-5 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 rounded-lg text-sm font-semibold transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={enterEditMode}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-semibold transition"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: fields */}
          <div className="space-y-6">
            {/* BPM */}
            <Field label="BPM" pending={pending}>
              {editing ? (
                <input
                  type="number"
                  value={editBpm ?? ""}
                  onChange={(e) =>
                    setEditBpm(
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  className="w-32 px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white text-2xl font-mono focus:outline-none focus:border-amber-500"
                />
              ) : (
                <span className="text-2xl font-mono">
                  {track.bpm ?? "—"}
                </span>
              )}
            </Field>

            {/* Key: Root */}
            <Field label="Key" pending={pending}>
              {editing ? (
                <div className="flex items-center gap-3">
                  <select
                    value={editRoot}
                    onChange={(e) => setEditRoot(e.target.value)}
                    className="px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white text-lg focus:outline-none focus:border-amber-500"
                  >
                    <option value="none">No key</option>
                    {ROOT_NOTES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  {editRoot !== "none" && (
                    <select
                      value={editMode}
                      onChange={(e) => setEditMode(e.target.value)}
                      className="px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white text-lg focus:outline-none focus:border-amber-500"
                    >
                      {MODES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <span className="text-2xl font-mono">
                  {track.root
                    ? `${track.root} ${track.mode || ""}`
                    : "—"}
                </span>
              )}
            </Field>

            {/* Tuning */}
            {!noKey && (
              <Field label="Tuning (cents)" pending={pending}>
                {editing ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setEditTuning(nearestMultipleOf25(editTuning, "down"))
                      }
                      className="w-10 h-10 bg-zinc-800 border border-zinc-600 rounded-lg text-white hover:bg-zinc-700 transition text-lg font-bold"
                    >
                      &minus;
                    </button>
                    <input
                      type="number"
                      min={-100}
                      max={100}
                      value={editTuning}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        if (!isNaN(v) && v >= -100 && v <= 100) setEditTuning(v);
                      }}
                      className="w-20 px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white text-2xl font-mono text-center focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={() =>
                        setEditTuning(nearestMultipleOf25(editTuning, "up"))
                      }
                      className="w-10 h-10 bg-zinc-800 border border-zinc-600 rounded-lg text-white hover:bg-zinc-700 transition text-lg font-bold"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <span className="text-2xl font-mono">
                    {track.tuning != null
                      ? `${track.tuning > 0 ? "+" : ""}${track.tuning}`
                      : "—"}
                  </span>
                )}
              </Field>
            )}

            {/* Bars Percussion */}
            <Field label="Bars Percussion" pending={pending}>
              {editing ? (
                <input
                  type="number"
                  min={0}
                  value={editBarsPercussion ?? ""}
                  onChange={(e) =>
                    setEditBarsPercussion(
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  className="w-32 px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white text-2xl font-mono focus:outline-none focus:border-amber-500"
                />
              ) : (
                <span className="text-2xl font-mono">
                  {track.barsPercussion ?? "—"}
                </span>
              )}
            </Field>

            {/* Swing */}
            <Field label="Swing" pending={pending}>
              {editing ? (
                <button
                  onClick={() => setEditSwing(!editSwing)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    editSwing
                      ? "bg-amber-600 text-white"
                      : "bg-zinc-800 border border-zinc-600 text-zinc-400"
                  }`}
                >
                  {editSwing ? "Yes" : "No"}
                </button>
              ) : (
                <span className="text-2xl font-mono">
                  {track.swing != null
                    ? track.swing
                      ? "Yes"
                      : "No"
                    : "—"}
                </span>
              )}
            </Field>
          </div>

          {/* Right: YouTube player */}
          <div>
            {embedUrl ? (
              <div className="aspect-video w-full">
                <iframe
                  src={embedUrl}
                  className="w-full h-full rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : track.youtubeUrl ? (
              <a
                href={track.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-500 hover:underline"
              >
                Open on YouTube
              </a>
            ) : (
              <div className="aspect-video w-full bg-zinc-900 rounded-lg flex items-center justify-center text-zinc-600">
                No video found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  pending,
  children,
}: {
  label: string;
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      {pending ? (
        <span className="text-2xl text-zinc-500 animate-pulse">...</span>
      ) : (
        children
      )}
    </div>
  );
}
