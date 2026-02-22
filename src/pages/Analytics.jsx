import React, { useEffect, useMemo, useState } from "react";

/**
 * Analytics.jsx (TaskFlow)
 * UI matches your screenshots:
 * - Dark hero + subtitle
 * - 4 pastel stat cards
 * - 4 big chart cards (simple SVG charts)
 * - Summary Statistics panel
 *
 * Data sources (safe fallbacks):
 * - Todos (tries multiple LS keys)
 * - Reminders (tries multiple LS keys)
 * - Work sessions (tries multiple LS keys)
 * - Goals (tries multiple LS keys)
 */

function safeJSONParse(str, fallback) {
  try {
    const v = JSON.parse(str);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function parseDate(value) {
  if (!value) return null;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  // MM/DD/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [mm, dd, yy] = value.split("/").map(Number);
    return new Date(yy, mm - 1, dd);
  }

  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function isSameMonth(dt, ref) {
  return (
    dt &&
    ref &&
    dt.getFullYear() === ref.getFullYear() &&
    dt.getMonth() === ref.getMonth()
  );
}

function money(n) {
  const x = Number(n || 0);
  return `$${x.toFixed(0)}`;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}


function ymd(dt) {
  const d = dt instanceof Date ? dt : new Date(dt);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toBool(v) {
  if (v === true) return true;
  if (v === false) return false;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.toLowerCase().trim();
    return s === "true" || s === "1" || s === "yes";
  }
  return Boolean(v);
}

function flattenPerDayMap(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
  const out = [];
  for (const [dateKey, arr] of Object.entries(obj)) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      out.push({ ...item, date: item?.date || dateKey });
    }
  }
  return out;
}

function readDayStoreOrArray(raw, todayKey) {
  if (Array.isArray(raw)) return raw.map((x) => ({ ...x, date: x?.date || todayKey }));
  return flattenPerDayMap(raw);
}

/** Basic “sparkline” polyline points */
function makeSparkPoints(values, w = 520, h = 240, pad = 28) {
  const safe = values.length ? values : [0];
  const minV = Math.min(...safe);
  const maxV = Math.max(...safe);
  const range = maxV - minV || 1;

  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  return safe
    .map((v, i) => {
      const x = pad + (innerW * i) / Math.max(1, safe.length - 1);
      const y = pad + innerH - ((v - minV) / range) * innerH;
      return `${x},${y}`;
    })
    .join(" ");
}

