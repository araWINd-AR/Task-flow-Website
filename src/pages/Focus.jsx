import React, { useEffect, useState } from "react";

const WORK_KEY = "taskflow_work_sessions_v1";
const FOCUS_STATS_KEY = "taskflow_focus_stats_v1";

const FOCUS_MIN = 25;
const BREAK_MIN = 5;

function saveWork(minutes) {
  const today = new Date().toISOString().slice(0, 10);

  const sessions = JSON.parse(localStorage.getItem(WORK_KEY) || "[]");

  const entry = {
    id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
    date: today,
    start: "Focus",
    end: "Focus",
    hours: Number((minutes / 60).toFixed(2)),
    rate: 0,
    earnings: 0,
    notes: `Pomodoro focus (${minutes}m)`,
    source: "focus",
    createdAt: Date.now(),
  };

  // Keep the newest entries at the top (matches Work Hours behavior)
  localStorage.setItem(WORK_KEY, JSON.stringify([entry, ...sessions]));
}

function safeParse(str, fallback) {
  try {
    const v = JSON.parse(str);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function readStats() {
  const stats = safeParse(localStorage.getItem(FOCUS_STATS_KEY), {
    totalSessions: 0,
    totalFocusMinutes: 0,
  });
  return {
    totalSessions: Number(stats.totalSessions || 0),
    totalFocusMinutes: Number(stats.totalFocusMinutes || 0),
  };
}

function writeStats(next) {
  localStorage.setItem(FOCUS_STATS_KEY, JSON.stringify(next));
}

export default function Focus() {
  const [mode, setMode] = useState("focus"); // focus | break
  const [seconds, setSeconds] = useState(FOCUS_MIN * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(() => readStats().totalSessions);

  // Keep stats in sync across refreshes / tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== FOCUS_STATS_KEY) return;
      setSessions(readStats().totalSessions);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!running) return;

    const t = setInterval(() => {
      setSeconds((s) => s - 1);
    }, 1000);

    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (seconds > 0) return;

    if (mode === "focus") {
      // ✅ Save completed session (persisted)
      setSessions((s) => {
        const nextSessions = s + 1;
        const prev = readStats();
        writeStats({
          totalSessions: nextSessions,
          totalFocusMinutes: prev.totalFocusMinutes + FOCUS_MIN,
        });
        return nextSessions;
      });

      // ✅ Bonus: Integrate with Work Hours (auto-add focus time)
      saveWork(FOCUS_MIN);

      setMode("break");
      setSeconds(BREAK_MIN * 60);
    } else {
      setMode("focus");
      setSeconds(FOCUS_MIN * 60);
    }

    setRunning(false);
  }, [seconds, mode]);

  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;

  return (
    <div className="pageWrap">
      <section className="heroCard">
        <h1 className="heroTitle" style={{ color: "#fff" }}>
          ⏱ Focus Mode
        </h1>
        <p className="heroSub">
          {mode === "focus"
            ? "Deep work time. No distractions."
            : "Break time. Recharge your brain."}
        </p>
      </section>

      <div className="whiteCard" style={{ textAlign: "center", marginTop: 20 }}>
        <h2 style={{ fontSize: 48, marginBottom: 10 }}>
          {String(min).padStart(2, "0")}:{String(sec).padStart(2, "0")}
        </h2>

        <div style={{ opacity: 0.8, marginBottom: 20 }}>
          Mode: <b>{mode.toUpperCase()}</b>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
          {!running ? (
            <button className="primaryBtn" onClick={() => setRunning(true)}>
              Start
            </button>
          ) : (
            <button className="darkBtn" onClick={() => setRunning(false)}>
              Pause
            </button>
          )}

          <button
            className="dangerBtn"
            onClick={() => {
              setRunning(false);
              setMode("focus");
              setSeconds(FOCUS_MIN * 60);
            }}
          >
            Reset
          </button>
        </div>

        <div style={{ marginTop: 20, opacity: 0.85 }}>
          ✅ Focus sessions completed: <b>{sessions}</b>
        </div>

        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.7 }}>
          Each focus session auto-adds <b>25 min</b> to Work Hours
        </div>
      </div>
    </div>
  );
}
