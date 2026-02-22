import React, { createContext, useContext, useEffect, useState } from "react";

const HabitsContext = createContext(null);
const LS_KEY = "taskflow_habits_v1";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || [];
  } catch {
    return [];
  }
}

export function HabitsProvider({ children }) {
  const [habits, setHabits] = useState(load);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(habits));
  }, [habits]);

  function addHabit({ title }) {
    setHabits((h) => [
      { id: crypto.randomUUID(), title, completions: [] },
      ...h,
    ]);
  }

  function removeHabit(id) {
    setHabits((h) => h.filter((x) => x.id !== id));
  }

  function toggleToday(id) {
    const today = todayISO();
    setHabits((h) =>
      h.map((x) =>
        x.id !== id
          ? x
          : {
              ...x,
              completions: x.completions.includes(today)
                ? x.completions.filter((d) => d !== today)
                : [...x.completions, today],
            }
      )
    );
  }

  function computeStreak(list = []) {
    let streak = 0;
    const set = new Set(list);
    const d = new Date();

    while (true) {
      const iso = d.toISOString().slice(0, 10);
      if (!set.has(iso)) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  return (
    <HabitsContext.Provider
      value={{ habits, addHabit, removeHabit, toggleToday, computeStreak, todayISO }}
    >
      {children}
    </HabitsContext.Provider>
  );
}

export function useHabits() {
  return useContext(HabitsContext);
}
