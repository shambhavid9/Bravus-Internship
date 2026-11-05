
const API_URL = "https://bravus-internship-backend.vercel.app/api";
const token = localStorage.getItem("token");

let allTasks = [];

const statuses = ["To Do", "In Progress", "In Review", "Done"];

if (!token) {
    window.location.href = "login.html";
}

// CREATE TASK
document.getElementById("taskForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    const assignedTo = document.getElementById("assignedTo").value;
    const priority = document.getElementById("priority").value;
    const dueDate = document.getElementById("dueDate").value;

    try {
        const response = await fetch(`${API_URL}/tasks`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({
                title,
                description,
                assignedTo,
                priority,
                dueDate
            })
        });

        const data = await response.json();

        document.getElementById("message").textContent =
            data.message || "Task creation completed.";

        if (response.ok) {
            document.getElementById("taskForm").reset();
            await loadTasks();
        }

    } catch (error) {
        console.error("CREATE TASK ERROR:", error);

        document.getElementById("message").textContent =
            "Unable to connect to server.";
    }
});

// LOAD TASKS
async function loadTasks() {
    try {
        const response = await fetch(`${API_URL}/tasks`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const data = await response.json();

        if (!response.ok) {
            document.getElementById("taskBoard").textContent =
                data.message || "Unable to load tasks.";
            return;
        }

        allTasks = data.tasks || [];

        populateAssigneeFilter();
        renderTasks();

    } catch (error) {
        console.error("LOAD TASKS ERROR:", error);

        document.getElementById("taskBoard").textContent =
            "Unable to connect to server.";
    }
}

// GET ASSIGNED USER DETAILS
function getAssignedUser(task) {
    if (task.assignedTo && typeof task.assignedTo === "object") {
        return task.assignedTo;
    }

    return null;
}

// FORMAT DATE
function getDateOnly(dateValue) {
    if (!dateValue) return "";

    const dateString = String(dateValue);

    if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
        return dateString.slice(0, 10);
    }

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// FORMAT DATE FOR DISPLAY
function formatDate(dateValue) {
    const date = getDateOnly(dateValue);

    if (!date) return "Not set";

    const parts = date.split("-");

    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

// UPDATE DASHBOARD
function updateDashboard() {
    const today = getDateOnly(new Date());

    document.getElementById("totalTasks").textContent =
        allTasks.length;

    document.getElementById("todoTasks").textContent =
        allTasks.filter(task => (task.status || "To Do") === "To Do").length;

    document.getElementById("progressTasks").textContent =
        allTasks.filter(task => task.status === "In Progress").length;

    document.getElementById("reviewTasks").textContent =
        allTasks.filter(task => task.status === "In Review").length;

    document.getElementById("completedTasks").textContent =
        allTasks.filter(task => task.status === "Done").length;

    document.getElementById("overdueTasks").textContent =
        allTasks.filter(task => {
            const dueDate = getDateOnly(task.dueDate);

            return dueDate &&
                dueDate < today &&
                task.status !== "Done";
        }).length;
}

// POPULATE ASSIGNEE FILTER
function populateAssigneeFilter() {
    const filter = document.getElementById("filterAssignee");
    const selectedValue = filter.value;

    const users = new Map();

    allTasks.forEach(task => {
        const user = getAssignedUser(task);

        if (user && user._id) {
            users.set(user._id, user);
        }
    });

    filter.innerHTML = '<option value="">All Users</option>';

    users.forEach(user => {
        const option = document.createElement("option");

        option.value = user._id;
        option.textContent = `${user.name} (${user.email})`;

        filter.appendChild(option);
    });

    if (users.has(selectedValue)) {
        filter.value = selectedValue;
    }
}

// RENDER KANBAN BOARD
function renderTasks() {
    const columns = {
        "To Do": document.getElementById("todoColumn"),
        "In Progress": document.getElementById("progressColumn"),
        "In Review": document.getElementById("reviewColumn"),
        "Done": document.getElementById("doneColumn")
    };

    const counts = {
        "To Do": 0,
        "In Progress": 0,
        "In Review": 0,
        "Done": 0
    };

    Object.values(columns).forEach(column => {
        column.innerHTML = "";
    });

    updateDashboard();

    const searchText = document.getElementById("taskSearch")
        .value.trim().toLowerCase();

    const selectedAssignee =
        document.getElementById("filterAssignee").value;

    const selectedStatus =
        document.getElementById("filterStatus").value;

    const selectedPriority =
        document.getElementById("filterPriority").value;

    const filteredTasks = allTasks.filter(task => {
        const status = task.status || "To Do";
        const user = getAssignedUser(task);

        const searchableText = [
            task.title,
            task.description,
            user?.name,
            user?.email
        ].filter(Boolean).join(" ").toLowerCase();

        const matchesAssignee =
            !selectedAssignee ||
            (user && user._id === selectedAssignee);

        const matchesStatus =
            !selectedStatus || status === selectedStatus;

        const matchesPriority =
            !selectedPriority || task.priority === selectedPriority;

        const matchesSearch =
            searchableText.includes(searchText);

        return matchesAssignee &&
            matchesStatus &&
            matchesPriority &&
            matchesSearch;
    });

    filteredTasks.forEach(task => {
        const status = task.status || "To Do";
        const column = columns[status];

        if (!column) return;

        counts[status]++;

        const user = getAssignedUser(task);
        const dueDate = getDateOnly(task.dueDate);
        const today = getDateOnly(new Date());

        const isOverdue =
            dueDate && dueDate < today && status !== "Done";

        const card = document.createElement("div");
        card.className = "task-card";

        const title = document.createElement("h4");
        title.textContent = task.title;

        const description = document.createElement("p");
        description.textContent = task.description;

        const assignee = document.createElement("div");
        assignee.className = "task-meta";
        assignee.textContent = user
            ? `Assigned to: ${user.name} (${user.email})`
            : "Assigned user unavailable";

        const priority = document.createElement("div");
        priority.className = "task-meta";
        priority.textContent = `Priority: ${task.priority || "Medium"}`;

        const statusText = document.createElement("div");
        statusText.className = "task-meta";
        statusText.textContent = `Status: ${status}`;

        const due = document.createElement("div");
        due.className = "task-meta" + (isOverdue ? " overdue" : "");

        due.textContent = dueDate
            ? `Due: ${formatDate(dueDate)}${isOverdue ? " (Overdue)" : ""}`
            : "Due date: Not set";

        const actions = document.createElement("div");
        actions.className = "task-actions";

        const editButton = document.createElement("button");
        editButton.className = "edit-btn";
        editButton.textContent = "Edit Task";
        editButton.addEventListener("click", () => updateTask(task._id));

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => deleteTask(task._id));

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        card.appendChild(title);
        card.appendChild(description);
        card.appendChild(assignee);
        card.appendChild(priority);
        card.appendChild(statusText);
        card.appendChild(due);
        card.appendChild(actions);

        column.appendChild(card);
    });

    statuses.forEach(status => {
        const column = columns[status];
        const heading = column.parentElement.querySelector("h3");

        heading.textContent = `${status} (${counts[status]})`;

        if (counts[status] === 0) {
            const empty = document.createElement("div");
            empty.className = "empty";
            empty.textContent = "No tasks here";

            column.appendChild(empty);
        }
    });

    if (filteredTasks.length === 0) {
        // Empty-state messages are displayed in each Kanban column.
        console.log("No tasks match the selected filters.");
    }
}

// FILTER AND SEARCH EVENTS
document.getElementById("filterAssignee")
    .addEventListener("change", renderTasks);

document.getElementById("filterStatus")
    .addEventListener("change", renderTasks);

document.getElementById("filterPriority")
    .addEventListener("change", renderTasks);

document.getElementById("taskSearch")
    .addEventListener("input", renderTasks);

document.getElementById("clearFilters")
    .addEventListener("click", function() {
        document.getElementById("filterAssignee").value = "";
        document.getElementById("filterStatus").value = "";
        document.getElementById("filterPriority").value = "";
        document.getElementById("taskSearch").value = "";

        renderTasks();
    });

// UPDATE TASK
async function updateTask(taskId) {
    const newPriority = prompt(
        "Enter priority: Low, Medium or High"
    );

    if (!newPriority) return;

    const newStatus = prompt(
        "Enter status: To Do, In Progress, In Review or Done"
    );

    if (!newStatus) return;

    const priority = newPriority.trim().toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase());

    const status = newStatus.trim().toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase());

    if (!["Low", "Medium", "High"].includes(priority)) {
        alert("Invalid priority.");
        return;
    }

    if (!statuses.includes(status)) {
        alert("Invalid status.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ priority, status })
        });

        const data = await response.json();

        alert(data.message || "Task update completed.");

        if (response.ok) {
            await loadTasks();
        }

    } catch (error) {
        console.error("UPDATE ERROR:", error);
        alert("Unable to update task.");
    }
}

// DELETE TASK
async function deleteTask(taskId) {
    if (!confirm("Are you sure you want to delete this task?")) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const data = await response.json();

        alert(data.message || "Task deletion completed.");

        if (response.ok) {
            await loadTasks();
        }

    } catch (error) {
        console.error("DELETE ERROR:", error);
        alert("Unable to delete task.");
    }
}

// LOAD USERS
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/users`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const data = await response.json();

        const assignedTo = document.getElementById("assignedTo");

        assignedTo.innerHTML =
            '<option value="">Select a user</option>';

        if (!response.ok) {
            assignedTo.innerHTML =
                '<option value="">Unable to load users</option>';

            console.error("USER FETCH ERROR:", data.message);
            return;
        }

        (data.users || []).forEach(user => {
            const option = document.createElement("option");

            option.value = user._id;
            option.textContent = `${user.name} (${user.email})`;

            assignedTo.appendChild(option);
        });

    } catch (error) {
        console.error("LOAD USERS ERROR:", error);

        document.getElementById("assignedTo").innerHTML =
            '<option value="">Unable to connect to server</option>';
    }
}

// LOGOUT
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "login.html";
}

// INITIAL LOAD
loadUsers();
loadTasks();
