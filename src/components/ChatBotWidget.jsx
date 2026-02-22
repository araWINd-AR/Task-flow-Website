import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthContext";
import { useNotes } from "../app/NotesContext";
import { useReminders } from "../app/RemindersContext";
import { useGoals } from "../app/GoalsContext";

const CHAT_KEY = "taskflow_chat_history_v1";
const BOT_NAME = "Chinni";

// Storage keys (from your app)
const TASKS_KEY = "taskflow_tasks_v1";
const LS_SESSIONS = "taskflow_work_sessions_v1";
const LS_EXPENSES = "taskflow_expenses_v1";

// ✅ Calendar reminders storage (Calendar.jsx uses this)
const CAL_REM_KEY = "taskflow_calendar_reminders_v1";

// ✅ Home page (Today's Todos / Today's Reminders) keys
const HOME_TODOS_KEY = "taskflow_todos_today";
const HOME_REMINDERS_KEY = "taskflow_reminders_today";

// ✅ Optional: custom refresh events (won’t change UI; only helps pages auto-refresh)
const EVT_CAL_REM = "taskflow_calendar_reminders_updated";
const EVT_TASKS = "taskflow_tasks_updated";
const EVT_NOTES = "taskflow_notes_updated";
const EVT_HOME_TODOS = "taskflow_home_todos_updated";
const EVT_HOME_REM = "taskflow_home_reminders_updated";

