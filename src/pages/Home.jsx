import React, { useEffect, useMemo, useState } from "react";
import TaskList from "../components/TaskList";
import { useReminders } from "../app/RemindersContext";

const TASKS_KEY = "taskflow_tasks_v1";

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function Home() {
  // -------- Todos (localStorage) --------
  const [todos, setTodos] = useState(() => {
    const raw = localStorage.getItem(TASKS_KEY);
    return safeParse(raw, []);
  });

  useEffect(() => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(todos));
  }, [todos]);

  const today = todayISO();
  const todaysTodos = useMemo(() => todos.filter((t) => t.date === today), [todos, today]);

  const totalTodos = todaysTodos.length;
  const doneTodos = todaysTodos.filter((t) => t.done).length;

  const [todoText, setTodoText] = useState("");
  const [showTodoForm, setShowTodoForm] = useState(false);

  const addTodo = () => {
    const trimmed = todoText.trim();
    if (!trimmed) return;

    setTodos((prev) => [
      {
        id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
        text: trimmed,
        date: today,
        done: false,
        createdAt: Date.now(),
      },
      ...prev,
    ]);

    setTodoText("");
    setShowTodoForm(false);
  };

  const toggleTodo = (id) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const removeTodo = (id) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  // -------- Reminders (context + localStorage inside provider) --------
  const { remindersForDate, addReminder, toggleHandled, removeReminder } = useReminders();

  const todaysReminders = useMemo(() => remindersForDate(today), [remindersForDate, today]);
  const totalRem = todaysReminders.length;
  const doneRem = todaysReminders.filter((r) => r.handled).length;

  const [remText, setRemText] = useState("");
  const [remType, setRemType] = useState("Reminder");
  const [showRemForm, setShowRemForm] = useState(false);

  const submitReminder = () => {
    const trimmed = remText.trim();
    if (!trimmed) return;

    // ✅ RemindersContext.addReminder expects (text, type, dateISO)
    // Passing an object caused "[object Object]" and broke analytics.
    addReminder(trimmed, remType, today);
    setRemText("");
    setRemType("Reminder");
    setShowRemForm(false);
  };

  // -------- UI small helpers --------
  const percent = (a, b) => (b === 0 ? 0 : Math.round((a / b) * 100));

  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div
        style={{
          background: "rgba(0,0,0,0.75)",
          borderRadius: 18,
          padding: 28,
          color: "white",
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          marginBottom: 18,
        }}
      >
        <div style={{ fontSize: 44, fontWeight: 900, color: "#7c5cff" }}>
          Good Evening!
        </div>
        <div style={{ marginTop: 6, opacity: 0.9 }}>
          Here's your productivity snapshot for today
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14, marginBottom: 18 }}>
        <StatCard
          title="TODAY'S TASKS"
          big={`${doneTodos}/${totalTodos}`}
          sub={`${percent(doneTodos, totalTodos)}% complete`}
          bg="#eaf0ff"
        />
        <StatCard
          title="REMINDERS"
          big={`${doneRem}/${totalRem}`}
          sub={`${percent(doneRem, totalRem)}% handled`}
          bg="#f2ecff"
        />
        <StatCard title="WORK HOURS" big="0.0h" sub="this week" bg="#fff1dd" />
        <StatCard title="EARNINGS" big="$0" sub="this month" bg="#eaffea" />
      </div>

      {/* Main cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18 }}>
        {/* Todos */}
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={{ fontSize: 24, fontWeight: 900 }}>Today's Todos</div>

            <button
              onClick={() => setShowTodoForm((v) => !v)}
              style={iconButtonStyle}
              title="Add Todo"
            >
              +
            </button>
          </div>

          {showTodoForm && (
            <div style={formBoxStyle}>
              <input
                value={todoText}
                onChange={(e) => setTodoText(e.target.value)}
                placeholder="Add a new todo..."
                style={inputStyle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTodo();
                  if (e.key === "Escape") setShowTodoForm(false);
                }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button onClick={addTodo} style={primaryBtnStyle}>Add</button>
                <button onClick={() => setShowTodoForm(false)} style={secondaryBtnStyle}>Cancel</button>
              </div>
            </div>
          )}

          <TaskList
            items={todaysTodos}
            onToggle={toggleTodo}
            onRemove={removeTodo}
            emptyText="No todos yet. Great way to start the day!"
          />
        </div>

        {/* Reminders */}
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={{ fontSize: 24, fontWeight: 900 }}>Today's Reminders</div>

            <button
              onClick={() => setShowRemForm((v) => !v)}
              style={iconButtonStyle}
              title="Add Reminder"
            >
              +
            </button>
          </div>

          {showRemForm && (
            <div style={formBoxStyle}>
              <input
                value={remText}
                onChange={(e) => setRemText(e.target.value)}
                placeholder="Add a reminder..."
                style={{ ...inputStyle, borderColor: "rgba(255,170,0,0.55)" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitReminder();
                  if (e.key === "Escape") setShowRemForm(false);
                }}
              />

              <select
                value={remType}
                onChange={(e) => setRemType(e.target.value)}
                style={{ ...inputStyle, paddingRight: 12 }}
              >
                <option value="Reminder">Reminder</option>
                <option value="Birthday">Birthday</option>
                <option value="Event">Event</option>
              </select>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button onClick={submitReminder} style={gradientBtnStyle}>Add</button>
                <button onClick={() => setShowRemForm(false)} style={secondaryBtnStyle}>Cancel</button>
              </div>
            </div>
          )}

          {/* Use same TaskList UI but map reminder fields */}
          <TaskList
            items={todaysReminders.map((r) => ({
              id: r.id,
              text: r.text,
              done: r.handled,
              type: r.type,
            }))}
            onToggle={(id) => toggleHandled(id)}
            onRemove={(id) => removeReminder(id)}
            emptyText="No reminders for today. Enjoy your day!"
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- small UI helpers ---------- */

function StatCard({ title, big, sub, bg }) {
  return (
    <div
      style={{
        background: bg,
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
        border: "1px solid rgba(0,0,0,0.08)",
        minHeight: 110,
      }}
    >
      <div style={{ fontWeight: 900, letterSpacing: 0.5, opacity: 0.75 }}>{title}</div>
      <div style={{ fontSize: 40, fontWeight: 950, marginTop: 6 }}>{big}</div>
      <div style={{ marginTop: 6, opacity: 0.75, fontWeight: 700 }}>{sub}</div>
    </div>
  );
}

const panelStyle = {
  background: "#fff",
  borderRadius: 18,
  padding: 18,
  border: "1px solid rgba(0,0,0,0.10)",
  boxShadow: "0 14px 30px rgba(0,0,0,0.25)",
  minHeight: 340,
};

const panelHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 12,
};

const iconButtonStyle = {
  width: 40,
  height: 40,
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.15)",
  background: "#fff",
  fontSize: 22,
  fontWeight: 900,
  cursor: "pointer",
};

const formBoxStyle = {
  border: "1px solid rgba(0,0,0,0.18)",
  borderRadius: 18,
  padding: 14,
  background: "#fff",
  marginBottom: 12,
  display: "grid",
  gap: 10,
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(0,0,0,0.18)",
  outline: "none",
  fontSize: 15,
};

const primaryBtnStyle = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "none",
  background: "#7c5cff",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const gradientBtnStyle = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(90deg, #ffb347, #7c5cff)",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryBtnStyle = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(0,0,0,0.18)",
  background: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};
