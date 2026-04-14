async function req(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(`${opts.method ?? "GET"} ${path} → ${res.status}`);
  return res.json();
}

export const getSettings  = ()       => req("/api/settings");
export const saveSettings = (data)   => req("/api/settings", { method: "PUT", body: JSON.stringify(data) });

export const getFeeds    = ()       => req("/api/feeds");
export const addFeed     = (data)   => req("/api/feeds",      { method: "POST",   body: JSON.stringify(data) });
export const updateFeed  = (id, d)  => req(`/api/feeds/${id}`,{ method: "PUT",    body: JSON.stringify(d) });
export const deleteFeed  = (id)     => req(`/api/feeds/${id}`,{ method: "DELETE" });

export const getModels    = ()       => req("/api/models");
export const addModel     = (data)   => req("/api/models",       { method: "POST",   body: JSON.stringify(data) });
export const updateModel  = (id, d)  => req(`/api/models/${id}`, { method: "PUT",    body: JSON.stringify(d) });
export const deleteModel  = (id)     => req(`/api/models/${id}`, { method: "DELETE" });

export const getProviders    = ()       => req("/api/providers");
export const addProvider     = (data)   => req("/api/providers",        { method: "POST",   body: JSON.stringify(data) });
export const updateProvider  = (id, d)  => req(`/api/providers/${id}`,  { method: "PUT",    body: JSON.stringify(d) });
export const deleteProvider  = (id)     => req(`/api/providers/${id}`,  { method: "DELETE" });

export const getRecipients   = ()       => req("/api/recipients");
export const addRecipient    = (data)   => req("/api/recipients",       { method: "POST",   body: JSON.stringify(data) });
export const updateRecipient = (id, d)  => req(`/api/recipients/${id}`, { method: "PUT",    body: JSON.stringify(d) });
export const deleteRecipient = (id)     => req(`/api/recipients/${id}`, { method: "DELETE" });

export const getRuns     = ()       => req("/api/runs");
export const getRunLog   = (id)     => req(`/api/runs/${id}/log`);
export const triggerRun  = ()       => req("/api/run", { method: "POST" });
export const stopRun     = (id)     => req(`/api/run/${id}`, { method: "DELETE" });
