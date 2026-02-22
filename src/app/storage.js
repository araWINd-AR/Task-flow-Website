const APP_KEY = "taskflow";

function getUserKey(user) {
  const id = user?.email || user?.id || user?.username || "guest";
  return `${APP_KEY}:${id}`;
}

function safeParse(str, fallback) {
  try {
    return JSON.parse(str) ?? fallback;
  } catch {
    return fallback;
  }
}

export function loadTodos(user) {
  const key = `${getUserKey(user)}:todos`;
  return safeParse(localStorage.getItem(key), []);
}

export function saveTodos(user, todos) {
  const key = `${getUserKey(user)}:todos`;
  localStorage.setItem(key, JSON.stringify(todos));
}

export function loadReminders(user) {
  const key = `${getUserKey(user)}:reminders`;
  return safeParse(localStorage.getItem(key), []);
}

export function saveReminders(user, reminders) {
  const key = `${getUserKey(user)}:reminders`;
  localStorage.setItem(key, JSON.stringify(reminders));
}
