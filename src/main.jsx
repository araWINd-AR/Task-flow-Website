import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./styles.css";

import { AuthProvider } from "./app/AuthContext";
import { RemindersProvider } from "./app/RemindersContext";
import { NotesProvider } from "./app/NotesContext";
import { HabitsProvider } from "./app/HabitsContext";
import { GoalsProvider } from "./app/GoalsContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RemindersProvider>
          <NotesProvider>
            <HabitsProvider>
              <GoalsProvider>
                <App />
              </GoalsProvider>
            </HabitsProvider>
          </NotesProvider>
        </RemindersProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
