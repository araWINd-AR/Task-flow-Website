import React, { useEffect, useMemo, useState } from "react";
import EmailExportModal from "../components/EmailExportModal";

const LS_SESSIONS = "taskflow_work_sessions_v1";
const LS_EXPENSES = "taskflow_expenses_v1";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const pad2 = (n) => String(n).padStart(2, "0");

function money(n) {
  const x = Number(n || 0);
  return `$${x.toFixed(2)}`;
}

function diffHours(startTime, endTime) {
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

function formatDay(dateValue) {
  if (!dateValue) return "—";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, {
    weekday: "long",
  });
}

function isValidDateValue(dateValue) {
  const d = new Date(dateValue);
  return !Number.isNaN(d.getTime());
}

function isInPeriod(dateValue, mode, monthIndex, yearValue) {
  if (!isValidDateValue(dateValue)) return false;

  const d = new Date(dateValue);
  const y = d.getFullYear();
  const m = d.getMonth();

  if (mode === "yearly") {
    return y === Number(yearValue);
  }

  return y === Number(yearValue) && m === Number(monthIndex);
}

function getPreviousPeriod(mode, monthIndex, yearValue) {
  const y = Number(yearValue);
  const m = Number(monthIndex);

  if (mode === "yearly") {
    return {
      mode: "yearly",
      monthIndex: m,
      yearValue: y - 1,
    };
  }

  if (m === 0) {
    return {
      mode: "monthly",
      monthIndex: 11,
      yearValue: y - 1,
    };
  }

  return {
    mode: "monthly",
    monthIndex: m - 1,
    yearValue: y,
  };
}

function getPeriodLabel(mode, monthIndex, yearValue) {
  if (mode === "yearly") return String(yearValue);
  return `${MONTH_NAMES[Number(monthIndex)]} ${yearValue}`;
}

function getComparisonText(currentValue, previousValue, formatter) {
  if (!previousValue) return `vs ${formatter(0)}`;

  const diff = currentValue - previousValue;
  if (diff === 0) return `vs ${formatter(previousValue)}`;

  const sign = diff > 0 ? "+" : "-";
  return `${sign}${formatter(Math.abs(diff))} vs previous`;
}

function getWorkStats(sourceSessions) {
  const totalHours = sourceSessions.reduce((sum, s) => sum + Number(s.hours || 0), 0);
  const totalEarnings = sourceSessions.reduce((sum, s) => sum + Number(s.earnings || 0), 0);
  const totalSessions = sourceSessions.length;

  const uniqueDays = new Set();
  const weekdayHours = {};

  sourceSessions.forEach((s) => {
    if (s.date) uniqueDays.add(s.date);

    const dayName = formatDay(s.date);
    if (dayName !== "—") {
      weekdayHours[dayName] = (weekdayHours[dayName] || 0) + Number(s.hours || 0);
    }
  });

  const daysWorked = uniqueDays.size;
  const avgDailyHours = daysWorked ? totalHours / daysWorked : 0;
  const earningsPerHour = totalHours ? totalEarnings / totalHours : 0;

  let busiestDay = "—";
  let busiestDayHours = 0;

  Object.entries(weekdayHours).forEach(([dayName, hrs]) => {
    if (hrs > busiestDayHours) {
      busiestDay = dayName;
      busiestDayHours = hrs;
    }
  });

  return {
    totalHours,
    totalEarnings,
    totalSessions,
    avgDailyHours,
    earningsPerHour,
    daysWorked,
    busiestDay,
    busiestDayHours,
  };
}

