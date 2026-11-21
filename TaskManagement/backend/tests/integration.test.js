require("dotenv").config();

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "task-test-secret";

const { before, after, test } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const request = require("supertest");

const User = require("../models/User");
const Task = require("../models/Task");
const app = require("../server");

const runId = crypto.randomUUID();
const createdUserIds = [];
const createdTaskIds = [];

let managementUser;
let assignedUser;
let otherUser;

function generateToken(user) {
    return jwt.sign(
        {
            id: user._id.toString(),
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );
}

// Connect ONLY to the separate test database
before(async () => {
    const uri = process.env.MONGODB_TEST_URI;

    assert.ok(uri, "MONGODB_TEST_URI is missing.");

    const databaseName = new URL(uri).pathname
        .replace(/^\/+/, "")
        .split("/")[0];

    assert.strictEqual(
        databaseName,
        "TaskManagement_Test",
        "Safety check failed: expected TaskManagement_Test database."
    );

    await mongoose.connect(uri);

    managementUser = await User.create({
        name: "Integration Management",
        email: `management-${runId}@test.com`,
        password: "test-password",
        role: "management"
    });

    assignedUser = await User.create({
        name: "Integration User",
        email: `user-${runId}@test.com`,
        password: "test-password",
        role: "user"
    });

    otherUser = await User.create({
        name: "Other Integration User",
        email: `other-${runId}@test.com`,
        password: "test-password",
        role: "user"
    });

    createdUserIds.push(
        managementUser._id,
        assignedUser._id,
        otherUser._id
    );
});

// Clean up only records created by this test
after(async () => {
    if (mongoose.connection.readyState === 1) {
        await Task.deleteMany({
            _id: { $in: createdTaskIds }
        });

        await User.deleteMany({
            _id: { $in: createdUserIds }
        });

        await mongoose.disconnect();
    }
});

test("Complete task management integration workflow", async () => {
    const managementToken = generateToken(managementUser);
    const userToken = generateToken(assignedUser);
    const otherUserToken = generateToken(otherUser);

    // 1. Management creates a task
    const createResponse = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${managementToken}`)
        .send({
            title: `Integration Test ${runId}`,
            description: "Testing the complete task workflow",
            assignedTo: assignedUser._id.toString(),
            priority: "High"
        });

    assert.strictEqual(createResponse.status, 201);

    const taskId = createResponse.body.task._id;
    createdTaskIds.push(taskId);

    // 2. Assigned user can see the task
    const userTasks = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${userToken}`);

    assert.strictEqual(userTasks.status, 200);
    assert.ok(
        userTasks.body.tasks.some(task => task._id === taskId)
    );

    // 3. Assigned user can open the task
    const taskDetails = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${userToken}`);

    assert.strictEqual(taskDetails.status, 200);

    // 4. Unassigned user cannot open the task
    const unauthorizedResponse = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${otherUserToken}`);

    assert.strictEqual(unauthorizedResponse.status, 403);

    // 5. Management updates task status
    const updateResponse = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${managementToken}`)
        .send({ status: "In Progress" });

    assert.strictEqual(updateResponse.status, 200);
    assert.strictEqual(updateResponse.body.task.status, "In Progress");
    assert.strictEqual(updateResponse.body.task.activity.length, 1);

    // 6. Management adds a progress comment
    const commentResponse = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set("Authorization", `Bearer ${managementToken}`)
        .send({ text: "Integration test progress update" });

    assert.strictEqual(commentResponse.status, 201);
    assert.strictEqual(
        commentResponse.body.comments[0].text,
        "Integration test progress update"
    );

    // 7. Management deletes the test task
    const deleteResponse = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${managementToken}`);

    assert.strictEqual(deleteResponse.status, 200);

    // 8. Deleted task should no longer exist
    const missingTask = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${managementToken}`);

    assert.strictEqual(missingTask.status, 404);
});


test("User management and authentication integration workflow", async () => {
    const adminUser = await User.create({
        name: "Integration Admin",
        email: `admin-${runId}@test.com`,
        password: "test-password",
        role: "admin"
    });

    createdUserIds.push(adminUser._id);

    const adminToken = generateToken(adminUser);
    const managementToken = generateToken(managementUser);

    // 1. Register a new user
    const registerResponse = await request(app)
        .post("/api/users")
        .send({
            name: "New Integration User",
            email: `newuser-${runId}@test.com`,
            password: "test-password"
        });

    assert.strictEqual(registerResponse.status, 201);
    assert.strictEqual(registerResponse.body.user.role, "user");

    const registeredUser = await User.findById(
        registerResponse.body.user.id
    );

    createdUserIds.push(registeredUser._id);

    // 2. Login with the registered account
    const loginResponse = await request(app)
        .post("/api/login")
        .send({
            email: `newuser-${runId}@test.com`,
            password: "test-password"
        });

    assert.strictEqual(loginResponse.status, 200);
    assert.ok(loginResponse.body.token);

    // 3. Management fetches users
    const managementUsers = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${managementToken}`);

    assert.strictEqual(managementUsers.status, 200);
    assert.ok(
        managementUsers.body.users.some(
            user => user.email === `newuser-${runId}@test.com`
        )
    );

    // 4. Admin fetches all users
    const adminUsers = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.strictEqual(adminUsers.status, 200);
    assert.ok(
        adminUsers.body.users.some(
            user => user.email === `admin-${runId}@test.com`
        )
    );

    // 5. Admin changes the registered user's role
    const roleResponse = await request(app)
        .put(`/api/users/${registeredUser._id}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "management" });

    assert.strictEqual(roleResponse.status, 200);
    assert.strictEqual(roleResponse.body.user.role, "management");
});


test("Registration should reject an already registered email", async () => {
    const response = await request(app)
        .post("/api/users")
        .send({
            name: "Duplicate Integration User",
            email: managementUser.email,
            password: "test-password"
        });

    assert.strictEqual(response.status, 409);
    assert.strictEqual(
        response.body.message,
        "An account with this email already exists."
    );
});


test("Login should reject an incorrect password", async () => {
    const response = await request(app)
        .post("/api/login")
        .send({
            email: managementUser.email,
            password: "wrong-password"
        });

    assert.strictEqual(response.status, 401);
    assert.strictEqual(
        response.body.message,
        "Invalid email or password."
    );
});

test("Login should reject an unregistered email", async () => {
    const response = await request(app)
        .post("/api/login")
        .send({
            email: `unknown-${runId}@test.com`,
            password: "test-password"
        });

    assert.strictEqual(response.status, 401);
    assert.strictEqual(
        response.body.message,
        "Invalid email or password."
    );
});


test("Task creation should reject an invalid due date", async () => {
    const managementToken = generateToken(managementUser);

    const response = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${managementToken}`)
        .send({
            title: "Invalid Date Test",
            description: "Testing invalid due date validation",
            assignedTo: assignedUser._id.toString(),
            priority: "High",
            dueDate: "not-a-valid-date"
        });

    assert.strictEqual(response.status, 400);
    assert.strictEqual(
        response.body.message,
        "Invalid due date."
    );
});

