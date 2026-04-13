import Parser from "rss-parser";

const parser = new Parser();

const FEEDS = [
  // Research labs & company blogs
  { url: "https://openai.com/news/rss.xml",                            source: "OpenAI" },
  { url: "https://www.anthropic.com/rss.xml",                          source: "Anthropic" },
  { url: "https://deepmind.google/blog/rss.xml",                       source: "DeepMind" },
  { url: "https://ai.meta.com/blog/feed/",                             source: "Meta AI" },
  { url: "https://huggingface.co/blog/feed.xml",                       source: "Hugging Face" },
  // Newsletters
  { url: "https://www.deeplearning.ai/the-batch/feed/",                source: "The Batch" },
  { url: "https://importai.substack.com/feed",                         source: "Import AI" },
  { url: "https://www.interconnects.ai/feed",                          source: "Interconnects" },
  { url: "https://simonwillison.net/atom/everything/",                  source: "Simon Willison" },
  // News outlets
  { url: "https://venturebeat.com/category/ai/feed/",                  source: "VentureBeat AI" },
  { url: "https://the-decoder.com/feed/",                              source: "The Decoder" },
  { url: "https://www.wired.com/feed/tag/artificial-intelligence/rss", source: "Wired AI" },
  { url: "https://www.technologyreview.com/feed/",                     source: "MIT Tech Review" },
];

const HOURS_BACK = 24;

export async function fetchArticles() {
  const cutoff = Date.now() - HOURS_BACK * 60 * 60 * 1000;

  const results = await Promise.allSettled(
    FEEDS.map(({ url }) => parser.parseURL(url))
  );

  const items = results.flatMap((r, i) => {
    if (r.status === "rejected") {
      console.warn(`Feed "${FEEDS[i].source}" failed: ${r.reason.message}`);
      return [];
    }
    return r.value.items.map((item) => ({ ...item, _source: FEEDS[i].source }));
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
      title: item.title?.trim() ?? "(no title)",
      body: item.contentSnippet ?? item.content ?? item.summary ?? "",
      url: item.link ?? "",
      pubDate: item.isoDate ?? null,
      source: item._source,
    }));
}
