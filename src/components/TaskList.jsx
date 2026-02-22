import React from "react";

export default function TaskList({ items, onToggle, onRemove, emptyText }) {
  if (!items?.length) {
    return (
      <div style={{ padding: 18, textAlign: "center", opacity: 0.7 }}>
        {emptyText}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10, paddingTop: 12 }}>
      {items.map((t) => (
        <div
          key={t.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "#fff",
          }}
        >
          <input
            type="checkbox"
            checked={!!t.done}
            onChange={() => onToggle(t.id)}
            style={{ width: 18, height: 18 }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, textDecoration: t.done ? "line-through" : "none", opacity: t.done ? 0.55 : 1 }}>
              {t.text}
            </div>
            {t.type ? (
              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>
                {t.type}
              </div>
            ) : null}
          </div>

          <button
            onClick={() => onRemove(t.id)}
            style={{
              border: "1px solid rgba(0,0,0,0.15)",
              background: "#fff",
              borderRadius: 12,
              padding: "8px 10px",
              cursor: "pointer",
              fontWeight: 600,
            }}
            title="Delete"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
