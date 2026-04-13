import { useState, useEffect, useCallback } from "react";
import { getFeeds, addFeed, updateFeed, deleteFeed } from "../api.js";

export default function FeedsPage() {
  const [feeds,   setFeeds]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUrl,  setNewUrl]  = useState("");
  const [newName, setNewName] = useState("");
  const [adding,  setAdding]  = useState(false);
  const [toast,   setToast]   = useState(null);

  const notify = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try { setFeeds(await getFeeds()); }
    catch { notify("Failed to load feeds", "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(feed) {
    try {
      const updated = await updateFeed(feed.id, { enabled: !feed.enabled });
      setFeeds((prev) => prev.map((f) => (f.id === feed.id ? updated : f)));
    } catch { notify("Update failed", "error"); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this feed?")) return;
    try {
      await deleteFeed(id);
      setFeeds((prev) => prev.filter((f) => f.id !== id));
      notify("Feed deleted");
    } catch { notify("Delete failed", "error"); }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!newUrl.trim() || !newName.trim()) return;
    setAdding(true);
    try {
      const feed = await addFeed({ url: newUrl.trim(), name: newName.trim() });
      setFeeds((prev) => [...prev, feed]);
      setNewUrl(""); setNewName("");
      notify("Feed added");
    } catch { notify("Add failed", "error"); }
    finally { setAdding(false); }
  }

  const enabled  = feeds.filter((f) => f.enabled).length;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">RSS Feeds</h1>
        <span className="text-muted">{enabled} / {feeds.length} active</span>
      </div>

      {/* Add feed form */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <form onSubmit={handleAdd}>
            <div className="form-row">
              <div className="form-group">
                <label>Feed URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/feed.xml"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ maxWidth: 200 }}>
                <label>Display name</label>
                <input
                  type="text"
                  placeholder="Source name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={adding || !newUrl || !newName}>
              {adding ? "Adding…" : "+ Add Feed"}
            </button>
          </form>
        </div>
      </div>

      {/* Feeds table */}
      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div className="card-body text-muted">Loading…</div>
          ) : feeds.length === 0 ? (
            <div className="card-body text-muted">No feeds yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Enabled</th>
                  <th>Name</th>
                  <th>URL</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {feeds.map((feed) => (
                  <tr key={feed.id}>
                    <td>
                      <label className="toggle" title={feed.enabled ? "Disable" : "Enable"}>
                        <input
                          type="checkbox"
                          checked={!!feed.enabled}
                          onChange={() => handleToggle(feed)}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </td>
                    <td style={{ fontWeight: 500 }}>{feed.name}</td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>
                      <a href={feed.url} target="_blank" rel="noreferrer">{feed.url}</a>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm text-danger"
                        onClick={() => handleDelete(feed.id)}
                      >
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

      {toast && (
        <div className={`toast${toast.type === "error" ? " toast-error" : ""}`}>
          {toast.msg}
        </div>
      )}
    </>
  );
}
