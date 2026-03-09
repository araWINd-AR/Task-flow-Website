import { createContext, useContext, useEffect, useMemo, useState } from "react";

const NotesContext = createContext(null);
const STORAGE_KEY = "taskflow_notes_v2";

function safeParse(json, fallback) {
  try {
    return JSON.parse(json) ?? fallback;
  } catch {
    return fallback;
  }
}

function uid(prefix = "note") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeNote(note) {
  const createdAt = note?.createdAt || new Date().toISOString();
  const updatedAt = note?.updatedAt || createdAt;
  const protect = Boolean(note?.protect);

  return {
    id: note?.id || uid(),
    title: String(note?.title || "Untitled Note").trim() || "Untitled Note",
    content: String(note?.content || "").trim(),
    color: note?.color || "#f7f1ff",
    protect,
    password: protect ? String(note?.password || "") : "",
    favorite: Boolean(note?.favorite),
    createdAt,
    updatedAt,
  };
}

export function NotesProvider({ children }) {
  const [notes, setNotes] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = safeParse(raw, []);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeNote);
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const addNote = (note) => {
    setNotes((prev) => [normalizeNote(note), ...prev]);
  };

  const updateNote = (id, patch) => {
    setNotes((prev) =>
      prev.map((item) =>
        item.id === id
          ? normalizeNote({
              ...item,
              ...patch,
              id: item.id,
              createdAt: item.createdAt,
              updatedAt: new Date().toISOString(),
            })
          : item
      )
    );
  };

  const removeNote = (id) => {
    setNotes((prev) => prev.filter((item) => item.id !== id));
  };

  const importNotes = (incoming) => {
    if (!Array.isArray(incoming)) return 0;

    const normalizedIncoming = incoming
      .filter((item) => item && (item.title || item.content))
      .map((item) =>
        normalizeNote({
          ...item,
          id: uid("imported_note"),
          createdAt: item?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      );

    if (normalizedIncoming.length === 0) return 0;

    setNotes((prev) => [...normalizedIncoming, ...prev]);
    return normalizedIncoming.length;
  };

  const clearAllNotes = () => setNotes([]);

  const value = useMemo(
    () => ({
      notes,
      addNote,
      updateNote,
      removeNote,
      importNotes,
      clearAllNotes,
    }),
    [notes]
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used inside NotesProvider");
  return ctx;
}
