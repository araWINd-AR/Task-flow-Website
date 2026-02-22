import { createContext, useContext, useEffect, useMemo, useState } from "react";

const GoalsContext = createContext(null);
const STORAGE_KEY = "taskflow_goals_v1";

function safeParse(json, fallback) {
  try {
    return JSON.parse(json) ?? fallback;
  } catch {
    return fallback;
  }
}

export function GoalsProvider({ children }) {
  const [goals, setGoals] = useState(() => safeParse(localStorage.getItem(STORAGE_KEY), []));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  }, [goals]);

  const addGoal = (goal) => {
    setGoals((prev) => [
      { ...goal, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
      ...prev,
    ]);
  };

  const removeGoal = (id) => setGoals((prev) => prev.filter((g) => g.id !== id));

  const value = useMemo(() => ({ goals, addGoal, removeGoal }), [goals]);

  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>;
}

export function useGoals() {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error("useGoals must be used inside GoalsProvider");
  return ctx;
}
