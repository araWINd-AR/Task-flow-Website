import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loadReminders, loadTodos, saveReminders, saveTodos } from "./storage";

// Replace this with your real AuthContext if you already have it
function useFakeAuth() {
  return { user: { username: "ar" } };
}

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const { user } = useFakeAuth();

  const [todos, setTodos] = useState([]);
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    setTodos(loadTodos(user));
    setReminders(loadReminders(user));
  }, [user?.email, user?.id, user?.username]);

  useEffect(() => {
    saveTodos(user, todos);
  }, [todos, user]);

  useEffect(() => {
    saveReminders(user, reminders);
  }, [reminders, user]);

  // ===== TODOS =====
  function addTodo(text) {
    const t = (text || "").trim();
    if (!t) return;

    setTodos((prev) => [
      {
        id: crypto.randomUUID(),
        text: t,
        done: false,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  }

  function toggleTodo(id) {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }

  function deleteTodo(id) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  // ===== REMINDERS =====
  function addReminder({ date, title, time, notes }) {
    const t = (title || "").trim();
    if (!date || !t) return;

    setReminders((prev) => [
      {
        id: crypto.randomUUID(),
        date,
        title: t,
        time: (time || "09:00").trim(),
        notes: (notes || "").trim(),
        done: false,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  }

  function toggleReminder(id) {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, done: !r.done } : r))
    );
  }

  function deleteReminder(id) {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }

  const value = useMemo(
    () => ({
      user,
      todos,
      reminders,
      addTodo,
      toggleTodo,
      deleteTodo,
      addReminder,
      toggleReminder,
      deleteReminder,
    }),
    [user, todos, reminders]
  );

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used inside AppDataProvider");
  return ctx;
}
