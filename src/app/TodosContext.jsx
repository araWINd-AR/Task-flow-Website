import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

const TodosContext = createContext(null);

function storageKey(user) {
  const id = user?.email || user?.username || user?.id || "guest";
  return `taskflow:${id}:todos`;
}

export function TodosProvider({ children }) {
  const { user } = useAuth();
  const [todos, setTodos] = useState([]);

  // load
  useEffect(() => {
    const key = storageKey(user);
    try {
      const raw = localStorage.getItem(key);
      setTodos(raw ? JSON.parse(raw) : []);
    } catch {
      setTodos([]);
    }
  }, [user?.email, user?.username, user?.id]);

  // save
  useEffect(() => {
    const key = storageKey(user);
    localStorage.setItem(key, JSON.stringify(todos));
  }, [todos, user]);

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

  const value = useMemo(
    () => ({ todos, addTodo, toggleTodo, deleteTodo }),
    [todos]
  );

  return <TodosContext.Provider value={value}>{children}</TodosContext.Provider>;
}

export function useTodos() {
  const ctx = useContext(TodosContext);
  if (!ctx) throw new Error("useTodos must be used inside TodosProvider");
  return ctx;
}
