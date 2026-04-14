const STORAGE_KEY = "student-planner-srs-data";

const topTabs = document.querySelectorAll(".top-tab");
const sections = document.querySelectorAll(".section");

const taskForm = document.getElementById("task-form");
const taskList = document.getElementById("task-list");

const eventForm = document.getElementById("event-form");
const eventList = document.getElementById("event-list");
const calendarViewTitle = document.getElementById("calendar-view-title");
const viewButtons = document.querySelectorAll(".view-btn");

const timerForm = document.getElementById("timer-form");
const timerDisplay = document.getElementById("timer-display");
const pauseTimerBtn = document.getElementById("pause-timer");
const resetTimerBtn = document.getElementById("reset-timer");

let state = loadState();
let currentCalendarView = "day";
let timerInterval = null;
let remainingSeconds = 0;
let originalSeconds = 0;

topTabs.forEach((tab) => {
  tab.addEventListener("click", () => switchTopTab(tab.dataset.tab));
});

taskForm.addEventListener("submit", onAddTask);
eventForm.addEventListener("submit", onSaveEvent);
viewButtons.forEach((btn) => {
  btn.addEventListener("click", () => setCalendarView(btn.dataset.view));
});

timerForm.addEventListener("submit", onSetStartTimer);
pauseTimerBtn.addEventListener("click", pauseTimer);
resetTimerBtn.addEventListener("click", resetTimer);

renderTasks();
renderEvents();
renderTimer();

function switchTopTab(tabName) {
  topTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
  sections.forEach((section) => {
    section.classList.toggle("active", section.id === `${tabName}-section`);
  });
}

function onAddTask(event) {
  event.preventDefault();
  const formData = new FormData(taskForm);
  const title = String(formData.get("taskTitle")).trim();
  const dueDate = String(formData.get("taskDueDate"));
  const priority = String(formData.get("taskPriority"));
  const description = String(formData.get("taskDescription")).trim();
  if (!title || !dueDate) return;

  state.tasks.push({
    id: crypto.randomUUID(),
    title,
    dueDate,
    priority,
    description,
    completed: false
  });
  sortTasks();
  persistState();
  taskForm.reset();
  renderTasks();
}

function renderTasks() {
  taskList.innerHTML = "";
  if (state.tasks.length === 0) {
    taskList.appendChild(buildEmpty("No tasks yet."));
    return;
  }

  state.tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = `item ${task.completed ? "task-complete" : ""}`;

    const title = document.createElement("h4");
    title.textContent = task.title;
    const meta = document.createElement("p");
    meta.className = "item-meta";
    meta.textContent = `Due: ${formatDate(task.dueDate)} | Priority: ${task.priority}`;
    const description = document.createElement("p");
    description.textContent = task.description || "No description.";

    const actions = document.createElement("div");
    actions.className = "item-actions";
    const toggleBtn = buildButton(task.completed ? "Mark Incomplete" : "Mark Complete", "muted-btn");
    toggleBtn.addEventListener("click", () => toggleTask(task.id));
    const editBtn = buildButton("Edit");
    editBtn.addEventListener("click", () => editTask(task.id));
    const deleteBtn = buildButton("Delete", "danger-btn");
    deleteBtn.addEventListener("click", () => deleteTask(task.id));
    actions.append(toggleBtn, editBtn, deleteBtn);

    item.append(title, meta, description, actions);
    taskList.appendChild(item);
  });
}

function toggleTask(taskId) {
  const task = state.tasks.find((current) => current.id === taskId);
  if (!task) return;
  task.completed = !task.completed;
  persistState();
  renderTasks();
}

function editTask(taskId) {
  const task = state.tasks.find((current) => current.id === taskId);
  if (!task) return;
  const nextTitle = prompt("Edit task title:", task.title);
  if (nextTitle === null || !nextTitle.trim()) return;
  const nextDescription = prompt("Edit task description:", task.description || "");
  task.title = nextTitle.trim();
  task.description = (nextDescription || "").trim();
  persistState();
  renderTasks();
}

function deleteTask(taskId) {
  if (!confirm("Are you sure you want to delete this task?")) return;
  state.tasks = state.tasks.filter((task) => task.id !== taskId);
  persistState();
  renderTasks();
}

function setCalendarView(view) {
  currentCalendarView = view;
  viewButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
  calendarViewTitle.textContent = `${view[0].toUpperCase()}${view.slice(1)} View`;
  renderEvents();
}

