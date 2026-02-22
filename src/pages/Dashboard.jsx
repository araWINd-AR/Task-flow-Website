import { useEffect, useMemo, useState } from "react";

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`; // local YYYY-MM-DD
}

function startOfWeek(d = new Date()) {
  // Sunday start (like your calendar labels)
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0 Sun
  x.setDate(x.getDate() - day);
  return x;
}

function isSameMonth(dateStr, y, m) {
  const d = new Date(`${dateStr}T00:00:00`);
  return !Number.isNaN(d.getTime()) && d.getFullYear() === y && d.getMonth() === m;
}

function inThisWeek(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const s = startOfWeek(new Date());
  const e = new Date(s);
  e.setDate(e.getDate() + 7);
  return d >= s && d < e;
}

function secondsToHours(sec) {
  return sec / 3600;
}
function round1(n) {
  return Math.round(n * 10) / 10;
}

const LS_TODOS = "taskflow_todos_today";
const LS_REMS = "taskflow_reminders_today";

// OPTIONAL: if your WorkHours page stores sessions, we can read them.
// If you don’t have it yet, it’ll just show 0.
const LS_WORK_SESSIONS = "taskflow_work_sessions"; 
// expected session shape: { id, date:"YYYY-MM-DD", durationSec:number, rate:number }

export default function Dashboard() {
  const [todos, setTodos] = useState([]);
  const [reminders, setReminders] = useState([]);

  const [showTodoAdd, setShowTodoAdd] = useState(true);
  const [showRemAdd, setShowRemAdd] = useState(true);

  const [todoText, setTodoText] = useState("");

  const [remText, setRemText] = useState("");
  const [remTime, setRemTime] = useState("");

  const [workSessions, setWorkSessions] = useState([]);

  const tKey = useMemo(() => todayKey(), []);

  // Load per-day todos/reminders
  useEffect(() => {
    try {
      const rawTodos = JSON.parse(localStorage.getItem(LS_TODOS) || "{}");
      const rawRems = JSON.parse(localStorage.getItem(LS_REMS) || "{}");

      // Support both formats:
      // - per-day map: { "YYYY-MM-DD": [ ... ] }
      // - legacy array: [ ... ]  (migrate to per-day map)
      const todosStore = Array.isArray(rawTodos) ? { [tKey]: rawTodos } : (rawTodos && typeof rawTodos === "object" ? rawTodos : {});
      const remsStore = Array.isArray(rawRems) ? { [tKey]: rawRems } : (rawRems && typeof rawRems === "object" ? rawRems : {});

      // Migrate if needed so other pages (Analytics) read consistently
      if (Array.isArray(rawTodos)) localStorage.setItem(LS_TODOS, JSON.stringify(todosStore));
      if (Array.isArray(rawRems)) localStorage.setItem(LS_REMS, JSON.stringify(remsStore));

      setTodos(
        Array.isArray(todosStore[tKey])
          ? todosStore[tKey].map((x) => ({ ...x, text: x?.text ?? x?.title ?? "" }))
          : []
      );

      // Normalize reminder shape (Dashboard uses `title`)
      setReminders(
        Array.isArray(remsStore[tKey])
          ? remsStore[tKey].map((x) => ({ ...x, title: x?.title ?? x?.text ?? "" }))
          : []
      );
    } catch {
      setTodos([]);
      setReminders([]);
    }
  }, [tKey]);

  // Persist todos
  useEffect(() => {
    const raw = JSON.parse(localStorage.getItem(LS_TODOS) || "{}");
    const all = Array.isArray(raw) ? { [tKey]: raw } : (raw && typeof raw === "object" ? raw : {});
    all[tKey] = todos;
    localStorage.setItem(LS_TODOS, JSON.stringify(all));
  }, [todos, tKey]);

  // Persist reminders
  useEffect(() => {
    const raw = JSON.parse(localStorage.getItem(LS_REMS) || "{}");
    const all = Array.isArray(raw) ? { [tKey]: raw } : (raw && typeof raw === "object" ? raw : {});
    all[tKey] = reminders;
    localStorage.setItem(LS_REMS, JSON.stringify(all));
  }, [reminders, tKey]);

  // Load work sessions (if present)
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(LS_WORK_SESSIONS) || "[]");
      setWorkSessions(Array.isArray(s) ? s : []);
    } catch {
      setWorkSessions([]);
    }
  }, []);

  // ------- TODOS -------
  function addTodo(e) {
    e.preventDefault();
    const text = todoText.trim();
    if (!text) return;

    const item = { id: uid(), text, done: false, createdAt: Date.now() };
    setTodos((p) => [item, ...p]);
    setTodoText("");
  }

  function toggleTodo(id) {
    setTodos((p) => p.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  }

  function deleteTodo(id) {
    setTodos((p) => p.filter((x) => x.id !== id));
  }

  // ------- REMINDERS -------
  function addReminder(e) {
    e.preventDefault();
    const title = remText.trim();
    if (!title) return;

    const item = {
      id: uid(),
      title,
      time: remTime.trim() || "—",
      handled: false,
      createdAt: Date.now(),
    };

    setReminders((p) => [item, ...p]);
    setRemText("");
    setRemTime("");
  }

  function toggleReminder(id) {
    setReminders((p) =>
      p.map((x) => (x.id === id ? { ...x, handled: !x.handled } : x))
    );
  }

  function deleteReminder(id) {
    setReminders((p) => p.filter((x) => x.id !== id));
  }

  // ------- STATS (for top row cards) -------
  const stats = useMemo(() => {
    const totalTodos = todos.length;
    const doneTodos = todos.filter((t) => t.done).length;
    const todoPct = totalTodos ? Math.round((doneTodos / totalTodos) * 100) : 0;

    const totalRem = reminders.length;
    const handledRem = reminders.filter((r) => r.handled).length;
    const remPct = totalRem ? Math.round((handledRem / totalRem) * 100) : 0;

    // Work hours this week (from work sessions if you have them)
    const weekSeconds = workSessions
      .filter((s) => s?.date && inThisWeek(s.date))
      .reduce((a, s) => a + (Number(s.durationSec) || 0), 0);

    const weekHours = secondsToHours(weekSeconds);

    // Earnings this month
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    const monthEarn = workSessions
      .filter((s) => s?.date && isSameMonth(s.date, y, m))
      .reduce((a, s) => {
        const h = secondsToHours(Number(s.durationSec) || 0);
        const rate = Number(s.rate) || 0;
        return a + h * rate;
      }, 0);

    return {
      totalTodos,
      doneTodos,
      todoPct,
      totalRem,
      handledRem,
      remPct,
      weekHours,
      monthEarn,
    };
  }, [todos, reminders, workSessions]);

  // Greeting name (you can connect it to your auth later)
  const username = "ar";

  return (
    <div className="dashboard-wrap">
      {/* HERO (Good Morning...) */}
      <div className="dash-hero">
        <div className="dash-hero-box">
          <h1 className="dash-hero-title">
            Good Morning, {username}! <span className="wave">👋</span>
          </h1>
          <p className="dash-hero-sub">Here's your productivity snapshot for today</p>
        </div>
      </div>

      {/* TOP STATS ROW */}
      <div className="dash-stats">
        {/* TODAY'S TASKS */}
        <div className="mini-stat blue">
          <div className="mini-top">
            <div className="mini-label">TODAY'S TASKS</div>
            <div className="mini-icon">○</div>
          </div>

          <div className="mini-value">
            {stats.doneTodos}/{stats.totalTodos}
          </div>

          <div className="mini-bar">
            <div className="mini-fill" style={{ width: `${stats.todoPct}%` }} />
          </div>

          <div className="mini-foot">{stats.todoPct}% complete</div>
        </div>

        {/* REMINDERS */}
        <div className="mini-stat purple">
          <div className="mini-top">
            <div className="mini-label">REMINDERS</div>
            <div className="mini-icon">🔔</div>
          </div>

          <div className="mini-value">
            {stats.handledRem}/{stats.totalRem}
          </div>

          <div className="mini-bar">
            <div className="mini-fill" style={{ width: `${stats.remPct}%` }} />
          </div>

          <div className="mini-foot">{stats.remPct}% handled</div>
        </div>

        {/* WORK HOURS */}
        <div className="mini-stat orange">
          <div className="mini-top">
            <div className="mini-label">WORK HOURS</div>
            <div className="mini-icon">🕒</div>
          </div>

          <div className="mini-value">{round1(stats.weekHours)}h</div>
          <div className="mini-foot">this week</div>
        </div>

        {/* EARNINGS */}
        <div className="mini-stat green">
          <div className="mini-top">
            <div className="mini-label">EARNINGS</div>
            <div className="mini-icon">↗</div>
          </div>

          <div className="mini-value">${Math.round(stats.monthEarn)}</div>
          <div className="mini-foot">this month</div>
        </div>
      </div>

      {/* TWO BIG CARDS */}
      <div className="dash-grid-2">
        {/* TODAY'S TODOS */}
        <div className="dash-card">
          <div className="dash-card-head">
            <div className="dash-card-title">
              <span className="ring purple">○</span> Today&apos;s Todos
            </div>
            <button className="dash-plus" onClick={() => setShowTodoAdd((v) => !v)}>
              +
            </button>
          </div>

          {showTodoAdd && (
            <form className="dash-form" onSubmit={addTodo}>
              <input
                className="dash-input focus-purple"
                placeholder="Add a new todo..."
                value={todoText}
                onChange={(e) => setTodoText(e.target.value)}
              />

              <div className="dash-btn-row">
                <button className="dash-btn primary" type="submit">
                  Add
                </button>
                <button className="dash-btn" type="button" onClick={() => setTodoText("")}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* LIST */}
          {todos.length === 0 ? (
            <p className="dash-empty">No todos yet. Great way to start the day! 🎉</p>
          ) : (
            <div className="dash-list">
              {todos.map((t) => (
                <div className={`dash-row ${t.done ? "done" : ""}`} key={t.id}>
                  <button className="dash-check" onClick={() => toggleTodo(t.id)}>
                    {t.done ? "✓" : "○"}
                  </button>
                  <div className="dash-text">{t.text}</div>
                  <button className="dash-x" onClick={() => deleteTodo(t.id)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TODAY'S REMINDERS */}
        <div className="dash-card">
          <div className="dash-card-head">
            <div className="dash-card-title">
              <span className="ring orange">🔔</span> Today&apos;s Reminders
            </div>
            <button className="dash-plus orange" onClick={() => setShowRemAdd((v) => !v)}>
              +
            </button>
          </div>

          {showRemAdd && (
            <form className="dash-form" onSubmit={addReminder}>
              <input
                className="dash-input focus-orange"
                placeholder="Add a reminder..."
                value={remText}
                onChange={(e) => setRemText(e.target.value)}
              />
              <input
                className="dash-input"
                placeholder="Reminder time (e.g., 09:30)"
                value={remTime}
                onChange={(e) => setRemTime(e.target.value)}
              />

              <div className="dash-btn-row">
                <button className="dash-btn gradient" type="submit">
                  Add
                </button>
                <button
                  className="dash-btn"
                  type="button"
                  onClick={() => {
                    setRemText("");
                    setRemTime("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* LIST */}
          {reminders.length === 0 ? (
            <p className="dash-empty">No reminders for today. Enjoy your day! 😊</p>
          ) : (
            <div className="dash-list">
              {reminders.map((r) => (
                <div className={`dash-row ${r.handled ? "done" : ""}`} key={r.id}>
                  <button className="dash-check orange" onClick={() => toggleReminder(r.id)}>
                    {r.handled ? "✓" : "○"}
                  </button>

                  <div className="time-pill">{r.time}</div>

                  <div className="dash-text">{r.title}</div>

                  <button className="dash-x" onClick={() => deleteReminder(r.id)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
