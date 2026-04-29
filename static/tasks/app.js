(function () {
  const API_BASE = "/api";
  const TOKEN_KEY = "tm_access_token";
  const REFRESH_KEY = "tm_refresh_token";
  const USER_KEY = "tm_user";
  const THEME_KEY = "tm_theme";

  const body = document.body;
  const page = body.dataset.page || "home";

  const nav = document.querySelector("[data-nav]");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const themeToggle = document.querySelector("[data-theme-toggle]");
  const logoutBtn = document.querySelector("[data-logout-btn]");
  const toastStack = document.getElementById("toast-stack");

  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const verifyOtpForm = document.getElementById("verify-otp-form");
  const forgotPasswordForm = document.getElementById("forgot-password-form");
  const resetPasswordForm = document.getElementById("reset-password-form");
  const dashboardGrid = document.getElementById("task-grid");
  const adminGrid = document.getElementById("admin-task-grid");

  const taskModal = document.getElementById("task-modal");
  const taskForm = document.getElementById("task-form");
  const adminModal = document.getElementById("admin-modal");
  const adminTaskForm = document.getElementById("admin-task-form");

  const els = {
    userName: document.getElementById("user-name"),
    userRole: document.getElementById("user-role"),
    statTotal: document.getElementById("stat-total"),
    statCompleted: document.getElementById("stat-completed"),
    statPending: document.getElementById("stat-pending"),
    adminTaskCount: document.getElementById("admin-task-count"),

    emptyState: document.getElementById("empty-state"),
    search: document.getElementById("search-input"),
    status: document.getElementById("status-filter"),
    priority: document.getElementById("priority-filter"),
    ordering: document.getElementById("ordering-filter"),
    resetFilters: document.getElementById("reset-filters"),
    refreshBtn: document.getElementById("refresh-btn"),
    addTaskBtn: document.getElementById("add-task-btn"),
    emptyAddBtn: document.getElementById("empty-add-btn"),
    addAdminTaskBtn: document.getElementById("add-admin-task-btn"),
    refreshAdminBtn: document.getElementById("refresh-admin-btn"),
    adminUserFilter: document.getElementById("admin-user-filter"),
    adminStatusFilter: document.getElementById("admin-status-filter"),
    adminOrderingFilter: document.getElementById("admin-ordering-filter"),
    adminResetFilters: document.getElementById("admin-reset-filters"),
  };

  const state = {
    user: readJSON(USER_KEY),
    tasks: [],
    adminTasks: [],
    staffUsers: [],
    filters: {
      search: "",
      status: "",
      priority: "",
      ordering: "-created_at",
    },
    adminFilters: {
      user: "",
      status: "",
      ordering: "-created_at",
    },
    activeTask: null,
  };

  initTheme();
  initNav();
  initLogout();
  syncNav();

  if (page === "login") bootstrapLogin();
  if (page === "register") bootstrapRegister();
  if (page === "verify-otp") bootstrapVerifyOtp();
  if (page === "forgot-password") bootstrapForgotPassword();
  if (page === "dashboard") bootstrapDashboard();
  if (page === "manager") bootstrapManager();

  function readJSON(key) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function setSession(payload) {
    localStorage.setItem(TOKEN_KEY, payload.access);
    localStorage.setItem(REFRESH_KEY, payload.refresh);
    if (payload.user) {
      state.user = payload.user;
      writeJSON(USER_KEY, payload.user);
    }
    syncNav();
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    state.user = null;
    syncNav();
  }

  function getAccessToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getRefreshToken() {
    return localStorage.getItem(REFRESH_KEY);
  }

  function isAuthed() {
    return Boolean(getAccessToken());
  }

  function isStaff() {
    return Boolean(state.user && state.user.is_staff);
  }

  function initTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark") body.dataset.theme = "dark";

    themeToggle?.addEventListener("click", () => {
      const next = body.dataset.theme === "dark" ? "light" : "dark";
      if (next === "dark") {
        body.dataset.theme = "dark";
        localStorage.setItem(THEME_KEY, "dark");
      } else {
        body.removeAttribute("data-theme");
        localStorage.setItem(THEME_KEY, "light");
      }
    });
  }

  function initNav() {
    navToggle?.addEventListener("click", () => {
      nav?.classList.toggle("nav-open");
      nav?.parentElement?.classList.toggle("nav-open");
      document.querySelector(".topbar")?.classList.toggle("nav-open");
    });
  }

  function syncNav() {
    const dashboardLink = document.querySelector("[data-nav-dashboard]");
    const managerLink = document.querySelector("[data-nav-manager]");
    const loginLink = document.querySelector("[data-nav-login]");
    const registerLink = document.querySelector("[data-nav-register]");
    const logoutButton = document.querySelector("[data-logout-btn]");
    const openChatBtn = document.getElementById("open-chat-btn");
    const chatWindow = document.getElementById("chat-window");

    if (!dashboardLink || !managerLink || !loginLink || !registerLink || !logoutButton) return;

    if (isAuthed()) {
      dashboardLink.hidden = false;
      logoutButton.hidden = false;
      loginLink.hidden = true;
      registerLink.hidden = true;
      managerLink.hidden = !isStaff();
      
      if (page === "dashboard" || page === "manager") {
        if (openChatBtn && (!chatWindow || chatWindow.hidden)) openChatBtn.hidden = false;
      } else {
        if (openChatBtn) openChatBtn.hidden = true;
        if (chatWindow) chatWindow.hidden = true;
      }
    } else {
      dashboardLink.hidden = true;
      managerLink.hidden = true;
      logoutButton.hidden = true;
      loginLink.hidden = false;
      registerLink.hidden = false;
      if (openChatBtn) openChatBtn.hidden = true;
      if (chatWindow) chatWindow.hidden = true;
    }
  }

  function initLogout() {
    logoutBtn?.addEventListener("click", async () => {
      await logoutCurrent();
      window.location.href = "/";
    });
  }

  async function logoutCurrent() {
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        await apiFetch("/logout/", {
          method: "POST",
          body: { refresh },
        });
      } catch {
        // Even if blacklisting fails, clear local session.
      }
    }
    clearSession();
  }

  async function apiFetch(path, options = {}, isRetry = false) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    if (options.auth !== false && getAccessToken()) {
      headers.Authorization = `Bearer ${getAccessToken()}`;
    }

    const init = {
      method: options.method || "GET",
      headers,
    };

    if (options.body !== undefined) {
      init.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }

    const response = await fetch(`${API_BASE}${path}`, init);
    
    if (response.status === 401 && !isRetry && options.auth !== false && getRefreshToken()) {
      try {
        const refreshResponse = await fetch(`${API_BASE}/token/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh: getRefreshToken() })
        });
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          localStorage.setItem(TOKEN_KEY, refreshData.access);
          return await apiFetch(path, options, true);
        }
      } catch (err) {
        // Fall through to error block below
      }
    }

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : null;

    if (!response.ok) {
      const error = new Error(payload?.detail || "Request failed");
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  function showToast(message, type = "info") {
    if (!toastStack) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastStack.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  }

  function setLoading(button, loading, label) {
    if (!button) return;
    button.disabled = loading;
    button.dataset.loading = loading ? "true" : "false";
    button.textContent = loading ? "Please wait..." : label;
  }

  function setErrors(container, errors) {
    if (!container) return;
    const lines = [];
    if (typeof errors === "string") {
      lines.push(errors);
    } else if (errors && typeof errors === "object") {
      Object.entries(errors).forEach(([field, value]) => {
        if (Array.isArray(value)) {
          value.forEach((item) => lines.push(`${field}: ${item}`));
        } else if (typeof value === "string") {
          lines.push(`${field}: ${value}`);
        }
      });
    }
    if (!lines.length) {
      container.hidden = true;
      container.innerHTML = "";
      return;
    }
    container.hidden = false;
    container.innerHTML = lines.map((line) => `<div>${escapeHTML(line)}</div>`).join("");
  }

  function escapeHTML(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  function toDatetimeLocal(value) {
    if (!value) return "";
    const date = new Date(value);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function getMinDatetimeLocal() {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  function taskCard(task, mode = "user") {
    const owner = mode === "admin" ? `<div class="user-badge" title="Owner: ${escapeHTML(task.user)}"><span class="ub-label">Owner</span><span class="ub-name">${escapeHTML(task.user)}</span></div>` : "";
    const assignedBy = mode === "admin" && task.assigned_by && task.assigned_by !== task.user ? `<div class="user-badge" title="Assigned by: ${escapeHTML(task.assigned_by)}"><span class="ub-label">By</span><span class="ub-name">${escapeHTML(task.assigned_by)}</span></div>` : "";
    const usersRow = mode === "admin" ? `<div class="task-users">${owner}${assignedBy}</div>` : "";
    return `
      <article class="task-card">
        <div>
          ${usersRow}
          <h3 class="task-title">${escapeHTML(task.title)}</h3>
          <div class="task-meta">
            <span class="badge ${task.status}">${escapeHTML(task.status)}</span>
            <span class="badge priority-${task.priority}">${escapeHTML(task.priority)}</span>
            <span class="badge">Due ${escapeHTML(formatDate(task.due_date))}</span>
          </div>
          ${task.description ? `<p class="task-desc">${escapeHTML(task.description)}</p>` : ""}
        </div>
        <div class="task-actions">
          <button class="btn btn-secondary btn-small" data-edit-task="${task.id}">Edit</button>
          <button class="btn btn-ghost btn-small" data-complete-task="${task.id}">${task.status === "completed" ? "Reopen" : "Complete"}</button>
          <button class="btn btn-ghost btn-small" data-delete-task="${task.id}">Delete</button>
        </div>
      </article>
    `;
  }

  async function bootstrapLogin() {
    if (isAuthed()) {
      window.location.href = "/dashboard/";
      return;
    }

    const errors = document.getElementById("login-errors");
    const button = loginForm?.querySelector("button[type='submit']");
    loginForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      setErrors(errors, null);
      const form = new FormData(loginForm);
      const payload = {
        username: form.get("username"),
        password: form.get("password"),
      };

      if (!payload.username || !payload.password) {
        setErrors(errors, "Please fill in both username and password.");
        return;
      }

      setLoading(button, true, "Login");
      try {
        const data = await apiFetch("/login/", { method: "POST", body: payload, auth: false });
        setSession(data);
        showToast("Login successful.", "success");
        window.location.href = "/dashboard/";
      } catch (err) {
        setErrors(errors, err.payload || err.message);
        showToast("Login failed.", "error");
      } finally {
        setLoading(button, false, "Login");
      }
    });
  }

  async function bootstrapRegister() {
    if (isAuthed()) {
      window.location.href = "/dashboard/";
      return;
    }

    const errors = document.getElementById("register-errors");
    const button = registerForm?.querySelector("button[type='submit']");
    registerForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      setErrors(errors, null);
      const form = new FormData(registerForm);
      const payload = {
        username: form.get("username"),
        email: form.get("email"),
        password: form.get("password"),
        password_confirm: form.get("password_confirm"),
      };

      if (!payload.username || !payload.email || !payload.password || !payload.password_confirm) {
        setErrors(errors, "Please complete all fields.");
        return;
      }
      if (payload.password !== payload.password_confirm) {
        setErrors(errors, "Passwords do not match.");
        return;
      }

      setLoading(button, true, "Create account");
      try {
        await apiFetch("/register/", { method: "POST", body: payload, auth: false });
        const params = new URLSearchParams({ email: payload.email, registered: "1" });
        window.location.href = `/verify-otp/?${params.toString()}`;
      } catch (err) {
        setErrors(errors, err.payload || err.message);
        showToast("Registration failed.", "error");
      } finally {
        setLoading(button, false, "Create account");
      }
    });
  }

  async function bootstrapVerifyOtp() {
    if (isAuthed()) {
      window.location.href = "/dashboard/";
      return;
    }

    const errors = document.getElementById("verify-otp-errors");
    const button = verifyOtpForm?.querySelector("button[type='submit']");
    const emailInput = verifyOtpForm?.querySelector("input[name='email']");
    const queryEmail = new URLSearchParams(window.location.search).get("email");
    const registered = new URLSearchParams(window.location.search).get("registered");
    if (queryEmail && emailInput) {
      emailInput.value = queryEmail;
    }
    if (registered === "1") {
      showToast("Account created. Check your email for the verification code.", "success");
    }

    verifyOtpForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      setErrors(errors, null);
      const form = new FormData(verifyOtpForm);
      const payload = {
        email: form.get("email"),
        otp_code: form.get("otp_code"),
      };

      if (!payload.email || !payload.otp_code) {
        setErrors(errors, "Please enter your email and OTP code.");
        return;
      }

      setLoading(button, true, "Verify account");
      try {
        const data = await apiFetch("/verify-otp/", { method: "POST", body: payload, auth: false });
        setSession(data);
        showToast(data.message || "Email verified successfully.", "success");
        window.location.href = "/dashboard/";
      } catch (err) {
        setErrors(errors, err.payload || err.message);
        showToast("OTP verification failed.", "error");
      } finally {
        setLoading(button, false, "Verify account");
      }
    });
  }

  async function bootstrapForgotPassword() {
    const requestErrors = document.getElementById("forgot-password-errors");
    const resetErrors = document.getElementById("reset-password-errors");
    const requestButton = forgotPasswordForm?.querySelector("button[type='submit']");
    const resetButton = resetPasswordForm?.querySelector("button[type='submit']");
    const requestEmailInput = forgotPasswordForm?.querySelector("input[name='email']");
    const resetEmailInput = resetPasswordForm?.querySelector("input[name='email']");
    const queryEmail = new URLSearchParams(window.location.search).get("email");
    if (queryEmail) {
      if (requestEmailInput && !requestEmailInput.value) requestEmailInput.value = queryEmail;
      if (resetEmailInput && !resetEmailInput.value) resetEmailInput.value = queryEmail;
    }

    forgotPasswordForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      setErrors(requestErrors, null);
      const form = new FormData(forgotPasswordForm);
      const payload = {
        email: form.get("email"),
      };

      if (!payload.email) {
        setErrors(requestErrors, "Please enter your email address.");
        return;
      }

      setLoading(requestButton, true, "Send OTP");
      try {
        const data = await apiFetch("/forgot-password/", { method: "POST", body: payload, auth: false });
        showToast(data.message || "OTP sent to your email.", "success");
        if (resetEmailInput) resetEmailInput.value = payload.email;
      } catch (err) {
        setErrors(requestErrors, err.payload || err.message);
        showToast("Could not send the password reset OTP.", "error");
      } finally {
        setLoading(requestButton, false, "Send OTP");
      }
    });

    resetPasswordForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      setErrors(resetErrors, null);
      const form = new FormData(resetPasswordForm);
      const payload = {
        email: form.get("email"),
        otp_code: form.get("otp_code"),
        new_password: form.get("new_password"),
      };

      if (!payload.email || !payload.otp_code || !payload.new_password) {
        setErrors(resetErrors, "Please complete all reset fields.");
        return;
      }

      setLoading(resetButton, true, "Reset password");
      try {
        const data = await apiFetch("/reset-password/", { method: "POST", body: payload, auth: false });
        showToast(data.message || "Password reset successfully.", "success");
        resetPasswordForm.reset();
        if (requestEmailInput && !requestEmailInput.value) requestEmailInput.value = payload.email;
        if (resetEmailInput && !resetEmailInput.value) resetEmailInput.value = payload.email;
      } catch (err) {
        setErrors(resetErrors, err.payload || err.message);
        showToast("Could not reset the password.", "error");
      } finally {
        setLoading(resetButton, false, "Reset password");
      }
    });
  }

  async function bootstrapDashboard() {
    if (!isAuthed()) {
      window.location.href = "/login/";
      return;
    }

    syncNav();
    await loadCurrentUser();
    await loadTaskSummary();
    await loadTasks();

    const openButtons = [els.addTaskBtn, els.emptyAddBtn];
    openButtons.forEach((button) => button?.addEventListener("click", () => openTaskModal()));
    els.refreshBtn?.addEventListener("click", () => loadTasks());
    els.resetFilters?.addEventListener("click", () => {
      els.search.value = "";
      els.status.value = "";
      els.priority.value = "";
      els.ordering.value = "-created_at";
      state.filters = { search: "", status: "", priority: "", ordering: "-created_at" };
      loadTasks();
    });
    [els.search, els.status, els.priority, els.ordering].forEach((el) => {
      el?.addEventListener("input", debounceSyncFilters);
      el?.addEventListener("change", debounceSyncFilters);
    });

    bindModal(taskModal);
    taskForm?.addEventListener("submit", submitTaskForm);
    dashboardGrid?.addEventListener("click", handleTaskActions);
    document.querySelectorAll("[data-mobile-filter]").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll("[data-mobile-filter]").forEach((item) => item.classList.remove("active"));
        chip.classList.add("active");
        els.status.value = chip.dataset.mobileFilter === "all" ? "" : chip.dataset.mobileFilter;
        state.filters.status = els.status.value;
        loadTasks();
      });
    });
  }

  async function bootstrapManager() {
    if (!isAuthed()) {
      window.location.href = "/login/";
      return;
    }

    syncNav();
    await loadCurrentUser();
    if (!isStaff()) {
      showToast("Manager panel is available for admins only.", "error");
      adminGrid.innerHTML = `
        <div class="empty-state-card">
          <h2>Access restricted</h2>
          <p>This section is only visible to staff users.</p>
          <a class="btn btn-primary" href="/dashboard/">Go to Dashboard</a>
        </div>
      `;
      return;
    }

    await loadAdminUsers();
    await loadAdminTasks();
    document.getElementById("add-admin-task-btn")?.addEventListener("click", () => openAdminModal());
    document.getElementById("refresh-admin-btn")?.addEventListener("click", loadAdminTasks);
    adminTaskForm?.addEventListener("submit", submitAdminTaskForm);
    adminGrid?.addEventListener("click", handleAdminTaskActions);
    bindModal(adminModal);

    els.adminResetFilters?.addEventListener("click", () => {
      if (els.adminUserFilter) els.adminUserFilter.value = "";
      if (els.adminStatusFilter) els.adminStatusFilter.value = "";
      if (els.adminOrderingFilter) els.adminOrderingFilter.value = "-created_at";
      state.adminFilters = { user: "", status: "", ordering: "-created_at" };
      loadAdminTasks();
    });
    [els.adminUserFilter, els.adminStatusFilter, els.adminOrderingFilter].forEach((el) => {
      el?.addEventListener("change", debounceSyncAdminFilters);
    });
  }

  async function loadCurrentUser() {
    try {
      const current = await apiFetch("/me/");
      state.user = current;
      writeJSON(USER_KEY, current);
      syncNav();
      if (els.userName) els.userName.textContent = current.username;
      if (els.userRole) els.userRole.textContent = current.is_staff ? "Administrator" : "Team member";
    } catch (err) {
      clearSession();
      window.location.href = "/login/";
    }
  }

  async function loadTaskSummary() {
    try {
      const summary = await apiFetch("/dashboard/summary/");
      els.statTotal && (els.statTotal.textContent = summary.total_tasks);
      els.statCompleted && (els.statCompleted.textContent = summary.completed_tasks);
      els.statPending && (els.statPending.textContent = summary.pending_tasks);
    } catch {}
  }

  function currentQuery() {
    const params = new URLSearchParams();
    if (state.filters.search) params.set("search", state.filters.search);
    if (state.filters.status) params.set("status", state.filters.status);
    if (state.filters.priority) params.set("priority", state.filters.priority);
    if (state.filters.ordering) params.set("ordering", state.filters.ordering);
    return params.toString();
  }

  async function loadTasks() {
    if (!dashboardGrid) return;

    dashboardGrid.innerHTML = "";
    els.emptyState.hidden = true;
    try {
      const data = await apiFetch(`/tasks/?${currentQuery()}`);
      state.tasks = data.results || data;
      renderTasks(state.tasks, "user");
      els.emptyState.hidden = state.tasks.length > 0;

    } catch (err) {

      if (err.status === 401) {
        clearSession();
        window.location.href = "/login/";
        return;
      }
      showToast("Could not load tasks.", "error");
      els.emptyState.hidden = false;
    }
  }

  async function loadAdminUsers() {
    try {
      state.staffUsers = await apiFetch("/admin/users/");
      populateAdminUserSelect();
    } catch {
      showToast("Could not load users for assignment.", "error");
    }
  }

  function currentAdminQuery() {
    const params = new URLSearchParams();
    if (state.adminFilters.user) params.set("user", state.adminFilters.user);
    if (state.adminFilters.status) params.set("status", state.adminFilters.status);
    if (state.adminFilters.ordering) params.set("ordering", state.adminFilters.ordering);
    return params.toString();
  }

  async function loadAdminTasks() {
    if (!adminGrid) return;
    try {
      const data = await apiFetch(`/admin/tasks/?${currentAdminQuery()}`);
      state.adminTasks = data.results || data;
      renderTasks(state.adminTasks, "admin");
      els.adminTaskCount && (els.adminTaskCount.textContent = data.count ?? state.adminTasks.length);
    } catch (err) {
      if (err.status === 401) {
        clearSession();
        window.location.href = "/login/";
        return;
      }
      showToast("Could not load admin tasks.", "error");
    }
  }

  function renderTasks(tasks, mode = "user") {
    const target = mode === "admin" ? adminGrid : dashboardGrid;
    if (!target) return;

    if (!tasks || !tasks.length) {
      target.innerHTML = "";
      return;
    }

    target.innerHTML = tasks.map((task) => taskCard(task, mode)).join("");
  }

  function debounceSyncFilters() {
    state.filters.search = els.search?.value?.trim() || "";
    state.filters.status = els.status?.value || "";
    state.filters.priority = els.priority?.value || "";
    state.filters.ordering = els.ordering?.value || "-created_at";
    clearTimeout(debounceSyncFilters.timer);
    debounceSyncFilters.timer = setTimeout(() => loadTasks(), 220);
  }

  function debounceSyncAdminFilters() {
    state.adminFilters.user = els.adminUserFilter?.value || "";
    state.adminFilters.status = els.adminStatusFilter?.value || "";
    state.adminFilters.ordering = els.adminOrderingFilter?.value || "-created_at";
    clearTimeout(debounceSyncAdminFilters.timer);
    debounceSyncAdminFilters.timer = setTimeout(() => loadAdminTasks(), 220);
  }

  function bindModal(modal) {
    if (!modal) return;
    modal.addEventListener("click", (event) => {
      if (event.target.matches("[data-close-modal]") || event.target.matches("[data-close-admin-modal]")) {
        closeModal(modal);
      }
    });
  }

  function openTaskModal(task = null) {
    state.activeTask = task;
    taskModal.hidden = false;
    document.body.style.overflow = "hidden";
    document.getElementById("modal-eyebrow").textContent = task ? "Edit task" : "New task";
    document.getElementById("modal-title").textContent = task ? "Edit task" : "Add task";
    document.getElementById("save-task-btn").textContent = task ? "Save changes" : "Save task";

    taskForm.reset();
    document.getElementById("task-id").value = task?.id || "";
    document.getElementById("task-title").value = task?.title || "";
    document.getElementById("task-description").value = task?.description || "";
    document.getElementById("task-priority").value = task?.priority || "medium";
    
    const dueDateInput = document.getElementById("task-due-date");
    dueDateInput.value = task ? toDatetimeLocal(task.due_date) : "";
    if (!task) {
      dueDateInput.min = getMinDatetimeLocal();
    } else {
      dueDateInput.removeAttribute("min");
    }
  }

  function openAdminModal(task = null) {
    state.activeTask = task;
    adminModal.hidden = false;
    document.body.style.overflow = "hidden";
    adminTaskForm.reset();
    document.getElementById("admin-task-id").value = task?.id || "";
    document.getElementById("admin-user").value = task?.owner_id || task?.user_id || "";
    document.getElementById("admin-title").value = task?.title || "";
    document.getElementById("admin-description").value = task?.description || "";
    document.getElementById("admin-status").value = task?.status || "pending";
    document.getElementById("admin-priority").value = task?.priority || "medium";
    
    const dueDateInput = document.getElementById("admin-due-date");
    dueDateInput.value = task ? toDatetimeLocal(task.due_date) : "";
    if (!task) {
      dueDateInput.min = getMinDatetimeLocal();
    } else {
      dueDateInput.removeAttribute("min");
    }
  }

  function closeModal(modal) {
    modal.hidden = true;
    document.body.style.overflow = "";
    state.activeTask = null;
  }

  function populateAdminUserSelect() {
    const select = document.getElementById("admin-user");
    const filterSelect = els.adminUserFilter;

    const options = state.staffUsers
      .map((user) => `<option value="${user.id}">${escapeHTML(user.username)} (${escapeHTML(user.email)})</option>`)
      .join("");
      
    if (select) select.innerHTML = `<option value="">Choose a user</option>${options}`;
    if (filterSelect) {
      const currentVal = filterSelect.value;
      filterSelect.innerHTML = `<option value="">All users</option>${options}`;
      filterSelect.value = currentVal;
    }
  }

  async function submitTaskForm(event) {
    event.preventDefault();
    const form = new FormData(taskForm);
    const payload = {
      title: form.get("title"),
      description: form.get("description"),
      priority: form.get("priority"),
      due_date: form.get("due_date"),
    };

    if (!payload.title || !payload.priority || !payload.due_date) {
      showToast("Please fill in the required task fields.", "error");
      return;
    }

    const isEdit = Boolean(form.get("id"));
    if (!isEdit && new Date(payload.due_date) <= new Date()) {
      showToast("Due date and time must be in the future.", "error");
      return;
    }
    const button = document.getElementById("save-task-btn");
    setLoading(button, true, isEdit ? "Save changes" : "Save task");
    try {
      if (isEdit) {
        await apiFetch(`/tasks/${form.get("id")}/`, { method: "PATCH", body: payload });
        showToast("Task updated.", "success");
      } else {
        await apiFetch("/tasks/", { method: "POST", body: payload });
        showToast("Task created.", "success");
      }
      closeModal(taskModal);
      await loadTasks();
      await loadTaskSummary();
    } catch (err) {
      showToast(err.payload?.detail || "Could not save task.", "error");
    } finally {
      setLoading(button, false, isEdit ? "Save changes" : "Save task");
    }
  }

  async function submitAdminTaskForm(event) {
    event.preventDefault();
    const form = new FormData(adminTaskForm);
    const payload = {
      user_id: Number(form.get("user_id")),
      title: form.get("title"),
      description: form.get("description"),
      status: form.get("status"),
      priority: form.get("priority"),
      due_date: form.get("due_date"),
    };

    if (!payload.user_id || !payload.title || !payload.due_date) {
      showToast("Please select a user and fill in the task details.", "error");
      return;
    }

    const isEdit = Boolean(form.get("id"));
    if (!isEdit && new Date(payload.due_date) <= new Date()) {
      showToast("Due date and time must be in the future.", "error");
      return;
    }
    try {
      if (isEdit) {
        await apiFetch(`/admin/tasks/${form.get("id")}/`, { method: "PATCH", body: payload });
        showToast("Task updated.", "success");
      } else {
        await apiFetch("/admin/tasks/", { method: "POST", body: payload });
        showToast("Task assigned.", "success");
      }
      closeModal(adminModal);
      await loadAdminTasks();
    } catch (err) {
      showToast(err.payload?.detail || "Could not save task.", "error");
    }
  }

  async function handleTaskActions(event) {
    const editId = event.target.closest("[data-edit-task]")?.dataset.editTask;
    const completeId = event.target.closest("[data-complete-task]")?.dataset.completeTask;
    const deleteId = event.target.closest("[data-delete-task]")?.dataset.deleteTask;

    if (editId) {
      const task = state.tasks.find((item) => String(item.id) === String(editId));
      if (task) openTaskModal(task);
      return;
    }

    if (completeId) {
      const task = state.tasks.find((item) => String(item.id) === String(completeId));
      if (!task) return;
      try {
        const nextStatus = task.status === "completed" ? "pending" : "completed";
        await apiFetch(`/tasks/${completeId}/`, { method: "PATCH", body: { status: nextStatus } });
        showToast("Task updated.", "success");
        await loadTasks();
        await loadTaskSummary();
      } catch {
        showToast("Could not update task.", "error");
      }
      return;
    }

    if (deleteId) {
      const confirmed = window.confirm("Delete this task? This cannot be undone.");
      if (!confirmed) return;
      try {
        await apiFetch(`/tasks/${deleteId}/`, { method: "DELETE" });
        showToast("Task deleted.", "success");
        await loadTasks();
        await loadTaskSummary();
      } catch {
        showToast("Could not delete task.", "error");
      }
    }
  }

  async function handleAdminTaskActions(event) {
    const editId = event.target.closest("[data-edit-task]")?.dataset.editTask;
    const completeId = event.target.closest("[data-complete-task]")?.dataset.completeTask;
    const deleteId = event.target.closest("[data-delete-task]")?.dataset.deleteTask;

    if (editId) {
      const task = state.adminTasks.find((item) => String(item.id) === String(editId));
      if (task) openAdminModal(task);
      return;
    }

    if (completeId) {
      try {
        const task = state.adminTasks.find((item) => String(item.id) === String(completeId));
        const nextStatus = task?.status === "completed" ? "pending" : "completed";
        await apiFetch(`/admin/tasks/${completeId}/`, { method: "PATCH", body: { status: nextStatus } });
        showToast("Task updated.", "success");
        await loadAdminTasks();
      } catch {
        showToast("Could not update task.", "error");
      }
      return;
    }

    if (deleteId) {
      const confirmed = window.confirm("Delete this task from the system?");
      if (!confirmed) return;
      try {
        await apiFetch(`/admin/tasks/${deleteId}/`, { method: "DELETE" });
        showToast("Task removed.", "success");
        await loadAdminTasks();
      } catch {
        showToast("Could not delete task.", "error");
      }
    }
  }

  // Chat Widget Logic
  const openChatBtn = document.getElementById("open-chat-btn");
  const closeChatBtn = document.getElementById("close-chat-btn");
  const chatWindow = document.getElementById("chat-window");
  const chatMessages = document.getElementById("chat-messages");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatBadge = document.getElementById("chat-badge");

  let chatPollInterval = null;
  let lastSeenCount = 0;
  let initializedSeenCount = false;

  if (openChatBtn && closeChatBtn && chatWindow) {
    openChatBtn.addEventListener("click", () => {
      chatWindow.hidden = false;
      openChatBtn.hidden = true;
      if (chatBadge) {
        chatBadge.hidden = true;
        chatBadge.textContent = "0";
      }
      loadMessages();
      setTimeout(() => chatMessages.scrollTop = chatMessages.scrollHeight, 100);
    });

    closeChatBtn.addEventListener("click", (e) => {
      e.preventDefault();
      chatWindow.hidden = true;
      openChatBtn.hidden = false;
    });

    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;
      chatInput.value = "";
      try {
        await apiFetch("/chat/", { method: "POST", body: { content: text } });
        loadMessages();
      } catch (err) {
        showToast("Failed to send message", "error");
      }
    });
    
    // Only poll when authenticated
    chatPollInterval = setInterval(() => {
        if (isAuthed()) loadMessages();
    }, 3000);
  }

  async function loadMessages() {
    if (!isAuthed()) return;
    try {
      const data = await apiFetch("/chat/");
      const messages = data.results || data;

      if (!initializedSeenCount) {
        lastSeenCount = messages.length;
        initializedSeenCount = true;
      }

      if (chatWindow.hidden) {
        const unread = messages.length - lastSeenCount;
        if (unread > 0 && chatBadge) {
          chatBadge.textContent = unread;
          chatBadge.hidden = false;
        } else if (chatBadge) {
          chatBadge.hidden = true;
        }
        return;
      }

      lastSeenCount = messages.length;
      if (chatBadge) chatBadge.hidden = true;

      const html = messages.map(msg => {
        const isSelf = state.user && msg.username === state.user.username;
        let isMention = false;
        if (state.user && state.user.username) {
            isMention = msg.content.includes(`@${state.user.username}`);
        }
        
        let cssClass = "chat-message";
        if (isSelf) cssClass += " self";
        if (isMention) cssClass += " mention";
        
        return `<div class="${cssClass}">
          <strong>${escapeHTML(msg.username)}</strong>
          ${escapeHTML(msg.content)}
        </div>`;
      }).join("");
      
      const shouldScroll = chatMessages.scrollTop + chatMessages.clientHeight >= chatMessages.scrollHeight - 20;
      chatMessages.innerHTML = html;
      if (shouldScroll) chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (err) {}
  }

})();
