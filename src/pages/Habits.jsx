import React, { useMemo, useState } from "react";
import { useAuth } from "../app/AuthContext";
import { useHabits } from "../app/HabitsContext";

const QUOTES = [
  "Small habits. Big results.",
  "Don’t break the chain.",
  "Consistency beats intensity.",
  "Your future is built daily.",
  "Progress is a daily decision.",
];

function pickQuote(seed = 0) {
  return QUOTES[seed % QUOTES.length];
}

export default function Habits() {
  const { user } = useAuth();
  const { habits, addHabit, removeHabit, toggleToday, computeStreak, todayISO } = useHabits();

  const name = String(user?.name || "User").trim() || "User";
  const today = todayISO();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  const stats = useMemo(() => {
    const total = habits.length;
    const doneToday = habits.filter((h) => (h.completions || []).includes(today)).length;

    let best = 0;
    let bestTitle = "";
    for (const h of habits) {
      const s = computeStreak(h.completions);
      if (s > best) {
        best = s;
        bestTitle = h.title;
      }
    }

    return { total, doneToday, best, bestTitle };
  }, [habits, today, computeStreak]);

  function onCreate() {
    const t = title.trim();
    if (!t) return;
    addHabit({ title: t });
    setTitle("");
    setOpen(false);
  }

  const quote = useMemo(() => {
    // stable daily quote
    const d = new Date();
    const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return pickQuote(seed);
  }, []);

  return (
    <div className="pageWrap">
      <section className="heroCard">
        <h1 className="heroTitle" style={{ color: "#fff" }}>
          Habits Tracker ⭐⭐⭐⭐⭐
        </h1>
        <p className="heroSub">
          {quote} — {name}, today is <b>{today}</b>
        </p>
      </section>

      {/* TOP STATS (inspiring) */}
      <div
        className="whiteCard"
        style={{
          marginTop: 14,
          borderRadius: 18,
          padding: 18,
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Habits</div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{stats.total}</div>
          <div style={{ opacity: 0.7 }}>Total habits you’re building</div>
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Completed Today</div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>
            {stats.doneToday}/{stats.total}
          </div>
          <div style={{ opacity: 0.7 }}>Keep momentum — don’t break the chain</div>
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Best Streak</div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{stats.best}🔥</div>
          <div style={{ opacity: 0.7 }}>
            {stats.bestTitle ? `Top habit: ${stats.bestTitle}` : "Create your first habit"}
          </div>
        </div>
      </div>

      <button className="widePrimaryBtn" type="button" onClick={() => setOpen(true)}>
        + Create Habit
      </button>

      {/* CREATE MODAL */}
      {open && (
        <div className="modalOverlay" onClick={() => setOpen(false)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <div className="modalTop">
              <h2>Create Habit</h2>
              <button className="xBtn" type="button" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>

            <label className="label">Habit name</label>
            <input
              className="input"
              placeholder="Example: Study / Gym / Read / Sleep early"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCreate();
              }}
            />

            <div className="row" style={{ marginTop: 10 }}>
              <button className="primaryBtn" type="button" onClick={onCreate}>
                Create
              </button>
              <button className="darkBtn" type="button" onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>

            <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
              Tip: You will get a streak automatically when you mark it ✅ daily.
            </div>
          </div>
        </div>
      )}

      <h2 className="sectionTitle" style={{ marginTop: 18 }}>
        Your Habits ({habits.length})
      </h2>

      {habits.length === 0 ? (
        <div className="whiteCard emptyBig">
          <div className="plusBig">+</div>
          <div className="muted">No habits yet. Create your first habit and start a streak.</div>
        </div>
      ) : (
        <div
          className="whiteCard"
          style={{
            borderRadius: 18,
            padding: 14,
            marginTop: 10,
          }}
        >
          <div style={{ display: "grid", gap: 10 }}>
            {habits.map((h) => {
              const done = (h.completions || []).includes(today);
              const streak = computeStreak(h.completions);

              return (
                <div
                  key={h.id}
                  
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: 14,
                    borderRadius: 14,
                    background: "rgba(0,0,0,0.04)",
                    border: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => toggleToday(h.id)}
                      title="Mark completed for today"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        border: "1px solid rgba(0,0,0,0.2)",
                        background: done ? "rgb(107, 73, 255)" : "#fff",
                        color: done ? "#fff" : "#111",
                        cursor: "pointer",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 900,
                      }}
                    >
                      {done ? "✓" : ""}
                    </button>

                    <div>
                      <div style={{ fontWeight: 900, fontSize: 16 }}>
                        {h.title}{" "}
                        <span style={{ opacity: 0.7, fontWeight: 700 }}>
                          ({streak}-day streak 🔥)
                        </span>
                      </div>
                      <div style={{ fontSize: 13, opacity: 0.75 }}>
                        {done ? "Completed today ✅" : "Not completed today"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div
                      style={{
                        fontWeight: 900,
                        padding: "8px 12px",
                        borderRadius: 999,
                        background: "rgba(107, 73, 255, 0.12)",
                        color: "rgb(107, 73, 255)",
                        minWidth: 90,
                        textAlign: "center",
                      }}
                      title="Current streak"
                    >
                      {streak}🔥
                    </div>

                    <button className="dangerBtn" type="button" onClick={() => removeHabit(h.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 12, opacity: 0.8, fontSize: 13 }}>
            💡 Streak rule: If you miss a day, the streak resets. Build consistency to inspire yourself.
          </div>
        </div>
      )}
    </div>
  );
}
