import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthContext";

/**
 * TopBar (TaskFlow)
 * ✅ Keeps layout HORIZONTAL (search + user chip + logout)
 * ✅ Adds Habits in search
 * ✅ Dropdown closes on outside click + route change
 * ✅ Uses minimal DOM so your existing CSS won't break
 */

const NAV_ITEMS = [
  { label: "Home", path: "/dashboard", keywords: ["home", "dashboard", "main", "start"] },
  { label: "Calendar", path: "/calendar", keywords: ["calendar", "schedule", "dates", "events"] },
  { label: "Notes", path: "/notes", keywords: ["notes", "memo", "write", "journal"] },
  { label: "Work Hours", path: "/work-hours", keywords: ["work", "hours", "earnings", "income", "expenses", "salary"] },
  { label: "Goals", path: "/goals", keywords: ["goals", "target", "plan", "objectives"] },

  // ✅ Habits (new)
  { label: "Habits", path: "/habits", keywords: ["habits", "habit", "tracker", "streak", "daily", "routine"] },

  // ✅ Focus / Pomodoro (NEW)
  { label: "Focus", path: "/focus", keywords: ["focus", "pomodoro", "timer", "study", "deep work", "sessions"] },

  { label: "Analytics", path: "/analytics", keywords: ["analytics", "stats", "statistics", "insights", "report", "charts"] },
];

function normalize(s) {
  return String(s || "").trim().toLowerCase();
}

export default function TopBar({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const effectiveName = useMemo(() => {
    const name = String(user?.name || "").trim();
    return name || "User";
  }, [user]);

  const initials = useMemo(() => {
    const t = String(effectiveName || "").trim();
    if (!t) return "U";
    return t
      .split(/\s+/)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("");
  }, [effectiveName]);

  const results = useMemo(() => {
    const query = normalize(q);
    if (!query) return [];

    return NAV_ITEMS.map((item) => {
      const hay = [item.label, ...item.keywords].map(normalize);
      let score = 0;

      for (const h of hay) {
        if (h === query) score += 100;
        else if (h.startsWith(query)) score += 30;
        else if (h.includes(query)) score += 10;
      }

      return { item, score };
    })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.item);
  }, [q]);

  useEffect(() => {
    function onDocClick(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  function submit() {
    if (results.length > 0) {
      navigate(results[0].path);
      setOpen(false);
      setQ("");
    }
  }

  function doLogout() {
    if (onLogout) return onLogout();

    try {
      logout();
    } catch {
      try {
        localStorage.removeItem("taskflow_auth_user");
        localStorage.removeItem("taskflow_auth_token");
      } catch {}
    }
    navigate("/login");
  }

  return (
    // ✅ IMPORTANT: inline flex styles so layout NEVER breaks even if CSS missing
    <div
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 16,
        padding: "12px 16px",
      }}
    >
      {/* SEARCH */}
      <div ref={wrapRef} style={{ position: "relative", width: "min(520px, 45vw)" }}>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search pages..."
          style={{
            width: "100%",
            height: 44,
            padding: "0 14px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.15)",
            outline: "none",
            background: "#fff",
            fontSize: 16,
          }}
        />

        {open && results.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: 50,
              left: 0,
              right: 0,
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
              zIndex: 50,
            }}
          >
            {results.map((r) => (
              <button
                key={r.path}
                onClick={() => {
                  navigate(r.path);
                  setOpen(false);
                  setQ("");
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 14px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 15,
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* USER CHIP */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderRadius: 14,
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.10)",
          minWidth: 160,
          justifyContent: "flex-start",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: "rgb(107, 73, 255)",
            color: "#fff",
            fontWeight: 800,
          }}
        >
          {initials}
        </div>
        <div style={{ fontWeight: 700, color: "#111" }}>{effectiveName}</div>
      </div>

      {/* LOGOUT */}
      <button
        onClick={doLogout}
        style={{
          height: 44,
          padding: "0 16px",
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.12)",
          background: "#fff",
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        Logout
      </button>
    </div>
  );
}
