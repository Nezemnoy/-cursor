import Parser from "rss-parser";

const parser = new Parser();

// RSS feeds to pull AI news from.
const FEEDS = [
  "https://feeds.feedburner.com/TechCrunch/",
  "https://www.technologyreview.com/feed/",
];

// Fetches articles from all configured RSS feeds and returns them in a
// uniform shape. The `score` field uses publication recency (newest = highest).
export async function fetchArticles() {
  const results = await Promise.allSettled(FEEDS.map((url) => parser.parseURL(url)));

  const items = results.flatMap((r, feedIndex) => {
    if (r.status === "rejected") {
      console.warn(`Feed ${FEEDS[feedIndex]} failed: ${r.reason.message}`);
      return [];
    }
    return r.value.items;
  });

  // Deduplicate by title, sort newest-first by pubDate, assign recency score.
  const seen = new Set();
  return items
    .filter(({ title }) => {
      if (!title || seen.has(title)) return false;
      seen.add(title);
      return true;
    })
    .sort((a, b) => {
      const tA = a.isoDate ? new Date(a.isoDate).getTime() : 0;
      const tB = b.isoDate ? new Date(b.isoDate).getTime() : 0;
      return tB - tA;
    })
    .map((item, index) => ({
      id: index + 1,
      title: item.title?.trim() ?? "(no title)",
      body: item.contentSnippet ?? item.content ?? item.summary ?? "",
      pubDate: item.isoDate ?? null,
      score: Math.max(100 - index, 1),
    }));
}
