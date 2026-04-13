import { getConfig } from "./config.js";

// Builds both HTML and plain-text versions of the digest email.
// `brief` is an optional { themes, recommendation } object from synthesizeDigest.
export function prepareEmail(articles, brief = null, date = new Date()) {
  const { subjectPrefix } = getConfig();
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const html = buildHtml(articles, brief, dateStr, subjectPrefix);
  const text = buildText(articles, brief, dateStr, subjectPrefix);

  return { subject: `${subjectPrefix} — ${dateStr}`, html, text };
}

const ACTION_SIGNAL_COLORS = {
  "Act Now":  { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b" },
  "Evaluate": { bg: "#fffbeb", border: "#fcd34d", text: "#92400e" },
  "Monitor":  { bg: "#f3f4f6", border: "#d1d5db", text: "#374151" },
};

function actionSignalBadge(signal) {
  if (!signal) return "";
  const colors = ACTION_SIGNAL_COLORS[signal] ?? ACTION_SIGNAL_COLORS["Monitor"];
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;font-family:sans-serif;background:${colors.bg};border:1px solid ${colors.border};color:${colors.text};">${escHtml(signal)}</span>`;
}

function buildHtml(articles, brief, dateStr, title) {
  const briefSection = brief ? `
        <tr>
          <td style="padding:20px 32px;background:#eff6ff;border-bottom:1px solid #bfdbfe;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#1d4ed8;font-family:sans-serif;">CTO Brief</p>
            <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#1e3a5f;font-family:sans-serif;">${escHtml(brief.themes)}</p>
            <p style="margin:0;font-size:13px;color:#1e3a5f;font-family:sans-serif;">
              <strong>This week:</strong> ${escHtml(brief.recommendation)}
            </p>
          </td>
        </tr>` : "";

  const cards = articles.map((a, i) => `
    <tr>
      <td style="padding:24px 0;border-bottom:1px solid #e5e7eb;">
        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-family:sans-serif;">
          ${i + 1} &nbsp;·&nbsp; <strong>${escHtml(a.source)}</strong>
          ${a.pubDate ? `&nbsp;·&nbsp; ${new Date(a.pubDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})}` : ""}
          ${a.relevanceScore != null ? `&nbsp;·&nbsp; relevance ${a.relevanceScore}/10` : ""}
          ${a.actionSignal ? `&nbsp;·&nbsp; ${actionSignalBadge(a.actionSignal)}` : ""}
        </p>
        <h2 style="margin:0 0 10px;font-size:18px;font-family:sans-serif;color:#111827;">
          <a href="${escHtml(a.url)}" style="color:#1d4ed8;text-decoration:none;">${escHtml(a.title)}</a>
        </h2>
        <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#374151;font-family:sans-serif;">
          ${escHtml(a.summary)}
        </p>
        ${a.strategicTake ? `
        <p style="margin:0;font-size:13px;color:#6b7280;font-family:sans-serif;">
          <strong>Strategic take:</strong> ${escHtml(a.strategicTake)}
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
            <h1 style="margin:0;font-size:22px;color:#ffffff;font-family:sans-serif;">${escHtml(title)}</h1>
            <p style="margin:4px 0 0;font-size:14px;color:#bfdbfe;font-family:sans-serif;">${dateStr}</p>
          </td>
        </tr>
        <!-- CTO Brief -->
        ${briefSection}
        <!-- Intro -->
        <tr>
          <td style="padding:24px 32px 0;">
            <p style="margin:0;font-size:14px;color:#6b7280;font-family:sans-serif;">
              Here are today's top ${articles.length} AI stories, curated and summarized by AI.
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

function buildText(articles, brief, dateStr, title) {
  const briefSection = brief
    ? `--- CTO Brief ---\n${brief.themes}\n\nThis week: ${brief.recommendation}\n\n`
    : "";

  const lines = articles.map((a, i) =>
    `${i + 1}. [${a.source}]${a.actionSignal ? ` [${a.actionSignal}]` : ""} ${a.title}\n` +
    `   ${a.url}\n` +
    `   ${a.summary}` +
    (a.strategicTake ? `\n   Strategic take: ${a.strategicTake}` : "")
  ).join("\n\n");

  return `${title} — ${dateStr}\n\n${briefSection}${lines}\n\n---\nGenerated automatically · powered by OpenRouter\n`;
}

function escHtml(str = "") {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
