const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}


document.getElementById("taskForm").addEventListener("submit", async function(event) {

    event.preventDefault();

    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const assignedTo = document.getElementById("assignedTo").value;
    const priority = document.getElementById("priority").value;
    const dueDate = document.getElementById("dueDate").value;

    try {

        const response = await fetch("https://bravus-internship-backend.vercel.app/api/tasks", {
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
            loadTasks();
        }

    } catch (error) {

        console.error(error);
        document.getElementById("message").textContent =
            "Unable to connect to server.";

    }

});


async function loadTasks() {

    try {

        const response = await fetch("https://bravus-internship-backend.vercel.app/api/tasks", {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const data = await response.json();

        const tasksDiv = document.getElementById("tasks");

        tasksDiv.innerHTML = "";

        if (!data.tasks || data.tasks.length === 0) {
            tasksDiv.innerHTML = "<p>No tasks found.</p>";
            return;
        }

        data.tasks.forEach(task => {

            const taskElement = document.createElement("div");

            const assignedUser = task.assignedTo;

taskElement.innerHTML = `

    <hr>
    <h3>${task.title}</h3>

    <p>${task.description}</p>

    <p>Priority: ${task.priority}</p>

    <p>Status: ${task.status || "Pending"}</p>

    <p>Assigned To: ${
        assignedUser && typeof assignedUser === "object"
            ? `${assignedUser.name} (${assignedUser.email})`
            : "Unassigned"
    }</p>

    <button onclick="updateTask('${task._id}')">
        Update
    </button>

    <button onclick="deleteTask('${task._id}')">
        Delete
    </button>
`;

            tasksDiv.appendChild(taskElement);

        });

    } catch (error) {

        console.error(error);

    }

}



async function updateTask(taskId) {

    const newPriority = prompt(
        "Enter priority: Low, Medium or High"
    );

    if (!newPriority) return;

    const newStatus = prompt(
        "Enter status: To Do, In Progress, In Review or Done"
    );

    if (!newStatus) return;

    const priority = newPriority.trim().charAt(0).toUpperCase()
        + newPriority.trim().slice(1).toLowerCase();

    const status = newStatus.trim().toLowerCase().replace(/\b\w/g, char => char.toUpperCase());

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

    try {

        const response = await fetch(
            `https://bravus-internship-backend.vercel.app/api/tasks/${taskId}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify({
                    priority: priority,
                    status: status
                })
            }
        );

        const data = await response.json();

        alert(data.message);

        if (response.ok) {
            loadTasks();
        }

    } catch (error) {

        console.error("UPDATE ERROR:", error);
        alert("Unable to update task.");

    }
}


async function deleteTask(taskId) {
    const confirmDelete = confirm(
        "Are you sure you want to delete this task?"
    );

    if (!confirmDelete) {
        return;
    }

    try {
        const response = await fetch(
            `https://bravus-internship-backend.vercel.app/api/tasks/${taskId}`,
            {
                method: "DELETE",
                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        const data = await response.json();

        alert(data.message);
        if (response.ok) {
            loadTasks();
        }
    } catch (error) {
        console.error("DELETE ERROR:", error);
        alert("Unable to delete task.");
    }
}


function logout() {

    localStorage.removeItem("token");
    localStorage.removeItem("user");

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
            option.textContent = user.name + " (" + user.email + ")";

            assignedTo.appendChild(option);
        });

    } catch (error) {
        console.error("LOAD USERS ERROR:", error);
    }
}


loadUsers();
loadTasks();