test("Task creation should reject an invalid assigned user ID", async () => {
    const managementToken = generateToken(managementUser);

    const response = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${managementToken}`)
        .send({
            title: "Invalid User ID Test",
            description: "Testing invalid assigned user ID",
            assignedTo: "invalid-user-id",
            priority: "High"
        });

    assert.strictEqual(response.status, 400);
});

test("Task creation should reject a non-existent assigned user", async () => {
    const managementToken = generateToken(managementUser);
    const nonExistentUserId = new mongoose.Types.ObjectId();

    const response = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${managementToken}`)
        .send({
            title: "Non-existent User Test",
            description: "Testing assigned user that does not exist",
            assignedTo: nonExistentUserId.toString(),
            priority: "High"
        });

    assert.strictEqual(response.status, 404);
});

test("Task update should reject a non-existent task", async () => {
    const managementToken = generateToken(managementUser);
    const nonExistentTaskId = new mongoose.Types.ObjectId();

    const response = await request(app)
        .put(`/api/tasks/${nonExistentTaskId}`)
        .set("Authorization", `Bearer ${managementToken}`)
        .send({
            status: "In Progress"
        });

    assert.strictEqual(response.status, 404);
});

test("Task update should reject a non-existent assigned user", async () => {
    const managementToken = generateToken(managementUser);
    const nonExistentUserId = new mongoose.Types.ObjectId();

    const task = await Task.create({
        title: "Update Assigned User Test",
        description: "Testing update with a non-existent user",
        assignedTo: assignedUser._id,
        createdBy: managementUser._id,
        priority: "High",
        status: "To Do"
    });

    createdTaskIds.push(task._id);

    const response = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set("Authorization", `Bearer ${managementToken}`)
        .send({
            assignedTo: nonExistentUserId.toString()
        });

    assert.strictEqual(response.status, 404);
});

