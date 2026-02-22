import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");

  function onSubmit(e) {
    e.preventDefault();
    setMsg("");

    if (password !== confirm) {
      setMsg("Passwords do not match.");
      return;
    }

    const res = register(username, password);
    if (!res.ok) {
      setMsg(res.message);
      return;
    }

    nav("/dashboard", { replace: true });
  }

  return (
    <div className="tf-content">
      <div className="tf-page">
        <div className="tf-hero" style={{ maxWidth: 780, margin: "0 auto" }}>
          <div style={{ fontSize: 44, fontWeight: 900, color: "#7c4dff" }}>Create Account</div>
          <div style={{ marginTop: 8, color: "#aab1c3", fontWeight: 700, fontSize: 18 }}>
            Register to use TaskFlow
          </div>

          <form onSubmit={onSubmit} style={{ marginTop: 18 }}>
            <label className="tf-label">Username</label>
            <input
              className="tf-input dark"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <label className="tf-label">Password</label>
            <input
              type="password"
              className="tf-input dark"
              placeholder="Create password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <label className="tf-label">Confirm Password</label>
            <input
              type="password"
              className="tf-input dark"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />

            {msg && (
              <div style={{ marginTop: 8, color: "#ffb4b4", fontWeight: 900 }}>
                {msg}
              </div>
            )}

            <button className="tf-primary" type="submit" style={{ marginTop: 12 }}>
              Register & Continue
            </button>

            <div style={{ marginTop: 14, color: "#aab1c3", fontWeight: 800 }}>
              Already have an account?{" "}
              <Link to="/login" style={{ color: "#a78bfa", fontWeight: 900 }}>
                Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
