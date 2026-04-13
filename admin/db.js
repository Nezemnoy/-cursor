import { openAndInit } from "../src/config.js";

// All functions open a fresh connection, perform the operation, and close.

function db() {
  return openAndInit();
}

// --- Settings ---

export function getAllSettings() {
  const d = db();
  const rows = d.prepare("SELECT key, value FROM settings ORDER BY key").all();
  d.close();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function saveSettings(obj) {
  const d = db();
  const stmt = d.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  d.transaction((entries) => { for (const [k, v] of entries) stmt.run(k, String(v)); })(
    Object.entries(obj)
  );
  d.close();
}

// --- Feeds ---

export function getFeeds() {
  const d = db();
  const rows = d.prepare("SELECT * FROM feeds ORDER BY id").all();
  d.close();
  return rows;
}

export function addFeed({ url, name }) {
  const d = db();
  const info = d.prepare("INSERT INTO feeds (url, name, enabled) VALUES (?, ?, 1)").run(url, name);
  const feed = d.prepare("SELECT * FROM feeds WHERE id = ?").get(info.lastInsertRowid);
  d.close();
  return feed;
}

export function updateFeed(id, updates) {
  const d = db();
  if (updates.url     !== undefined) d.prepare("UPDATE feeds SET url     = ? WHERE id = ?").run(updates.url, id);
  if (updates.name    !== undefined) d.prepare("UPDATE feeds SET name    = ? WHERE id = ?").run(updates.name, id);
  if (updates.enabled !== undefined) d.prepare("UPDATE feeds SET enabled = ? WHERE id = ?").run(updates.enabled ? 1 : 0, id);
  const feed = d.prepare("SELECT * FROM feeds WHERE id = ?").get(id);
  d.close();
  return feed ?? null;
}

export function deleteFeed(id) {
  const d = db();
  d.prepare("DELETE FROM feeds WHERE id = ?").run(id);
  d.close();
}

// --- Models ---

export function getModels() {
  const d = db();
  const rows = d.prepare("SELECT * FROM models ORDER BY priority ASC").all();
  d.close();
  return rows;
}

export function addModel({ modelId, priority }) {
  const d = db();
  const maxPriority = d.prepare("SELECT COALESCE(MAX(priority), -1) AS m FROM models").get().m;
  const p = priority ?? maxPriority + 1;
  const info = d.prepare("INSERT INTO models (model_id, priority, enabled) VALUES (?, ?, 1)").run(modelId, p);
  const row = d.prepare("SELECT * FROM models WHERE id = ?").get(info.lastInsertRowid);
  d.close();
  return row;
}

export function updateModel(id, updates) {
  const d = db();
  if (updates.modelId  !== undefined) d.prepare("UPDATE models SET model_id = ? WHERE id = ?").run(updates.modelId, id);
  if (updates.priority !== undefined) d.prepare("UPDATE models SET priority = ? WHERE id = ?").run(updates.priority, id);
  if (updates.enabled  !== undefined) d.prepare("UPDATE models SET enabled  = ? WHERE id = ?").run(updates.enabled ? 1 : 0, id);
  const row = d.prepare("SELECT * FROM models WHERE id = ?").get(id);
  d.close();
  return row ?? null;
}

export function deleteModel(id) {
  const d = db();
  d.prepare("DELETE FROM models WHERE id = ?").run(id);
  d.close();
}

// --- Providers ---

export function getProviders() {
  const d = db();
  const rows = d.prepare("SELECT * FROM providers ORDER BY priority ASC").all();
  d.close();
  return rows;
}

export function addProvider({ name, baseUrl, apiKey = "", priority }) {
  const d = db();
  const maxPriority = d.prepare("SELECT COALESCE(MAX(priority), -1) AS m FROM providers").get().m;
  const p = priority ?? maxPriority + 1;
  const info = d.prepare("INSERT INTO providers (name, base_url, api_key, priority, enabled) VALUES (?, ?, ?, ?, 1)")
    .run(name, baseUrl, apiKey, p);
  const row = d.prepare("SELECT * FROM providers WHERE id = ?").get(info.lastInsertRowid);
  d.close();
  return row;
}

export function updateProvider(id, updates) {
  const d = db();
  if (updates.name     !== undefined) d.prepare("UPDATE providers SET name     = ? WHERE id = ?").run(updates.name, id);
  if (updates.baseUrl  !== undefined) d.prepare("UPDATE providers SET base_url = ? WHERE id = ?").run(updates.baseUrl, id);
  if (updates.apiKey   !== undefined) d.prepare("UPDATE providers SET api_key  = ? WHERE id = ?").run(updates.apiKey, id);
  if (updates.priority !== undefined) d.prepare("UPDATE providers SET priority = ? WHERE id = ?").run(updates.priority, id);
  if (updates.enabled  !== undefined) d.prepare("UPDATE providers SET enabled  = ? WHERE id = ?").run(updates.enabled ? 1 : 0, id);
  const row = d.prepare("SELECT * FROM providers WHERE id = ?").get(id);
  d.close();
  return row ?? null;
}

export function deleteProvider(id) {
  const d = db();
  d.prepare("DELETE FROM providers WHERE id = ?").run(id);
  d.close();
}

// --- Recipients ---

export function getRecipients() {
  const d = db();
  const rows = d.prepare("SELECT * FROM recipients ORDER BY id").all();
  d.close();
  return rows;
}

export function addRecipient(email) {
  const d = db();
  const info = d.prepare("INSERT INTO recipients (email, enabled) VALUES (?, 1)").run(email);
  const row = d.prepare("SELECT * FROM recipients WHERE id = ?").get(info.lastInsertRowid);
  d.close();
  return row;
}

export function updateRecipient(id, updates) {
  const d = db();
  if (updates.email   !== undefined) d.prepare("UPDATE recipients SET email   = ? WHERE id = ?").run(updates.email, id);
  if (updates.enabled !== undefined) d.prepare("UPDATE recipients SET enabled = ? WHERE id = ?").run(updates.enabled ? 1 : 0, id);
  const row = d.prepare("SELECT * FROM recipients WHERE id = ?").get(id);
  d.close();
  return row ?? null;
}

export function deleteRecipient(id) {
  const d = db();
  d.prepare("DELETE FROM recipients WHERE id = ?").run(id);
  d.close();
}

// --- Runs ---

export function getRuns(limit = 50) {
  const d = db();
  const rows = d
    .prepare("SELECT id, started_at, finished_at, status, article_count FROM runs ORDER BY id DESC LIMIT ?")
    .all(limit);
  d.close();
  return rows;
}

export function getRunLog(id) {
  const d = db();
  const row = d.prepare("SELECT log, status FROM runs WHERE id = ?").get(id);
  d.close();
  return row ?? null;
}

export function createRun() {
  const d = db();
  const info = d
    .prepare("INSERT INTO runs (started_at, status, log) VALUES (?, 'running', '')")
    .run(new Date().toISOString());
  d.close();
  return info.lastInsertRowid;
}

export function appendRunLog(id, text) {
  const d = db();
  d.prepare("UPDATE runs SET log = log || ? WHERE id = ?").run(text, id);
  d.close();
}

export function finishRun(id, { status, articleCount }) {
  const d = db();
  d.prepare("UPDATE runs SET finished_at = ?, status = ?, article_count = ? WHERE id = ?")
    .run(new Date().toISOString(), status, articleCount ?? null, id);
  d.close();
}
