
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
            document.getElementById("taskBoard").textContent =
                data.message || "Unable to load tasks.";
            return;
        }

        allTasks = data.tasks || [];

        updateDashboard();
        populateAssigneeFilter();
        renderTasks();

    } catch (error) {
        console.error("LOAD TASKS ERROR:", error);
        document.getElementById("taskBoard").textContent =
            "Unable to connect to server.";
    }
}


// DASHBOARD COUNTS
function updateDashboard() {
    const today = getTodayDate();

    document.getElementById("totalTasks").textContent = allTasks.length;

    document.getElementById("todoTasks").textContent =
        allTasks.filter(task => (task.status || "To Do") === "To Do").length;

    document.getElementById("inProgressTasks").textContent =
        allTasks.filter(task => task.status === "In Progress").length;

    document.getElementById("completedTasks").textContent =
        allTasks.filter(task => task.status === "Done").length;

    document.getElementById("overdueTasks").textContent =
        allTasks.filter(task =>
            task.dueDate &&
            task.status !== "Done" &&
            getDateOnly(task.dueDate) < today
        ).length;
}


// DATE HELPERS
function getTodayDate() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

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


// KANBAN BOARD + SEARCH + FILTERS
function renderTasks() {
    const columns = {
        "To Do": document.getElementById("todoColumn"),
        "In Progress": document.getElementById("inProgressColumn"),
        "In Review": document.getElementById("inReviewColumn"),
        "Done": document.getElementById("doneColumn")
    };

    const selectedAssignee = document.getElementById("filterAssignee").value;
    const selectedStatus = document.getElementById("filterStatus").value;
    const selectedPriority = document.getElementById("filterPriority").value;

    const searchText = document.getElementById("taskSearch").value
        .trim()
        .toLowerCase();

    // Update dashboard
    updateDashboard();

    // Clear columns
    Object.values(columns).forEach(column => {
        column.innerHTML = "";
    });

    const counts = {
        "To Do": 0,
        "In Progress": 0,
        "In Review": 0,
        "Done": 0
    };

    // Apply search and filters
    const filteredTasks = allTasks.filter(task => {
        const assignedUser = task.assignedTo;

        const assigneeId =
            assignedUser && typeof assignedUser === "object"
                ? assignedUser._id
                : "";

        const searchableText = [
            task.title,
            task.description,
            assignedUser?.name,
            assignedUser?.email
        ].filter(Boolean).join(" ").toLowerCase();

        return (
            (!selectedAssignee || assigneeId === selectedAssignee) &&
            (!selectedStatus || task.status === selectedStatus) &&
            (!selectedPriority || task.priority === selectedPriority) &&
            searchableText.includes(searchText)
        );
    });

    // Render task cards
    filteredTasks.forEach(task => {
        const status = task.status || "To Do";
        const column = columns[status];

        if (!column) return;

        counts[status]++;

        const assignedUser = task.assignedTo;

        const assignedName =
            assignedUser && typeof assignedUser === "object"
                ? `${assignedUser.name} (${assignedUser.email})`
                : "Unassigned";

        const card = document.createElement("div");
        card.className = "task-card";

        const heading = document.createElement("h4");
        heading.textContent = task.title;

        const description = document.createElement("p");
        description.textContent = task.description;

        const priority = document.createElement("p");
        priority.textContent = `Priority: ${task.priority}`;

        const assignee = document.createElement("p");
        assignee.textContent = `Assigned To: ${assignedName}`;

        const date = document.createElement("p");

        date.textContent = task.dueDate
            ? `Due Date: ${new Date(task.dueDate).toLocaleDateString("en-IN")}`
            : "Due Date: Not set";

        if (
            task.dueDate &&
            status !== "Done" &&
            getDateOnly(task.dueDate) < getTodayDate()
        ) {
            date.textContent += " (OVERDUE)";
            date.style.color = "red";
        }

        const updateButton = document.createElement("button");
        updateButton.textContent = "Update";
        updateButton.onclick = () => updateTask(task._id);

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.onclick = () => deleteTask(task._id);

        
const commentsHeading = document.createElement("h5");
commentsHeading.textContent = "Progress Notes";

const commentsList = document.createElement("div");

if (task.comments && task.comments.length > 0) {
    task.comments.forEach(comment => {
        const commentItem = document.createElement("p");

        const author = comment.createdBy?.name || "Unknown user";
        const commentDate = comment.createdAt
            ? new Date(comment.createdAt).toLocaleString("en-IN")
            : "";

        commentItem.textContent =
            `${author} (${commentDate}): ${comment.text}`;

        commentsList.appendChild(commentItem);
    });
} else {
    const emptyComments = document.createElement("p");
    emptyComments.textContent = "No progress notes yet.";
    commentsList.appendChild(emptyComments);
}
const activityHeading = document.createElement("h5");
activityHeading.textContent = "Activity History";

const activityList = document.createElement("div");

if (task.activity && task.activity.length > 0) {
    task.activity.forEach(entry => {
        const activityItem = document.createElement("p");

        const author = entry.changedBy?.name || "Unknown user";

        const activityDate = entry.changedAt
            ? new Date(entry.changedAt).toLocaleString("en-IN")
            : "";

        activityItem.textContent =
            `${author} changed status from ${entry.fromStatus} to ${entry.toStatus} (${activityDate})`;

        activityList.appendChild(activityItem);
    });
} else {
    const emptyActivity = document.createElement("p");
    emptyActivity.textContent = "No status changes recorded yet.";
    activityList.appendChild(emptyActivity);
}

const commentButton = document.createElement("button");
commentButton.textContent = "Add Progress Note";
commentButton.onclick = () => addProgressNote(task._id);

card.append(
    heading,
    description,
    priority,
    assignee,
    date,
    commentsHeading,
    commentsList,
    commentButton,
    activityHeading,
    activityList,
    updateButton,
    deleteButton
);


        column.appendChild(card);
    });

    // Update column headings
    Object.keys(columns).forEach(status => {
        const heading = columns[status].parentElement.querySelector("h3");

        heading.textContent = `${status} (${counts[status]})`;

        if (counts[status] === 0) {
            const empty = document.createElement("p");
            empty.textContent = "No matching tasks";
            columns[status].appendChild(empty);
        }
    });
}


