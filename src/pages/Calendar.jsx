import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "taskflow_calendar_reminders_v1";
const EVT_CAL_REM = "taskflow_calendar_reminders_updated";

function pad2(n) {
  return String(n).padStart(2, "0");
}
function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function fromISODate(iso) {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(y, m - 1, day);
}
function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function weekdayName(date) {
  return date.toLocaleString("default", { weekday: "long" });
}

function prettyFullDate(date) {
  return date.toLocaleString("default", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Build calendar grid (Sun..Sat) for a month
function buildMonthGrid(monthCursor) {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  const startDayIndex = firstOfMonth.getDay(); // 0=Sun
  const totalDays = lastOfMonth.getDate();

  const cells = [];

  // leading blanks from previous month
  for (let i = 0; i < startDayIndex; i++) {
    const d = new Date(year, month, 1 - (startDayIndex - i));
    cells.push({ date: d, inMonth: false });
  }

  // days in this month
  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month, day);
    cells.push({ date: d, inMonth: true });
  }

  // trailing blanks to complete weeks
  while (cells.length % 7 !== 0) {
    const d = new Date(
      year,
      month,
      totalDays + (cells.length - (startDayIndex + totalDays)) + 1
    );
    cells.push({ date: d, inMonth: false });
  }

  return cells;
}

