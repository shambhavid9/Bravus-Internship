
const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}

const API_URL = "https://bravus-internship-backend.vercel.app/api";
const validStatuses = [
    "To Do",
    "In Progress",
    "In Review",
    "Done"
];

async function loadTasks() {
    const tasksDiv = document.getElementById("tasks");

    try {
        const response = await fetch(`${API_URL}/tasks`, {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const data = await response.json();
        tasksDiv.innerHTML = "";

        if (!response.ok) {
            tasksDiv.textContent =
                data.message || "Failed to load tasks.";
            return;
        }

        if (!data.tasks || data.tasks.length === 0) {
            tasksDiv.textContent = "No tasks assigned to you.";
            return;
        }

        data.tasks.forEach(task => {
            const taskElement = document.createElement("div");

            const dueDate = task.dueDate
                ? new Date(task.dueDate).toLocaleDateString()
                : "Not set";

            taskElement.innerHTML = `
                <hr>
                <h3></h3>
                <p class="description"></p>
                <p><strong>Priority:</strong> ${escapeHTML(task.priority)}</p>
                <p><strong>Status:</strong> ${escapeHTML(task.status || "To Do")}</p>
                <p><strong>Due Date:</strong> ${escapeHTML(dueDate)}</p>

                <div class="status-controls"></div>

                <h4>Progress Notes</h4>
                <div class="comments"></div>

                <h4>Activity History</h4>
                <div class="activity"></div>
            `;

            taskElement.querySelector("h3").textContent = task.title;
            taskElement.querySelector(".description").textContent =
                task.description;

            // Status update controls
            const controlsDiv =
                taskElement.querySelector(".status-controls");

            const statusLabel = document.createElement("label");
            statusLabel.textContent = "Update Status: ";

            const statusSelect = document.createElement("select");

            validStatuses.forEach(status => {
                const option = document.createElement("option");
                option.value = status;
                option.textContent = status;
                option.selected = status === (task.status || "To Do");
                statusSelect.appendChild(option);
            });

            const updateButton = document.createElement("button");
            updateButton.textContent = "Update Status";

            updateButton.addEventListener("click", () => {
                updateTaskStatus(
                    task._id,
                    statusSelect.value,
                    updateButton
                );
            });

            controlsDiv.append(
                statusLabel,
                statusSelect,
                updateButton
            );

            // Progress notes
            const commentsDiv = taskElement.querySelector(".comments");

            if (task.comments && task.comments.length > 0) {
                task.comments.forEach(comment => {
                    const note = document.createElement("p");

                    const author =
                        typeof comment.createdBy === "object"
                            ? comment.createdBy?.name || "User"
                            : "User";

                    note.textContent =
                        `${author} (${formatDate(comment.createdAt)}): ${comment.text}`;

                    commentsDiv.appendChild(note);
                });
            } else {
                commentsDiv.textContent = "No progress notes yet.";
            }

            // Activity history
            const activityDiv = taskElement.querySelector(".activity");

            if (task.activity && task.activity.length > 0) {
                task.activity.forEach(entry => {
                    const item = document.createElement("p");

                    const author =
                        typeof entry.changedBy === "object"
                            ? entry.changedBy?.name || "User"
                            : "User";

                    item.textContent =
                        `${author}: ${entry.fromStatus} → ${entry.toStatus} (${formatDate(entry.changedAt)})`;

                    activityDiv.appendChild(item);
                });
            } else {
                activityDiv.textContent =
                    "No status changes recorded yet.";
            }

            tasksDiv.appendChild(taskElement);
        });

    } catch (error) {
        console.error("TASK LOAD ERROR:", error);
        tasksDiv.textContent = "Unable to connect to server.";
    }
}

// Update task status through the user-only API
async function updateTaskStatus(taskId, status, button) {
    button.disabled = true;
    button.textContent = "Updating...";

    try {
        const response = await fetch(
            `${API_URL}/tasks/${encodeURIComponent(taskId)}/status`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify({ status })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Failed to update task status.");
            return;
        }

        alert("Task status updated successfully!");
        await loadTasks();

    } catch (error) {
        console.error("STATUS UPDATE ERROR:", error);
        alert("Unable to connect to server.");
    } finally {
        button.disabled = false;
        button.textContent = "Update Status";
    }
}

function formatDate(date) {
    return date ? new Date(date).toLocaleString() : "Date unavailable";
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

loadTasks();
