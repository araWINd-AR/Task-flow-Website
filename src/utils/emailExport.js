// src/utils/emailExport.js

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function currency(n) {
  const x = Number(n || 0);
  if (Number.isNaN(x)) return "$0.00";
  return x.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function hoursFmt(n) {
  const x = Number(n || 0);
  if (Number.isNaN(x)) return "0.0h";
  return `${x.toFixed(1)}h`;
}

function toISODate(d) {
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    if (!dt || Number.isNaN(dt.getTime())) return "";
    return dt.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

/**
 * Reads TaskFlow data from localStorage.
 * Supports your actual keys + user-scoped todos key.
 */
export function readTaskFlowData(user) {
  const u =
    typeof user === "string"
      ? user
      : user?.email || user?.username || user?.id || user?.name || "guest";

  const keyCandidates = {
    workSessions: [
      "taskflow_work_sessions_v1",
      "taskflow_work_sessions",
      `taskflow_work_sessions_${u}`,
    ],
    expenses: ["taskflow_expenses_v1", "taskflow_expenses", `taskflow_expenses_${u}`],
    goals: ["taskflow_goals_v1", "taskflow_goals", `taskflow_goals_${u}`],
    reminders: ["taskflow_reminders_v1", "taskflow_reminders", `taskflow_reminders_${u}`],
    todos: [`taskflow:${u}:todos`, "taskflow_todos_v1", "taskflow_todos", `taskflow_todos_${u}`],
  };

  const pick = (arr) => {
    for (const k of arr) {
      const raw = localStorage.getItem(k);
      if (raw) return safeParse(raw, []);
    }
    return [];
  };

  return {
    workSessions: pick(keyCandidates.workSessions),
    expenses: pick(keyCandidates.expenses),
    goals: pick(keyCandidates.goals),
    todos: pick(keyCandidates.todos),
    reminders: pick(keyCandidates.reminders),
  };
}

export function buildEmailReport({ userName, sections, data }) {
  const lines = [];
  const now = new Date();

  const sessions = Array.isArray(data.workSessions) ? data.workSessions : [];
  const expenses = Array.isArray(data.expenses) ? data.expenses : [];
  const goals = Array.isArray(data.goals) ? data.goals : [];
  const todos = Array.isArray(data.todos) ? data.todos : [];
  const reminders = Array.isArray(data.reminders) ? data.reminders : [];

  lines.push(`TaskFlow Export Report`);
  lines.push(`User: ${userName || "guest"}`);
  lines.push(`Generated: ${now.toLocaleString()}`);
  lines.push(`----------------------------------------`);
  lines.push("");

  // =========================
  // WORK HOURS + / or EARNINGS
  // =========================
  if (sections.workHours || sections.earnings) {
    const totalHours = sessions.reduce((sum, s) => sum + (Number(s?.hours ?? 0) || 0), 0);
    const totalEarnings = sessions.reduce(
      (sum, s) => sum + (Number(s?.earnings ?? 0) || 0),
      0
    );

    lines.push("✅ Work Hours / Earnings");
    lines.push(`Total sessions: ${sessions.length}`);

    if (sections.workHours) {
      lines.push(`Total hours: ${hoursFmt(totalHours)}`);
    }
    if (sections.earnings) {
      lines.push(`Total earnings: ${currency(totalEarnings)}`);
    }

    lines.push("");
  }

  // ==========
  // EXPENSES
  // ==========
  if (sections.expenses) {
    const totalSpent = expenses.reduce((sum, e) => sum + (Number(e?.amount ?? 0) || 0), 0);

    lines.push("✅ Expenses");
    lines.push(`Total records: ${expenses.length}`);
    lines.push(`Total spent: ${currency(totalSpent)}`);

    // show a few recent items (optional)
    const preview = expenses.slice(0, 5);
    if (preview.length) {
      lines.push("");
      lines.push("Recent expenses:");
      preview.forEach((e, i) => {
        const name = e?.name || e?.title || e?.expenseName || "Expense";
        const type = e?.type ? ` (${e.type})` : "";
        lines.push(`${i + 1}. ${name}${type} - ${currency(e?.amount ?? 0)}`);
      });
    }

    lines.push("");
  }

  // ======
  // GOALS
  // ======
  if (sections.goals) {
    lines.push("✅ Goals");

    lines.push(`Total goals: ${goals.length}`);

    const upcoming = goals
      .map((g) => ({ ...g, _due: g?.targetDate || g?.dueDate || "" }))
      .filter((g) => g._due)
      .sort((a, b) => String(a._due).localeCompare(String(b._due)))
      .slice(0, 8);

    if (upcoming.length) {
      lines.push("");
      lines.push("Upcoming goals:");
      upcoming.forEach((g, i) => {
        const title = g?.title || "Goal";
        const cat = g?.category ? ` • ${g.category}` : "";
        const due = g._due ? ` • Due: ${g._due}` : "";
        const tgt =
          g?.targetValue != null
            ? ` • Target: ${g.targetValue} ${g.unit || ""}`.trim()
            : "";
        lines.push(`${i + 1}. ${title}${cat}${tgt}${due}`);
      });
    }

    lines.push("");
  }

  // ======
  // TODOS
  // ======
  if (sections.todos) {
    const doneCount = todos.filter((t) => !!t?.done).length;
    const pendingCount = todos.length - doneCount;

    lines.push("✅ Todos");
    lines.push(`Total todos: ${todos.length}`);
    lines.push(`Completed: ${doneCount}`);
    lines.push(`Pending: ${pendingCount}`);

    const pendingList = todos.filter((t) => !t?.done).slice(0, 10);
    if (pendingList.length) {
      lines.push("");
      lines.push("Pending todos:");
      pendingList.forEach((t, i) => {
        lines.push(`${i + 1}. ${t?.text || "Todo"}`);
      });
    }

    lines.push("");
  }

  // ==========
  // REMINDERS
  // ==========
  if (sections.reminders) {
    const handled = reminders.filter((r) => !!r?.handled).length;
    const unhandled = reminders.length - handled;

    lines.push("✅ Reminders");
    lines.push(`Total reminders: ${reminders.length}`);
    lines.push(`Handled: ${handled}`);
    lines.push(`Pending: ${unhandled}`);

    const today = toISODate(new Date());
    const todays = reminders
      .filter((r) => String(r?.date || "") === today)
      .slice(0, 10);

    if (todays.length) {
      lines.push("");
      lines.push(`Today (${today}) reminders:`);
      todays.forEach((r, i) => {
        const status = r?.handled ? "✅" : "⏳";
        const text = r?.text || "Reminder";
        const type = r?.type ? ` (${r.type})` : "";
        lines.push(`${i + 1}. ${status} ${text}${type}`);
      });
    }

    lines.push("");
  }

  lines.push("— End of report —");
  return lines.join("\n");
}

export function openMailClient({ toEmail, subject, body }) {
  const mailto = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  window.location.href = mailto;
}
