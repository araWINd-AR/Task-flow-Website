import { createContext, useContext, useEffect, useMemo, useState } from "react";

const NotesContext = createContext(null);
const STORAGE_KEY = "taskflow_notes_v1";

function safeParse(json, fallback) {
  try {
    return JSON.parse(json) ?? fallback;
  } catch {
    return fallback;
  }
}

export function NotesProvider({ children }) {
  const [notes, setNotes] = useState(() => safeParse(localStorage.getItem(STORAGE_KEY), []));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const addNote = (note) => {
    setNotes((prev) => [
      { ...note, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
      ...prev,
    ]);
  };

  const removeNote = (id) => setNotes((prev) => prev.filter((n) => n.id !== id));

  const value = useMemo(() => ({ notes, addNote, removeNote }), [notes]);

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used inside NotesProvider");
  return ctx;
}
