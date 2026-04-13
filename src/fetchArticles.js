import Parser from "rss-parser";
import { getConfig } from "./config.js";

const parser = new Parser();

export async function fetchArticles() {
  const { feeds, hoursBack } = getConfig();
  const cutoff = Date.now() - hoursBack * 60 * 60 * 1000;

  const results = await Promise.allSettled(
    feeds.map(({ url }) => parser.parseURL(url))
  );

  const items = results.flatMap((r, i) => {
    if (r.status === "rejected") {
      console.warn(`Feed "${feeds[i].source}" failed: ${r.reason.message}`);
      return [];
    }
    return r.value.items.map((item) => ({ ...item, _source: feeds[i].source }));
  });

  const seen = new Set();
  return items
    .filter(({ title, isoDate }) => {
      if (!title || seen.has(title)) return false;
      if (isoDate && new Date(isoDate).getTime() < cutoff) return false;
      seen.add(title);
      return true;
    })
    .sort((a, b) => {
      const tA = a.isoDate ? new Date(a.isoDate).getTime() : 0;
      const tB = b.isoDate ? new Date(b.isoDate).getTime() : 0;
      return tB - tA;
    })
    .map((item) => ({
      title:   item.title?.trim() ?? "(no title)",
      body:    item.contentSnippet ?? item.content ?? item.summary ?? "",
      url:     item.link ?? "",
      pubDate: item.isoDate ?? null,
      source:  item._source,
    }));
}