test("Task update should reject an invalid due date", async () => {
    const managementToken = generateToken(managementUser);

    const task = await Task.create({
        title: "Invalid Update Date Test",
        description: "Testing invalid due date during update",
        assignedTo: assignedUser._id,
        createdBy: managementUser._id,
        priority: "High",
        status: "To Do"
    });

    createdTaskIds.push(task._id);

    const response = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set("Authorization", `Bearer ${managementToken}`)
        .send({
            dueDate: "not-a-valid-date"
        });

    assert.strictEqual(response.status, 400);
});

test("Task deletion should reject a non-existent task", async () => {
    const managementToken = generateToken(managementUser);
    const nonExistentTaskId = new mongoose.Types.ObjectId();

    const response = await request(app)
        .delete(`/api/tasks/${nonExistentTaskId}`)
        .set("Authorization", `Bearer ${managementToken}`);

    assert.strictEqual(response.status, 404);
});

test("Adding a comment should reject a non-existent task", async () => {
    const managementToken = generateToken(managementUser);
    const nonExistentTaskId = new mongoose.Types.ObjectId();

    const response = await request(app)
        .post(`/api/tasks/${nonExistentTaskId}/comments`)
        .set("Authorization", `Bearer ${managementToken}`)
        .send({
            text: "Testing comment on a missing task"
        });

    assert.strictEqual(response.status, 404);
});

test("User role update should reject an invalid role", async () => {
    const adminToken = generateToken({
        _id: new mongoose.Types.ObjectId(),
        role: "admin"
    });

    const response = await request(app)
        .put(`/api/users/${assignedUser._id}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            role: "superadmin"
        });

    assert.strictEqual(response.status, 400);
});

test("User role update should reject a non-existent user", async () => {
    const adminToken = generateToken({
        _id: new mongoose.Types.ObjectId(),
        role: "admin"
    });

    const nonExistentUserId = new mongoose.Types.ObjectId();

    const response = await request(app)
        .put(`/api/users/${nonExistentUserId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            role: "management"
        });

    assert.strictEqual(response.status, 404);
});

test("Admin should not be allowed to change their own role", async () => {
    const admin = await User.create({
        name: "Self Role Test Admin",
        email: `selfrole-${runId}@test.com`,
        password: "TestPassword123",
        role: "admin"
    });

    createdUserIds.push(admin._id);

    const adminToken = generateToken(admin);

    const response = await request(app)
        .put(`/api/users/${admin._id}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            role: "user"
        });

    assert.strictEqual(response.status, 403);
});

test("Admin should successfully update another user's role", async () => {
    const admin = await User.create({
        name: "Role Update Admin",
        email: `roleadmin-${runId}@test.com`,
        password: "TestPassword123",
        role: "admin"
    });

    createdUserIds.push(admin._id);

    const adminToken = generateToken(admin);

    const response = await request(app)
        .put(`/api/users/${assignedUser._id}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            role: "management"
        });

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.user.role, "management");
});

