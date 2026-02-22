import { useState } from "react";

export default function TaskForm({ onAdd }) {
  const [text, setText] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    onAdd(trimmed);
    setText("");
  }

  return (
    <form className="mini-form" onSubmit={handleSubmit}>
      <input
        className="mini-input"
        placeholder="Add a new todo..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="mini-actions">
        <button className="mini-btn primary" type="submit">
          Add
        </button>
        <button
          className="mini-btn"
          type="button"
          onClick={() => setText("")}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