export default function Calendar() {
  const todayISO = useMemo(() => toISODate(new Date()), []);
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedISO, setSelectedISO] = useState(todayISO);

  // reminders = { "YYYY-MM-DD": [{id, text, time, done, createdAt}] }
  const [reminders, setReminders] = useState({});

  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState("");
  const [newTime, setNewTime] = useState("09:00");

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setReminders(JSON.parse(raw));
      else setReminders({});
    } catch {
      setReminders({});
    }
  }

  // ✅ Initial load
  useEffect(() => {
    loadFromStorage();
  }, []);

  // ✅ Save whenever reminders change (calendar manual add/toggle/delete)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
      // same-tab sync (Analytics listens to this)
      window.dispatchEvent(new Event("taskflow_reminders_updated"));
    } catch {
      // ignore
    }
  }, [reminders]);

  // ✅ Listen for chatbot event and storage changes
  useEffect(() => {
    function onChatReminderCreated() {
      loadFromStorage();
    }

    function onStorage(e) {
      if (e.key === STORAGE_KEY) loadFromStorage();
    }

    window.addEventListener(EVT_CAL_REM, onChatReminderCreated);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(EVT_CAL_REM, onChatReminderCreated);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const grid = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
  const selectedDate = useMemo(() => fromISODate(selectedISO), [selectedISO]);

  // Jump month cursor if selected date is out of month
  useEffect(() => {
    if (!sameMonth(selectedDate, monthCursor)) {
      setMonthCursor(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedISO]);

  const dayReminders = reminders[selectedISO] || [];
  const pending = dayReminders.filter((r) => !r.done);
  const completed = dayReminders.filter((r) => r.done);

  function prevMonth() {
    setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  function openAdd() {
    setNewText("");
    setNewTime("09:00");
    setShowAdd(true);
  }

  function addReminder(e) {
    e.preventDefault();
    const text = newText.trim();
    if (!text) return;

    const item = {
      id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
      text,
      time: String(newTime || "").trim() || "09:00",
      done: false,
      createdAt: Date.now(),
    };

    setReminders((prev) => ({
      ...prev,
      [selectedISO]: [item, ...(prev[selectedISO] || [])],
    }));
    setShowAdd(false);
  }

  function toggleDone(id) {
    setReminders((prev) => {
      const list = prev[selectedISO] || [];
      const updated = list.map((r) => (r.id === id ? { ...r, done: !r.done } : r));
      return { ...prev, [selectedISO]: updated };
    });
  }

  function deleteReminder(id) {
    setReminders((prev) => {
      const list = prev[selectedISO] || [];
      const updated = list.filter((r) => r.id !== id);
      return { ...prev, [selectedISO]: updated };
    });
  }

  return (
    <div className="pageWrap">
      <div className="pageHeaderCard">
        <h1 className="pageTitle">Calendar</h1>
        <p className="pageSubtitle">Manage your reminders, birthdays, and events</p>
      </div>

      <div className="calLayout">
        {/* Left: calendar */}
        <div className="calBoard">
          <div className="calTopRow">
            <div className="calMonth">
              <span className="monthMain">
                {monthCursor.toLocaleString("default", { month: "long" })}
              </span>
              <span className="monthYear">{monthCursor.getFullYear()}</span>
            </div>

            <div className="calNav">
              <button className="calNavBtn" onClick={prevMonth} type="button">
                ← Previous
              </button>
              <button className="calNavBtn" onClick={nextMonth} type="button">
                Next →
              </button>
            </div>
          </div>

          <div className="calWeekdays">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="calWeekday">
                {d}
              </div>
            ))}
          </div>

          <div className="calGrid">
            {grid.map(({ date, inMonth }) => {
              const iso = toISODate(date);
              const isToday = iso === todayISO;
              const active = iso === selectedISO;

              return (
                <button
                  key={iso}
                  type="button"
                  className={[
                    "calCell",
                    active ? "active" : "",
                    isToday ? "today" : "",
                    inMonth ? "" : "dim",
                    (reminders[iso]?.length || 0) > 0 ? "hasItems" : "",
                  ].join(" ")}
                  onClick={() => setSelectedISO(iso)}
                >
                  <div className="calCellNum">{date.getDate()}</div>
                  {(reminders[iso]?.length || 0) > 0 ? <div className="calDot" /> : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: selected day panel */}
        <div className="calSide">
          <div className="calSideCard">
            <div className="calSideTitle">{weekdayName(selectedDate)}</div>
            <div className="calSideDate">{prettyFullDate(selectedDate)}</div>

            <button className="primaryBtn" type="button" onClick={openAdd}>
              + Add Reminder
            </button>

            <div className="calLists">
              <div className="calListBlock">
                <div className="calListHead">
                  Pending <span className="pill">{pending.length}</span>
                </div>

                {pending.length === 0 ? (
                  <div className="mutedText">No pending reminders</div>
                ) : (
                  <div className="calItems">
                    {pending.map((r) => (
                      <div key={r.id} className="calItem">
                        <button className="checkBtn" onClick={() => toggleDone(r.id)} type="button">
                          ✓
                        </button>
                        <div className="calItemText">
                          {r.time ? `${r.time} — ` : ""}
                          {r.text}
                        </div>
                        <button
                          className="trashBtn"
                          onClick={() => deleteReminder(r.id)}
                          type="button"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="calListBlock">
                <div className="calListHead">
                  Completed <span className="pill">{completed.length}</span>
                </div>

                {completed.length === 0 ? (
                  <div className="mutedText">No completed reminders</div>
                ) : (
                  <div className="calItems">
                    {completed.map((r) => (
                      <div key={r.id} className="calItem done">
                        <button className="checkBtn done" onClick={() => toggleDone(r.id)} type="button">
                          ✓
                        </button>
                        <div className="calItemText">
                          {r.time ? `${r.time} — ` : ""}
                          {r.text}
                        </div>
                        <button
                          className="trashBtn"
                          onClick={() => deleteReminder(r.id)}
                          type="button"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Add reminder modal */}
          {showAdd ? (
            <div className="modalOverlay" onClick={() => setShowAdd(false)}>
              <div className="modalCard" onClick={(e) => e.stopPropagation()}>
                <div className="modalTitle">Add Reminder</div>
                <div className="modalSub">{prettyFullDate(selectedDate)}</div>

                <form onSubmit={addReminder} className="modalForm">
                  <input
                    className="input"
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="Reminder text..."
                    autoFocus
                  />

                  <input
                    className="input"
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    aria-label="Select reminder time"
                  />

                  <div className="modalActions">
                    <button className="primaryBtn" type="submit">
                      Add
                    </button>
                    <button className="ghostBtn" type="button" onClick={() => setShowAdd(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
