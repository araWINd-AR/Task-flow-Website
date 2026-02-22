import { useMemo, useState } from "react";
import { useNotes } from "../app/NotesContext";

const COLORS = ["#FFF4B8", "#E8F0FF", "#F6E9FF", "#E9FFF1", "#F1F1F1", "#FFEFD9"];

// ✅ NEW: Attractive quotes (related to productivity/notes)
const QUOTES = [
  "Small steps every day lead to big results.",
  "Your future self will thank you for today’s notes.",
  "Focus on progress, not perfection.",
  "Clarity begins with a single note.",
  "Write it down. Make it real.",
  "Discipline beats motivation when motivation fades.",
  "One page at a time — that’s how goals are built.",
  "Notes today, success tomorrow.",
];

export default function Notes() {
  const { notes, addNote, removeNote } = useNotes();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [protect, setProtect] = useState(false);
  const [password, setPassword] = useState("");

  // ✅ NEW: pick a random quote once per load
  const randomQuote = useMemo(() => {
    return QUOTES[Math.floor(Math.random() * QUOTES.length)];
  }, []);

  const reset = () => {
    setTitle("");
    setContent("");
    setColor(COLORS[0]);
    setProtect(false);
    setPassword("");
  };

  const onCreate = () => {
    const t = title.trim();
    const c = content.trim();
    if (!t || !c) return;

    addNote({
      title: t,
      content: c,
      color,
      protect,
      password: protect ? password : "",
    });

    reset();
    setOpen(false);
  };

  return (
    <div className="pageWrap">
      <section className="heroCard">
        <h1 className="heroTitle" style={{ color: "#fff" }}>
          Notes
        </h1>
        <p className="heroSub">Create and manage your notes with optional password protection</p>
      </section>

      <button className="widePrimaryBtn" type="button" onClick={() => setOpen(true)}>
        + Create New Note
      </button>

      {open && (
        <div className="modalOverlay" onClick={() => setOpen(false)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <div className="modalTop">
              <h2>Create New Note</h2>
              <button className="xBtn" type="button" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>

            <label className="label">Title</label>
            <input
              className="input"
              placeholder="Note title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <label className="label">Content</label>
            <textarea
              className="input textarea"
              placeholder="Write your note here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            <label className="label">Color</label>
            <div className="colorRow">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={"colorDot" + (c === color ? " active" : "")}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>

            <div className="divider" />

            <div className="rowBetween">
              <label className="checkRow">
                <input type="checkbox" checked={protect} onChange={(e) => setProtect(e.target.checked)} />
                Protect with Password
              </label>

              {protect && (
                <input
                  className="input"
                  style={{ width: 220 }}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </div>

            <div className="row">
              <button className="primaryBtn" type="button" onClick={onCreate}>
                Create Note
              </button>
              <button
                className="darkBtn"
                type="button"
                onClick={() => {
                  reset();
                  setOpen(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <h2 className="sectionTitle">Your Notes ({notes.length})</h2>

      {notes.length === 0 ? (
        // ✅ UPDATED EMPTY STATE (more attractive, still uses your same card)
        <div
          className="whiteCard emptyBig"
          style={{
            position: "relative",
            overflow: "hidden",
            background:
              "linear-gradient(135deg, rgba(124,92,255,0.18), rgba(255,255,255,0.95), rgba(124,92,255,0.10))",
            border: "1px solid rgba(124,92,255,0.25)",
          }}
        >
          {/* soft glow layer */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at top right, rgba(124,92,255,0.25), transparent 55%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative" }}>
            <div className="plusBig">+</div>

            <div className="muted" style={{ fontSize: 16, marginBottom: 10 }}>
              No notes yet. Create your first note!
            </div>

            {/* ✅ NEW QUOTE */}
            <div
              style={{
                marginTop: 10,
                padding: "14px 16px",
                borderRadius: 14,
                background: "rgba(0,0,0,0.04)",
                border: "1px solid rgba(0,0,0,0.06)",
                maxWidth: 560,
                marginLeft: "auto",
                marginRight: "auto",
                fontStyle: "italic",
                color: "#2b2b2b",
                lineHeight: 1.4,
              }}
            >
              “{randomQuote}”
            </div>

            <div
              style={{
                marginTop: 12,
                fontSize: 13,
                opacity: 0.75,
              }}
            >
              Tip: Use notes to capture tasks, ideas, reminders, and plans — everything becomes easier to manage.
            </div>
          </div>
        </div>
      ) : (
        <div className="notesGrid">
          {notes.map((n) => (
            <div key={n.id} className="noteCard" style={{ background: n.color }}>
              <div className="noteTop">
                <div className="noteTitle">{n.title}</div>
                <button className="dangerBtn" type="button" onClick={() => removeNote(n.id)}>
                  Delete
                </button>
              </div>
              <div className="noteBody">{n.content}</div>
              {n.protect && <div className="noteTag">Protected</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
