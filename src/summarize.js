// Picks the top N articles by score and produces a one-sentence summary for each.
export function getTopArticles(articles, topN = 3) {
  return [...articles].sort((a, b) => b.score - a.score).slice(0, topN);
}

// Trims the body to the first sentence as a simple summary.
export function summarizeArticle(article) {
  const firstSentence = article.body.split(".")[0].trim() + ".";
  return {
    title: article.title,
    summary: firstSentence,
    score: article.score,
  };
}
