
const API_URL = "https://bravus-internship-backend.vercel.app";

const token = localStorage.getItem("token");

let currentUser = null;

try {
    currentUser = JSON.parse(localStorage.getItem("user"));
} catch (error) {
    currentUser = null;
}

// ===============================
// AUTHENTICATION
// ===============================

if (!token || !currentUser) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
} else if (currentUser.role !== "admin") {
    if (currentUser.role === "management") {
        window.location.href = "management.html";
    } else {
        window.location.href = "user.html";
    }
}


// ===============================
// SYSTEM OVERVIEW
// ===============================

function updateStat(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


// ===============================
// LOAD ALL USERS
// ===============================

async function loadUsers() {

    try {

        const response = await fetch(
            `${API_URL}/api/users`,
            {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        const data = await response.json();

        const usersDiv = document.getElementById("users");

        usersDiv.innerHTML = "";

        if (!response.ok) {
            usersDiv.innerHTML = "<p>Unable to load users.</p>";
            return;
        }

        const users = data.users || [];

        updateStat("totalUsers", users.length);

        updateStat(
            "totalAdmins",
            users.filter(user => user.role === "admin").length
        );

        updateStat(
            "totalManagement",
            users.filter(user => user.role === "management").length
        );

        if (users.length === 0) {
            usersDiv.innerHTML = "<p>No users found.</p>";
            return;
        }

        users.forEach(user => {

            const userElement = document.createElement("div");

            userElement.innerHTML = `
                <hr>

                <p><strong>Name:</strong> ${user.name}</p>

                <p><strong>Email:</strong> ${user.email}</p>

                <p><strong>Current Role:</strong> ${user.role}</p>

                <label for="role-${user._id}">
                    Change Role:
                </label>

                <select id="role-${user._id}">
                    <option value="user" ${user.role === "user" ? "selected" : ""}>
                        User
                    </option>

                    <option value="management" ${user.role === "management" ? "selected" : ""}>
                        Management
                    </option>

                    <option value="admin" ${user.role === "admin" ? "selected" : ""}>
                        Admin
                    </option>
                </select>

                <button onclick="updateUserRole('${user._id}')">
                    Update Role
                </button>

                <p id="message-${user._id}"></p>
            `;

            usersDiv.appendChild(userElement);

        });

    } catch (error) {

        console.error("USER LOAD ERROR:", error);

        document.getElementById("users").innerHTML =
            "<p>Error loading users. Please try again.</p>";

    }

}


// ===============================
// UPDATE USER ROLE
// ===============================

async function updateUserRole(userId) {

    try {

        const roleSelect = document.getElementById(`role-${userId}`);
        const message = document.getElementById(`message-${userId}`);

        const role = roleSelect.value;

        message.textContent = "Updating role...";

        const response = await fetch(
            `${API_URL}/api/users/${userId}/role`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify({ role })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            message.textContent =
                data.message || "Failed to update role.";
            return;
        }

        message.textContent = "Role updated successfully!";

        await loadUsers();

    } catch (error) {

        console.error("ROLE UPDATE ERROR:", error);

        const message = document.getElementById(`message-${userId}`);

        if (message) {
            message.textContent =
                "Something went wrong. Please try again.";
        }

    }

}


// ===============================
// LOAD ALL TASKS
// ===============================

async function loadTasks() {

    try {

        const response = await fetch(
            `${API_URL}/api/tasks`,
            {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        const data = await response.json();

        const tasksDiv = document.getElementById("tasks");

        tasksDiv.innerHTML = "";

        if (!response.ok) {
            tasksDiv.innerHTML = "<p>Unable to load tasks.</p>";
            return;
        }

        const tasks = data.tasks || [];

        updateStat("totalTasks", tasks.length);

        updateStat(
            "todoTasks",
            tasks.filter(task => task.status === "To Do").length
        );

        updateStat(
            "inProgressTasks",
            tasks.filter(task => task.status === "In Progress").length
        );

        updateStat(
            "completedTasks",
            tasks.filter(task => task.status === "Done").length
        );

        if (tasks.length === 0) {
            tasksDiv.innerHTML = "<p>No tasks found.</p>";
            return;
        }

        tasks.forEach(task => {

            const taskElement = document.createElement("div");

            taskElement.innerHTML = `
                <hr>

                <h3>${task.title}</h3>

                <p>${task.description}</p>

                <p>
                    <strong>Priority:</strong> ${task.priority}
                </p>

                <p>
                    <strong>Status:</strong> ${task.status || "Pending"}
                </p>

                <p>
                    <strong>Assigned To:</strong>
                    ${task.assignedTo?.name || "Unknown"}
                </p>
            `;

            tasksDiv.appendChild(taskElement);

        });

    } catch (error) {

        console.error("TASK LOAD ERROR:", error);

        document.getElementById("tasks").innerHTML =
            "<p>Error loading tasks. Please try again.</p>";

    }

}


// ===============================
// LOGOUT
// ===============================

function logout() {

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "login.html";

}


// ===============================
// INITIAL DASHBOARD LOAD
// ===============================

loadUsers();
loadTasks();