export default function Analytics() {
  const now = new Date();

  // ✅ same-tab localStorage writes don't trigger the native "storage" event.
  // RemindersContext will dispatch this so Analytics refreshes immediately.
  const EVT_REMINDERS_UPDATED = "taskflow_reminders_updated";

  // ✅ keep analytics in sync with changes made on Home/Dashboard
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((x) => x + 1);
    window.addEventListener("storage", bump); // other tabs
    window.addEventListener("focus", bump);   // returning to tab
    window.addEventListener(EVT_REMINDERS_UPDATED, bump); // same tab
    const onVis = () => {
      if (document.visibilityState === "visible") bump();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("storage", bump);
      window.removeEventListener("focus", bump);
      window.removeEventListener(EVT_REMINDERS_UPDATED, bump);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // -------- LocalStorage keys (robust) --------
  // Todos can be stored either as a flat array OR as a per-day map (Dashboard)
  const TODO_KEYS = [
    "taskflow_todos_today", // per-day map (Dashboard)
    "taskflow_todos_v1",
    "taskflow_tasks_v1",
    "taskflow_todos",
    "todos",
  ];
  const SESSION_KEYS = ["taskflow_work_sessions_v1", "taskflow_sessions_v1", "work_sessions"];
  const GOAL_KEYS = ["taskflow_goals_v1", "goals_v1", "goals"];

  function readFirstExisting(keys, fallback) {
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (raw) return safeJSONParse(raw, fallback);
    }
    return fallback;
  }

  const todos = useMemo(() => {
    const today = ymd(new Date());

    // ✅ MERGE todos from ALL keys, then dedupe.
    const merged = [];
    for (const k of TODO_KEYS) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = safeJSONParse(raw, null);
      if (parsed == null) continue;
      const list = readDayStoreOrArray(parsed, today);
      if (Array.isArray(list)) merged.push(...list);
    }

    // Normalize + dedupe + "done true" wins
    const byKey = new Map();
    for (const t of merged) {
      const text =
        typeof t?.text === "string"
          ? t.text
          : typeof t?.title === "string"
          ? t.title
          : String(t?.text ?? t?.title ?? "");

      const done = toBool(t?.done ?? t?.completed ?? t?.isDone ?? t?.checked);
      const key = t?.id ?? `${text}-${t?.date ?? ""}`;

      if (!byKey.has(key)) {
        byKey.set(key, { ...t, text, done });
      } else {
        const prev = byKey.get(key);
        byKey.set(key, { ...prev, ...t, text, done: Boolean(prev.done || done) });
      }
    }

    return Array.from(byKey.values());
  }, [tick]);


  const sessions = useMemo(() => {
    const data = readFirstExisting(SESSION_KEYS, []);
    return Array.isArray(data) ? data : [];
  }, [tick]);

  const goals = useMemo(() => {
    const data = readFirstExisting(GOAL_KEYS, []);
    return Array.isArray(data) ? data : [];
  }, [tick]);

  // -------- Derived stats --------
  const todoStats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter((t) => Boolean(t.done || t.completed || t.isDone)).length;
    const pct = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pct };
  }, [todos]);

  const workThisMonth = useMemo(() => {
    let hours = 0;
    let earned = 0;

    for (const s of sessions) {
      const dt = parseDate(s.date);
      if (!dt || !isSameMonth(dt, now)) continue;

      const h = Number(s.durationHours || s.hours || 0);
      const rate = Number(s.rate || s.hourlyRate || 0);
      hours += h;
      earned += h * rate;
    }

    return { hours, earned };
  }, [sessions, now]);

  const goalStats = useMemo(() => {
    const total = goals.length;
    const active = goals.filter((g) => !(g.completed || g.done || g.status === "completed")).length;
    const completed = total - active;

    // “Avg goal progress” – if goal has progress fields, use them; else 0/100 heuristic
    let sumProgress = 0;
    let count = 0;

    for (const g of goals) {
      if (typeof g.progress === "number") {
        sumProgress += clamp(g.progress, 0, 100);
        count++;
      } else if (typeof g.current === "number" && typeof g.target === "number" && g.target > 0) {
        sumProgress += clamp((g.current / g.target) * 100, 0, 100);
        count++;
      } else {
        // if no progress info, treat completed goals as 100, active as 0
        const isDone = Boolean(g.completed || g.done || g.status === "completed");
        sumProgress += isDone ? 100 : 0;
        count++;
      }
    }

    const avg = count ? Math.round(sumProgress / count) : 0;

    return { total, active, completed, avg };
  }, [goals]);

  // -------- Chart data (simple placeholders but real) --------
  // 30-day completion % (rough, based on todos createdAt / date)
  const completionSeries = useMemo(() => {
    const days = 30;
    const series = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

      // todos created on this day
      const dayTodos = todos.filter((t) => {
        const dt = parseDate(t.date || t.createdDate || t.createdAt);
        if (!dt) return false;
        const k = `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
        return k === key;
      });

      const total = dayTodos.length;
      const done = dayTodos.filter((t) => Boolean(t.done || t.completed || t.isDone)).length;
      const pct = total ? Math.round((done / total) * 100) : 0;

      series.push(pct);
    }

    // If absolutely no data, keep flat line
    if (series.every((x) => x === 0) && todos.length === 0) {
      return Array.from({ length: 30 }).map(() => 0);
    }
    return series;
  }, [todos, now]);

  // 30-day work hours (based on sessions per day)
  const workHoursSeries = useMemo(() => {
    const days = 30;
    const series = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

      let sum = 0;
      for (const s of sessions) {
        const dt = parseDate(s.date);
        if (!dt) continue;
        const k = `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
        if (k === key) sum += Number(s.durationHours || s.hours || 0);
      }
      series.push(Number(sum.toFixed(2)));
    }

    return series;
  }, [sessions, now]);

  // Weekly earnings (W1..W4 of current month)
  const weeklyEarnings = useMemo(() => {
    const weeks = [0, 0, 0, 0];

    for (const s of sessions) {
      const dt = parseDate(s.date);
      if (!dt || !isSameMonth(dt, now)) continue;

      const weekIndex = clamp(Math.floor((dt.getDate() - 1) / 7), 0, 3);
      const h = Number(s.durationHours || s.hours || 0);
      const rate = Number(s.rate || s.hourlyRate || 0);
      weeks[weekIndex] += h * rate;
    }

    return weeks.map((x) => Number(x.toFixed(0)));
  }, [sessions, now]);

  // Goals by category (simple buckets)
  const goalsByCategory = useMemo(() => {
    const cats = ["Health", "Learning", "Personal"];
    const active = [0, 0, 0];
    const completed = [0, 0, 0];

    for (const g of goals) {
      const catRaw = String(g.category || g.type || "Personal").toLowerCase();
      let idx = 2;
      if (catRaw.includes("health")) idx = 0;
      else if (catRaw.includes("learn") || catRaw.includes("study")) idx = 1;

      const isDone = Boolean(g.completed || g.done || g.status === "completed");
      if (isDone) completed[idx] += 1;
      else active[idx] += 1;
    }

    return { cats, active, completed };
  }, [goals]);

  // -------- Render --------
  return (
    <div className="tf-page tf-analytics-page">
      {/* HERO */}
      <div className="tf-hero">
        <div className="tf-hero-row">
          <div>
            <h1 className="tf-hero-title" style={{ margin: 0 }}>Analytics &amp; Insights</h1>
            <p className="tf-hero-sub">Track your productivity, progress, and performance</p>
          </div>
        </div>
      </div>

      {/* TOP CARDS (3 across) */}
      <div className="tf-cards tf-cards-3">
        <div className="tf-mini tf-mini-blue">
          <div className="tf-mini-label">COMPLETION RATE</div>
          <div className="tf-mini-value">{todoStats.pct}%</div>
          <div className="tf-mini-sub">
            {todoStats.completed}/{todoStats.total} tasks
          </div>
        </div>

        <div className="tf-mini tf-mini-orange">
          <div className="tf-mini-label">WORK THIS MONTH</div>
          <div className="tf-mini-value">{workThisMonth.hours.toFixed(1)}h</div>
          <div className="tf-mini-sub">{money(workThisMonth.earned)} earned</div>
        </div>

        <div className="tf-mini tf-mini-green">
          <div className="tf-mini-label">AVG GOAL PROGRESS</div>
          <div className="tf-mini-value">{goalStats.avg}%</div>
          <div className="tf-mini-sub">{goalStats.active} active goals</div>
        </div>
      </div>

      {/* CHART GRID (2x2) */}
      <div className="tf-chartGrid">
        {/* Completion % */}
        <div className="tf-chartCard">
          <div className="tf-chartHead">
            <div className="tf-chartTitle">Task Completion (30 Days)</div>
          </div>
          <div className="tf-chartBody">
            <svg viewBox="0 0 520 240" className="tf-chartSvg" role="img" aria-label="Task Completion Chart">
              {/* grid */}
              <g className="tf-grid">
                {Array.from({ length: 5 }).map((_, i) => (
                  <line key={i} x1="40" x2="500" y1={30 + i * 42} y2={30 + i * 42} />
                ))}
                {Array.from({ length: 6 }).map((_, i) => (
                  <line key={i} y1="30" y2="210" x1={40 + i * 92} x2={40 + i * 92} />
                ))}
              </g>

              <polyline
                points={makeSparkPoints(completionSeries, 520, 240, 40)}
                className="tf-line"
              />
            </svg>
            <div className="tf-chartLegend">— Completion %</div>
          </div>
        </div>

        {/* Work Hours */}
        <div className="tf-chartCard">
          <div className="tf-chartHead">
            <div className="tf-chartTitle">Work Hours (30 Days)</div>
          </div>
          <div className="tf-chartBody">
            <svg viewBox="0 0 520 240" className="tf-chartSvg" role="img" aria-label="Work Hours Chart">
              <g className="tf-grid">
                {Array.from({ length: 5 }).map((_, i) => (
                  <line key={i} x1="40" x2="500" y1={30 + i * 42} y2={30 + i * 42} />
                ))}
                {Array.from({ length: 6 }).map((_, i) => (
                  <line key={i} y1="30" y2="210" x1={40 + i * 92} x2={40 + i * 92} />
                ))}
              </g>

              <polyline
                points={makeSparkPoints(workHoursSeries, 520, 240, 40)}
                className="tf-line"
              />
            </svg>
            <div className="tf-chartLegend">— Hours</div>
          </div>
        </div>

        {/* Weekly earnings */}
        <div className="tf-chartCard">
          <div className="tf-chartHead">
            <div className="tf-chartTitle">Weekly Earnings</div>
          </div>
          <div className="tf-chartBody">
            <svg viewBox="0 0 520 240" className="tf-chartSvg" role="img" aria-label="Weekly Earnings Chart">
              <g className="tf-grid">
                {Array.from({ length: 5 }).map((_, i) => (
                  <line key={i} x1="40" x2="500" y1={30 + i * 42} y2={30 + i * 42} />
                ))}
              </g>

              {/* bars */}
              {weeklyEarnings.map((v, idx) => {
                const max = Math.max(...weeklyEarnings, 1);
                const h = (v / max) * 150;
                const x = 70 + idx * 105;
                const y = 200 - h;
                return (
                  <g key={idx}>
                    <rect className="tf-bar" x={x} y={y} width="72" height={h} rx="12" />
                    <text className="tf-xlabel" x={x + 36} y="224" textAnchor="middle">
                      W{idx + 1}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Goals by category */}
        <div className="tf-chartCard">
          <div className="tf-chartHead">
            <div className="tf-chartTitle">Goals by Category</div>
          </div>
          <div className="tf-chartBody">
            <svg viewBox="0 0 520 240" className="tf-chartSvg" role="img" aria-label="Goals by Category Chart">
              <g className="tf-grid">
                {Array.from({ length: 5 }).map((_, i) => (
                  <line key={i} x1="40" x2="500" y1={30 + i * 42} y2={30 + i * 42} />
                ))}
              </g>

              {goalsByCategory.cats.map((c, i) => {
                const a = goalsByCategory.active[i];
                const d = goalsByCategory.completed[i];
                const max = Math.max(...goalsByCategory.active, ...goalsByCategory.completed, 1);

                const ah = (a / max) * 140;
                const dh = (d / max) * 140;

                const baseX = 90 + i * 140;

                return (
                  <g key={c}>
                    <rect className="tf-bar" x={baseX} y={200 - ah} width="38" height={ah} rx="10" />
                    <rect className="tf-bar2" x={baseX + 48} y={200 - dh} width="38" height={dh} rx="10" />
                    <text className="tf-xlabel" x={baseX + 43} y="224" textAnchor="middle">
                      {c}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div className="tf-legendRow">
              <span className="tf-leg"><span className="tf-sq tf-sq1" /> Active</span>
              <span className="tf-leg"><span className="tf-sq tf-sq2" /> Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY STATISTICS */}
      <div className="tf-summary">
        <div className="tf-summaryTitle">Summary Statistics</div>

        <div className="tf-summaryGrid">
          <div className="tf-summaryItem">
            <div className="tf-summaryLabel">Total Todos</div>
            <div className="tf-summaryValue purple">{todoStats.total}</div>
          </div>

          <div className="tf-summaryItem">
            <div className="tf-summaryLabel">Active Goals</div>
            <div className="tf-summaryValue orange">{goalStats.active}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