test("Management should only fetch regular users without passwords", async () => {
    const managementToken = generateToken(managementUser);

    const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${managementToken}`);

    assert.strictEqual(response.status, 200);

    assert.ok(
        response.body.users.every(user => user.role === "user")
    );

    assert.ok(
        response.body.users.every(user => !user.password)
    );
});

test("Admin should fetch all users without passwords", async () => {
    const admin = await User.create({
        name: "User List Admin",
        email: `listadmin-${runId}@test.com`,
        password: "TestPassword123",
        role: "admin"
    });

    createdUserIds.push(admin._id);

    const adminToken = generateToken(admin);

    const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.strictEqual(response.status, 200);

    assert.ok(
        response.body.users.some(user => user.role === "management")
    );

    assert.ok(
        response.body.users.some(user => user.role === "admin")
    );

    assert.ok(
        response.body.users.every(user => !user.password)
    );
});

test("User should only fetch tasks assigned to them", async () => {
    const ownTask = await Task.create({
        title: "User Own Task Test",
        description: "Assigned to the logged-in user",
        assignedTo: assignedUser._id,
        createdBy: managementUser._id,
        priority: "High",
        status: "To Do"
    });

    const otherTask = await Task.create({
        title: "Other User Task Test",
        description: "Assigned to another user",
        assignedTo: otherUser._id,
        createdBy: managementUser._id,
        priority: "Medium",
        status: "To Do"
    });

    createdTaskIds.push(ownTask._id, otherTask._id);

    const userToken = generateToken(assignedUser);

    const response = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${userToken}`);

    assert.strictEqual(response.status, 200);

    assert.ok(
        response.body.tasks.every(
            task => task.assignedTo._id.toString() === assignedUser._id.toString()
        )
    );
});