function onSaveEvent(event) {
  event.preventDefault();
  const formData = new FormData(eventForm);
  const title = String(formData.get("eventTitle")).trim();
  const startDateTime = String(formData.get("eventStartDateTime"));
  const endDateTime = String(formData.get("eventEndDateTime"));
  const description = String(formData.get("eventDescription")).trim();

  if (!title || !startDateTime || !endDateTime) return;
  if (new Date(endDateTime) < new Date(startDateTime)) {
    alert("End date/time must be after start date/time.");
    return;
  }

  state.events.push({
    id: crypto.randomUUID(),
    title,
    startDateTime,
    endDateTime,
    description
  });
  sortEvents();
  persistState();
  eventForm.reset();
  renderEvents();
}

function renderEvents() {
  eventList.innerHTML = "";
  const filtered = filterEventsByView(currentCalendarView, state.events);
  if (filtered.length === 0) {
    eventList.appendChild(buildEmpty("No events for this calendar view."));
    return;
  }

  filtered.forEach((entry) => {
    const item = document.createElement("li");
    item.className = "item";

    const title = document.createElement("h4");
    title.textContent = entry.title;
    const meta = document.createElement("p");
    meta.className = "item-meta";
    meta.textContent = `${formatDateTime(entry.startDateTime)} - ${formatDateTime(entry.endDateTime)}`;
    const description = document.createElement("p");
    description.textContent = entry.description || "No description.";

    const actions = document.createElement("div");
    actions.className = "item-actions";
    const editBtn = buildButton("Edit");
    editBtn.addEventListener("click", () => editEvent(entry.id));
    const deleteBtn = buildButton("Delete", "danger-btn");
    deleteBtn.addEventListener("click", () => deleteEvent(entry.id));
    actions.append(editBtn, deleteBtn);

    item.append(title, meta, description, actions);
    eventList.appendChild(item);
  });
}

function editEvent(eventId) {
  const selected = state.events.find((eventItem) => eventItem.id === eventId);
  if (!selected) return;
  const nextTitle = prompt("Edit event title:", selected.title);
  if (nextTitle === null || !nextTitle.trim()) return;
  const nextDescription = prompt("Edit event description:", selected.description || "");
  selected.title = nextTitle.trim();
  selected.description = (nextDescription || "").trim();
  persistState();
  renderEvents();
}

function deleteEvent(eventId) {
  if (!confirm("Are you sure you want to delete this event?")) return;
  state.events = state.events.filter((eventItem) => eventItem.id !== eventId);
  persistState();
  renderEvents();
}

function onSetStartTimer(event) {
  event.preventDefault();
  const minutes = Number(new FormData(timerForm).get("minutes"));
  if (!Number.isFinite(minutes) || minutes < 1) return;
  originalSeconds = Math.floor(minutes * 60);
  remainingSeconds = originalSeconds;
  startTimer();
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    remainingSeconds -= 1;
    renderTimer();
    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      remainingSeconds = 0;
      renderTimer();
      alert("Timer complete.");
      safeBeep();
    }
  }, 1000);
  renderTimer();
}

function pauseTimer() {
  if (!timerInterval) return;
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  remainingSeconds = originalSeconds;
  renderTimer();
}

function renderTimer() {
  timerDisplay.textContent = toClock(remainingSeconds);
}

function safeBeep() {
  try {
    const context = new window.AudioContext();
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
  } catch (error) {
    // Ignore if audio cannot be played.
  }
}

function filterEventsByView(view, events) {
  const now = new Date();
  const today = atStartOfDay(now);
  const endOfToday = atEndOfDay(now);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return events.filter((event) => {
    const start = new Date(event.startDateTime);
    if (view === "day") return start >= today && start <= endOfToday;
    if (view === "week") return start >= today && start <= endOfWeek;
    return start >= today && start <= endOfMonth;
  });
}

function sortTasks() {
  state.tasks.sort((first, second) => new Date(first.dueDate) - new Date(second.dueDate));
}

function sortEvents() {
  state.events.sort(
    (first, second) => new Date(first.startDateTime) - new Date(second.startDateTime)
  );
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { tasks: [], events: [] };
  try {
    const parsed = JSON.parse(raw);
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      events: Array.isArray(parsed.events) ? parsed.events : []
    };
  } catch (error) {
    alert("Saved data is corrupted. Starting with empty data.");
    return { tasks: [], events: [] };
  }
}

function buildButton(text, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  if (className) button.classList.add(className);
  return button;
}

function buildEmpty(message) {
  const empty = document.createElement("li");
  empty.className = "empty";
  empty.textContent = message;
  return empty;
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function formatDateTime(value) {
  return new Date(value).toLocaleString();
}

function toClock(totalSeconds) {
  const safeValue = Math.max(0, totalSeconds || 0);
  const minutes = String(Math.floor(safeValue / 60)).padStart(2, "0");
  const seconds = String(safeValue % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function atStartOfDay(date) {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

function atEndOfDay(date) {
  const clone = new Date(date);
  clone.setHours(23, 59, 59, 999);
  return clone;
}
