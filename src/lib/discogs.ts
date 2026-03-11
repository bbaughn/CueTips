const DISCOGS_BASE = "https://api.discogs.com";

function headers() {
  const h: Record<string, string> = {
    "User-Agent": "CueTips/0.1",
  };
  if (process.env.DISCOGS_TOKEN) {
    h["Authorization"] = `Discogs token=${process.env.DISCOGS_TOKEN}`;
  }
  return h;
}

export interface DiscogsSearchResult {
  id: number;
  title: string;
  year: string;
  cover_image: string;
  thumb: string;
  type: string;
}

export interface DiscogsRelease {
  id: number;
  title: string;
  artists: { name: string }[];
  year: number;
  images?: { type: string; uri: string; uri150: string }[];
  labels?: { name: string; catno: string }[];
  tracklist: {
    position: string;
    title: string;
    duration: string;
    artists?: { name: string }[];
  }[];
}

export async function searchDiscogs(
  query: string,
  type: string = "release"
): Promise<{ results: DiscogsSearchResult[] }> {
  const url = `${DISCOGS_BASE}/database/search?q=${encodeURIComponent(query)}&type=${type}&per_page=20`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Discogs search failed: ${res.status}`);
  return res.json();
}

export async function getDiscogsRelease(
  discogsId: number
): Promise<DiscogsRelease> {
  const url = `${DISCOGS_BASE}/releases/${discogsId}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Discogs release fetch failed: ${res.status}`);
  return res.json();
}
