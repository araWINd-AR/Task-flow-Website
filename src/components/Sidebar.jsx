import { NavLink } from "react-router-dom";

const linkClass = ({ isActive }) => "sideLink" + (isActive ? " active" : "");

export default function Sidebar() {
  return (
    <aside className="sideBar">
      <div className="sideGroup">
        <NavLink to="/dashboard" className={linkClass}>
          Home
        </NavLink>

        <NavLink to="/calendar" className={linkClass}>
          Calendar
        </NavLink>

        <NavLink to="/notes" className={linkClass}>
          Notes
        </NavLink>

        <NavLink to="/work-hours" className={linkClass}>
          Work Hours
        </NavLink>

        <NavLink to="/goals" className={linkClass}>
          Goals
        </NavLink>

        <NavLink to="/habits" className={linkClass}>
          Habits
        </NavLink>

        {/* ✅ NEW: Focus / Pomodoro Mode */}
        <NavLink to="/focus" className={linkClass}>
          Focus
        </NavLink>

        <NavLink to="/analytics" className={linkClass}>
          Analytics
        </NavLink>
      </div>
    </aside>
  );
}
