const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}


async function loadTasks() {

    try {

        const response = await fetch(
            "http://localhost:3001/api/tasks",
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
            tasksDiv.innerHTML = `<p>${data.message || "Failed to load tasks."}</p>`;
            return;
        }

        if (!data.tasks || data.tasks.length === 0) {
            tasksDiv.innerHTML = "<p>No tasks assigned to you.</p>";
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
                <p><strong>Due Date:</strong> ${task.dueDate || "Not set"}</p>
            `;

            tasksDiv.appendChild(taskElement);

        });

    } catch (error) {

        console.error("TASK LOAD ERROR:", error);

        document.getElementById("tasks").innerHTML =
            "<p>Unable to connect to server.</p>";
    }

}


function logout() {

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "login.html";
}