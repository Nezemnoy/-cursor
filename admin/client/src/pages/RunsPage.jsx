import { useState, useEffect, useRef, useCallback } from "react";
import { getRuns, getRunLog, triggerRun } from "../api.js";

function StatusBadge({ status }) {
  const cls = status === "success" ? "badge-success"
            : status === "error"   ? "badge-error"
            :                        "badge-running";
  return <span className={`badge ${cls}`}>{status}</span>;
}

export default function RunsPage() {
  const [runs,      setRuns]      = useState([]);
  const [running,   setRunning]   = useState(false);
  const [activeId,  setActiveId]  = useState(null);
  const [log,       setLog]       = useState("");
  const [logStatus, setLogStatus] = useState(null);
  const [toast,     setToast]     = useState(null);
  const logRef   = useRef(null);
  const pollRef  = useRef(null);

  const notify = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadRuns = useCallback(async () => {
    try { setRuns(await getRuns()); }
    catch { notify("Failed to load runs", "error"); }
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  // Poll log when a run is active
  useEffect(() => {
    if (!activeId) { clearInterval(pollRef.current); return; }

    const poll = async () => {
      try {
        const data = await getRunLog(activeId);
        setLog(data.log ?? "");
        setLogStatus(data.status);
        if (data.status !== "running") {
          clearInterval(pollRef.current);
          loadRuns();
          if (running) setRunning(false);
        }
      } catch { clearInterval(pollRef.current); }
    };

    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current);
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRun() {
    setRunning(true);
    setLog("");
    setLogStatus("running");
    try {
      const { runId } = await triggerRun();
      setActiveId(runId);
      notify("Pipeline started");
    } catch {
      notify("Failed to start run", "error");
      setRunning(false);
    }
  }

  function handleRowClick(id) {
    setActiveId((prev) => (prev === id ? null : id));
    setLog("");
    setLogStatus(null);
  }

  function fmt(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Runs</h1>
        <button className="btn btn-run" onClick={handleRun} disabled={running}>
          {running ? "⏳ Running…" : "▶ Run Now"}
        </button>
      </div>

      {/* Live log */}
      {activeId && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body" style={{ paddingBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                Run #{activeId} &nbsp;<StatusBadge status={logStatus ?? "running"} />
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => { setActiveId(null); setLog(""); }}>
                Close
              </button>
            </div>
            <div className="log-pane" ref={logRef}>
              {log || "Waiting for output…"}
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <div className="card">
        <div className="table-wrap">
          {runs.length === 0 ? (
            <div className="card-body text-muted">No runs yet. Press "Run Now" to start.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Started</th>
                  <th>Finished</th>
                  <th>Status</th>
                  <th>Articles</th>
                  <th>Log</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    onClick={() => handleRowClick(run.id)}
                    style={{ cursor: "pointer" }}
                    title="Click to view log"
                  >
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>{run.id}</td>
                    <td>{fmt(run.started_at)}</td>
                    <td>{fmt(run.finished_at)}</td>
                    <td><StatusBadge status={run.status} /></td>
                    <td>{run.article_count ?? "—"}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleRowClick(run.id); }}
                      >
                        {activeId === run.id ? "Hide" : "View"}
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
