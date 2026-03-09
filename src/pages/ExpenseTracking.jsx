import React, { useEffect, useMemo, useState } from "react";
import "./expense-tracking.css";

const LS_KEYS = {
  income: "taskflow_et_income_v1",
  expenses: "taskflow_et_expenses_v1",
  investments: "taskflow_et_investments_v1",
  splitFriends: "taskflow_et_split_friends_v1",
  splitGroups: "taskflow_et_split_groups_v1",
  splitExpenses: "taskflow_et_split_expenses_v1",
};

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeName(value, fallback = "Unknown") {
  const text = String(value || "").trim();
  return text || fallback;
}

function getTopExpenses(expenses = [], limit = 5) {
  return [...expenses]
    .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
    .slice(0, limit);
}

function getFriendSpend(splitExpenses = [], friends = []) {
  const friendMap = new Map(
    friends.map((f) => [String(f.id), normalizeName(f.name, "Unknown")])
  );

  const totals = new Map();

  splitExpenses.forEach((item) => {
    const payerId = String(item.paidBy || "");
    const label =
      friendMap.get(payerId) ||
      normalizeName(item.paidByName || item.friendName || payerId, "Unknown");

    totals.set(label, (totals.get(label) || 0) + Number(item.amount || 0));
  });

  return [...totals.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function getCategorySpend(expenses = []) {
  const totals = new Map();

  expenses.forEach((item) => {
    const key = normalizeName(item.category, "Other");
    totals.set(key, (totals.get(key) || 0) + Number(item.amount || 0));
  });

  return [...totals.entries()]
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function getExpenseTrend(expenses = []) {
  const totals = new Map();

  expenses.forEach((item) => {
    const key = item.date || todayISO();
    totals.set(key, (totals.get(key) || 0) + Number(item.amount || 0));
  });

  return [...totals.entries()]
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => new Date(a.label) - new Date(b.label))
    .slice(-7);
}

export default function ExpenseTracking() {
  const [mainTab, setMainTab] = useState("dashboard");
  const [splitTab, setSplitTab] = useState("analysis");

  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [splitFriends, setSplitFriends] = useState([]);
  const [splitGroups, setSplitGroups] = useState([]);
  const [splitExpenses, setSplitExpenses] = useState([]);

  const [search, setSearch] = useState("");

  const [incomeForm, setIncomeForm] = useState({
    title: "",
    description: "",
    amount: "",
    date: todayISO(),
  });

  const [expenseForm, setExpenseForm] = useState({
    title: "",
    category: "Food",
    description: "",
    amount: "",
    date: todayISO(),
  });

  const [investmentForm, setInvestmentForm] = useState({
    title: "",
    type: "Stocks",
    description: "",
    amount: "",
    date: todayISO(),
  });

  const [friendForm, setFriendForm] = useState({
    name: "",
    email: "",
  });

  const [groupForm, setGroupForm] = useState({
    name: "",
    members: [],
  });

  const [splitExpenseForm, setSplitExpenseForm] = useState({
    title: "",
    amount: "",
    category: "Food",
    paidBy: "",
    groupId: "",
    date: todayISO(),
    members: [],
    notes: "",
  });

  useEffect(() => {
    setIncome(safeParse(localStorage.getItem(LS_KEYS.income), []));
    setExpenses(safeParse(localStorage.getItem(LS_KEYS.expenses), []));
    setInvestments(safeParse(localStorage.getItem(LS_KEYS.investments), []));
    setSplitFriends(safeParse(localStorage.getItem(LS_KEYS.splitFriends), []));
    setSplitGroups(safeParse(localStorage.getItem(LS_KEYS.splitGroups), []));
    setSplitExpenses(safeParse(localStorage.getItem(LS_KEYS.splitExpenses), []));
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.income, JSON.stringify(income));
  }, [income]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.expenses, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.investments, JSON.stringify(investments));
  }, [investments]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.splitFriends, JSON.stringify(splitFriends));
  }, [splitFriends]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.splitGroups, JSON.stringify(splitGroups));
  }, [splitGroups]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.splitExpenses, JSON.stringify(splitExpenses));
  }, [splitExpenses]);

  const totalIncome = useMemo(
    () => income.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [income]
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [expenses]
  );

  const totalInvestments = useMemo(
    () => investments.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [investments]
  );

  const netAmount = totalIncome - totalExpenses - totalInvestments;

  const filteredIncome = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return income;
    return income.filter((item) =>
      [item.title, item.description, item.date].some((x) =>
        String(x || "").toLowerCase().includes(q)
      )
    );
  }, [income, search]);

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter((item) =>
      [item.title, item.description, item.category, item.date].some((x) =>
        String(x || "").toLowerCase().includes(q)
      )
    );
  }, [expenses, search]);

  const filteredInvestments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return investments;
    return investments.filter((item) =>
      [item.title, item.description, item.type, item.date].some((x) =>
        String(x || "").toLowerCase().includes(q)
      )
    );
  }, [investments, search]);

  const filteredFriends = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return splitFriends;
    return splitFriends.filter((item) =>
      [item.name, item.email].some((x) =>
        String(x || "").toLowerCase().includes(q)
      )
    );
  }, [splitFriends, search]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return splitGroups;
    return splitGroups.filter((item) =>
      String(item.name || "").toLowerCase().includes(q)
    );
  }, [splitGroups, search]);

  const filteredSplitExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return splitExpenses;
    return splitExpenses.filter((item) =>
      [item.title, item.notes, item.category, item.date].some((x) =>
        String(x || "").toLowerCase().includes(q)
      )
    );
  }, [splitExpenses, search]);

  const splitTotalSpent = useMemo(
    () => splitExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [splitExpenses]
  );

  const splitAverageExpense = splitExpenses.length
    ? splitTotalSpent / splitExpenses.length
    : 0;

  const splitHighestExpense = splitExpenses.length
    ? Math.max(...splitExpenses.map((item) => Number(item.amount || 0)))
    : 0;

  const splitSettled = useMemo(
    () =>
      splitExpenses
        .filter((item) => item.settled)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [splitExpenses]
  );

  const expenseTrend = useMemo(() => getExpenseTrend(splitExpenses), [splitExpenses]);
  const spendingByCategory = useMemo(
    () => getCategorySpend(splitExpenses),
    [splitExpenses]
  );
  const topExpenses = useMemo(() => getTopExpenses(splitExpenses, 5), [splitExpenses]);
  const spendingByFriend = useMemo(
    () => getFriendSpend(splitExpenses, splitFriends),
    [splitExpenses, splitFriends]
  );

  const trendMax = Math.max(1, ...expenseTrend.map((x) => x.amount || 0));
  const categoryMax = Math.max(1, ...spendingByCategory.map((x) => x.amount || 0));
  const friendMax = Math.max(1, ...spendingByFriend.map((x) => x.amount || 0));

  function addIncome() {
    if (!incomeForm.title.trim() || !Number(incomeForm.amount)) return;

    setIncome((prev) => [
      {
        id: uid(),
        ...incomeForm,
        amount: Number(incomeForm.amount),
      },
      ...prev,
    ]);

    setIncomeForm({
      title: "",
      description: "",
      amount: "",
      date: todayISO(),
    });
  }

  function addExpense() {
    if (!expenseForm.title.trim() || !Number(expenseForm.amount)) return;

    setExpenses((prev) => [
      {
        id: uid(),
        ...expenseForm,
        amount: Number(expenseForm.amount),
      },
      ...prev,
    ]);

    setExpenseForm({
      title: "",
      category: "Food",
      description: "",
      amount: "",
      date: todayISO(),
    });
  }

  function addInvestment() {
    if (!investmentForm.title.trim() || !Number(investmentForm.amount)) return;

    setInvestments((prev) => [
      {
        id: uid(),
        ...investmentForm,
        amount: Number(investmentForm.amount),
      },
      ...prev,
    ]);

    setInvestmentForm({
      title: "",
      type: "Stocks",
      description: "",
      amount: "",
      date: todayISO(),
    });
  }

  function addFriend() {
    if (!friendForm.name.trim()) return;

    const friend = {
      id: uid(),
      name: friendForm.name.trim(),
      email: friendForm.email.trim(),
    };

    setSplitFriends((prev) => [friend, ...prev]);
    setFriendForm({ name: "", email: "" });

    setGroupForm((prev) => ({
      ...prev,
      members: [...prev.members],
    }));
  }

  function toggleGroupMember(friendId) {
    setGroupForm((prev) => ({
      ...prev,
      members: prev.members.includes(friendId)
        ? prev.members.filter((id) => id !== friendId)
        : [...prev.members, friendId],
    }));
  }

  function addGroup() {
    if (!groupForm.name.trim()) return;

    setSplitGroups((prev) => [
      {
        id: uid(),
        name: groupForm.name.trim(),
        members: groupForm.members,
      },
      ...prev,
    ]);

    setGroupForm({
      name: "",
      members: [],
    });
  }

  function toggleSplitMember(friendId) {
    setSplitExpenseForm((prev) => ({
      ...prev,
      members: prev.members.includes(friendId)
        ? prev.members.filter((id) => id !== friendId)
        : [...prev.members, friendId],
    }));
  }

  function addSplitExpense() {
    if (!splitExpenseForm.title.trim() || !Number(splitExpenseForm.amount)) return;

    const paidByFriend = splitFriends.find((f) => f.id === splitExpenseForm.paidBy);

    setSplitExpenses((prev) => [
      {
        id: uid(),
        ...splitExpenseForm,
        amount: Number(splitExpenseForm.amount),
        paidByName: paidByFriend?.name || "",
        settled: false,
      },
      ...prev,
    ]);

    setSplitExpenseForm({
      title: "",
      amount: "",
      category: "Food",
      paidBy: "",
      groupId: "",
      date: todayISO(),
      members: [],
      notes: "",
    });
  }

  function removeItem(kind, id) {
    if (kind === "income") setIncome((prev) => prev.filter((x) => x.id !== id));
    if (kind === "expenses") setExpenses((prev) => prev.filter((x) => x.id !== id));
    if (kind === "investments") {
      setInvestments((prev) => prev.filter((x) => x.id !== id));
    }
    if (kind === "friend") setSplitFriends((prev) => prev.filter((x) => x.id !== id));
    if (kind === "group") setSplitGroups((prev) => prev.filter((x) => x.id !== id));
    if (kind === "split-expense") {
      setSplitExpenses((prev) => prev.filter((x) => x.id !== id));
    }
  }

  function toggleSettled(id) {
    setSplitExpenses((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, settled: !item.settled } : item
      )
    );
  }

  function handleImport(kind, event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = String(reader.result || "");
        let parsed = [];

        if (file.name.endsWith(".json")) {
          parsed = safeParse(raw, []);
        } else {
          const lines = raw.split(/\r?\n/).filter(Boolean);
          const headers = lines[0]?.split(",").map((x) => x.trim()) || [];
          parsed = lines.slice(1).map((line) => {
            const values = line.split(",");
            const obj = {};
            headers.forEach((header, idx) => {
              obj[header] = values[idx]?.trim() || "";
            });
            return obj;
          });
        }

        if (!Array.isArray(parsed)) return;

        const normalized = parsed.map((item) => ({
          id: uid(),
          ...item,
          amount: Number(item.amount || 0),
        }));

        if (kind === "income") setIncome((prev) => [...normalized, ...prev]);
        if (kind === "expenses") setExpenses((prev) => [...normalized, ...prev]);
        if (kind === "investments") setInvestments((prev) => [...normalized, ...prev]);
      } catch {
        // ignore invalid imports
      }
    };
    reader.readAsText(file);
  }

  function renderMainTabs() {
    const tabs = [
      { key: "dashboard", label: "🐷 Dashboard", color: "purple" },
      { key: "income", label: "↗ Income", color: "green" },
      { key: "expenses", label: "↘ Expenses", color: "red" },
      { key: "investments", label: "🐷 Investments", color: "blue" },
      { key: "splitwise", label: "Splitwise", color: "orange" },
    ];

    return (
      <div className="et-tab-row">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`et-main-tab ${mainTab === tab.key ? `active ${tab.color}` : ""}`}
            onClick={() => setMainTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  function renderDashboard() {
    return (
      <div className="et-stack-gap">
        <div className="et-stat-grid et-stat-grid-4">
          <div className="et-stat-card">
            <div className="et-stat-title">Total Income</div>
            <div className="et-stat-value green">{money(totalIncome)}</div>
            <div className="et-stat-sub">All income entries</div>
          </div>

          <div className="et-stat-card">
            <div className="et-stat-title">Total Expenses</div>
            <div className="et-stat-value red">{money(totalExpenses)}</div>
            <div className="et-stat-sub">All expense entries</div>
          </div>

          <div className="et-stat-card">
            <div className="et-stat-title">Total Investments</div>
            <div className="et-stat-value blue">{money(totalInvestments)}</div>
            <div className="et-stat-sub">All investment entries</div>
          </div>

          <div className="et-stat-card">
            <div className="et-stat-title">Net Amount</div>
            <div className="et-stat-value">{money(netAmount)}</div>
            <div className="et-stat-sub">Income - expenses - investments</div>
          </div>
        </div>

        <div className="et-stat-grid et-stat-grid-3">
          <div className="et-panel et-panel-big">
            <h3 className="et-panel-heading">Recent Income</h3>
            {income.length === 0 ? (
              <div className="et-empty-box">No income entries yet.</div>
            ) : (
              <div className="et-list">
                {income.slice(0, 4).map((item) => (
                  <div key={item.id} className="et-list-item">
                    <div>
                      <div className="et-item-title">{item.title}</div>
                      <div className="et-item-sub">{formatDate(item.date)}</div>
                    </div>
                    <div className="et-amount-text income">{money(item.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="et-panel et-panel-big">
            <h3 className="et-panel-heading">Recent Expenses</h3>
            {expenses.length === 0 ? (
              <div className="et-empty-box">No expense entries yet.</div>
            ) : (
              <div className="et-list">
                {expenses.slice(0, 4).map((item) => (
                  <div key={item.id} className="et-list-item">
                    <div>
                      <div className="et-item-title">{item.title}</div>
                      <div className="et-item-sub">
                        {item.category} • {formatDate(item.date)}
                      </div>
                    </div>
                    <div className="et-amount-text expense">{money(item.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="et-panel et-panel-big">
            <h3 className="et-panel-heading">Recent Investments</h3>
            {investments.length === 0 ? (
              <div className="et-empty-box">No investment entries yet.</div>
            ) : (
              <div className="et-list">
                {investments.slice(0, 4).map((item) => (
                  <div key={item.id} className="et-list-item">
                    <div>
                      <div className="et-item-title">{item.title}</div>
                      <div className="et-item-sub">
                        {item.type} • {formatDate(item.date)}
                      </div>
                    </div>
                    <div className="et-amount-text investment">{money(item.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderMoneyTab(kind) {
    const isIncome = kind === "income";
    const isExpense = kind === "expenses";
    const isInvestment = kind === "investments";

    const list = isIncome
      ? filteredIncome
      : isExpense
      ? filteredExpenses
      : filteredInvestments;

    const form = isIncome ? incomeForm : isExpense ? expenseForm : investmentForm;
    const setForm = isIncome ? setIncomeForm : isExpense ? setExpenseForm : setInvestmentForm;
    const addHandler = isIncome ? addIncome : isExpense ? addExpense : addInvestment;
    const title = isIncome ? "Income" : isExpense ? "Expenses" : "Investments";
    const singleTitle = isIncome ? "Income" : isExpense ? "Expense" : "Investment";
    const amountClass = isIncome ? "income" : isExpense ? "expense" : "investment";

    return (
      <div className="et-stack-gap">
        <div className="et-toolbar-row">
          <input
            className="et-search"
            placeholder={`Search ${title.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <label className="et-action-btn purple wide">
            Import
            <input
              type="file"
              accept=".json,.csv"
              hidden
              onChange={(e) => handleImport(kind, e)}
            />
          </label>
        </div>

        <div className="et-money-layout">
          <div className="et-panel et-form-panel">
            <h3 className="et-form-title">Add {singleTitle}</h3>

            <div className="et-money-form-grid">
              <label className="et-field">
                <span>Title</span>
                <input
                  className="et-input"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder={`Enter ${singleTitle.toLowerCase()} title`}
                />
              </label>

              {isExpense ? (
                <label className="et-field">
                  <span>Category</span>
                  <select
                    className="et-input"
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  >
                    <option>Food</option>
                    <option>Transport</option>
                    <option>Bills</option>
                    <option>Shopping</option>
                    <option>Health</option>
                    <option>Other</option>
                  </select>
                </label>
              ) : isInvestment ? (
                <label className="et-field">
                  <span>Type</span>
                  <select
                    className="et-input"
                    value={form.type}
                    onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                  >
                    <option>Stocks</option>
                    <option>Crypto</option>
                    <option>Mutual Funds</option>
                    <option>Gold</option>
                    <option>Real Estate</option>
                    <option>Other</option>
                  </select>
                </label>
              ) : (
                <label className="et-field">
                  <span>Amount</span>
                  <input
                    className="et-input"
                    value={form.amount}
                    onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="Enter amount"
                  />
                </label>
              )}

              {!isIncome && (
                <label className="et-field">
                  <span>Amount</span>
                  <input
                    className="et-input"
                    value={form.amount}
                    onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="Enter amount"
                  />
                </label>
              )}

              <label className="et-field et-date-field">
                <span>Date</span>
                <input
                  className="et-input et-date-input"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                />
              </label>

              <label className="et-field full">
                <span>Description</span>
                <textarea
                  className="et-input et-textarea"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                />
              </label>
            </div>

            <div className="et-form-actions">
              <button className="et-action-btn purple wide" onClick={addHandler}>
                Add {singleTitle}
              </button>
            </div>
          </div>

          <div className="et-panel et-list-panel">
            <h3 className="et-panel-heading">{title} List</h3>
            {list.length === 0 ? (
              <div className="et-empty-box">No {title.toLowerCase()} entries yet.</div>
            ) : (
              <div className="et-list">
                {list.map((item) => (
                  <div key={item.id} className="et-list-item">
                    <div>
                      <div className="et-item-title">{item.title}</div>
                      <div className="et-item-sub">
                        {isExpense ? `${item.category} • ` : ""}
                        {isInvestment ? `${item.type} • ` : ""}
                        {formatDate(item.date)}
                        {item.description ? ` • ${item.description}` : ""}
                      </div>
                    </div>

                    <div className="et-inline-actions">
                      <div className={`et-amount-text ${amountClass}`}>
                        {money(item.amount)}
                      </div>
                      <button
                        className="et-delete-btn"
                        onClick={() => removeItem(kind, item.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderSplitTabs() {
    const tabs = [
      { key: "dashboard", label: "📊 Dashboard" },
      { key: "friends", label: "👥 Friends" },
      { key: "groups", label: "🧑‍🤝‍🧑 Groups" },
      { key: "expenses", label: "💸 Expenses" },
      { key: "analysis", label: "📈 Analysis" },
    ];

    return (
      <div className="et-tab-row et-sub-tab-row">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`et-split-tab ${splitTab === tab.key ? "active" : ""}`}
            onClick={() => setSplitTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  function renderSplitDashboard() {
    return (
      <div className="et-stack-gap">
        {renderSplitTabs()}
        <div className="et-stat-grid et-stat-grid-4">
          <div className="et-stat-card">
            <div className="et-stat-title">You Owe</div>
            <div className="et-stat-value">{money(0)}</div>
            <div className="et-stat-sub">No pending balance</div>
          </div>
          <div className="et-stat-card">
            <div className="et-stat-title">You Are Owed</div>
            <div className="et-stat-value">{money(0)}</div>
            <div className="et-stat-sub">No receivables</div>
          </div>
          <div className="et-stat-card">
            <div className="et-stat-title">Net Balance</div>
            <div className="et-stat-value">{money(0)}</div>
            <div className="et-stat-sub">Current net</div>
          </div>
          <div className="et-stat-card">
            <div className="et-stat-title">Unsettled</div>
            <div className="et-stat-value">{splitExpenses.filter((x) => !x.settled).length}</div>
            <div className="et-stat-sub">Open expenses</div>
          </div>
        </div>

        <div className="et-stat-grid et-stat-grid-3">
          <div className="et-panel">
            <h3 className="et-panel-heading">Friends</h3>
            <div className="et-metric-value">{splitFriends.length}</div>
          </div>
          <div className="et-panel">
            <h3 className="et-panel-heading">Groups</h3>
            <div className="et-metric-value">{splitGroups.length}</div>
          </div>
          <div className="et-panel">
            <h3 className="et-panel-heading">Expenses</h3>
            <div className="et-metric-value">{splitExpenses.length}</div>
          </div>
        </div>
      </div>
    );
  }

  function renderSplitFriends() {
    return (
      <div className="et-stack-gap">
        {renderSplitTabs()}
        <div className="et-toolbar-row compact">
          <input
            className="et-search"
            placeholder="Search friends..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="et-action-btn orange wide" onClick={addFriend}>
            Add Friend
          </button>
        </div>

        <div className="et-panel">
          <h3 className="et-form-title">Add Friend</h3>
          <div className="et-form-grid">
            <label className="et-field">
              <span>Name</span>
              <input
                className="et-input"
                value={friendForm.name}
                onChange={(e) => setFriendForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Friend name"
              />
            </label>

            <label className="et-field">
              <span>Email (optional)</span>
              <input
                className="et-input"
                value={friendForm.email}
                onChange={(e) => setFriendForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Friend email"
              />
            </label>
          </div>
        </div>

        <div className="et-panel">
          <h3 className="et-panel-heading">Friends</h3>
          {filteredFriends.length === 0 ? (
            <div className="et-empty-box">No friends yet. Add one!</div>
          ) : (
            <div className="et-list">
              {filteredFriends.map((friend) => (
                <div key={friend.id} className="et-list-item">
                  <div>
                    <div className="et-item-title">{friend.name}</div>
                    <div className="et-item-sub">{friend.email || "No email"}</div>
                  </div>

                  <button
                    className="et-delete-btn"
                    onClick={() => removeItem("friend", friend.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderSplitGroups() {
    return (
      <div className="et-stack-gap">
        {renderSplitTabs()}
        <div className="et-toolbar-row compact">
          <input
            className="et-search"
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="et-action-btn orange wide" onClick={addGroup}>
            Create Group
          </button>
        </div>

        <div className="et-panel">
          <h3 className="et-form-title">Create Group</h3>

          <div className="et-form-grid et-form-grid-single">
            <label className="et-field">
              <span>Group Name</span>
              <input
                className="et-input"
                value={groupForm.name}
                onChange={(e) => setGroupForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Roommates"
              />
            </label>

            <div className="et-field">
              <span>Select Members</span>
              {splitFriends.length === 0 ? (
                <div className="et-empty-inline">Add friends first.</div>
              ) : (
                <div className="et-check-grid">
                  {splitFriends.map((friend) => (
                    <label key={friend.id} className="et-check-item">
                      <input
                        type="checkbox"
                        checked={groupForm.members.includes(friend.id)}
                        onChange={() => toggleGroupMember(friend.id)}
                      />
                      <span>{friend.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="et-panel">
          <h3 className="et-panel-heading">Groups</h3>
          {filteredGroups.length === 0 ? (
            <div className="et-empty-box">No groups yet. Create one!</div>
          ) : (
            <div className="et-list">
              {filteredGroups.map((group) => (
                <div key={group.id} className="et-list-item et-list-item-stretch">
                  <div>
                    <div className="et-item-title">{group.name}</div>
                    <div className="et-item-sub">
                      {group.members.length} member{group.members.length === 1 ? "" : "s"}
                    </div>
                  </div>

                  <button
                    className="et-delete-btn"
                    onClick={() => removeItem("group", group.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderSplitExpenses() {
    return (
      <div className="et-stack-gap">
        {renderSplitTabs()}
        <div className="et-toolbar-row compact">
          <input
            className="et-search"
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="et-action-btn orange wide" onClick={addSplitExpense}>
            Add Expense
          </button>
        </div>

        <div className="et-panel">
          <h3 className="et-form-title">Add Split Expense</h3>

          <div className="et-form-grid">
            <label className="et-field">
              <span>Title</span>
              <input
                className="et-input"
                value={splitExpenseForm.title}
                onChange={(e) =>
                  setSplitExpenseForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Dinner, Groceries, Taxi..."
              />
            </label>

            <label className="et-field">
              <span>Amount</span>
              <input
                className="et-input"
                value={splitExpenseForm.amount}
                onChange={(e) =>
                  setSplitExpenseForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                placeholder="Enter amount"
              />
            </label>

            <label className="et-field">
              <span>Category</span>
              <select
                className="et-input"
                value={splitExpenseForm.category}
                onChange={(e) =>
                  setSplitExpenseForm((prev) => ({ ...prev, category: e.target.value }))
                }
              >
                <option>Food</option>
                <option>Transport</option>
                <option>Utilities</option>
                <option>Entertainment</option>
                <option>Travel</option>
                <option>Other</option>
              </select>
            </label>

            <label className="et-field">
              <span>Paid By</span>
              <select
                className="et-input"
                value={splitExpenseForm.paidBy}
                onChange={(e) =>
                  setSplitExpenseForm((prev) => ({ ...prev, paidBy: e.target.value }))
                }
              >
                <option value="">Select Friend</option>
                {splitFriends.map((friend) => (
                  <option key={friend.id} value={friend.id}>
                    {friend.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="et-field">
              <span>Group (optional)</span>
              <select
                className="et-input"
                value={splitExpenseForm.groupId}
                onChange={(e) =>
                  setSplitExpenseForm((prev) => ({ ...prev, groupId: e.target.value }))
                }
              >
                <option value="">No Group</option>
                {splitGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="et-field et-date-field">
              <span>Date</span>
              <input
                className="et-input et-date-input"
                type="date"
                value={splitExpenseForm.date}
                onChange={(e) =>
                  setSplitExpenseForm((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </label>

            <label className="et-field full">
              <span>Notes</span>
              <textarea
                className="et-input et-textarea"
                value={splitExpenseForm.notes}
                onChange={(e) =>
                  setSplitExpenseForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Optional notes"
              />
            </label>

            <div className="et-field full">
              <span>Split With</span>
              {splitFriends.length === 0 ? (
                <div className="et-empty-inline">Add friends first.</div>
              ) : (
                <div className="et-check-grid">
                  {splitFriends.map((friend) => (
                    <label key={friend.id} className="et-check-item">
                      <input
                        type="checkbox"
                        checked={splitExpenseForm.members.includes(friend.id)}
                        onChange={() => toggleSplitMember(friend.id)}
                      />
                      <span>{friend.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="et-panel">
          <h3 className="et-panel-heading">Expenses</h3>
          {filteredSplitExpenses.length === 0 ? (
            <div className="et-empty-box">No expenses yet.</div>
          ) : (
            <div className="et-list">
              {filteredSplitExpenses.map((item) => (
                <div key={item.id} className="et-list-item et-list-item-stretch">
                  <div>
                    <div className="et-item-title">{item.title}</div>
                    <div className="et-item-sub">
                      {item.category} • {formatDate(item.date)}
                      {item.paidByName ? ` • Paid by ${item.paidByName}` : ""}
                      {item.notes ? ` • ${item.notes}` : ""}
                    </div>
                  </div>

                  <div className="et-split-right">
                    <span className={`et-badge ${item.settled ? "settled" : "pending"}`}>
                      {item.settled ? "Settled" : "Pending"}
                    </span>

                    <div className="et-amount-text">{money(item.amount)}</div>

                    <button
                      className="et-mini-btn"
                      onClick={() => toggleSettled(item.id)}
                    >
                      {item.settled ? "Mark Pending" : "Mark Settled"}
                    </button>

                    <button
                      className="et-delete-btn"
                      onClick={() => removeItem("split-expense", item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderSplitAnalysis() {
    return (
      <div className="et-stack-gap">
        {renderSplitTabs()}
        <div className="et-stat-grid et-stat-grid-4">
          <div className="et-metric-card">
            <div className="et-stat-title">Total Spent</div>
            <div className="et-metric-value">{money(splitTotalSpent)}</div>
            <div className="et-stat-sub">{splitExpenses.length} expenses</div>
          </div>

          <div className="et-metric-card">
            <div className="et-stat-title">Average Expense</div>
            <div className="et-metric-value">{money(splitAverageExpense)}</div>
            <div className="et-stat-sub">Per expense</div>
          </div>

          <div className="et-metric-card">
            <div className="et-stat-title">Highest Expense</div>
            <div className="et-metric-value">{money(splitHighestExpense)}</div>
            <div className="et-stat-sub">Max amount</div>
          </div>

          <div className="et-metric-card">
            <div className="et-stat-title">Total Settled</div>
            <div className="et-metric-value">{money(splitSettled)}</div>
            <div className="et-stat-sub">
              {splitExpenses.filter((x) => x.settled).length} settlements
            </div>
          </div>
        </div>

        <div className="et-analysis-grid">
          <div className="et-panel et-panel-big">
            <h3 className="et-panel-heading">Expense Trend</h3>
            {expenseTrend.length === 0 ? (
              <div className="et-empty-box">No expenses recorded yet.</div>
            ) : (
              <div className="et-chart-list">
                {expenseTrend.map((item) => (
                  <div key={item.label} className="et-chart-row">
                    <div className="et-chart-label">{formatDate(item.label)}</div>
                    <div className="et-chart-bar-wrap">
                      <div
                        className="et-chart-bar"
                        style={{ width: `${(item.amount / trendMax) * 100}%` }}
                      />
                    </div>
                    <div className="et-chart-value">{money(item.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="et-panel et-panel-big">
            <h3 className="et-panel-heading">Spending by Category</h3>
            {spendingByCategory.length === 0 ? (
              <div className="et-empty-box">No expenses recorded yet.</div>
            ) : (
              <div className="et-chart-list">
                {spendingByCategory.map((item) => (
                  <div key={item.label} className="et-chart-row">
                    <div className="et-chart-label">{item.label}</div>
                    <div className="et-chart-bar-wrap">
                      <div
                        className="et-chart-bar secondary"
                        style={{ width: `${(item.amount / categoryMax) * 100}%` }}
                      />
                    </div>
                    <div className="et-chart-value">{money(item.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="et-panel et-panel-big">
            <h3 className="et-panel-heading">Top Expenses</h3>
            {topExpenses.length === 0 ? (
              <div className="et-empty-box">No expenses recorded yet.</div>
            ) : (
              <div className="et-list">
                {topExpenses.map((expense, index) => (
                  <div key={expense.id || index} className="et-list-item">
                    <div>
                      <div className="et-item-title">
                        {expense.title || `Expense ${index + 1}`}
                      </div>
                      <div className="et-item-sub">
                        {expense.category || "Uncategorized"}
                        {expense.paidByName ? ` • Paid by ${expense.paidByName}` : ""}
                      </div>
                    </div>
                    <div className="et-amount-text expense">{money(expense.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="et-panel et-panel-big">
            <h3 className="et-panel-heading">Spending by Friend</h3>
            {spendingByFriend.length === 0 ? (
              <div className="et-empty-box">
                No friends added yet. Add friends to track their spending.
              </div>
            ) : (
              <div className="et-chart-list">
                {spendingByFriend.map((friend) => (
                  <div key={friend.name} className="et-chart-row">
                    <div className="et-chart-label">{friend.name}</div>
                    <div className="et-chart-bar-wrap">
                      <div
                        className="et-chart-bar"
                        style={{ width: `${(friend.amount / friendMax) * 100}%` }}
                      />
                    </div>
                    <div className="et-chart-value">{money(friend.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderSplitwise() {
    if (splitTab === "dashboard") return renderSplitDashboard();
    if (splitTab === "friends") return renderSplitFriends();
    if (splitTab === "groups") return renderSplitGroups();
    if (splitTab === "expenses") return renderSplitExpenses();
    return renderSplitAnalysis();
  }

  return (
    <div className="et-page">
      <section className="et-hero">
        <h1>Expense Tracking</h1>
        <p>Track your expenses, income, and investments with ease</p>
      </section>

      {renderMainTabs()}

      {mainTab === "dashboard" && renderDashboard()}
      {mainTab === "income" && renderMoneyTab("income")}
      {mainTab === "expenses" && renderMoneyTab("expenses")}
      {mainTab === "investments" && renderMoneyTab("investments")}
      {mainTab === "splitwise" && renderSplitwise()}
    </div>
  );
}