import React, { useMemo, useState } from "react";
import { useAuth } from "../app/AuthContext";
import { buildEmailReport, openMailClient, readTaskFlowData } from "../utils/emailExport";

/**
 * FIX:
 * - WorkHours totals come from React state (sessions/expenses) via dataOverride
 * - Goals/Todos/Reminders should come from storage (unless also overridden)
 * - Report must include whichever checkboxes are selected
 *
 * NOTE: UI layout unchanged. Only data + report selection logic updated.
 */
export default function EmailExportModal({ open, onClose, dataOverride }) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [sections, setSections] = useState({
    workHours: true,
    earnings: true,
    expenses: false,
    goals: false,
    todos: false,
    reminders: false,
  });

  // ✅ Merge: localStorage data + live state override
  const data = useMemo(() => {
    const base = readTaskFlowData(user);

    const overrideSessions = Array.isArray(dataOverride?.workSessions)
      ? dataOverride.workSessions
      : null;

    const overrideExpenses = Array.isArray(dataOverride?.expenses) ? dataOverride.expenses : null;

    const overrideGoals = Array.isArray(dataOverride?.goals) ? dataOverride.goals : null;
    const overrideTodos = Array.isArray(dataOverride?.todos) ? dataOverride.todos : null;
    const overrideReminders = Array.isArray(dataOverride?.reminders) ? dataOverride.reminders : null;

    return {
      workSessions: overrideSessions ?? base.workSessions ?? [],
      expenses: overrideExpenses ?? base.expenses ?? [],
      goals: overrideGoals ?? base.goals ?? [],
      todos: overrideTodos ?? base.todos ?? [],
      reminders: overrideReminders ?? base.reminders ?? [],
    };
  }, [dataOverride, user]);

  if (!open) return null;

  function toggle(key) {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function send() {
    const toEmail = email.trim();
    if (!toEmail) {
      alert("Please enter an email address.");
      return;
    }

    const report = buildEmailReport({
      userName: user?.name || user?.username || user?.email || "guest",
      sections,
      data,
    });

    const subject = `TaskFlow Export - ${
      user?.name || user?.username || user?.email || "guest"
    } - ${new Date().toLocaleDateString()}`;

    openMailClient({ toEmail, subject, body: report });
  }

  return (
    <div className="tf-modal-backdrop" onMouseDown={onClose}>
      <div className="tf-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="tf-modal-header">
          <div>
            <div className="tf-modal-title">Export to Email</div>
            <div className="tf-modal-sub">Choose what you want to send</div>
          </div>
          <button className="tf-modal-close" onClick={onClose} title="Close">
            ×
          </button>
        </div>

        <div className="tf-modal-body">
          <label className="tf-field-label">Email address</label>
          <input
            className="tf-field-input"
            placeholder="example@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="tf-sectionTitle">Select sections</div>

          <div className="tf-checkGrid">
            <label className="tf-check">
              <input
                type="checkbox"
                checked={sections.workHours}
                onChange={() => toggle("workHours")}
              />
              <span>Work Hours</span>
            </label>

            <label className="tf-check">
              <input
                type="checkbox"
                checked={sections.earnings}
                onChange={() => toggle("earnings")}
              />
              <span>Earnings</span>
            </label>

            <label className="tf-check">
              <input
                type="checkbox"
                checked={sections.expenses}
                onChange={() => toggle("expenses")}
              />
              <span>Expenses</span>
            </label>

            <label className="tf-check">
              <input type="checkbox" checked={sections.goals} onChange={() => toggle("goals")} />
              <span>Goals</span>
            </label>

            <label className="tf-check">
              <input type="checkbox" checked={sections.todos} onChange={() => toggle("todos")} />
              <span>Todos</span>
            </label>

            <label className="tf-check">
              <input
                type="checkbox"
                checked={sections.reminders}
                onChange={() => toggle("reminders")}
              />
              <span>Reminders</span>
            </label>
          </div>

          <div className="tf-hint">
            Note: This opens your email app with the report prefilled. For “auto-send”, you need a
            backend (or EmailJS).
          </div>
        </div>

        <div className="tf-modal-footer">
          <button className="tf-btn tf-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="tf-btn tf-btn-primary" onClick={send}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
