import React, { useMemo } from "react";

const QUOTES = [
  "Small steps every day lead to big results.",
  "Your future self will thank you for today’s work.",
  "Focus on progress, not perfection.",
  "Organize your thoughts. Productivity follows.",
  "Write it down. Make it real.",
  "Clarity begins with a single note.",
];

export default function EmptyState({ title = "Nothing here yet" }) {
  const quote = useMemo(() => {
    return QUOTES[Math.floor(Math.random() * QUOTES.length)];
  }, []);

  return (
    <div className="tf-empty-wrap">
      <div className="tf-empty-card">
        <h2>{title}</h2>
        <p className="tf-empty-quote">“{quote}”</p>
        <span className="tf-empty-hint">
          Start by adding something new ✨
        </span>
      </div>
    </div>
  );
}