test("Management should fetch tasks assigned to all users", async () => {
    const firstTask = await Task.create({
        title: "Management Task One",
        description: "Assigned to first user",
        assignedTo: assignedUser._id,
        createdBy: managementUser._id,
        priority: "High",
        status: "To Do"
    });

    const secondTask = await Task.create({
        title: "Management Task Two",
        description: "Assigned to another user",
        assignedTo: otherUser._id,
        createdBy: managementUser._id,
        priority: "Medium",
        status: "To Do"
    });

    createdTaskIds.push(firstTask._id, secondTask._id);

    const managementToken = generateToken(managementUser);

    const response = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${managementToken}`);

    assert.strictEqual(response.status, 200);

    const returnedIds = response.body.tasks.map(
        task => task._id.toString()
    );

    assert.ok(returnedIds.includes(firstTask._id.toString()));
    assert.ok(returnedIds.includes(secondTask._id.toString()));
});

test("User should not fetch a task assigned to another user", async () => {
    const task = await Task.create({
        title: "Restricted Task Test",
        description: "This task belongs to another user",
        assignedTo: otherUser._id,
        createdBy: managementUser._id,
        priority: "Medium",
        status: "To Do"
    });

    createdTaskIds.push(task._id);

    const userToken = generateToken(assignedUser);

    const response = await request(app)
        .get(`/api/tasks/${task._id}`)
        .set("Authorization", `Bearer ${userToken}`);

    assert.strictEqual(response.status, 403);
    assert.strictEqual(response.body.message, "Access denied.");
});

test("User should successfully fetch their own task by ID", async () => {
    const task = await Task.create({
        title: "User Own Task Details",
        description: "This task belongs to the logged-in user",
        assignedTo: assignedUser._id,
        createdBy: managementUser._id,
        priority: "High",
        status: "In Progress"
    });

    createdTaskIds.push(task._id);

    const userToken = generateToken(assignedUser);

    const response = await request(app)
        .get(`/api/tasks/${task._id}`)
        .set("Authorization", `Bearer ${userToken}`);

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.task.title, "User Own Task Details");
});

test("Management should successfully fetch a task by ID", async () => {
    const task = await Task.create({
        title: "Management Task Details",
        description: "Management can access this task",
        assignedTo: assignedUser._id,
        createdBy: managementUser._id,
        priority: "Medium",
        status: "To Do"
    });

    createdTaskIds.push(task._id);

    const managementToken = generateToken(managementUser);

    const response = await request(app)
        .get(`/api/tasks/${task._id}`)
        .set("Authorization", `Bearer ${managementToken}`);

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.task.title, "Management Task Details");
});

test("Management should successfully update a task", async () => {
    const task = await Task.create({
        title: "Task Before Update",
        description: "Original description",
        assignedTo: assignedUser._id,
        createdBy: managementUser._id,
        priority: "Low",
        status: "To Do"
    });

    createdTaskIds.push(task._id);

    const managementToken = generateToken(managementUser);

    const response = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set("Authorization", `Bearer ${managementToken}`)
        .send({
            title: "Task After Update",
            description: "Updated description",
            priority: "High",
            status: "In Progress"
        });

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.task.title, "Task After Update");
    assert.strictEqual(response.body.task.priority, "High");
    assert.strictEqual(response.body.task.status, "In Progress");
});

test("Management should successfully reassign a task", async () => {
    const task = await Task.create({
        title: "Task Reassignment Test",
        description: "Testing task reassignment",
        assignedTo: assignedUser._id,
        createdBy: managementUser._id,
        priority: "Medium",
        status: "To Do"
    });

    createdTaskIds.push(task._id);

    const managementToken = generateToken(managementUser);

    const response = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set("Authorization", `Bearer ${managementToken}`)
        .send({
            assignedTo: otherUser._id.toString()
        });

    assert.strictEqual(response.status, 200);
    assert.strictEqual(
        response.body.task.assignedTo.toString(),
        otherUser._id.toString()
    );
});

test("Task update should reject an invalid assigned user ID", async () => {
    const task = await Task.create({
        title: "Invalid Assignment Test",
        description: "Testing invalid assigned user ID",
        assignedTo: assignedUser._id,
        createdBy: managementUser._id,
        priority: "Medium",
        status: "To Do"
    });

    createdTaskIds.push(task._id);

    const managementToken = generateToken(managementUser);

    const response = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set("Authorization", `Bearer ${managementToken}`)
        .send({
            assignedTo: "invalid-user-id"
        });

    assert.strictEqual(response.status, 400);
    assert.strictEqual(
        response.body.message,
        "Invalid assigned user ID."
    );
});

test("Task update should reject an empty title", async () => {
    const task = await Task.create({
        title: "Original Task Title",
        description: "Testing empty title",
        assignedTo: assignedUser._id,
        createdBy: managementUser._id,
        priority: "Medium",
        status: "To Do"
    });

    createdTaskIds.push(task._id);

    const managementToken = generateToken(managementUser);

    const response = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set("Authorization", `Bearer ${managementToken}`)
        .send({
            title: "   "
        });

    assert.strictEqual(response.status, 400);
    assert.strictEqual(
        response.body.message,
        "Title cannot be empty."
    );
});

test("Task update should reject an empty description", async () => {
    const task = await Task.create({
        title: "Description Validation Test",
        description: "Original description",
        assignedTo: assignedUser._id,
        createdBy: managementUser._id,
        priority: "Medium",
        status: "To Do"
    });

    createdTaskIds.push(task._id);

    const managementToken = generateToken(managementUser);

    const response = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set("Authorization", `Bearer ${managementToken}`)
        .send({
            description: "   "
        });

    assert.strictEqual(response.status, 400);
    assert.strictEqual(
        response.body.message,
        "Description cannot be empty."
    );
});

test("Management should successfully clear a task due date", async () => {
    const task = await Task.create({
        title: "Due Date Clearing Test",
        description: "Testing due date removal",
        assignedTo: assignedUser._id,
        createdBy: managementUser._id,
        priority: "Medium",
        status: "To Do",
        dueDate: new Date("2026-12-20")
    });

    createdTaskIds.push(task._id);

    const managementToken = generateToken(managementUser);

    const response = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set("Authorization", `Bearer ${managementToken}`)
        .send({
            dueDate: ""
        });

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.task.dueDate, null);
});

test("Management should record task status change activity", async () => {
    const task = await Task.create({
        title: "Activity Tracking Test",
        description: "Testing status change activity",
        assignedTo: assignedUser._id,
        createdBy: managementUser._id,
        priority: "Medium",
        status: "To Do"
    });

    createdTaskIds.push(task._id);

    const managementToken = generateToken(managementUser);

    const response = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set("Authorization", `Bearer ${managementToken}`)
        .send({
            status: "In Progress"
        });

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.task.status, "In Progress");
    assert.strictEqual(response.body.task.activity.length, 1);
    assert.strictEqual(
        response.body.task.activity[0].fromStatus,
        "To Do"
    );
    assert.strictEqual(
        response.body.task.activity[0].toStatus,
        "In Progress"
    );
    assert.strictEqual(
        response.body.task.activity[0].changedBy.toString(),
        managementUser._id.toString()
    );
});