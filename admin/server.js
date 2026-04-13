import "dotenv/config";
import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";
import {
  getAllSettings, saveSettings,
  getFeeds, addFeed, updateFeed, deleteFeed,
  getModels, addModel, updateModel, deleteModel,
  getRecipients, addRecipient, updateRecipient, deleteRecipient,
  getRuns, getRunLog, createRun, appendRunLog, finishRun,
} from "./db.js";

const __dirname  = dirname(fileURLToPath(import.meta.url));
const ROOT       = join(__dirname, "..");
const CLIENT_DIST = join(__dirname, "client/dist");
const PORT       = process.env.ADMIN_PORT ?? 3001;

const app = express();
app.use(cors());
app.use(express.json());

// ── Settings ────────────────────────────────────────────────────────────────

app.get("/api/settings", (_req, res) => {
  res.json(getAllSettings());
});

app.put("/api/settings", (req, res) => {
  saveSettings(req.body);
  res.json({ ok: true });
});

// ── Feeds ────────────────────────────────────────────────────────────────────

app.get("/api/feeds", (_req, res) => {
  res.json(getFeeds());
});

app.post("/api/feeds", (req, res) => {
  const { url, name } = req.body ?? {};
  if (!url || !name) return res.status(400).json({ error: "url and name required" });
  res.json(addFeed({ url, name }));
});

app.put("/api/feeds/:id", (req, res) => {
  const feed = updateFeed(Number(req.params.id), req.body);
  if (!feed) return res.status(404).json({ error: "Feed not found" });
  res.json(feed);
});

app.delete("/api/feeds/:id", (req, res) => {
  deleteFeed(Number(req.params.id));
  res.json({ ok: true });
});

// ── Models ────────────────────────────────────────────────────────────────────

app.get("/api/models", (_req, res) => {
  res.json(getModels());
});

app.post("/api/models", (req, res) => {
  const { modelId, priority } = req.body ?? {};
  if (!modelId) return res.status(400).json({ error: "modelId required" });
  res.json(addModel({ modelId, priority }));
});

app.put("/api/models/:id", (req, res) => {
  const row = updateModel(Number(req.params.id), req.body);
  if (!row) return res.status(404).json({ error: "Model not found" });
  res.json(row);
});

app.delete("/api/models/:id", (req, res) => {
  deleteModel(Number(req.params.id));
  res.json({ ok: true });
});

// ── Recipients ────────────────────────────────────────────────────────────────

app.get("/api/recipients", (_req, res) => {
  res.json(getRecipients());
});

app.post("/api/recipients", (req, res) => {
  const { email } = req.body ?? {};
  if (!email) return res.status(400).json({ error: "email required" });
  res.json(addRecipient(email));
});

app.put("/api/recipients/:id", (req, res) => {
  const row = updateRecipient(Number(req.params.id), req.body);
  if (!row) return res.status(404).json({ error: "Recipient not found" });
  res.json(row);
});

app.delete("/api/recipients/:id", (req, res) => {
  deleteRecipient(Number(req.params.id));
  res.json({ ok: true });
});

// ── Runs ──────────────────────────────────────────────────────────────────────

app.get("/api/runs", (_req, res) => {
  res.json(getRuns());
});

app.get("/api/runs/:id/log", (req, res) => {
  const row = getRunLog(Number(req.params.id));
  if (!row) return res.status(404).json({ error: "Run not found" });
  res.json(row);
});

app.post("/api/run", (_req, res) => {
  const runId = createRun();
  res.json({ runId });

  const child = spawn("node", ["index.js"], {
    cwd: ROOT,
    env: { ...process.env, FORCE_COLOR: "0" },
  });

  let articleCount = null;

  const onData = (data) => {
    const text = data.toString();
    process.stdout.write(text);
    appendRunLog(runId, text);
    const m = text.match(/(\d+) articles passed relevance filter/);
    if (m) articleCount = Number(m[1]);
  };

  child.stdout.on("data", onData);
  child.stderr.on("data", onData);

  child.on("close", (code) => {
    finishRun(runId, { status: code === 0 ? "success" : "error", articleCount });
  });
});

// ── Static (React build) ──────────────────────────────────────────────────────

if (existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(join(CLIENT_DIST, "index.html"));
    }
  });
} else {
  app.get("/", (_req, res) => res.send("Admin API running. Build the client: cd admin/client && npm run build"));
}

app.listen(PORT, () => {
  console.log(`Admin panel: http://localhost:${PORT}`);
});
