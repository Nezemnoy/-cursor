import { useState, useEffect, useCallback } from "react";
import {
  getSettings, saveSettings,
  getModels, addModel, updateModel, deleteModel,
  getRecipients, addRecipient, updateRecipient, deleteRecipient,
} from "../api.js";

const TABS = ["AI", "Prompts", "Filter", "Email", "Scheduler"];

// ── Models sub-component ──────────────────────────────────────────────────────

function ModelsSection({ notify }) {
  const [models,   setModels]   = useState([]);
  const [newId,    setNewId]    = useState("");
  const [adding,   setAdding]   = useState(false);

  const load = useCallback(async () => {
    try { setModels(await getModels()); } catch { notify("Failed to load models", "error"); }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(m) {
    try {
      const updated = await updateModel(m.id, { enabled: !m.enabled });
      setModels((prev) => prev.map((x) => (x.id === m.id ? updated : x)));
    } catch { notify("Update failed", "error"); }
  }

  async function handlePriority(m, delta) {
    const newP = m.priority + delta;
    try {
      const updated = await updateModel(m.id, { priority: newP });
      setModels((prev) =>
        prev.map((x) => (x.id === m.id ? updated : x)).sort((a, b) => a.priority - b.priority)
      );
    } catch { notify("Update failed", "error"); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this model?")) return;
    try {
      await deleteModel(id);
      setModels((prev) => prev.filter((m) => m.id !== id));
      notify("Model deleted");
    } catch { notify("Delete failed", "error"); }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!newId.trim()) return;
    setAdding(true);
    try {
      const m = await addModel({ modelId: newId.trim() });
      setModels((prev) => [...prev, m]);
      setNewId("");
      notify("Model added");
    } catch { notify("Add failed", "error"); }
    finally { setAdding(false); }
  }

  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 10 }}>Models (fallback order)</div>
      <p className="hint" style={{ marginBottom: 12 }}>
        Models are tried top-to-bottom. If a model runs out of quota/credits, the next one is used automatically.
      </p>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="table-wrap">
          {models.length === 0 ? (
            <div className="card-body text-muted">No models configured.</div>
          ) : (
            <table>
              <thead>
                <tr><th>Priority</th><th>Model ID</th><th>Enabled</th><th></th></tr>
              </thead>
              <tbody>
                {models.map((m, idx) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" disabled={idx === 0}
                          onClick={() => handlePriority(m, -1)}>↑</button>
                        <button className="btn btn-ghost btn-sm" disabled={idx === models.length - 1}
                          onClick={() => handlePriority(m, 1)}>↓</button>
                      </div>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 13 }}>{m.model_id}</td>
                    <td>
                      <label className="toggle">
                        <input type="checkbox" checked={!!m.enabled} onChange={() => handleToggle(m)} />
                        <span className="toggle-slider" />
                      </label>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(m.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <form onSubmit={handleAdd}>
        <div className="input-row">
          <input
            type="text"
            placeholder="e.g. google/gemini-2.0-flash-exp:free"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            style={{ fontFamily: "monospace" }}
          />
          <button className="btn btn-primary" type="submit" disabled={adding || !newId.trim()}>
            {adding ? "Adding…" : "+ Add"}
          </button>
        </div>
        <p className="hint" style={{ marginTop: 6 }}>
          Find model IDs at <a href="https://openrouter.ai/models" target="_blank" rel="noreferrer">openrouter.ai/models</a>
        </p>
      </form>
    </div>
  );
}

// ── Recipients sub-component ──────────────────────────────────────────────────

function RecipientsSection({ notify }) {
  const [recipients, setRecipients] = useState([]);
  const [newEmail,   setNewEmail]   = useState("");
  const [adding,     setAdding]     = useState(false);

  const load = useCallback(async () => {
    try { setRecipients(await getRecipients()); } catch { notify("Failed to load recipients", "error"); }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(r) {
    try {
      const updated = await updateRecipient(r.id, { enabled: !r.enabled });
      setRecipients((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
    } catch { notify("Update failed", "error"); }
  }

  async function handleDelete(id) {
    if (!confirm("Remove this recipient?")) return;
    try {
      await deleteRecipient(id);
      setRecipients((prev) => prev.filter((r) => r.id !== id));
      notify("Recipient removed");
    } catch { notify("Delete failed", "error"); }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAdding(true);
    try {
      const r = await addRecipient({ email: newEmail.trim() });
      setRecipients((prev) => [...prev, r]);
      setNewEmail("");
      notify("Recipient added");
    } catch { notify("Add failed", "error"); }
    finally { setAdding(false); }
  }

  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 10 }}>Recipients</div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="table-wrap">
          {recipients.length === 0 ? (
            <div className="card-body text-muted">No recipients yet.</div>
          ) : (
            <table>
              <thead>
                <tr><th>Email</th><th>Enabled</th><th></th></tr>
              </thead>
              <tbody>
                {recipients.map((r) => (
                  <tr key={r.id}>
                    <td>{r.email}</td>
                    <td>
                      <label className="toggle">
                        <input type="checkbox" checked={!!r.enabled} onChange={() => handleToggle(r)} />
                        <span className="toggle-slider" />
                      </label>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(r.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <form onSubmit={handleAdd}>
        <div className="input-row">
          <input
            type="email"
            placeholder="user@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={adding || !newEmail.trim()}>
            {adding ? "Adding…" : "+ Add"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab,    setTab]    = useState("AI");
  const [s,      setS]      = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [showPw,  setShowPw]  = useState(false);
  const [openPrompt, setOpenPrompt] = useState(null);

  const notify = useCallback((msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    getSettings().then(setS).catch(() => notify("Failed to load settings", "error"));
  }, [notify]);

  const set = (key, val) => setS((prev) => ({ ...prev, [key]: val }));

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings(s);
      notify("Settings saved");
    } catch { notify("Save failed", "error"); }
    finally { setSaving(false); }
  }

  if (!s) return <div className="text-muted">Loading…</div>;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={"tab-btn" + (tab === t ? " active" : "")} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* ── AI tab ──────────────────────────────────────────────────────────── */}
      {tab === "AI" && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-body">
              <div className="form-group">
                <label>OpenRouter API Key</label>
                <div className="input-row">
                  <input type={showKey ? "text" : "password"} value={s.apiKey ?? ""}
                    onChange={(e) => set("apiKey", e.target.value)} placeholder="sk-or-v1-…" />
                  <button type="button" className="btn btn-ghost" onClick={() => setShowKey((v) => !v)}>
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="separator" />

              <div className="form-row">
                <div className="form-group">
                  <label>Temp — Filter</label>
                  <input type="number" step="0.1" min="0" max="2"
                    value={s.tempFilter ?? "0"} onChange={(e) => set("tempFilter", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Temp — Summarize</label>
                  <input type="number" step="0.1" min="0" max="2"
                    value={s.tempSummarize ?? "0.3"} onChange={(e) => set("tempSummarize", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Temp — Synthesize</label>
                  <input type="number" step="0.1" min="0" max="2"
                    value={s.tempSynthesize ?? "0.4"} onChange={(e) => set("tempSynthesize", e.target.value)} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Delay between requests (ms)</label>
                  <input type="number" min="0" step="100"
                    value={s.delay ?? "2000"} onChange={(e) => set("delay", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Max retries on 429</label>
                  <input type="number" min="0" max="10"
                    value={s.maxRetries ?? "3"} onChange={(e) => set("maxRetries", e.target.value)} />
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>

          <ModelsSection notify={notify} />
        </>
      )}

      {/* ── Prompts tab ──────────────────────────────────────────────────────── */}
      {tab === "Prompts" && (
        <form onSubmit={handleSave}>
          <div className="card">
            <div className="card-body">
              {[
                {
                  key: "promptFilter",
                  label: "Filter prompt",
                  hint: "Placeholders: {{TOPICS}}, {{ARTICLES}}",
                  rows: 14,
                },
                {
                  key: "promptSummarize",
                  label: "Summarize prompt",
                  hint: "Placeholders: {{TITLE}}, {{SOURCE}}, {{CONTENT}}",
                  rows: 14,
                },
                {
                  key: "promptSynthesize",
                  label: "Synthesize (CTO brief) prompt",
                  hint: "Placeholders: {{ARTICLES}}",
                  rows: 10,
                },
              ].map(({ key, label, hint, rows }) => (
                <div key={key} className="form-group">
                  <div
                    style={{ display: "flex", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}
                    onClick={() => setOpenPrompt((p) => (p === key ? null : key))}
                  >
                    <label style={{ cursor: "pointer", marginBottom: 0 }}>{label}</label>
                    <span className="text-muted" style={{ fontSize: 12 }}>{openPrompt === key ? "▲ collapse" : "▼ expand"}</span>
                  </div>
                  <p className="hint">{hint}</p>
                  {openPrompt === key && (
                    <textarea
                      rows={rows}
                      style={{ fontFamily: "monospace", fontSize: 12.5, marginTop: 6 }}
                      value={s[key] ?? ""}
                      onChange={(e) => set(key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save prompts"}
            </button>
          </div>
        </form>
      )}

      {/* ── Filter tab ───────────────────────────────────────────────────────── */}
      {tab === "Filter" && (
        <form onSubmit={handleSave}>
          <div className="card">
            <div className="card-body">
              <div className="form-group">
                <label>Topic filters</label>
                <textarea rows={3} value={s.topics ?? ""}
                  onChange={(e) => set("topics", e.target.value)}
                  placeholder="AI research,LLM releases,AI policy,…" />
                <p className="hint">Comma-separated topics for AI relevance scoring</p>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Min relevance score (1–10)</label>
                  <input type="number" min="1" max="10"
                    value={s.minScore ?? "6"} onChange={(e) => set("minScore", e.target.value)} />
                  <p className="hint">Articles below this score are dropped</p>
                </div>
                <div className="form-group">
                  <label>Max articles per digest</label>
                  <input type="number" min="1" max="50"
                    value={s.topN ?? "8"} onChange={(e) => set("topN", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Recency window (hours)</label>
                  <input type="number" min="1" max="168"
                    value={s.hoursBack ?? "24"} onChange={(e) => set("hoursBack", e.target.value)} />
                </div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </form>
      )}

      {/* ── Email tab ────────────────────────────────────────────────────────── */}
      {tab === "Email" && (
        <>
          <form onSubmit={handleSave}>
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>SMTP Host</label>
                    <input type="text" value={s.smtpHost ?? ""}
                      onChange={(e) => set("smtpHost", e.target.value)} placeholder="smtp.gmail.com" />
                  </div>
                  <div className="form-group" style={{ maxWidth: 100 }}>
                    <label>Port</label>
                    <input type="number" value={s.smtpPort ?? "587"}
                      onChange={(e) => set("smtpPort", e.target.value)} />
                  </div>
                  <div className="form-group" style={{ maxWidth: 110 }}>
                    <label>Secure (TLS)</label>
                    <div style={{ paddingTop: 8 }}>
                      <label className="toggle">
                        <input type="checkbox" checked={s.smtpSecure === "true"}
                          onChange={(e) => set("smtpSecure", String(e.target.checked))} />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>SMTP User</label>
                    <input type="text" value={s.smtpUser ?? ""}
                      onChange={(e) => set("smtpUser", e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>SMTP Password</label>
                    <div className="input-row">
                      <input type={showPw ? "text" : "password"} value={s.smtpPass ?? ""}
                        onChange={(e) => set("smtpPass", e.target.value)} />
                      <button type="button" className="btn btn-ghost" onClick={() => setShowPw((v) => !v)}>
                        {showPw ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="separator" />
                <div className="form-group">
                  <label>From address</label>
                  <input type="email" value={s.digestFrom ?? ""}
                    onChange={(e) => set("digestFrom", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Email subject prefix</label>
                  <input type="text" value={s.subjectPrefix ?? ""}
                    onChange={(e) => set("subjectPrefix", e.target.value)} placeholder="AI News Digest" />
                </div>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save SMTP settings"}
                </button>
              </div>
            </div>
          </form>

          <RecipientsSection notify={notify} />
        </>
      )}

      {/* ── Scheduler tab ────────────────────────────────────────────────────── */}
      {tab === "Scheduler" && (
        <form onSubmit={handleSave}>
          <div className="card">
            <div className="card-body">
              <div className="form-group">
                <label>Cron schedule</label>
                <input type="text" value={s.cronSchedule ?? "0 7 * * *"}
                  onChange={(e) => set("cronSchedule", e.target.value)} placeholder="0 7 * * *" />
                <p className="hint">
                  Standard cron expression.{" "}
                  <a href="https://crontab.guru" target="_blank" rel="noreferrer">crontab.guru</a>
                </p>
              </div>
              <div className="form-group">
                <label>Scheduler enabled</label>
                <div style={{ paddingTop: 8 }}>
                  <label className="toggle">
                    <input type="checkbox" checked={s.schedulerEnabled !== "false"}
                      onChange={(e) => set("schedulerEnabled", String(e.target.checked))} />
                    <span className="toggle-slider" />
                  </label>
                </div>
                <p className="hint">Requires scheduler.js to be running</p>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </form>
      )}

      {toast && (
        <div className={`toast${toast.type === "error" ? " toast-error" : ""}`}>
          {toast.msg}
        </div>
      )}
    </>
  );
}
