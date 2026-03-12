"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Release {
  id: string;
  title: string;
  artist: string;
  year: number | null;
  coverArtUrl: string | null;
}

interface Track {
  id: string;
  title: string;
  artist: string;
  position: string | null;
  duration: string | null;
  releaseId: string;
  releaseTitle: string;
  label: string | null;
  coverArtUrl: string | null;
  analysisStatus: string | null;
  bpm: number | null;
  key: string | null;
  endBpm: number | null;
  endKey: string | null;
}

type Tab = "releases" | "tracks";
type SortField = "artist" | "title" | "label" | "bpm" | "key";
type SortDir = "asc" | "desc";

function sortTracks(tracks: Track[], field: SortField, dir: SortDir): Track[] {
  return [...tracks].sort((a, b) => {
    let av: string | number | null;
    let bv: string | number | null;

    if (field === "bpm") {
      av = a.bpm;
      bv = b.bpm;
    } else if (field === "key") {
      av = a.key;
      bv = b.key;
    } else {
      av = a[field];
      bv = b[field];
    }

    // Nulls sort last regardless of direction
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;

    let cmp: number;
    if (typeof av === "number" && typeof bv === "number") {
      cmp = av - bv;
    } else {
      cmp = String(av).localeCompare(String(bv));
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

export default function CollectionGrid({ userName }: { userName: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("releases");
  const [releases, setReleases] = useState<Release[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [sortField, setSortField] = useState<SortField>("artist");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [loadingReleases, setLoadingReleases] = useState(true);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [tracksLoaded, setTracksLoaded] = useState(false);

  const hasPending = tracks.some(
    (t) =>
      t.analysisStatus === "queued" || t.analysisStatus === "running"
  );

  useEffect(() => {
    fetch("/api/collection")
      .then((r) => r.json())
      .then((data) => {
        setReleases(data);
        setLoadingReleases(false);
      });
  }, []);

  useEffect(() => {
    if (tab === "tracks" && !tracksLoaded) {
      setLoadingTracks(true);
      fetch("/api/collection/tracks")
        .then((r) => r.json())
        .then((data) => {
          setTracks(data);
          setLoadingTracks(false);
          setTracksLoaded(true);
        });
    }
  }, [tab, tracksLoaded]);

  // Auto-poll for pending analysis results
  useEffect(() => {
    if (!hasPending || tab !== "tracks") return;
    const interval = setInterval(async () => {
      await fetch("/api/analysis/poll", { method: "POST" });
      const res = await fetch("/api/collection/tracks");
      if (res.ok) setTracks(await res.json());
    }, 10000);
    return () => clearInterval(interval);
  }, [hasPending, tab]);

  const sortedTracks = sortTracks(tracks, sortField, sortDir);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function sortIndicator(field: SortField) {
    if (sortField !== field) return "";
    return sortDir === "asc" ? " \u25B2" : " \u25BC";
  }

  const loading = tab === "releases" ? loadingReleases : loadingTracks;
  const empty =
    tab === "releases" ? releases.length === 0 : tracks.length === 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CueTips</h1>
          <p className="text-sm text-zinc-400">Welcome, {userName}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/add")}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-semibold transition"
          >
            + Add Release
          </button>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-zinc-800">
          <button
            onClick={() => setTab("releases")}
            className={`px-4 py-2 text-sm font-medium transition -mb-px ${
              tab === "releases"
                ? "text-white border-b-2 border-amber-500"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Releases
          </button>
          <button
            onClick={() => setTab("tracks")}
            className={`px-4 py-2 text-sm font-medium transition -mb-px ${
              tab === "tracks"
                ? "text-white border-b-2 border-amber-500"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Tracks
          </button>
        </div>

        {loading ? (
          <p className="text-zinc-500 text-center mt-20">Loading...</p>
        ) : empty ? (
          <div className="text-center mt-20">
            <p className="text-zinc-400 mb-4">Your collection is empty.</p>
            <button
              onClick={() => router.push("/add")}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-lg font-semibold transition"
            >
              Add Your First Release
            </button>
          </div>
        ) : tab === "releases" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {releases.map((r) => (
              <div
                key={r.id}
                className="group cursor-pointer"
                onClick={() => {
                  /* future: navigate to release detail */
                }}
              >
                <div className="aspect-square bg-zinc-900 rounded-lg overflow-hidden mb-2">
                  {r.coverArtUrl ? (
                    <Image
                      src={r.coverArtUrl}
                      alt={`${r.artist} - ${r.title}`}
                      width={300}
                      height={300}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                      No Cover
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium truncate">{r.artist}</p>
                <p className="text-xs text-zinc-400 truncate">
                  {r.title} {r.year ? `(${r.year})` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {hasPending && (
              <p className="text-xs text-amber-400 mb-3 animate-pulse">
                Analyzing tracks... refreshing automatically
              </p>
            )}
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="py-3 px-2 w-10"></th>
                  {(["artist", "title", "label", "bpm", "key"] as SortField[]).map(
                    (field) => (
                      <th
                        key={field}
                        onClick={() => toggleSort(field)}
                        className="py-3 px-4 font-medium cursor-pointer hover:text-white transition select-none"
                      >
                        {field.charAt(0).toUpperCase() + field.slice(1)}
                        {sortIndicator(field)}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedTracks.map((t) => {
                  const pending =
                    t.analysisStatus === "queued" ||
                    t.analysisStatus === "running";
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition"
                    >
                      <td className="py-2 px-2 w-10">
                        {t.coverArtUrl ? (
                          <Image
                            src={t.coverArtUrl}
                            alt=""
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-zinc-800" />
                        )}
                      </td>
                      <td className="py-3 px-4">{t.artist}</td>
                      <td className="py-3 px-4">{t.title}</td>
                      <td className="py-3 px-4 text-zinc-400">
                        {t.label || "—"}
                      </td>
                      <td className="py-3 px-4">
                        {pending ? (
                          <span className="text-zinc-500 animate-pulse">...</span>
                        ) : t.bpm ? (
                          <span>
                            {t.bpm}
                            {t.endBpm && t.endBpm !== t.bpm && (
                              <span className="text-zinc-500">
                                {" "}
                                &rarr; {t.endBpm}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {pending ? (
                          <span className="text-zinc-500 animate-pulse">...</span>
                        ) : t.key ? (
                          <span>
                            {t.key}
                            {t.endKey && t.endKey !== t.key && (
                              <span className="text-zinc-500">
                                {" "}
                                &rarr; {t.endKey}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
