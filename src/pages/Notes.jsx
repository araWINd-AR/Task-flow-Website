import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNotes } from "../app/NotesContext";
import "./notes.css";

const NOTE_COLORS = [
  "#fff3d2",
  "#eaf1ff",
  "#f6e8ff",
  "#e9fff4",
  "#ffe6ef",
  "#eefbff",
  "#f7f7fb",
  "#ffeedd",
];

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function shortText(value, max = 220) {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

function toImportPayload(raw) {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.notes)) return parsed.notes;
  return [];
}

function EmptyState({ onCreate }) {
  return (
    <div className="tfnotes-empty-card">
      <div className="tfnotes-empty-plus">＋</div>
      <div className="tfnotes-empty-text">No notes yet. Create your first note!</div>
      <button className="tfnotes-empty-btn" type="button" onClick={onCreate}>
        Create Note
      </button>
    </div>
  );
}

function NoSearchResults({ onClear }) {
  return (
    <div className="tfnotes-empty-card tfnotes-empty-small">
      <div className="tfnotes-empty-plus">⌕</div>
      <div className="tfnotes-empty-text">No notes match your search.</div>
      <button className="tfnotes-empty-btn" type="button" onClick={onClear}>
        Clear Search
      </button>
    </div>
  );
}

export default function Notes() {
  const { notes, addNote, updateNote, removeNote, importNotes, clearAllNotes } = useNotes();

  const fileInputRef = useRef(null);
  const searchInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("notes");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState(NOTE_COLORS[2]);
  const [protect, setProtect] = useState(false);
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [unlockValues, setUnlockValues] = useState({});
  const [unlockedMap, setUnlockedMap] = useState({});
  const [revealMap, setRevealMap] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setSearch("");

    const clearAutofill = () => {
      setSearch("");
      if (searchInputRef.current) {
        searchInputRef.current.value = "";
      }
    };

    const t1 = setTimeout(clearAutofill, 60);
    const t2 = setTimeout(clearAutofill, 250);
    const t3 = setTimeout(clearAutofill, 700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const protectedNotes = useMemo(() => notes.filter((item) => item.protect), [notes]);

  const sortedNotes = useMemo(() => {
    const query = String(search || "").trim().toLowerCase();

    return [...notes]
      .sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      })
      .filter((note) => {
        if (!query) return true;
        return [note.title, note.content].some((field) =>
          String(field || "").toLowerCase().includes(query)
        );
      });
  }, [notes, search]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setContent("");
    setColor(NOTE_COLORS[2]);
    setProtect(false);
    setPassword("");
  }

  function openCreateModal() {
    resetForm();
    setError("");
    setMessage("");
    setIsModalOpen(true);
  }

  function openEditModal(note) {
    setEditingId(note.id);
    setTitle(note.title || "");
    setContent(note.content || "");
    setColor(note.color || NOTE_COLORS[2]);
    setProtect(Boolean(note.protect));
    setPassword(note.password || "");
    setError("");
    setMessage("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    resetForm();
  }

  function handleSaveNote() {
    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    setError("");
    setMessage("");

    if (!cleanTitle || !cleanContent) {
      setError("Title and content are required.");
      return;
    }

    if (protect && !password.trim()) {
      setError("Enter a password for the protected note.");
      return;
    }

    const payload = {
      title: cleanTitle,
      content: cleanContent,
      color,
      protect,
      password: protect ? password.trim() : "",
    };

    if (editingId) {
      updateNote(editingId, payload);
      setMessage("Note updated successfully.");
    } else {
      addNote({ ...payload, favorite: false });
      setMessage("Note created successfully.");
    }

    setSearch("");
    setActiveTab("notes");
    closeModal();
  }

  async function handleImportChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setError("");
    setMessage("");

    try {
      const raw = await file.text();
      const payload = toImportPayload(raw);
      const addedCount = importNotes(payload);

      if (!addedCount) {
        setError("No valid notes were found in that file.");
        return;
      }

      setSearch("");
      setActiveTab("notes");
      setMessage(`${addedCount} note${addedCount > 1 ? "s" : ""} imported successfully.`);
    } catch {
      setError("Import failed. Use a JSON file exported as an array or { notes: [...] }.");
    }
  }

  function handleExportNotes() {
    try {
      const payload = JSON.stringify({ notes }, null, 2);
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "taskflow-notes-export.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("Notes exported successfully.");
      setError("");
    } catch {
      setError("Export failed in this browser.");
    }
  }

  function handleUnlock(note) {
    const candidate = String(unlockValues[note.id] || "");
    if (candidate === note.password) {
      setUnlockedMap((prev) => ({ ...prev, [note.id]: true }));
      setError("");
      return;
    }
    setError(`Wrong password for "${note.title}".`);
  }

  function handleToggleFavorite(note) {
    updateNote(note.id, { favorite: !note.favorite });
  }

  function handleRemoveProtection(note) {
    updateNote(note.id, { protect: false, password: "" });
    setUnlockedMap((prev) => ({ ...prev, [note.id]: true }));
    setMessage(`Protection removed from ${note.title}.`);
    setError("");
  }

  async function handleCopy(text) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copied to clipboard.");
      setError("");
    } catch {
      setError("Copy failed in this browser.");
    }
  }

  return (
    <div className="tfnotes-page-bleed">
      <div className="tfnotes-page">
        <section className="tfnotes-hero">
          <h1>Notes</h1>
          <p>Create and manage your notes with optional password protection</p>
        </section>

        <div className="tfnotes-actions-row">
          <button className="tfnotes-btn tfnotes-btn-primary" type="button" onClick={openCreateModal}>
            <span className="tfnotes-btn-icon">＋</span>
            Create New Note
          </button>

          <button className="tfnotes-btn tfnotes-btn-secondary" type="button" onClick={handleExportNotes}>
            <span className="tfnotes-btn-icon">⇩</span>
            Export Notes
          </button>

          <button
            className="tfnotes-btn tfnotes-btn-import"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="tfnotes-btn-icon">＋</span>
            Import Notes
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={handleImportChange}
          />
        </div>

        {(message || error) && (
          <div className={`tfnotes-banner ${error ? "error" : "success"}`}>
            {error || message}
          </div>
        )}

        <div className="tfnotes-tab-bar">
          <button
            type="button"
            className={`tfnotes-tab ${activeTab === "notes" ? "active" : ""}`}
            onClick={() => setActiveTab("notes")}
          >
            📝 Notes
          </button>
          <button
            type="button"
            className={`tfnotes-tab ${activeTab === "passwords" ? "active" : ""}`}
            onClick={() => setActiveTab("passwords")}
          >
            🔐 Password Manager
          </button>
        </div>

        {activeTab === "notes" ? (
          <section className="tfnotes-section">
            <div className="tfnotes-section-head">
              <h2>
                📝 Notes {search.trim() ? `(${sortedNotes.length}/${notes.length})` : `(${notes.length})`}
              </h2>

              <div className="tfnotes-search-wrap">
                <span className="tfnotes-search-icon">⌕</span>

                <input
                  ref={searchInputRef}
                  className="tfnotes-search-input"
                  type="search"
                  inputMode="search"
                  placeholder="Search notes by title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  name="taskflow-notes-search"
                  data-form-type="other"
                  data-lpignore="true"
                />

                {search.trim() && (
                  <button
                    type="button"
                    className="tfnotes-search-clear"
                    onClick={() => {
                      setSearch("");
                      if (searchInputRef.current) {
                        searchInputRef.current.focus();
                      }
                    }}
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {notes.length === 0 ? (
              <EmptyState onCreate={openCreateModal} />
            ) : sortedNotes.length === 0 ? (
              <NoSearchResults
                onClear={() => {
                  setSearch("");
                  if (searchInputRef.current) {
                    searchInputRef.current.focus();
                  }
                }}
              />
            ) : (
              <div className="tfnotes-grid">
                {sortedNotes.map((note) => {
                  const isUnlocked = !note.protect || unlockedMap[note.id];

                  return (
                    <article key={note.id} className="tfnote-card" style={{ background: note.color }}>
                      <div className="tfnote-card-top">
                        <div className="tfnote-card-title-wrap">
                          <h3>{note.title}</h3>
                          <div className="tfnote-card-meta">{formatDateTime(note.updatedAt)}</div>
                        </div>

                        <div className="tfnote-card-actions">
                          {note.protect && (
                            <span className="tfnote-icon-badge" title="Protected">
                              🔒
                            </span>
                          )}

                          <button
                            type="button"
                            className="tfnote-icon-btn"
                            title="Edit"
                            onClick={() => openEditModal(note)}
                          >
                            ✎
                          </button>

                          <button
                            type="button"
                            className="tfnote-icon-btn tfnote-icon-btn-danger"
                            title="Delete"
                            onClick={() => removeNote(note.id)}
                          >
                            🗑
                          </button>
                        </div>
                      </div>

                      {note.favorite && <div className="tfnote-pin">★ Pinned</div>}

                      {isUnlocked ? (
                        <div className="tfnote-card-body">{shortText(note.content, 260) || "No content"}</div>
                      ) : (
                        <div className="tfnote-lock-box">
                          <div className="tfnote-lock-text">This note is password protected.</div>
                          <div className="tfnote-lock-row">
                            <input
                              className="tfnotes-dark-input"
                              type="password"
                              placeholder="Enter password"
                              value={unlockValues[note.id] || ""}
                              onChange={(e) =>
                                setUnlockValues((prev) => ({
                                  ...prev,
                                  [note.id]: e.target.value,
                                }))
                              }
                            />
                            <button
                              type="button"
                              className="tfnotes-inline-btn"
                              onClick={() => handleUnlock(note)}
                            >
                              Unlock
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="tfnote-footer-actions">
                        <button
                          type="button"
                          className="tfnotes-text-btn"
                          onClick={() => handleToggleFavorite(note)}
                        >
                          {note.favorite ? "Unpin" : "Pin"}
                        </button>

                        <button
                          type="button"
                          className="tfnotes-text-btn"
                          onClick={() => handleCopy(note.content || "")}
                        >
                          Copy
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section className="tfnotes-section">
            <div className="tfnotes-section-head tfnotes-manager-head">
              <h2>🔐 Password Manager</h2>

              {protectedNotes.length > 0 && (
                <button className="tfnotes-clear-btn" type="button" onClick={clearAllNotes}>
                  Clear All Notes
                </button>
              )}
            </div>

            {protectedNotes.length === 0 ? (
              <div className="tfnotes-empty-card tfnotes-empty-small">
                <div className="tfnotes-empty-plus">🔐</div>
                <div className="tfnotes-empty-text">No protected notes yet.</div>
              </div>
            ) : (
              <div className="tfnotes-manager-list">
                {protectedNotes.map((note) => {
                  const reveal = revealMap[note.id];

                  return (
                    <div key={note.id} className="tfnotes-manager-row">
                      <div className="tfnotes-manager-meta">
                        <div className="tfnotes-manager-title">{note.title}</div>
                        <div className="tfnotes-manager-sub">
                          Updated {formatDateTime(note.updatedAt)}
                        </div>
                      </div>

                      <div className="tfnotes-manager-password-wrap">
                        <input
                          className="tfnotes-dark-input"
                          readOnly
                          type={reveal ? "text" : "password"}
                          value={note.password || ""}
                        />

                        <button
                          type="button"
                          className="tfnotes-inline-btn tfnotes-inline-btn-muted"
                          onClick={() =>
                            setRevealMap((prev) => ({ ...prev, [note.id]: !prev[note.id] }))
                          }
                        >
                          {reveal ? "Hide" : "Show"}
                        </button>

                        <button
                          type="button"
                          className="tfnotes-inline-btn"
                          onClick={() => handleCopy(note.password || "")}
                        >
                          Copy
                        </button>

                        <button
                          type="button"
                          className="tfnotes-inline-btn tfnotes-inline-btn-danger"
                          onClick={() => handleRemoveProtection(note)}
                        >
                          Remove Protection
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {isModalOpen && (
        <div className="tfnotes-modal-overlay" onClick={closeModal}>
          <div className="tfnotes-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="tfnotes-modal-head">
              <div>
                <h3>{editingId ? "Edit Note" : "Create New Note"}</h3>
                <p>Save ideas, reminders, and quick thoughts in one place.</p>
              </div>

              <button type="button" className="tfnotes-close-btn" onClick={closeModal}>
                ×
              </button>
            </div>

            <div className="tfnotes-form-grid">
              <label className="tfnotes-field">
                <span>Title</span>
                <input
                  className="tfnotes-dark-input"
                  placeholder="e.g. Meeting summary"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoComplete="off"
                />
              </label>

              <label className="tfnotes-field">
                <span>Content</span>
                <textarea
                  className="tfnotes-dark-input tfnotes-textarea"
                  placeholder="Write your note here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </label>

              <div className="tfnotes-field">
                <span>Note Color</span>
                <div className="tfnotes-color-row">
                  {NOTE_COLORS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`tfnotes-color-swatch ${color === item ? "active" : ""}`}
                      style={{ background: item }}
                      onClick={() => setColor(item)}
                    />
                  ))}
                </div>
              </div>

              <div className="tfnotes-protect-row">
                <label className="tfnotes-check">
                  <input
                    type="checkbox"
                    checked={protect}
                    onChange={(e) => setProtect(e.target.checked)}
                  />
                  <span>Protect with password</span>
                </label>

                {protect && (
                  <input
                    className="tfnotes-dark-input"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                )}
              </div>
            </div>

            <div className="tfnotes-modal-actions">
              <button className="tfnotes-btn tfnotes-btn-primary" type="button" onClick={handleSaveNote}>
                {editingId ? "Save Changes" : "Create Note"}
              </button>

              <button className="tfnotes-btn tfnotes-btn-cancel" type="button" onClick={closeModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}