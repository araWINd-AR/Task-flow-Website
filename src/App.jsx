import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import Layout from "./Layout";
import RequireAuth from "./app/RequireAuth";

import Home from "./pages/Home";
import Calendar from "./pages/Calendar";
import Notes from "./pages/Notes";
import WorkHours from "./pages/WorkHours";
import Goals from "./pages/Goals";
import Habits from "./pages/Habits";
import Focus from "./pages/Focus";
import Analytics from "./pages/Analytics";

import Login from "./pages/Login";
import Register from "./pages/Register";

import ChatBotWidget from "./components/ChatBotWidget";

export default function App() {
  const location = useLocation();

  const hideAI =
    location.pathname === "/login" ||
    location.pathname === "/register";

  return (
    <>
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected app */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Home />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="notes" element={<Notes />} />
          <Route path="work-hours" element={<WorkHours />} />
          <Route path="goals" element={<Goals />} />

          {/* ✅ HABITS */}
          <Route path="habits" element={<Habits />} />

          {/* ✅ Focus / Pomodoro Mode (between Habits and Analytics) */}
          <Route path="focus" element={<Focus />} />

          <Route path="analytics" element={<Analytics />} />
        </Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {!hideAI && <ChatBotWidget />}
    </>
  );
}
