import YouTube from "youtube-sr";

export async function findYoutubeUrl(
  artist: string,
  title: string
): Promise<string | null> {
  try {
    const query = `${artist} ${title}`;
    const results = await YouTube.search(query, { limit: 1, type: "video" });
    if (results.length > 0 && results[0].url) {
      return results[0].url;
    }
    return null;
  } catch {
    return null;
  }
}