// ✅ NEW: Calendar selected date event (sent by Calendar.jsx)
const EVT_CAL_SELECTED = "taskflow_calendar_selected_date";

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function nowTime() {
  try {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function normalizeText(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDaysISO(baseISO, days) {
  const [y, m, d] = String(baseISO).split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

function startOfWeekISO(date = new Date()) {
  // Monday start
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfMonthISO(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function isoToDate(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function inRangeISO(iso, startISO, endISO) {
  const dt = isoToDate(iso);
  const s = isoToDate(startISO);
  const e = isoToDate(endISO);
  if (!dt || !s || !e) return false;
  return dt.getTime() >= s.getTime() && dt.getTime() <= e.getTime();
}

function money(n) {
  const x = Number(n || 0);
  return `$${x.toFixed(2)}`;
}

/** Detect timeframe from user text */
function detectTimeframe(t) {
  if (t.includes("all time") || t.includes("overall") || t.includes("total") || t.includes("lifetime")) return "total";
  if (t.includes("this month") || t.includes("month")) return "month";
  if (t.includes("this week") || t.includes("week")) return "week";
  if (t.includes("today") || t.includes("now")) return "today";
  return "today";
}

function buildHelp() {
  return [
    "You can ask me things like:",
    "• help",
    "• open home / calendar / notes / work hours / goals / habits / focus / analytics",
    "",
    "Smart assistant features:",
    "• what should I do today",
    "• summarize my notes",
    "• suggest a focus plan",
    "• how productive was I this week",
    "",
    "✅ Create with chat:",
    "• set reminder today 18:30 call mom",
    "• remind me tomorrow 5pm pay rent",
    "• add reminder 2026-01-20 09:15 meeting",
    "• (If you selected a date in Calendar, reminders without date will save to that selected date)",
    "",
    "• create note Shopping | eggs, milk, bread",
    "• add note Title: content here",
    "",
    "• add todo buy milk",
    "• create todo tomorrow submit assignment",
    "",
    "Focus (Pomodoro):",
    "• open focus",
    "• pomodoro",
    "• focus timer",
    "",
    "Work & Money:",
    "• my work hours / my workings",
    "• my earnings",
    "• my expenses / total expenses",
    "• my profit / net",
    "",
    "Add time filters:",
    "• today / this week / this month / total",
    'Example: “my expenses this month”',
    "",
    "Friendly chat:",
    "• hi / hello",
    "• who am i",
    "• what’s my name",
    "• how are you",
  ].join("\n");
}

function matchRoute(text) {
  const t = normalizeText(text);

  if (/(^| )home( |$)/.test(t) || t.includes("open home")) return "/dashboard";
  if (/(^| )calendar( |$)/.test(t) || t.includes("open calendar")) return "/calendar";
  if (/(^| )notes( |$)/.test(t) || t.includes("open notes")) return "/notes";
  if (t.includes("work hours") || t.includes("open work") || t.includes("open work hours")) return "/work-hours";
  if (/(^| )goals( |$)/.test(t) || t.includes("open goals")) return "/goals";

  // ✅ HABITS
  if (/habits/.test(t) || /open habits/.test(t) || /habit tracker/.test(t)) return "/habits";

  // ✅ FOCUS / POMODORO
  if (
    t.includes("open focus") ||
    /(^| )focus( |$)/.test(t) ||
    t.includes("pomodoro") ||
    t.includes("focus timer") ||
    t.includes("start focus")
  ) {
    return "/focus";
  }

  if (t.includes("analytics") || t.includes("open analytics")) return "/analytics";

  return null;
}

/** Conversational intents */
function isGreeting(t) {
  return (
    t === "hi" ||
    t === "hello" ||
    t === "hey" ||
    t.startsWith("hi ") ||
    t.startsWith("hello ") ||
    t.startsWith("hey ")
  );
}
function isHowAreYou(t) {
  return t.includes("how are you") || t.includes("how r you") || t.includes("how are u");
}
function isWhoAmI(t) {
  return t.includes("who am i") || t.includes("who i am") || t.includes("what is my name") || t.includes("my name");
}
function isThanks(t) {
  return t.includes("thank") || t === "thanks" || t === "ty";
}
function isWhoAreYou(t) {
  return t.includes("who are you") || t.includes("what are you") || t.includes("your name");
}
function isSmallTalkInvite(t) {
  return (
    t.includes("talk to me") ||
    t.includes("interact with me") ||
    t.includes("chat with me") ||
    t.includes("be my friend") ||
    t.includes("keep me company")
  );
}
function isGreetingTime(t) {
  return (
    t.includes("good morning") ||
    t.includes("good afternoon") ||
    t.includes("good evening") ||
    t.includes("good night")
  );
}

/** App feature intents */
function looksLikeTodayPlan(t) {
  return (
    t.includes("what should i do today") ||
    t.includes("plan my day") ||
    t.includes("today plan") ||
    (t.includes("what") && t.includes("do") && t.includes("today"))
  );
}

function looksLikeNotesSummary(t) {
  return (
    t.includes("summarize my notes") ||
    t.includes("summary of my notes") ||
    (t.includes("summarize") && t.includes("notes")) ||
    t.includes("notes summary")
  );
}

function looksLikeFocusPlan(t) {
  return (
    t.includes("suggest a focus plan") ||
    t.includes("focus plan") ||
    t.includes("pomodoro") ||
    (t.includes("suggest") && t.includes("focus"))
  );
}

function looksLikeWeeklyProductivity(t) {
  return (
    t.includes("how productive was i this week") ||
    t.includes("this week productivity") ||
    (t.includes("productive") && t.includes("week")) ||
    t.includes("weekly report")
  );
}

/** Work / Earnings / Expenses / Net intent detection */
function wantsWorkHours(t) {
  return t.includes("my work") || t.includes("workings") || t.includes("work hours") || (t.includes("hours") && t.includes("work"));
}

function wantsEarnings(t) {
  return (
    t.includes("my earning") ||
    t.includes("my earnings") ||
    t.includes("earning") ||
    t.includes("earnings") ||
    t.includes("income") ||
    t.includes("salary")
  );
}

function wantsExpenses(t) {
  return (
    t.includes("my expense") ||
    t.includes("my expenses") ||
    t.includes("expense") ||
    t.includes("expenses") ||
    t.includes("spent") ||
    t.includes("spend")
  );
}

function wantsNet(t) {
  return t.includes("net") || t.includes("profit") || t.includes("balance") || (t.includes("my") && t.includes("profit"));
}

/* ---------------------------
   ✅ Chat create helpers
---------------------------- */

function parseTimeToHHMM(raw) {
  const s = String(raw || "").trim().toLowerCase();

  // 24h: 18:30
  const m24 = s.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (m24) return `${pad2(Number(m24[1]))}:${m24[2]}`;

  // 12h: 5pm / 5:10pm / 12am
  const m12 = s.match(/\b(1[0-2]|0?\d)(?::([0-5]\d))?\s*(am|pm)\b/);
  if (m12) {
    let h = Number(m12[1]);
    const mm = m12[2] ? Number(m12[2]) : 0;
    const ap = m12[3];
    if (ap === "pm" && h !== 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return `${pad2(h)}:${pad2(mm)}`;
  }

  return null;
}

// ✅ get the actual time token from the raw text (for clean stripping)
function extractTimeTokenRaw(raw) {
  const s = String(raw || "");

  const m24 = s.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (m24) return m24[0];

  const m12 = s.match(/\b(1[0-2]|0?\d)(?::([0-5]\d))?\s*(am|pm)\b/i);
  if (m12) return m12[0];

  return null;
}

function extractISODateFromText(raw) {
  const s = String(raw || "").toLowerCase();

  const m = s.match(/\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
  if (m) return m[0];

  const base = todayISO();
  if (s.includes("tomorrow")) return addDaysISO(base, 1);
  if (s.includes("today")) return base;

  return null;
}

function stripTokensForText(raw, tokens = []) {
  let out = String(raw || "");
  for (const t of tokens) {
    if (!t) continue;
    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(escaped, "ig"), " ");
  }
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

function looksLikeCreateCalendarReminder(t) {
  return (
    t.includes("set reminder") ||
    t.includes("add reminder") ||
    t.includes("create reminder") ||
    t.startsWith("remind me") ||
    (t.includes("reminder") && t.includes("at "))
  );
}

function looksLikeCreateNote(t) {
  return t.startsWith("create note") || t.startsWith("add note") || t.includes("create note ");
}

function looksLikeCreateTodo(t) {
  return t.startsWith("add todo") || t.startsWith("create todo") || t.startsWith("add task") || t.startsWith("create task");
}

/* ---------------------------
   ✅ Save also to Home page keys
---------------------------- */

function saveHomeTodo({ text }) {
  const msg = String(text || "").trim();
  if (!msg) return;

  const list = safeParse(localStorage.getItem(HOME_TODOS_KEY), []);
  const item = {
    id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
    text: msg,
    done: false,
    createdAt: Date.now(),
  };

  const next = [item, ...(Array.isArray(list) ? list : [])];
  localStorage.setItem(HOME_TODOS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVT_HOME_TODOS));
}

function saveHomeReminder({ text, timeHHMM }) {
  // Store reminders in per-day object format (same as Dashboard)
  // This prevents Analytics from showing 0/1 when reminders are actually handled.
  const dateISO = todayISO();

  // Accept either string or object input
  const msgRaw =
    typeof text === "string"
      ? text
      : text && typeof text === "object"
      ? (text.text ?? text.title ?? "")
      : String(text ?? "");

  const msg = String(msgRaw || "").trim();
  if (!msg) return;

  const raw = safeParse(localStorage.getItem(HOME_REMINDERS_KEY), {});
  const store =
    Array.isArray(raw)
      ? { [dateISO]: raw } // migrate old array -> map
      : raw && typeof raw === "object"
      ? raw
      : {};

  const item = {
    id: uid(),
    title: msg, // match Dashboard shape
    type: "Reminder",
    handled: false,
    time: timeHHMM || "09:00",
    createdAt: Date.now(),
  };

  const dayList = Array.isArray(store[dateISO]) ? store[dateISO] : [];
  store[dateISO] = [item, ...dayList];

  localStorage.setItem(HOME_REMINDERS_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(EVT_HOME_REM));
}

function saveCalendarReminder({ dateISO, timeHHMM, text }) {
  const date = dateISO || todayISO();
  const time = timeHHMM || "09:00";
  const msg = String(text || "").trim();
  if (!msg) return { ok: false, error: "Empty reminder text" };

  const store = safeParse(localStorage.getItem(CAL_REM_KEY), {});
  const list = Array.isArray(store?.[date]) ? store[date] : [];

  const item = {
    id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
    text: msg,
    time,
    done: false,
    createdAt: Date.now(),
  };

  const next = { ...store, [date]: [item, ...list] };
  localStorage.setItem(CAL_REM_KEY, JSON.stringify(next));

  // ✅ Calendar refresh
  window.dispatchEvent(new Event(EVT_CAL_REM));

  // ✅ If reminder is for TODAY, also push into Home (Today's Reminders)
  if (date === todayISO()) {
    saveHomeReminder({ text: msg, timeHHMM: time });
  }

  return { ok: true, date, time, text: msg };
}

function saveTodo({ dateISO, text }) {
  const date = dateISO || todayISO();
  const msg = String(text || "").trim();
  if (!msg) return { ok: false, error: "Empty todo text" };

  const list = safeParse(localStorage.getItem(TASKS_KEY), []);
  const item = {
    id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
    text: msg,
    date,
    done: false,
    createdAt: Date.now(),
  };
  const next = [item, ...(Array.isArray(list) ? list : [])];
  localStorage.setItem(TASKS_KEY, JSON.stringify(next));

  window.dispatchEvent(new Event(EVT_TASKS));

  if (date === todayISO()) {
    saveHomeTodo({ text: msg });
  }

  return { ok: true, date, text: msg };
}

function parseNote(raw) {
  const s = String(raw || "").trim();

  const noCmd = s.replace(/^create note\s*/i, "").replace(/^add note\s*/i, "").trim();

  if (!noCmd) return { title: "Untitled", content: "" };

  if (noCmd.includes("|")) {
    const [a, b] = noCmd.split("|");
    const title = String(a || "").trim() || "Untitled";
    const content = String(b || "").trim();
    return { title, content };
  }

  const idx = noCmd.indexOf(":");
  if (idx > 0) {
    const title = noCmd.slice(0, idx).trim() || "Untitled";
    const content = noCmd.slice(idx + 1).trim();
    return { title, content };
  }

  const content = noCmd.trim();
  const title = content.length > 28 ? content.slice(0, 28) + "…" : content;
  return { title: title || "Untitled", content };
}

export default function ChatBotWidget() {
  const { user } = useAuth();
  const { notes, addNote } = useNotes();
  const { reminders } = useReminders();
  const { goals } = useGoals();

  const navigate = useNavigate();

  const userDisplayName = useMemo(() => {
    const name = String(user?.name || "").trim();
    return name || "there";
  }, [user?.name]);

  const storageKey = useMemo(() => {
    const u = user?.name || "guest";
    return `${CHAT_KEY}_${u}`;
  }, [user?.name]);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  // ✅ NEW: default date from Calendar selected date
  const [calendarDefaultISO, setCalendarDefaultISO] = useState(() => todayISO());

  useEffect(() => {
    const handler = (e) => {
      const dateISO = e?.detail?.dateISO;
      if (typeof dateISO === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
        setCalendarDefaultISO(dateISO);
      }
    };

    window.addEventListener(EVT_CAL_SELECTED, handler);
    return () => window.removeEventListener(EVT_CAL_SELECTED, handler);
  }, []);

  const [messages, setMessages] = useState(() => {
    const saved = safeParse(localStorage.getItem(storageKey), null);
    if (Array.isArray(saved) && saved.length) return saved;

    return [
      {
        id: uid(),
        role: "bot",
        text: `Hi ${userDisplayName}! I’m ${BOT_NAME}.\n\n${buildHelp()}`,
        ts: nowTime(),
      },
    ];
  });

  const bottomRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function push(role, text) {
    setMessages((prev) => [...prev, { id: uid(), role, text, ts: nowTime() }]);
  }

  function getTodos() {
    return safeParse(localStorage.getItem(TASKS_KEY), []);
  }

  function getWorkSessions() {
    return safeParse(localStorage.getItem(LS_SESSIONS), []);
  }

  function getExpenses() {
    return safeParse(localStorage.getItem(LS_EXPENSES), []);
  }

  function getRangeForTimeframe(tf) {
    const end = todayISO();
    if (tf === "today") return { start: end, end };
    if (tf === "week") return { start: startOfWeekISO(new Date()), end };
    if (tf === "month") return { start: startOfMonthISO(new Date()), end };
    return { start: "1970-01-01", end };
  }

  function summarizeWorkAndMoney(tf) {
    const { start, end } = getRangeForTimeframe(tf);

    const sessions = getWorkSessions();
    const expenses = getExpenses();

    const sIn = sessions.filter((s) => inRangeISO(s?.date, start, end));
    const eIn = expenses.filter((e) => inRangeISO(e?.date, start, end));

    const totalHours = sIn.reduce((sum, s) => sum + Number(s?.hours || 0), 0);
    const totalEarn = sIn.reduce((sum, s) => sum + Number(s?.earnings || 0), 0);
    const totalSpent = eIn.reduce((sum, e) => sum + Number(e?.amount || 0), 0);
    const net = totalEarn - totalSpent;

    return { start, end, sIn, eIn, totalHours, totalEarn, totalSpent, net };
  }

  function labelForTF(tf) {
    if (tf === "today") return "Today";
    if (tf === "week") return "This week";
    if (tf === "month") return "This month";
    return "Total";
  }

  function answerWorkHoursEarningsExpensesNet(kind, tf) {
    const { start, end, sIn, eIn, totalHours, totalEarn, totalSpent, net } = summarizeWorkAndMoney(tf);

    const hdr = `📌 ${labelForTF(tf)} (${start} → ${end})`;
    const lines = [hdr, ""];

    if (kind === "work") {
      lines.push(`💼 Work sessions: ${sIn.length}`);
      lines.push(`🕒 Total work hours: ${totalHours.toFixed(1)}h`);
      lines.push("");
      lines.push('Tip: say “open work hours” to view details.');
      return lines.join("\n");
    }

    if (kind === "earnings") {
      lines.push(`💼 Work sessions: ${sIn.length}`);
      lines.push(`💰 Total earnings: ${money(totalEarn)}`);
      if (totalHours > 0) {
        const rate = totalEarn / Math.max(totalHours, 0.01);
        lines.push(`📈 Effective hourly: ${money(rate)}/hr`);
      }
      return lines.join("\n");
    }

    if (kind === "expenses") {
      lines.push(`🧾 Expense records: ${eIn.length}`);
      lines.push(`💸 Total expenses: ${money(totalSpent)}`);
      if (eIn.length) {
        const top = eIn
          .slice(0, 3)
          .map((x, i) => `${i + 1}. ${(x?.name || x?.title || "Expense")} — ${money(x?.amount || 0)}`);
        lines.push("");
        lines.push("Latest expenses:");
        lines.push(...top);
      }
      return lines.join("\n");
    }

    lines.push(`💰 Earnings: ${money(totalEarn)}`);
    lines.push(`💸 Expenses: ${money(totalSpent)}`);
    lines.push(`📈 Net (profit): ${money(net)}`);
    lines.push("");
    lines.push(net < 0 ? "Insight: You spent more than you earned in this period." : "Insight: Positive net — keep it up.");
    return lines.join("\n");
  }

  function answerTodayPlan() {
    const today = todayISO();

    const todos = getTodos().filter((t) => t?.date === today);
    const undone = todos.filter((t) => !t?.done);
    const done = todos.filter((t) => t?.done);

    const todaysRem = (reminders || []).filter((r) => r?.date === today);
    const remOpen = todaysRem.filter((r) => !r?.handled);
    const remDone = todaysRem.filter((r) => r?.handled);

    const topTodos = undone.slice(0, 5).map((t, i) => `${i + 1}. ${t.text}`);
    const topRem = remOpen.slice(0, 5).map((r, i) => `${i + 1}. [${r.type}] ${r.text}`);

    const lines = [];
    lines.push(`📌 ${userDisplayName}, here’s your plan for today (${today}):`);
    lines.push("");

    lines.push(`✅ Todos: ${done.length}/${todos.length} done`);
    if (topTodos.length) {
      lines.push("Next todos:");
      lines.push(...topTodos);
    } else {
      lines.push("No pending todos for today. Add one from Home.");
    }

    lines.push("");
    lines.push(`⏰ Reminders: ${remDone.length}/${todaysRem.length} handled`);
    if (topRem.length) {
      lines.push("Open reminders:");
      lines.push(...topRem);
    } else {
      lines.push("No open reminders for today.");
    }

    const activeGoals = (goals || [])
      .slice(0, 2)
      .map((g) => g?.title || g?.name)
      .filter(Boolean);

    if (activeGoals.length) {
      lines.push("");
      lines.push("🎯 Quick goal nudge:");
      lines.push(activeGoals.map((g, i) => `${i + 1}. ${g}`).join("\n"));
      lines.push("Try spending 25 minutes on one of these today.");
    }

    return lines.join("\n");
  }

  function answerNotesSummary() {
    const total = (notes || []).length;
    if (!total) {
      return ["📝 Notes summary:", "You don’t have any notes yet.", "Go to Notes → Create New Note."].join("\n");
    }

    const latest = (notes || []).slice(0, 5).map((n, i) => {
      const title = String(n?.title || "Untitled").trim();
      const body = String(n?.content || "").trim().replace(/\s+/g, " ");
      const preview = body.length > 80 ? body.slice(0, 80) + "…" : body;
      return `${i + 1}. ${title} — ${preview}`;
    });

    return [
      `📝 ${userDisplayName}, your notes summary: ${(notes || []).length} total`,
      "",
      "Latest notes:",
      ...latest,
      "",
      "Tip: say “open notes” if you want to edit them.",
    ].join("\n");
  }

  function answerFocusPlan() {
    const today = todayISO();
    const todos = getTodos().filter((t) => t?.date === today);
    const undone = todos.filter((t) => !t?.done);
    const list = undone.slice(0, 6).map((t) => t.text).filter(Boolean);

    const lines = [];
    lines.push(`🎯 ${userDisplayName}, here’s a focus plan (fast + effective):`);
    lines.push("");
    lines.push("Plan format: 25 min focus + 5 min break (Pomodoro).");
    lines.push("");
    lines.push("Tip: type “open focus” to start your timer.");
    lines.push("");

    if (list.length) {
      lines.push("Pick 3 focus blocks:");
      lines.push(`1) ${list[0]}`);
      lines.push(`2) ${list[1] || "A small task (5–10 min) to build momentum"}`);
      lines.push(`3) ${list[2] || "Review + clean up tasks/reminders"}`);
    } else {
      lines.push("You have no pending todos for today.");
      lines.push("Recommendation:");
      lines.push("1) Add 1–2 todos on Home");
      lines.push("2) Do one 25-min block immediately");
      lines.push("3) End with 10 mins planning tomorrow");
    }

    lines.push("");
    lines.push("Power move: after 3 Pomodoros, take a 20–30 min break.");
    return lines.join("\n");
  }

  function answerWeeklyProductivity() {
    const end = todayISO();
    const start = startOfWeekISO(new Date());

    const todosAll = getTodos();
    const weekTodos = todosAll.filter((t) => inRangeISO(t?.date, start, end));
    const weekDone = weekTodos.filter((t) => t?.done);

    const weekRem = (reminders || []).filter((r) => inRangeISO(r?.date, start, end));
    const weekRemDone = weekRem.filter((r) => r?.handled);

    const sessions = getWorkSessions();
    const weekSessions = sessions.filter((s) => inRangeISO(s?.date, start, end));
    const totalHours = weekSessions.reduce((sum, s) => sum + Number(s?.hours || 0), 0);
    const totalEarn = weekSessions.reduce((sum, s) => sum + Number(s?.earnings || 0), 0);

    const expenses = getExpenses();
    const weekExpenses = expenses.filter((e) => inRangeISO(e?.date, start, end));
    const totalSpent = weekExpenses.reduce((sum, e) => sum + Number(e?.amount || 0), 0);

    const net = totalEarn - totalSpent;

    const lines = [];
    lines.push(`📊 ${userDisplayName}, your weekly productivity (${start} → ${end})`);
    lines.push("");
    lines.push(`✅ Todos: ${weekDone.length}/${weekTodos.length} completed`);
    lines.push(`⏰ Reminders: ${weekRemDone.length}/${weekRem.length} handled`);
    lines.push("");
    lines.push(`💼 Work Hours: ${totalHours.toFixed(1)}h`);
    lines.push(`💰 Earnings: ${money(totalEarn)}`);
    lines.push(`🧾 Expenses: ${money(totalSpent)}`);
    lines.push(`📈 Net: ${money(net)}`);
    lines.push("");
    lines.push("Tip: Ask “my earnings this week” or “my expenses this month” anytime.");
    return lines.join("\n");
  }

  function answerFriendlyChat(t) {
    if (isGreeting(t)) {
      return `Hi ${userDisplayName}! 🙂\nHow can I help you today?\n\nTry: “set reminder 18:30 call mom” (it uses selected Calendar date)`;
    }
    if (isGreetingTime(t)) {
      return `${t.replace(/\b\w/g, (c) => c.toUpperCase())}, ${userDisplayName}!\nWant a quick plan? Type: “what should I do today”.`;
    }
    if (isHowAreYou(t)) {
      return `I’m doing great, ${userDisplayName} — ready to help.\nYou can also say: “add todo buy milk” or “set reminder 5pm pay rent”.`;
    }
    if (isWhoAmI(t)) {
      return `You are logged in as: ${userDisplayName}\nIf this looks wrong, logout and login again with the correct username.`;
    }
    if (isThanks(t)) {
      return `You’re welcome, ${userDisplayName}.\nWant to add something quickly? Try: “add todo …” or “set reminder …”.`;
    }
    if (isWhoAreYou(t)) {
      return `I’m ${BOT_NAME}, your TaskFlow assistant.\nI can navigate pages, summarize notes, and create reminders, notes, and todos from chat.`;
    }
    if (isSmallTalkInvite(t)) {
      return `Sure, ${userDisplayName} 🙂\nTell me what you want right now:\n• plan my day\n• summarize my notes\n• add todo buy milk\n• set reminder 18:30 call mom\n• create note Title | content`;
    }
    return null;
  }

  function answerFor(text) {
    const t = normalizeText(text);

    if (!t || t === "help" || t === "menu") return buildHelp();

    const friendly = answerFriendlyChat(t);
    if (friendly) return friendly;

    if (looksLikeTodayPlan(t)) return answerTodayPlan();
    if (looksLikeNotesSummary(t)) return answerNotesSummary();
    if (looksLikeFocusPlan(t)) return answerFocusPlan();
    if (looksLikeWeeklyProductivity(t)) return answerWeeklyProductivity();

    const tf = detectTimeframe(t);
    if (wantsNet(t)) return answerWorkHoursEarningsExpensesNet("net", tf);
    if (wantsExpenses(t)) return answerWorkHoursEarningsExpensesNet("expenses", tf);
    if (wantsEarnings(t)) return answerWorkHoursEarningsExpensesNet("earnings", tf);
    if (wantsWorkHours(t)) return answerWorkHoursEarningsExpensesNet("work", tf);

    return [
      `I can help with your TaskFlow data, ${userDisplayName}.`,
      "",
      "Try one of these:",
      "• add todo buy milk",
      "• set reminder 18:30 call mom (uses selected Calendar date)",
      "• create note Shopping | eggs, milk, bread",
      "",
      "Or productivity:",
      "• what should i do today",
      "• summarize my notes",
      "• suggest a focus plan",
      "• how productive was i this week",
      "",
      "Work & money:",
      "• my work hours / my earnings / my expenses / my profit",
      "Add timeframe: today / this week / this month / total",
      "",
      "Type “help” to see everything.",
    ].join("\n");
  }

  function tryHandleCreateCommands(rawText) {
    const t = normalizeText(rawText);

    // ✅ Calendar reminder create
    if (looksLikeCreateCalendarReminder(t)) {
      // ✅ IMPORTANT CHANGE:
      // If user does NOT specify date, use selected calendar date (calendarDefaultISO)
      const dateISO = extractISODateFromText(rawText) || calendarDefaultISO || todayISO();
      const timeHHMM = parseTimeToHHMM(rawText) || "09:00";

      const knownCmd = ["set reminder", "add reminder", "create reminder", "remind me", "reminder", "at", "today", "tomorrow"];
      const dateToken = extractISODateFromText(rawText);
      const timeTokenRaw = extractTimeTokenRaw(rawText);

      let cleaned = stripTokensForText(rawText, [...knownCmd, dateToken, timeTokenRaw]);
      cleaned = cleaned.replace(/\s+/g, " ").trim();

      const res = saveCalendarReminder({ dateISO, timeHHMM, text: cleaned });
      if (!res.ok) return { handled: true, reply: "I couldn’t create that reminder. Please include reminder text." };

      return {
        handled: true,
        reply: `✅ Reminder created\n📅 ${res.date}\n⏰ ${res.time}\n📝 ${res.text}\n\nTip: open calendar to view it.`,
      };
    }

    // ✅ Note create
    if (looksLikeCreateNote(t)) {
      const { title, content } = parseNote(rawText);

      if (typeof addNote === "function") {
        try {
          addNote({ title: title || "Untitled", content: content || "" });
          window.dispatchEvent(new Event(EVT_NOTES));

          return {
            handled: true,
            reply: `✅ Note created\n📝 ${title || "Untitled"}\n\nTip: open notes to view it.`,
          };
        } catch {
          return { handled: true, reply: "I couldn’t create the note. Please try again." };
        }
      }

      return {
        handled: true,
        reply: "I can’t create a note because addNote() is not available in NotesContext. Please share NotesContext.jsx and I will fix it.",
      };
    }

    // ✅ Todo create
    if (looksLikeCreateTodo(t)) {
      const base = todayISO();
      const dateISO = extractISODateFromText(rawText) || (t.includes("tomorrow") ? addDaysISO(base, 1) : base);

      const cmdStrip = rawText
        .replace(/^add todo\s*/i, "")
        .replace(/^create todo\s*/i, "")
        .replace(/^add task\s*/i, "")
        .replace(/^create task\s*/i, "");

      const cleaned = stripTokensForText(cmdStrip, ["today", "tomorrow", dateISO]).trim();
      const res = saveTodo({ dateISO, text: cleaned });
      if (!res.ok) return { handled: true, reply: "I couldn’t create that todo. Please include todo text." };

      return {
        handled: true,
        reply: `✅ Todo added\n📅 ${res.date}\n📝 ${res.text}\n\nTip: open home to see it.`,
      };
    }

    return { handled: false };
  }

  function send() {
    const text = input.trim();
    if (!text) return;

    setInput("");
    push("user", text);

    const createRes = tryHandleCreateCommands(text);
    if (createRes?.handled) {
      push("bot", createRes.reply || "Done.");
      return;
    }

    const route = matchRoute(text);
    if (route) {
      const label = route === "/dashboard" ? "home" : route.replace("/", "");
      push("bot", `Opening ${label}…`);
      setTimeout(() => navigate(route), 200);
      return;
    }

    push("bot", answerFor(text));
  }

  function clearChat() {
    setMessages([
      {
        id: uid(),
        role: "bot",
        text: `Hi ${userDisplayName}! I’m ${BOT_NAME}.\n\n${buildHelp()}`,
        ts: nowTime(),
      },
    ]);
  }

  return (
    <>
      <button
        className="tf-chat-fab"
        onClick={() => setOpen((o) => !o)}
        title={open ? `Close ${BOT_NAME}` : `Open ${BOT_NAME}`}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? "×" : "💬"}
      </button>

      {open && (
        <div className="tf-chat-panel" role="dialog" aria-modal="false">
          <div className="tf-chat-header">
            <div className="tf-chat-title">
              <div className="tf-chat-badge">AI</div>
              <div>
                <div style={{ fontWeight: 900, lineHeight: 1.1 }}>{BOT_NAME}</div>
                <div className="tf-chat-sub">Quick help, planning & insights</div>
              </div>
            </div>

            <div className="tf-chat-actions">
              <button className="tf-chat-action" onClick={clearChat} title="Clear chat">
                Clear
              </button>
              <button className="tf-chat-action" onClick={() => setOpen(false)} title="Close">
                Close
              </button>
            </div>
          </div>

          <div className="tf-chat-body">
            {messages.map((m) => (
              <div key={m.id} className={`tf-chat-msg ${m.role === "user" ? "me" : "bot"}`}>
                <div className="tf-chat-bubble">
                  {String(m.text)
                    .split("\n")
                    .map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                </div>
                <div className="tf-chat-time">{m.ts}</div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="tf-chat-inputRow">
            <input
              className="tf-chat-input"
              placeholder={`Message ${BOT_NAME}... (try: set reminder 6pm call mom)`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
            />
            <button className="tf-chat-send" onClick={send}>
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