export default function WorkHours() {
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

  const [sessions, setSessions] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const [tab, setTab] = useState("sessions");
  const [search, setSearch] = useState("");

  const [emailExportOpen, setEmailExportOpen] = useState(false);

  const [periodMode, setPeriodMode] = useState("monthly");
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));

  const [wsDate, setWsDate] = useState(todayISO);
  const [wsStart, setWsStart] = useState("");
  const [wsEnd, setWsEnd] = useState("");
  const [wsRate, setWsRate] = useState("");
  const [wsNotes, setWsNotes] = useState("");

  const [exDate, setExDate] = useState(todayISO);
  const [exName, setExName] = useState("");
  const [exType, setExType] = useState("Food");
  const [exWhere, setExWhere] = useState("");
  const [exAmount, setExAmount] = useState("");

  useEffect(() => {
    const loadedSessions = safeParse(localStorage.getItem(LS_SESSIONS), []);
    const loadedExpenses = safeParse(localStorage.getItem(LS_EXPENSES), []);
    setSessions(Array.isArray(loadedSessions) ? loadedSessions : []);
    setExpenses(Array.isArray(loadedExpenses) ? loadedExpenses : []);
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_SESSIONS, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(LS_EXPENSES, JSON.stringify(expenses));
  }, [expenses]);

  const wsHours = useMemo(() => diffHours(wsStart, wsEnd), [wsStart, wsEnd]);
  const wsRateNum = useMemo(() => Number(wsRate || 0), [wsRate]);
  const wsEarn = useMemo(() => wsHours * wsRateNum, [wsHours, wsRateNum]);

  const availableYears = useMemo(() => {
    const yearSet = new Set([now.getFullYear()]);

    sessions.forEach((s) => {
      if (isValidDateValue(s.date)) yearSet.add(new Date(s.date).getFullYear());
    });

    expenses.forEach((e) => {
      if (isValidDateValue(e.date)) yearSet.add(new Date(e.date).getFullYear());
    });

    return Array.from(yearSet).sort((a, b) => b - a);
  }, [sessions, expenses, now]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) =>
      isInPeriod(s.date, periodMode, selectedMonth, selectedYear)
    );
  }, [sessions, periodMode, selectedMonth, selectedYear]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) =>
      isInPeriod(e.date, periodMode, selectedMonth, selectedYear)
    );
  }, [expenses, periodMode, selectedMonth, selectedYear]);

  const previousPeriod = useMemo(() => {
    return getPreviousPeriod(periodMode, selectedMonth, selectedYear);
  }, [periodMode, selectedMonth, selectedYear]);

  const previousSessions = useMemo(() => {
    return sessions.filter((s) =>
      isInPeriod(
        s.date,
        previousPeriod.mode,
        previousPeriod.monthIndex,
        previousPeriod.yearValue
      )
    );
  }, [sessions, previousPeriod]);

  const currentStats = useMemo(() => getWorkStats(filteredSessions), [filteredSessions]);
  const previousStats = useMemo(() => getWorkStats(previousSessions), [previousSessions]);

  const currentLabel = useMemo(
    () => getPeriodLabel(periodMode, selectedMonth, selectedYear),
    [periodMode, selectedMonth, selectedYear]
  );

  const previousLabel = useMemo(
    () =>
      getPeriodLabel(
        previousPeriod.mode,
        previousPeriod.monthIndex,
        previousPeriod.yearValue
      ),
    [previousPeriod]
  );

  const visibleSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filteredSessions;

    return filteredSessions.filter((s) => {
      const dayText = formatDay(s.date).toLowerCase();

      return (
        String(s.date || "").toLowerCase().includes(q) ||
        dayText.includes(q) ||
        String(s.start || "").toLowerCase().includes(q) ||
        String(s.end || "").toLowerCase().includes(q) ||
        String(s.notes || "").toLowerCase().includes(q) ||
        String(s.rate || "").toLowerCase().includes(q)
      );
    });
  }, [filteredSessions, search]);

  const visibleExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filteredExpenses;

    return filteredExpenses.filter((e) => {
      return (
        String(e.date || "").toLowerCase().includes(q) ||
        String(e.name || "").toLowerCase().includes(q) ||
        String(e.type || "").toLowerCase().includes(q) ||
        String(e.where || "").toLowerCase().includes(q) ||
        String(e.amount || "").toLowerCase().includes(q)
      );
    });
  }, [filteredExpenses, search]);

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

  const periodButtonBase = {
    border: "1px solid #9aa4b2",
    borderRadius: 16,
    height: 46,
    padding: "0 20px",
    fontWeight: 700,
    fontSize: 16,
    cursor: "pointer",
    transition: "all 0.15s ease",
  };

  const selectBase = {
    height: 46,
    borderRadius: 16,
    border: "1px solid #9aa4b2",
    padding: "0 16px",
    fontSize: 16,
    fontWeight: 600,
    background: "#fff",
    color: "#1f2937",
    outline: "none",
  };

  return (
    <div className="workhours-scope">
      <div className="page">
        <div className="wh-hero">
          <div
            className="wh-hero-top"
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 18,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1 className="wh-title">Work Hours</h1>
              <p className="wh-sub">Track your work sessions and earnings</p>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginLeft: "auto",
              }}
            >
              <button
                type="button"
                onClick={() => setPeriodMode("monthly")}
                style={{
                  ...periodButtonBase,
                  background: periodMode === "monthly" ? "#7c4dff" : "#fff",
                  color: periodMode === "monthly" ? "#fff" : "#1f2937",
                  borderColor: periodMode === "monthly" ? "#7c4dff" : "#9aa4b2",
                }}
              >
                Monthly
              </button>

              <button
                type="button"
                onClick={() => setPeriodMode("yearly")}
                style={{
                  ...periodButtonBase,
                  background: periodMode === "yearly" ? "#7c4dff" : "#fff",
                  color: periodMode === "yearly" ? "#fff" : "#1f2937",
                  borderColor: periodMode === "yearly" ? "#7c4dff" : "#9aa4b2",
                }}
              >
                Yearly
              </button>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                disabled={periodMode === "yearly"}
                style={{
                  ...selectBase,
                  width: 138,
                  opacity: periodMode === "yearly" ? 0.65 : 1,
                  cursor: periodMode === "yearly" ? "not-allowed" : "pointer",
                }}
              >
                {MONTH_NAMES.map((month, index) => (
                  <option key={month} value={index}>
                    {month}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{ ...selectBase, width: 110, cursor: "pointer" }}
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 24,
            marginTop: 32,
          }}
        >
          <div className="wh-card" style={{ minHeight: 180, padding: 28 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <span>Total Hours</span>
              <span style={{ color: "#7c4dff", fontSize: 28 }}>◔</span>
            </div>
            <strong style={{ fontSize: 38, lineHeight: 1.1 }}>
              {currentStats.totalHours.toFixed(1)}h
            </strong>
            <div style={{ color: "#6b7280", marginTop: 10 }}>vs {previousLabel}</div>
          </div>

          <div className="wh-card" style={{ minHeight: 180, padding: 28 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <span>Total Earnings</span>
              <span style={{ color: "#e2aa2e", fontSize: 30 }}>$</span>
            </div>
            <strong style={{ fontSize: 38, lineHeight: 1.1 }}>
              {money(currentStats.totalEarnings)}
            </strong>
            <div style={{ color: "#6b7280", marginTop: 10 }}>vs {previousLabel}</div>
          </div>

          <div className="wh-card" style={{ minHeight: 180, padding: 28 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <span>Sessions</span>
              <span style={{ color: "#7c4dff", fontSize: 34, lineHeight: 1 }}>+</span>
            </div>
            <strong style={{ fontSize: 38, lineHeight: 1.1 }}>
              {currentStats.totalSessions}
            </strong>
            <div style={{ color: "#6b7280", marginTop: 10 }}>in {currentLabel}</div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 18,
            marginTop: 28,
          }}
        >
          <div
            className="wh-card"
            style={{
              background: "#e8f0ff",
              minHeight: 120,
              padding: 20,
              borderRadius: 20,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800, color: "#374151", textTransform: "uppercase" }}>
              Avg Daily Hours
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 10 }}>
              {currentStats.avgDailyHours.toFixed(1)}h
            </div>
            <div style={{ color: "#6b7280", marginTop: 4 }}>per day worked</div>
          </div>

          <div
            className="wh-card"
            style={{
              background: "#e8f8eb",
              minHeight: 120,
              padding: 20,
              borderRadius: 20,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800, color: "#374151", textTransform: "uppercase" }}>
              Earnings/Hour
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 10 }}>
              {money(currentStats.earningsPerHour)}
            </div>
            <div style={{ color: "#6b7280", marginTop: 4 }}>average rate</div>
          </div>

          <div
            className="wh-card"
            style={{
              background: "#f4ebff",
              minHeight: 120,
              padding: 20,
              borderRadius: 20,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800, color: "#374151", textTransform: "uppercase" }}>
              Days Worked
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 10 }}>
              {currentStats.daysWorked}
            </div>
            <div style={{ color: "#6b7280", marginTop: 4 }}>in this period</div>
          </div>

          <div
            className="wh-card"
            style={{
              background: "#f7efd9",
              minHeight: 120,
              padding: 20,
              borderRadius: 20,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800, color: "#374151", textTransform: "uppercase" }}>
              Busiest Day
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 10 }}>
              {currentStats.busiestDay}
            </div>
            <div style={{ color: "#6b7280", marginTop: 4 }}>
              {currentStats.busiestDay === "—"
                ? "no data"
                : `${currentStats.busiestDayHours.toFixed(1)}h worked`}
            </div>
          </div>
        </div>

        <div
          className="wh-controls"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginTop: 26,
            marginBottom: 12,
          }}
        >
          <input
            className="wh-input wh-search"
            placeholder="Search sessions or expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: "1 1 320px", minWidth: 260 }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
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

            <button className="wh-btn primary" onClick={() => setEmailExportOpen(true)}>
              Export to Email
            </button>
          </div>
        </div>

        <div className="wh-formsGrid">
          <div className="wh-section">
            <h2 className="wh-sectionTitle">Enter Work Time</h2>

            <div className="wh-formGrid">
              <div>
                <label className="wh-label">Date</label>
                <input
                  className="wh-input"
                  type="date"
                  value={wsDate}
                  onChange={(e) => setWsDate(e.target.value)}
                />
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
                <input
                  className="wh-input"
                  type="time"
                  value={wsStart}
                  onChange={(e) => setWsStart(e.target.value)}
                />
              </div>

              <div>
                <label className="wh-label">End Time</label>
                <input
                  className="wh-input"
                  type="time"
                  value={wsEnd}
                  onChange={(e) => setWsEnd(e.target.value)}
                />
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

          <div className="wh-section">
            <h2 className="wh-sectionTitle">Enter Expense</h2>

            <div className="wh-formGrid">
              <div>
                <label className="wh-label">Date</label>
                <input
                  className="wh-input"
                  type="date"
                  value={exDate}
                  onChange={(e) => setExDate(e.target.value)}
                />
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
                <select
                  className="wh-input"
                  value={exType}
                  onChange={(e) => setExType(e.target.value)}
                >
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

        {tab === "sessions" ? (
          <div className="wh-section">
            <h2 className="wh-sectionTitle">Work Sessions</h2>

            <table className="wh-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
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
                    <td colSpan="8" className="empty">
                      No sessions found.
                    </td>
                  </tr>
                ) : (
                  visibleSessions.map((s) => (
                    <tr key={s.id}>
                      <td>{s.date}</td>
                      <td>{formatDay(s.date)}</td>
                      <td>
                        {s.start} → {s.end}
                      </td>
                      <td>{Number(s.hours || 0).toFixed(2)}h</td>
                      <td>{money(s.rate)}</td>
                      <td style={{ fontWeight: 900, color: "#7c4dff" }}>
                        {money(s.earnings)}
                      </td>
                      <td>{s.notes || "—"}</td>
                      <td>
                        <button
                          className="wh-btn dangerSmall"
                          onClick={() => deleteSession(s.id)}
                        >
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
                        <button
                          className="wh-btn dangerSmall"
                          onClick={() => deleteExpense(e.id)}
                        >
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

        <EmailExportModal
          open={emailExportOpen}
          onClose={() => setEmailExportOpen(false)}
          dataOverride={{ workSessions: sessions, expenses }}
        />
      </div>
    </div>
  );
}