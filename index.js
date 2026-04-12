import { fetchArticles } from "./src/fetchArticles.js";
import { getTopArticles, summarizeArticle } from "./src/summarize.js";
import { prepareEmail } from "./src/prepareEmail.js";

const articles = await fetchArticles();
const top = getTopArticles(articles, 3);
const summaries = top.map(summarizeArticle);
const email = prepareEmail(summaries);

console.log(email);