async function addProgressNote(taskId) {
    const comment = prompt("Enter your progress note:");

    if (!comment || !comment.trim()) return;

    try {
        const response = await fetch(
            `${API_URL}/tasks/${taskId}/comments`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify({
                    text: comment.trim()
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Unable to add progress note.");
            return;
        }

        alert("Progress note added successfully!");

        await loadTasks();

    } catch (error) {
        console.error("ADD COMMENT ERROR:", error);
        alert("Unable to connect to server.");
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
    const newPriority = prompt("Enter priority: Low, Medium or High");

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
        alert("Invalid priority.");
        return;
    }

    if (!validStatuses.includes(status)) {
        alert("Invalid status.");
        return;
    }

    const updateData = { priority, status };

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
    if (!confirm("Are you sure you want to delete this task?")) return;

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
        assignedTo.innerHTML = '<option value="">Select a user</option>';

        if (!response.ok) {
            assignedTo.innerHTML =
                '<option value="">Unable to load users</option>';

            console.error("USER FETCH ERROR:", data.message);
            return;
        }

        data.users.forEach(user => {
            const option = document.createElement("option");
            option.value = user._id;
            option.textContent = `${user.name} (${user.email})`;
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


// VERIFY ROLE AND INITIAL LOAD
async function verifyManagementAccess() {
    try {
        const response = await fetch(`${API_URL}/profile`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        if (!response.ok) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "login.html";
            return;
        }

        const data = await response.json();
        const role = data.user.role;

        if (role === "user") {
            window.location.href = "user.html";
            return;
        }

        if (role !== "management" && role !== "admin") {
            window.location.href = "login.html";
            return;
        }

        loadUsers();
        loadTasks();

    } catch (error) {
        console.error("ACCESS VERIFICATION ERROR:", error);
        document.body.innerHTML = "<h2>Unable to verify access. Please try again.</h2>";
    }
}

if (token) {
    verifyManagementAccess();
}
