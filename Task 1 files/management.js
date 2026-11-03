
const API_URL = "https://bravus-internship-backend.vercel.app/api";
const token = localStorage.getItem("token");

let allTasks = [];

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

        document.getElementById("message").textContent = data.message;

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
            document.getElementById("tasks").textContent =
                data.message || "Unable to load tasks.";
            return;
        }

        allTasks = data.tasks || [];

        updateDashboard();
        populateAssigneeFilter();
        renderTasks();

    } catch (error) {
        console.error("LOAD TASKS ERROR:", error);
        document.getElementById("tasks").textContent =
            "Unable to connect to server.";
    }
}


// DASHBOARD COUNTS
function updateDashboard() {
    const today = getTodayDate();

    const total = allTasks.length;

    const todo = allTasks.filter(task =>
        (task.status || "To Do") === "To Do"
    ).length;

    const inProgress = allTasks.filter(task =>
        task.status === "In Progress"
    ).length;

    const completed = allTasks.filter(task =>
        task.status === "Done"
    ).length;

    const overdue = allTasks.filter(task => {
        if (!task.dueDate || task.status === "Done") {
            return false;
        }

        return getDateOnly(task.dueDate) < today;
    }).length;

    document.getElementById("totalTasks").textContent = total;
    document.getElementById("todoTasks").textContent = todo;
    document.getElementById("inProgressTasks").textContent = inProgress;
    document.getElementById("completedTasks").textContent = completed;
    document.getElementById("overdueTasks").textContent = overdue;
}


// GET TODAY'S DATE
function getTodayDate() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


// GET DATE WITHOUT TIME
function getDateOnly(dateValue) {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) return "";

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}

// ASSIGNEE FILTER OPTIONS
function populateAssigneeFilter() {
    const filter = document.getElementById("filterAssignee");
    const selectedValue = filter.value;

    const users = new Map();

    allTasks.forEach(task => {
        const user = task.assignedTo;

        if (user && typeof user === "object") {
            users.set(user._id, {
                id: user._id,
                name: user.name,
                email: user.email
            });
        }
    });

    filter.innerHTML = '<option value="">All Users</option>';

    users.forEach(user => {
        const option = document.createElement("option");

        option.value = user.id;
        option.textContent = `${user.name} (${user.email})`;

        filter.appendChild(option);
    });

    if (users.has(selectedValue)) {
        filter.value = selectedValue;
    }
}


// DISPLAY FILTERED TASKS
function renderTasks() {
    const tasksDiv = document.getElementById("tasks");

    const selectedAssignee =
        document.getElementById("filterAssignee").value;

    const selectedStatus =
        document.getElementById("filterStatus").value;

    const selectedPriority =
        document.getElementById("filterPriority").value;

    const filteredTasks = allTasks.filter(task => {
        const assigneeId =
            task.assignedTo && typeof task.assignedTo === "object"
                ? task.assignedTo._id
                : "";

        const matchesAssignee =
            !selectedAssignee || assigneeId === selectedAssignee;

        const matchesStatus =
            !selectedStatus || task.status === selectedStatus;

        const matchesPriority =
            !selectedPriority || task.priority === selectedPriority;

        return matchesAssignee && matchesStatus && matchesPriority;
    });

    tasksDiv.innerHTML = "";

    if (filteredTasks.length === 0) {
        tasksDiv.textContent = "No matching tasks found.";
        return;
    }

    filteredTasks.forEach(task => {
        const taskElement = document.createElement("div");

        const assignedUser = task.assignedTo;

        const assignedName =
            assignedUser && typeof assignedUser === "object"
                ? `${assignedUser.name} (${assignedUser.email})`
                : "Unassigned";

        const dueDate = task.dueDate
            ? new Date(task.dueDate).toLocaleDateString("en-IN")
            : "Not set";

        const isOverdue =
            task.dueDate &&
            task.status !== "Done" &&
            getDateOnly(task.dueDate) < getTodayDate();

        const heading = document.createElement("h3");
        heading.textContent = task.title;

        const description = document.createElement("p");
        description.textContent = task.description;

        const priority = document.createElement("p");
        priority.textContent = `Priority: ${task.priority}`;

        const status = document.createElement("p");
        status.textContent = `Status: ${task.status || "To Do"}`;

        const assignee = document.createElement("p");
        assignee.textContent = `Assigned To: ${assignedName}`;

        const date = document.createElement("p");
        date.textContent = `Due Date: ${dueDate}`;

        if (isOverdue) {
            date.textContent += " (OVERDUE)";
            date.style.color = "red";
        }

        const updateButton = document.createElement("button");
        updateButton.textContent = "Update";
        updateButton.onclick = () => updateTask(task._id);

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.onclick = () => deleteTask(task._id);

        taskElement.append(
            document.createElement("hr"),
            heading,
            description,
            priority,
            status,
            assignee,
            date,
            updateButton,
            deleteButton
        );

        tasksDiv.appendChild(taskElement);
    });
}


// FILTER EVENT LISTENERS
document.getElementById("filterAssignee")
    .addEventListener("change", renderTasks);

document.getElementById("filterStatus")
    .addEventListener("change", renderTasks);

document.getElementById("filterPriority")
    .addEventListener("change", renderTasks);

document.getElementById("clearFilters")
    .addEventListener("click", function() {
        document.getElementById("filterAssignee").value = "";
        document.getElementById("filterStatus").value = "";
        document.getElementById("filterPriority").value = "";

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

    const newDueDate = prompt(
        "Enter due date (YYYY-MM-DD), or leave blank to keep existing date:"
    );

    const priority = newPriority.trim().toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase());

    const status = newStatus.trim().toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase());

    const validPriorities = ["Low", "Medium", "High"];
    const validStatuses = ["To Do", "In Progress", "In Review", "Done"];

    if (!validPriorities.includes(priority)) {
        alert("Invalid priority. Enter Low, Medium or High.");
        return;
    }

    if (!validStatuses.includes(status)) {
        alert("Invalid status. Enter To Do, In Progress, In Review or Done.");
        return;
    }

    const updateData = {
        priority,
        status
    };

    if (newDueDate && newDueDate.trim() !== "") {
        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(newDueDate.trim()) ||
            isNaN(Date.parse(newDueDate.trim() + "T00:00:00"))
        ) {
            alert("Invalid date. Use YYYY-MM-DD.");
            return;
        }

        updateData.dueDate = newDueDate.trim();
    }

    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(updateData)
        });

        const data = await response.json();

        alert(data.message);

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
    const confirmDelete = confirm(
        "Are you sure you want to delete this task?"
    );

    if (!confirmDelete) return;

    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const data = await response.json();

        alert(data.message);

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

        data.users.forEach(user => {
            const option = document.createElement("option");

            option.value = user._id;
            option.textContent =
                `${user.name} (${user.email})`;

            assignedTo.appendChild(option);
        });

    } catch (error) {
        console.error("LOAD USERS ERROR:", error);
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
