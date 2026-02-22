import { useState } from "react";
import { useGoals } from "../app/GoalsContext";

export default function Goals() {
  const { goals, addGoal, removeGoal } = useGoals();

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [targetValue, setTargetValue] = useState(10);
  const [unit, setUnit] = useState("tasks");
  const [category, setCategory] = useState("Productivity");
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  const onCreate = () => {
    const t = title.trim();
    if (!t) return;

    addGoal({
      title: t,
      desc: desc.trim(),
      targetValue: Number(targetValue) || 0,
      unit: unit.trim() || "tasks",
      category,
      targetDate,
    });

    setTitle("");
    setDesc("");
  };

  return (
    <div className="pageWrap">
      <section className="heroCard">
        <h1 className="heroTitle">Goals & Objectives</h1>
        <p className="heroSub">Set, track, and achieve your goals</p>
      </section>

      <div className="whiteCard">
        <h2 className="mutedTitle">Create New Goal</h2>

        <label className="label">Goal Title</label>
        <input
          className="input"
          placeholder="e.g., Read 12 books"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="label">Description (Optional)</label>
        <textarea
          className="input textarea"
          placeholder="Add notes about your goal..."
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />

        <div className="row">
          <div style={{ flex: 1 }}>
            <label className="label">Target Value</label>
            <input
              className="input"
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label className="label">Unit</label>
            <input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
        </div>

        <div className="row">
          <div style={{ flex: 1 }}>
            <label className="label">Category</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>Productivity</option>
              <option>Health</option>
              <option>Finance</option>
              <option>Study</option>
              <option>Personal</option>
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label className="label">Target Date</label>
            <input className="input" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
        </div>

        <div className="row">
          <button className="primaryBtn" type="button" onClick={onCreate}>
            Create Goal
          </button>
          <button className="darkBtn" type="button" onClick={() => { setTitle(""); setDesc(""); }}>
            Cancel
          </button>
        </div>
      </div>

      <h2 className="sectionTitle">Your Goals ({goals.length})</h2>

      {goals.length === 0 ? (
        <div className="whiteCard emptyBig">
          <div className="muted">No goals yet.</div>
          <div className="mutedSmall">Set your first goal to start tracking your progress!</div>
        </div>
      ) : (
        <div className="notesGrid">
          {goals.map((g) => (
            <div className="whiteCard" key={g.id}>
              <div className="rowBetween">
                <div>
                  <div className="listTitle">{g.title}</div>
                  <div className="listSub">
                    {g.category} • Target: {g.targetValue} {g.unit} • Due: {g.targetDate}
                  </div>
                </div>
                <button className="dangerBtn" type="button" onClick={() => removeGoal(g.id)}>
                  Delete
                </button>
              </div>
              {g.desc ? <div style={{ marginTop: 10 }}>{g.desc}</div> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
