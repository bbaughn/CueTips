"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface SearchResult {
  id: number;
  title: string;
  year: string;
  thumb: string;
  type: string;
  inDb: boolean;
  inCollection: boolean;
}

export default function AddReleasePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<number | null>(null);
  const [restoring, setRestoring] = useState<number | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    const res = await fetch(
      `/api/discogs/search?q=${encodeURIComponent(query)}`
    );
    if (res.ok) {
      const data = await res.json();
      setResults(data.results || []);
    }
    setSearching(false);
  }

  async function handleAdd(discogsId: number) {
    setAdding(discogsId);
    const res = await fetch("/api/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discogsId }),
    });
    if (res.ok) {
      router.push("/");
    }
    setAdding(null);
  }

  async function handleRestore(discogsId: number) {
    setRestoring(discogsId);
    const res = await fetch("/api/collection/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discogsId }),
    });
    if (res.ok) {
      setConfirmRestore(null);
    }
    setRestoring(null);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Add Release</h1>
          <button
            onClick={() => router.push("/")}
            className="text-zinc-400 hover:text-white transition"
          >
            Back to Collection
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <input
            type="text"
            placeholder="Search Discogs (artist, title, label...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={searching}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {searching ? "..." : "Search"}
          </button>
        </form>

        <div className="space-y-3">
          {results.map((r) => (
            <div
              key={r.id}
              className={`flex items-center gap-4 p-4 rounded-lg border ${
                r.inDb
                  ? "bg-zinc-900/80 border-amber-700/50"
                  : "bg-zinc-900 border-zinc-800"
              }`}
            >
              {r.thumb ? (
                <Image
                  src={r.thumb}
                  alt=""
                  width={60}
                  height={60}
                  className="rounded object-cover w-[60px] h-[60px]"
                  unoptimized
                />
              ) : (
                <div className="w-[60px] h-[60px] bg-zinc-800 rounded flex items-center justify-center text-zinc-600 text-xs">
                  No img
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{r.title}</p>
                  {r.inDb && (
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 border border-amber-700/50">
                      In CueTips
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-400">{r.year || "—"}</p>
              </div>
              {r.inCollection ? (
                confirmRestore === r.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">
                      Wipe your customizations?
                    </span>
                    <button
                      onClick={() => handleRestore(r.id)}
                      disabled={restoring === r.id}
                      className="px-3 py-1.5 bg-red-700 hover:bg-red-600 rounded-lg text-xs font-medium transition disabled:opacity-50"
                    >
                      {restoring === r.id ? "..." : "Yes, Restore"}
                    </button>
                    <button
                      onClick={() => setConfirmRestore(null)}
                      className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs font-medium transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmRestore(r.id)}
                    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium text-zinc-300 transition"
                  >
                    Restore Defaults
                  </button>
                )
              ) : (
                <button
                  onClick={() => handleAdd(r.id)}
                  disabled={adding === r.id}
                  className="px-4 py-2 bg-zinc-700 hover:bg-amber-600 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {adding === r.id
                    ? "Adding..."
                    : r.inDb
                      ? "+ Add"
                      : "+ Import"}
                </button>
              )}
            </div>
          ))}
        </div>

        {results.length === 0 && !searching && (
          <p className="text-zinc-500 text-center mt-12">
            Search Discogs to find releases to add to your collection.
          </p>
        )}
      </div>
    </div>
  );
}
