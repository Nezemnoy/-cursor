import { NavLink, Routes, Route, Navigate } from "react-router-dom";
import FeedsPage    from "./pages/FeedsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import RunsPage     from "./pages/RunsPage.jsx";

const NAV = [
  { to: "/feeds",    icon: "📡", label: "Feeds" },
  { to: "/settings", icon: "⚙️", label: "Settings" },
  { to: "/runs",     icon: "▶️", label: "Runs" },
];

export default function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">AI <span>Digest</span> Admin</div>
        <nav>
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/"         element={<Navigate to="/feeds" replace />} />
          <Route path="/feeds"    element={<FeedsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/runs"     element={<RunsPage />} />
        </Routes>
      </main>
    </div>
  );
}
