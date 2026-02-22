import React, { useEffect, useMemo, useState } from "react";
import EmailExportModal from "../components/EmailExportModal";

const LS_SESSIONS = "taskflow_work_sessions_v1";
const LS_EXPENSES = "taskflow_expenses_v1";

const pad2 = (n) => String(n).padStart(2, "0");

function money(n) {
  const x = Number(n || 0);
  return `$${x.toFixed(2)}`;
}

function diffHours(startTime, endTime) {
  // "HH:MM" -> hours float (supports crossing midnight)
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if ([sh, sm, eh, em].some((v) => Number.isNaN(v))) return 0;

  const start = sh * 60 + sm;
  const end = eh * 60 + em;

  const minutes = end >= start ? end - start : end + 24 * 60 - start;
  return minutes / 60;
}

function safeParse(str, fallback) {
  try {
    const v = JSON.parse(str);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export default function WorkHours() {
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

  // Data
  const [sessions, setSessions] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // UI
  const [tab, setTab] = useState("sessions"); // "sessions" | "expenses"
  const [search, setSearch] = useState("");

  // ✅ NEW: Email Export Modal State
  const [emailExportOpen, setEmailExportOpen] = useState(false);

  // Work Session Form
  const [wsDate, setWsDate] = useState(todayISO);
  const [wsStart, setWsStart] = useState("");
  const [wsEnd, setWsEnd] = useState("");
  const [wsRate, setWsRate] = useState("");
  const [wsNotes, setWsNotes] = useState("");

  // Expense Form
  const [exDate, setExDate] = useState(todayISO);
  const [exName, setExName] = useState("");
  const [exType, setExType] = useState("Food");
  const [exWhere, setExWhere] = useState("");
  const [exAmount, setExAmount] = useState("");

  // Load
  useEffect(() => {
    const loadedSessions = safeParse(localStorage.getItem(LS_SESSIONS), []);
    const loadedExpenses = safeParse(localStorage.getItem(LS_EXPENSES), []);
    setSessions(Array.isArray(loadedSessions) ? loadedSessions : []);
    setExpenses(Array.isArray(loadedExpenses) ? loadedExpenses : []);
  }, []);

  // Save
  useEffect(() => {
    localStorage.setItem(LS_SESSIONS, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(LS_EXPENSES, JSON.stringify(expenses));
  }, [expenses]);

  // Live calculations for Work Session Form
  const wsHours = useMemo(() => diffHours(wsStart, wsEnd), [wsStart, wsEnd]);
  const wsRateNum = useMemo(() => Number(wsRate || 0), [wsRate]);
  const wsEarn = useMemo(() => wsHours * wsRateNum, [wsHours, wsRateNum]);

  // Stats
  const stats = useMemo(() => {
    const totalHours = sessions.reduce((sum, s) => sum + Number(s.hours || 0), 0);
    const totalEarnings = sessions.reduce((sum, s) => sum + Number(s.earnings || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const net = totalEarnings - totalExpenses;

    return { totalHours, totalEarnings, totalExpenses, net };
  }, [sessions, expenses]);

  // Search filtering
  const visibleSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => {
      return (
        String(s.date || "").toLowerCase().includes(q) ||
        String(s.start || "").toLowerCase().includes(q) ||
        String(s.end || "").toLowerCase().includes(q) ||
        String(s.notes || "").toLowerCase().includes(q) ||
        String(s.rate || "").toLowerCase().includes(q)
      );
    });
  }, [sessions, search]);

  const visibleExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter((e) => {
      return (
        String(e.date || "").toLowerCase().includes(q) ||
        String(e.name || "").toLowerCase().includes(q) ||
        String(e.type || "").toLowerCase().includes(q) ||
        String(e.where || "").toLowerCase().includes(q) ||
        String(e.amount || "").toLowerCase().includes(q)
      );
    });
  }, [expenses, search]);

  // Actions
  function addWorkSession() {
    if (!wsDate) return;
    if (!wsStart || !wsEnd) return;
    if (wsHours <= 0) return;

    const rate = Number(wsRate || 0);
    const earnings = wsHours * rate;

    const newSession = {
      id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
      date: wsDate,
      start: wsStart,
      end: wsEnd,
      hours: Number(wsHours.toFixed(2)),
      rate: Number(rate.toFixed(2)),
      earnings: Number(earnings.toFixed(2)),
      notes: wsNotes || "",
      createdAt: Date.now(),
    };

    setSessions((prev) => [newSession, ...prev]);

    // reset minimal
    setWsStart("");
    setWsEnd("");
    setWsRate("");
    setWsNotes("");
  }

  function deleteSession(id) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  function addExpense() {
    if (!exDate) return;
    const amt = Number(exAmount || 0);
    if (!amt || amt <= 0) return;

    const entry = {
      id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
      date: exDate,
      name: exName || "Expense",
      type: exType,
      where: exWhere || "",
      amount: Number(amt.toFixed(2)),
      createdAt: Date.now(),
    };

    setExpenses((prev) => [entry, ...prev]);

    setExName("");
    setExWhere("");
    setExAmount("");
    setExType("Food");
  }

  function deleteExpense(id) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="workhours-scope">
      <div className="page">
        {/* HERO */}
        <div className="wh-hero">
          <div className="wh-hero-top">
            <div>
              <h1 className="wh-title">Work Hours</h1>
              <p className="wh-sub">Track your work sessions, earnings, and expenses</p>
            </div>

            <div className="wh-controls">
              <input
                className="wh-input wh-search"
                placeholder="Search sessions or expenses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <div className="wh-tabRow">
                <button
                  className={`wh-tab ${tab === "sessions" ? "active" : ""}`}
                  onClick={() => setTab("sessions")}
                >
                  Sessions
                </button>
                <button
                  className={`wh-tab ${tab === "expenses" ? "active" : ""}`}
                  onClick={() => setTab("expenses")}
                >
                  Expenses
                </button>
              </div>

              {/* ✅ NEW: Export to Email button */}
              <button className="wh-btn primary" onClick={() => setEmailExportOpen(true)}>
                Export to Email
              </button>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="wh-stats">
          <div className="wh-card">
            <span>Total Hours</span>
            <strong>{stats.totalHours.toFixed(1)}h</strong>
          </div>
          <div className="wh-card">
            <span>Total Earnings</span>
            <strong>{money(stats.totalEarnings)}</strong>
          </div>
          <div className="wh-card">
            <span>Total Expenses</span>
            <strong>{money(stats.totalExpenses)}</strong>
          </div>
          <div className="wh-card">
            <span>Net (Profit)</span>
            <strong>{money(stats.net)}</strong>
          </div>
        </div>

        {/* TWO FORMS */}
        <div className="wh-formsGrid">
          {/* WORK FORM */}
          <div className="wh-section">
            <h2 className="wh-sectionTitle">Enter Work Time</h2>

            <div className="wh-formGrid">
              <div>
                <label className="wh-label">Date</label>
                <input className="wh-input" type="date" value={wsDate} onChange={(e) => setWsDate(e.target.value)} />
              </div>

              <div>
                <label className="wh-label">Hourly Pay ($)</label>
                <input
                  className="wh-input"
                  value={wsRate}
                  onChange={(e) => setWsRate(e.target.value)}
                  placeholder="e.g. 20"
                />
              </div>

              <div>
                <label className="wh-label">Start Time</label>
                <input className="wh-input" type="time" value={wsStart} onChange={(e) => setWsStart(e.target.value)} />
              </div>

              <div>
                <label className="wh-label">End Time</label>
                <input className="wh-input" type="time" value={wsEnd} onChange={(e) => setWsEnd(e.target.value)} />
              </div>
            </div>

            <div className="wh-liveCalc">
              <div className="wh-liveBox">
                <div className="wh-liveLabel">Hours</div>
                <div className="wh-liveValue">{wsHours.toFixed(2)}h</div>
              </div>
              <div className="wh-liveBox">
                <div className="wh-liveLabel">Earnings</div>
                <div className="wh-liveValue">{money(wsEarn)}</div>
              </div>
            </div>

            <label className="wh-label">Notes (optional)</label>
            <input
              className="wh-input"
              value={wsNotes}
              onChange={(e) => setWsNotes(e.target.value)}
              placeholder="e.g. shift at store"
            />

            <button className="wh-btn primary" onClick={addWorkSession}>
              Add Work Session
            </button>
          </div>

          {/* EXPENSE FORM */}
          <div className="wh-section">
            <h2 className="wh-sectionTitle">Enter Expense</h2>

            <div className="wh-formGrid">
              <div>
                <label className="wh-label">Date</label>
                <input className="wh-input" type="date" value={exDate} onChange={(e) => setExDate(e.target.value)} />
              </div>

              <div>
                <label className="wh-label">Amount ($)</label>
                <input
                  className="wh-input"
                  value={exAmount}
                  onChange={(e) => setExAmount(e.target.value)}
                  placeholder="e.g. 12.50"
                />
              </div>

              <div>
                <label className="wh-label">Expense Name</label>
                <input
                  className="wh-input"
                  value={exName}
                  onChange={(e) => setExName(e.target.value)}
                  placeholder="e.g. Grocery"
                />
              </div>

              <div>
                <label className="wh-label">Type</label>
                <select className="wh-input" value={exType} onChange={(e) => setExType(e.target.value)}>
                  <option>Food</option>
                  <option>Transport</option>
                  <option>Bills</option>
                  <option>Shopping</option>
                  <option>Health</option>
                  <option>Entertainment</option>
                  <option>Other</option>
                </select>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label className="wh-label">Where / Used For (optional)</label>
                <input
                  className="wh-input"
                  value={exWhere}
                  onChange={(e) => setExWhere(e.target.value)}
                  placeholder="e.g. Walmart, Uber, etc."
                />
              </div>
            </div>

            <button className="wh-btn warn" onClick={addExpense}>
              Add Expense
            </button>
          </div>
        </div>

        {/* DISPLAY TABLES */}
        {tab === "sessions" ? (
          <div className="wh-section">
            <h2 className="wh-sectionTitle">Work Sessions</h2>

            <table className="wh-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Hours</th>
                  <th>Pay</th>
                  <th>Earnings</th>
                  <th>Notes</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {visibleSessions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty">
                      No sessions found.
                    </td>
                  </tr>
                ) : (
                  visibleSessions.map((s) => (
                    <tr key={s.id}>
                      <td>{s.date}</td>
                      <td>
                        {s.start} → {s.end}
                      </td>
                      <td>{Number(s.hours || 0).toFixed(2)}h</td>
                      <td>{money(s.rate)}</td>
                      <td style={{ fontWeight: 900, color: "#7c4dff" }}>{money(s.earnings)}</td>
                      <td>{s.notes || "—"}</td>
                      <td>
                        <button className="wh-btn dangerSmall" onClick={() => deleteSession(s.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="wh-section">
            <h2 className="wh-sectionTitle">Expenses</h2>

            <table className="wh-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Where Used</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {visibleExpenses.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty">
                      No expenses found.
                    </td>
                  </tr>
                ) : (
                  visibleExpenses.map((e) => (
                    <tr key={e.id}>
                      <td>{e.date}</td>
                      <td style={{ fontWeight: 900 }}>{e.name}</td>
                      <td>{e.type}</td>
                      <td>{e.where || "—"}</td>
                      <td style={{ fontWeight: 900 }}>{money(e.amount)}</td>
                      <td>
                        <button className="wh-btn dangerSmall" onClick={() => deleteExpense(e.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ✅ NEW: Email Export Modal mounted here */}
        {/* ✅ NEW: Email Export Modal mounted here */}
<EmailExportModal
  open={emailExportOpen}
  onClose={() => setEmailExportOpen(false)}
  dataOverride={{ workSessions: sessions, expenses }}
/>

      </div>
    </div>
  );
}
