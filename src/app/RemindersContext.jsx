import { createContext, useContext, useEffect, useMemo, useState } from "react";

const RemindersContext = createContext(null);

function pad2(n) {
  return String(n).padStart(2, "0");
}
function todayISODate() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const STORAGE_KEY = "taskflow_reminders_v1";

// ✅ Custom event so other pages (Analytics) can refresh instantly.
// Note: the native "storage" event does NOT fire in the same tab that writes.
export const EVT_REMINDERS_UPDATED = "taskflow_reminders_updated";

export function RemindersProvider({ children }) {
  const [reminders, setReminders] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
    } finally {
      // Always notify listeners, even if storage is blocked.
      window.dispatchEvent(new Event(EVT_REMINDERS_UPDATED));
    }
  }, [reminders]);

  // add reminder for a date
  // Supports BOTH calling styles:
  // 1) addReminder("text", "type", "YYYY-MM-DD")
  // 2) addReminder({ text, type, date })   (older Home code)
  function addReminder(text, type = "Reminder", dateISO = todayISODate()) {
    // handle object input safely
    if (text && typeof text === "object") {
      const obj = text;
      text = obj.text ?? obj.title ?? "";
      type = obj.type ?? type;
      dateISO = obj.date ?? obj.dateISO ?? dateISO;
    }

    const clean = String(text || "").trim();
    if (!clean) return;

    const newReminder = {
      id: crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      text: clean,
      type,
      date: dateISO,     // ✅ stored per date
      handled: false,    // ✅ completed state
      createdAt: Date.now(),
    };

    setReminders((prev) => [newReminder, ...prev]);
  }

  function removeReminder(id) {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }

  function toggleHandled(id) {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, handled: !r.handled } : r))
    );
  }

  function remindersForDate(dateISO) {
    return reminders
      .filter((r) => r.date === dateISO)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  const value = useMemo(
    () => ({
      reminders,
      addReminder,
      removeReminder,
      toggleHandled,
      remindersForDate,
      todayISO: todayISODate(),
    }),
    [reminders]
  );

  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>;
}

export function useReminders() {
  const ctx = useContext(RemindersContext);
  if (!ctx) throw new Error("useReminders must be used inside RemindersProvider");
  return ctx;
}
