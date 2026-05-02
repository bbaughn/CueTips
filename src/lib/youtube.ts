import YouTube from "youtube-sr";

const MAX_DURATION_MS = 20 * 60 * 1000;

export async function findYoutubeUrl(
  artist: string,
  title: string
): Promise<string | null> {
  try {
    const query = `${artist} ${title}`;
    const results = await YouTube.search(query, { limit: 10, type: "video" });
    const candidate = results.find(
      (r) => r.url && r.duration > 0 && r.duration <= MAX_DURATION_MS
    );
    if (candidate?.url) return candidate.url;
    if (results.length > 0) {
      console.warn(
        `[youtube] No candidate under 20m for "${artist} - ${title}" (${results.length} results)`
      );
    }
    return null;
  } catch {
    return null;
  }
}
