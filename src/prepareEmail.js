// Formats summarized articles into a plain-text email body.
export function prepareEmail(summaries, date = new Date()) {
  const dateStr = date.toDateString();

  const articleLines = summaries
    .map(
      ({ title, summary, score }, i) =>
        `${i + 1}. ${title} (score: ${score})\n   ${summary}`
    )
    .join("\n\n");

  return `Subject: AI News Digest — ${dateStr}

Hello,

Here are today's top AI stories:

${articleLines}

---
This digest was generated automatically.
`;
}
