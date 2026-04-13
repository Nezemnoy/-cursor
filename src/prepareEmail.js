// Builds both HTML and plain-text versions of the digest email.
export function prepareEmail(articles, date = new Date()) {
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const html = buildHtml(articles, dateStr);
  const text = buildText(articles, dateStr);

  return { subject: `AI News Digest — ${dateStr}`, html, text };
}

function buildHtml(articles, dateStr) {
  const cards = articles.map((a, i) => `
    <tr>
      <td style="padding:24px 0;border-bottom:1px solid #e5e7eb;">
        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-family:sans-serif;">
          ${i + 1} &nbsp;·&nbsp; <strong>${escHtml(a.source)}</strong>
          ${a.pubDate ? `&nbsp;·&nbsp; ${new Date(a.pubDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})}` : ""}
          ${a.relevanceScore != null ? `&nbsp;·&nbsp; relevance ${a.relevanceScore}/10` : ""}
        </p>
        <h2 style="margin:0 0 10px;font-size:18px;font-family:sans-serif;color:#111827;">
          <a href="${escHtml(a.url)}" style="color:#1d4ed8;text-decoration:none;">${escHtml(a.title)}</a>
        </h2>
        <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#374151;font-family:sans-serif;">
          ${escHtml(a.summary)}
        </p>
        ${a.whyItMatters ? `
        <p style="margin:0;font-size:13px;color:#6b7280;font-family:sans-serif;">
          <strong>Why it matters:</strong> ${escHtml(a.whyItMatters)}
        </p>` : ""}
      </td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <!-- Header -->
        <tr>
          <td style="background:#1d4ed8;padding:28px 32px;">
            <h1 style="margin:0;font-size:22px;color:#ffffff;font-family:sans-serif;">AI News Digest</h1>
            <p style="margin:4px 0 0;font-size:14px;color:#bfdbfe;font-family:sans-serif;">${dateStr}</p>
          </td>
        </tr>
        <!-- Intro -->
        <tr>
          <td style="padding:24px 32px 0;">
            <p style="margin:0;font-size:14px;color:#6b7280;font-family:sans-serif;">
              Here are today's top ${articles.length} AI stories, curated and summarized by Gemini.
            </p>
          </td>
        </tr>
        <!-- Articles -->
        <tr>
          <td style="padding:0 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${cards}
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 32px;background:#f3f4f6;">
            <p style="margin:0;font-size:12px;color:#9ca3af;font-family:sans-serif;text-align:center;">
              Generated automatically by ai-news-digest · powered by OpenRouter
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildText(articles, dateStr) {
  const lines = articles.map((a, i) =>
    `${i + 1}. [${a.source}] ${a.title}\n` +
    `   ${a.url}\n` +
    `   ${a.summary}` +
    (a.whyItMatters ? `\n   Why it matters: ${a.whyItMatters}` : "")
  ).join("\n\n");

  return `AI News Digest — ${dateStr}\n\n${lines}\n\n---\nGenerated automatically · powered by OpenRouter\n`;
}

function escHtml(str = "") {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
