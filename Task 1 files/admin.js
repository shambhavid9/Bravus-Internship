
const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}

async function loadUsers() {
    try {
        const response = await fetch(
            "https://bravus-internship-backend.vercel.app/api/users",
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
            usersDiv.innerHTML = `<p>${data.message}</p>`;
            return;
        }

        if (!data.users || data.users.length === 0) {
            usersDiv.innerHTML = "<p>No users found.</p>";
            return;
        }

        data.users.forEach(user => {
            const userElement = document.createElement("div");

            userElement.innerHTML = `
                <hr>
                <p><strong>Name:</strong> ${user.name}</p>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Role:</strong> ${user.role}</p>

                <select id="role-${user._id}">
                    <option value="user" ${user.role === "user" ? "selected" : ""}>User</option>
                    <option value="management" ${user.role === "management" ? "selected" : ""}>Management</option>
                    <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
                </select>

                <button onclick="updateUserRole('${user._id}')">
                    Update Role
                </button>
            `;

            usersDiv.appendChild(userElement);
        });

    } catch (error) {
        console.error("USER LOAD ERROR:", error);
        alert("Unable to load users.");
    }
}

async function updateUserRole(userId) {
    const roleSelect = document.getElementById(`role-${userId}`);
    const newRole = roleSelect.value;

    try {
        const response = await fetch(
            `https://bravus-internship-backend.vercel.app/api/users/${userId}/role`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify({
                    role: newRole
                })
            }
        );

        const data = await response.json();
        alert(data.message);

        if (response.ok) {
            loadUsers();
        }

    } catch (error) {
        console.error("ROLE UPDATE ERROR:", error);
        alert("Unable to update user role.");
    }
}

async function loadTasks() {
    try {
        const response = await fetch(
            "https://bravus-internship-backend.vercel.app/api/tasks",
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
            tasksDiv.innerHTML = `<p>${data.message}</p>`;
            return;
        }

        if (!data.tasks || data.tasks.length === 0) {
            tasksDiv.innerHTML = "<p>No tasks found.</p>";
            return;
        }

        data.tasks.forEach(task => {
            const taskElement = document.createElement("div");

            taskElement.innerHTML = `
                <hr>
                <h3>${task.title}</h3>
                <p>${task.description}</p>
                <p><strong>Priority:</strong> ${task.priority}</p>
                <p><strong>Status:</strong> ${task.status || "Pending"}</p>
                <p><strong>Assigned To:</strong> ${task.assignedTo?.name || "Unknown"}</p>
            `;

            tasksDiv.appendChild(taskElement);
        });

    } catch (error) {
        console.error("TASK LOAD ERROR:", error);
        alert("Unable to load tasks.");
    }
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
}
