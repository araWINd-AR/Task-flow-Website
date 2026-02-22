import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

const LS_USERS = "taskflow_users_v1";
const LS_SESSION = "taskflow_session_v1";
const LS_LAST_CRED = "taskflow_last_cred_v1";

function safeParse(str, fallback) {
  try {
    const v = JSON.parse(str);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function initialsFrom(name) {
  const parts = String(name || "")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2);
  const inits = parts.map((p) => p[0].toUpperCase()).join("");
  return inits || "AR";
}

function loadUsers() {
  return safeParse(localStorage.getItem(LS_USERS), []);
}

function saveUsers(users) {
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}

function loadSession() {
  return safeParse(localStorage.getItem(LS_SESSION), null);
}

function saveSession(session) {
  localStorage.setItem(LS_SESSION, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(LS_SESSION);
}

function loadLastCred() {
  return safeParse(localStorage.getItem(LS_LAST_CRED), { username: "", password: "" });
}

function saveLastCred(username, password) {
  localStorage.setItem(LS_LAST_CRED, JSON.stringify({ username, password }));
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadSession());
  const [users, setUsers] = useState(() => loadUsers());
  const [lastCred, setLastCred] = useState(() => loadLastCred());

  // persist users
  useEffect(() => {
    saveUsers(users);
  }, [users]);

  // persist session
  useEffect(() => {
    if (session) saveSession(session);
  }, [session]);

  // persist lastCred
  useEffect(() => {
    localStorage.setItem(LS_LAST_CRED, JSON.stringify(lastCred));
  }, [lastCred]);

  /**
   * ✅ UPDATED USER OBJECT:
   * - Prefer session.userId to find the real user record
   * - Fallback for old sessions that only stored username
   */
  const user = useMemo(() => {
    if (!session) return null;

    let found = null;

    // ✅ new way: session has userId
    if (session.userId) {
      found = users.find((u) => u.id === session.userId) || null;
    }

    // fallback: old sessions stored username only
    if (!found && session.username) {
      found = users.find((u) => u.username?.toLowerCase() === String(session.username).toLowerCase()) || null;
    }

    // If still not found, at least show something
    const fallbackName = String(session.username || "User");

    const displayName =
      String(found?.fullName || "").trim() ||
      String(found?.username || "").trim() ||
      fallbackName;

    return {
      id: found?.id || null,
      username: found?.username || session.username || "",
      displayName,             // ✅ use this in header
      name: displayName,       // compatibility
      initials: initialsFrom(displayName),
    };
  }, [session, users]);

  /**
   * ✅ UPDATED REGISTER:
   * Now accepts fullName and stores it.
   * If your UI doesn't pass fullName yet, it will default to username.
   */
  function register(username, password, fullName) {
    const u = String(username || "").trim();
    const p = String(password || "");
    const fn = String(fullName || "").trim();

    if (!u) return { ok: false, message: "Username is required." };
    if (p.length < 4) return { ok: false, message: "Password must be at least 4 characters." };

    const exists = users.some((x) => x.username.toLowerCase() === u.toLowerCase());
    if (exists) return { ok: false, message: "User already exists. Please login." };

    const newUser = {
      id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
      username: u,
      password: p,                 // demo-only (not secure)
      fullName: fn || u,           // ✅ store real name; fallback to username
      createdAt: Date.now(),
    };

    const next = [newUser, ...users];
    setUsers(next);

    // ✅ new session stores userId
    setSession({ userId: newUser.id, username: newUser.username, loggedInAt: Date.now() });

    setLastCred({ username: u, password: p });
    saveLastCred(u, p);

    return { ok: true, message: "Registered successfully." };
  }

  /**
   * ✅ UPDATED LOGIN:
   * Saves session.userId so we can fetch fullName later.
   */
  function login(username, password) {
    const u = String(username || "").trim();
    const p = String(password || "");

    const found = users.find((x) => x.username.toLowerCase() === u.toLowerCase());
    if (!found) return { ok: false, message: "User not found. Please register." };
    if (found.password !== p) return { ok: false, message: "Wrong password." };

    setSession({ userId: found.id, username: found.username, loggedInAt: Date.now() });

    setLastCred({ username: found.username, password: p });
    saveLastCred(found.username, p);

    return { ok: true, message: "Login success." };
  }

  function logout() {
    clearSession();
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ user, session, users, lastCred, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
