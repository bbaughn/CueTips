"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

interface Track {
  id: string;
  title: string;
  artist: string;
  position: string | null;
  duration: string | null;
  youtubeUrl: string | null;
  analysisStatus: string | null;
  bpm: number | null;
  key: string | null;
  hour: number | null;
  minute: number | null;
  tuning: number | null;
  endBpm: number | null;
  endKey: string | null;
  endHour: number | null;
  endMinute: number | null;
}

interface ReleaseDetail {
  id: string;
  title: string;
  artist: string;
  year: number | null;
  label: string | null;
  catNo: string | null;
  coverArtUrl: string | null;
  tracks: Track[];
}

function youtubeEmbedUrl(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export default function ReleasePage() {
  const params = useParams();
  const router = useRouter();
  const [release, setRelease] = useState<ReleaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const id = params.id as string;

  const [analyzing, setAnalyzing] = useState(false);
  const [removing, setRemoving] = useState(false);

  const hasPending = release?.tracks.some(
    (t) => t.analysisStatus === "queued" || t.analysisStatus === "running"
  );

  const hasUnanalyzed = release?.tracks.some(
    (t) =>
      !t.bpm &&
      t.analysisStatus !== "queued" &&
      t.analysisStatus !== "running"
  );

  async function analyzeRelease() {
    if (!release) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/admin/reanalyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseId: release.id }),
      });
      if (res.ok) {
        const refreshed = await fetch(`/api/release/${id}`);
        if (refreshed.ok) setRelease(await refreshed.json());
      }
    } finally {
      setAnalyzing(false);
    }
  }

  async function removeFromCollection() {
    if (!release) return;
    const confirmed = window.confirm(
      `Remove "${release.title}" from your collection?`
    );
    if (!confirmed) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/collection/${release.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/");
      } else {
        setRemoving(false);
      }
    } catch {
      setRemoving(false);
    }
  }

  useEffect(() => {
    fetch(`/api/release/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setRelease(data);
        setLoading(false);
      });
  }, [id]);

  // Auto-poll for pending analysis
  useEffect(() => {
    if (!hasPending) return;
    const interval = setInterval(async () => {
      await fetch("/api/analysis/poll", { method: "POST" });
      const res = await fetch(`/api/release/${id}`);
      if (res.ok) setRelease(await res.json());
    }, 10000);
    return () => clearInterval(interval);
  }, [hasPending, id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (!release) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-500">Release not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto p-6">
          <button
            onClick={() => router.push("/")}
            className="text-zinc-400 hover:text-white transition text-sm mb-6 block"
          >
            &larr; Back to Collection
          </button>
          <div className="flex gap-8">
            <div className="shrink-0">
              {release.coverArtUrl ? (
                <Image
                  src={release.coverArtUrl}
                  alt={`${release.artist} - ${release.title}`}
                  width={240}
                  height={240}
                  className="w-60 h-60 rounded-lg object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-60 h-60 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-600">
                  No Cover
                </div>
              )}
            </div>
            <div className="flex flex-col justify-end">
              <h1 className="text-3xl font-bold">{release.title}</h1>
              <p className="text-xl text-zinc-300 mt-1">{release.artist}</p>
              <div className="flex gap-4 mt-3 text-sm text-zinc-400">
                {release.year && <span>{release.year}</span>}
                {release.label && <span>{release.label}</span>}
                {release.catNo && (
                  <span className="text-zinc-500">{release.catNo}</span>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={analyzeRelease}
                  disabled={analyzing}
                  className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded transition"
                >
                  {analyzing ? "Submitting..." : "Analyze Tracks"}
                </button>
                <button
                  onClick={removeFromCollection}
                  disabled={removing}
                  className="px-4 py-2 text-sm bg-zinc-800 hover:bg-red-700 text-zinc-300 hover:text-white border border-zinc-700 hover:border-red-700 disabled:opacity-50 rounded transition"
                >
                  {removing ? "Removing..." : "Remove from Collection"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tracklist */}
      <div className="max-w-7xl mx-auto p-6">
        {hasPending && (
          <p className="text-xs text-amber-400 mb-3 animate-pulse">
            Analyzing tracks... refreshing automatically
          </p>
        )}
        {(() => {
          const tracks = release.tracks;
          const hasEndBpm = tracks.some((t) => t.endBpm != null);
          const hasEndKey = tracks.some((t) => t.endKey != null);
          const hasEndCueTips = tracks.some((t) => t.endHour != null);
          return (
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="py-3 px-4 font-medium w-12">#</th>
                  <th className="py-3 px-4 font-medium">Artist</th>
                  <th className="py-3 px-4 font-medium">Title</th>
                  <th className="py-3 px-4 font-medium">BPM</th>
                  {hasEndBpm && <th className="py-3 px-4 font-medium">BPM (End)</th>}
                  <th className="py-3 px-4 font-medium">Key</th>
                  {hasEndKey && <th className="py-3 px-4 font-medium">Key (End)</th>}
                  <th className="py-3 px-4 font-medium">CueTips</th>
                  {hasEndCueTips && <th className="py-3 px-4 font-medium">CueTips (End)</th>}
                  <th className="py-3 px-4 font-medium">Tuning</th>
                  <th className="py-3 px-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {tracks.map((t) => {
                  const pending =
                    t.analysisStatus === "queued" ||
                    t.analysisStatus === "running";
                  const analysisFailed =
                    t.analysisStatus === "failed" ||
                    t.analysisStatus === "error";
                  const embedUrl = t.youtubeUrl
                    ? youtubeEmbedUrl(t.youtubeUrl)
                    : null;

                  return (
                    <tr
                      key={t.id}
                      className="border-b border-zinc-800/50 align-top cursor-pointer hover:bg-zinc-900/50 transition"
                      onClick={() => router.push(`/track/${t.id}`)}
                    >
                      <td className="py-4 px-4 text-zinc-500">
                        {t.position || "—"}
                      </td>
                      <td className="py-4 px-4">{t.artist}</td>
                      <td className="py-4 px-4">{t.title}</td>
                      <td className="py-4 px-4">
                        {pending ? (
                          <span className="text-zinc-500 animate-pulse">...</span>
                        ) : analysisFailed ? (
                          <span className="text-red-500 text-xs">failed</span>
                        ) : t.bpm ? (
                          <span>{t.bpm}</span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      {hasEndBpm && (
                        <td className="py-4 px-4">
                          {pending ? (
                            <span className="text-zinc-500 animate-pulse">...</span>
                          ) : analysisFailed ? (
                            <span className="text-red-500 text-xs">failed</span>
                          ) : t.endBpm != null ? (
                            <span>{t.endBpm}</span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                      )}
                      <td className="py-4 px-4">
                        {pending ? (
                          <span className="text-zinc-500 animate-pulse">...</span>
                        ) : analysisFailed ? (
                          <span className="text-red-500 text-xs">failed</span>
                        ) : t.key ? (
                          <span>{t.key}</span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      {hasEndKey && (
                        <td className="py-4 px-4">
                          {pending ? (
                            <span className="text-zinc-500 animate-pulse">...</span>
                          ) : analysisFailed ? (
                            <span className="text-red-500 text-xs">failed</span>
                          ) : t.endKey != null ? (
                            <span>{t.endKey}</span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                      )}
                      <td className="py-4 px-4">
                        {pending ? (
                          <span className="text-zinc-500 animate-pulse">...</span>
                        ) : analysisFailed ? (
                          <span className="text-red-500 text-xs">failed</span>
                        ) : t.hour != null ? (
                          <span>
                            {t.hour}:{String(t.minute ?? 0).padStart(2, "0")}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      {hasEndCueTips && (
                        <td className="py-4 px-4">
                          {pending ? (
                            <span className="text-zinc-500 animate-pulse">...</span>
                          ) : analysisFailed ? (
                            <span className="text-red-500 text-xs">failed</span>
                          ) : t.endHour != null ? (
                            <span>
                              {t.endHour}:{String(t.endMinute ?? 0).padStart(2, "0")}
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                      )}
                      <td className="py-4 px-4">
                        {pending ? (
                          <span className="text-zinc-500 animate-pulse">...</span>
                        ) : analysisFailed ? (
                          <span className="text-red-500 text-xs">failed</span>
                        ) : t.tuning != null ? (
                          <span>
                            {t.tuning > 0 ? "+" : ""}
                            {t.tuning}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {embedUrl ? (
                          <iframe
                            src={embedUrl}
                            width={280}
                            height={158}
                            className="rounded"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : t.youtubeUrl ? (
                          <a
                            href={t.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-500 hover:underline text-xs"
                          >
                            Open on YouTube
                          </a>
                        ) : (
                          <span className="text-zinc-600 text-xs">
                            No video found
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          );
        })()}
      </div>
    </div>
  );
}
