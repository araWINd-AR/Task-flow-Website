import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthContext";

export default function Login() {
  const { login, lastCred } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  // ✅ Auto-fill username + password (still works)
  useEffect(() => {
    setUsername(lastCred?.username || "");
    setPassword(lastCred?.password || "");
  }, [lastCred]);

  function onSubmit(e) {
    e.preventDefault();
    setMsg("");

    const res = login(username, password);
    if (!res.ok) {
      setMsg(res.message);
      return;
    }

    const goTo = location.state?.from || "/dashboard";
    nav(goTo, { replace: true });
  }

  return (
    <div className="tf-content">
      <div className="tf-page">
        <div className="tf-hero" style={{ maxWidth: 780, margin: "0 auto" }}>
          <div style={{ fontSize: 44, fontWeight: 900, color: "#7c4dff" }}>TaskFlow</div>

          <div style={{ marginTop: 8, color: "#aab1c3", fontWeight: 700, fontSize: 18 }}>
            Login to access your reminders, calendar, and work hours
          </div>

          <form onSubmit={onSubmit} style={{ marginTop: 18 }}>
            <label className="tf-label">Username</label>
            <input
              className="tf-input dark"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <label className="tf-label">Password</label>
            <input
              type="password"
              className="tf-input dark"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {msg && (
              <div style={{ marginTop: 8, color: "#ffb4b4", fontWeight: 900 }}>
                {msg}
              </div>
            )}

            <button className="tf-primary" type="submit" style={{ marginTop: 12 }}>
              Login
            </button>

            <div style={{ marginTop: 14, color: "#aab1c3", fontWeight: 800 }}>
              New user?{" "}
              <Link to="/register" style={{ color: "#a78bfa", fontWeight: 900 }}>
                Create account
              </Link>
            </div>

            {/* ✅ Removed “Saved (demo)” display completely */}
          </form>
        </div>
      </div>
    </div>
  );
}
