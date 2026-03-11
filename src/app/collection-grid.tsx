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
}

type Tab = "releases" | "tracks";

export default function CollectionGrid({ userName }: { userName: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("releases");
  const [releases, setReleases] = useState<Release[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loadingReleases, setLoadingReleases] = useState(true);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [tracksLoaded, setTracksLoaded] = useState(false);

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
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="py-3 px-4 font-medium">Artist</th>
                  <th className="py-3 px-4 font-medium">Title</th>
                  <th className="py-3 px-4 font-medium">Label</th>
                </tr>
              </thead>
              <tbody>
                {tracks.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition"
                  >
                    <td className="py-3 px-4">{t.artist}</td>
                    <td className="py-3 px-4">{t.title}</td>
                    <td className="py-3 px-4 text-zinc-400">
                      {t.label || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
