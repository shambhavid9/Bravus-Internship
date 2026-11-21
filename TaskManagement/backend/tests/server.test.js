// Set test environment before importing the backend
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "task-test-secret";

const { test } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../server");

// Helper function to generate test tokens
function generateToken(role = "user") {
    return jwt.sign(
        {
            id: "64b000000000000000000001",
            role: role
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );
}

// Test 1: Root route should return a successful response
test("GET / should return API status", async () => {
    const response = await request(app).get("/");

    assert.strictEqual(response.status, 200);
});

// Test 2: Profile route should reject requests without a token
test("GET /api/profile should reject missing token", async () => {
    const response = await request(app).get("/api/profile");

    assert.strictEqual(response.status, 401);
});

// Test 3: Profile route should reject an invalid token
test("GET /api/profile should reject invalid token", async () => {
    const response = await request(app)
        .get("/api/profile")
        .set("Authorization", "Bearer invalid-token");

    assert.strictEqual(response.status, 403);
});

// Test 4: Normal user should not access admin-only route
test("GET /api/admin-test should reject normal user", async () => {
    const response = await request(app)
        .get("/api/admin-test")
        .set("Authorization", `Bearer ${generateToken("user")}`);

    assert.strictEqual(response.status, 403);
});

// Test 5: Admin should access admin-only route
test("GET /api/admin-test should allow admin", async () => {
    const response = await request(app)
        .get("/api/admin-test")
        .set("Authorization", `Bearer ${generateToken("admin")}`);

    assert.strictEqual(response.status, 200);
});

// Test 6: Registration should reject missing fields
test("POST /api/users should reject missing fields", async () => {
    const response = await request(app)
        .post("/api/users")
        .send({});

    assert.strictEqual(response.status, 400);
});

// Test 7: Login should reject missing credentials
test("POST /api/login should reject missing credentials", async () => {
    const response = await request(app)
        .post("/api/login")
        .send({});

    assert.strictEqual(response.status, 400);
});

// Test 8: Task creation should reject missing fields
test("POST /api/tasks should reject missing fields", async () => {
    const response = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${generateToken("management")}`)
        .send({});

    assert.strictEqual(response.status, 400);
});

// Test 9: Task creation should reject invalid priority
test("POST /api/tasks should reject invalid priority", async () => {
    const response = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${generateToken("management")}`)
        .send({
            title: "Test Task",
            description: "Testing invalid priority",
            assignedTo: "64b000000000000000000001",
            priority: "Urgent"
        });

    assert.strictEqual(response.status, 400);
});

// Test 10: Comment route should reject empty comments
test("POST /api/tasks/:id/comments should reject empty comment", async () => {
    const response = await request(app)
        .post("/api/tasks/64b000000000000000000001/comments")
        .set("Authorization", `Bearer ${generateToken("management")}`)
        .send({ text: "" });

    assert.strictEqual(response.status, 400);
});

// Test 11: Comment route should reject comments over 500 characters
test("POST /api/tasks/:id/comments should reject long comment", async () => {
    const response = await request(app)
        .post("/api/tasks/64b000000000000000000001/comments")
       .set("Authorization", `Bearer ${generateToken("management")}`)
        .send({ text: "A".repeat(501) });

    assert.strictEqual(response.status, 400);
});


// Test 12: User should not create tasks
test("POST /api/tasks should reject normal user", async () => {
    const response = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${generateToken("user")}`)
        .send({
            title: "Unauthorized Task",
            description: "Testing user permissions",
            assignedTo: "64b000000000000000000001"
        });

    assert.strictEqual(response.status, 403);
});

// Test 13: User should not update tasks
test("PUT /api/tasks/:id should reject normal user", async () => {
    const response = await request(app)
        .put("/api/tasks/64b000000000000000000001")
        .set("Authorization", `Bearer ${generateToken("user")}`)
        .send({ status: "Done" });

    assert.strictEqual(response.status, 403);
});


test("PATCH status should reject invalid task ID", async () => {
    const response = await request(app)
        .patch("/api/tasks/invalid-id/status")
        .set("Authorization", `Bearer ${generateToken("user")}`)
        .send({ status: "Done" });

    assert.strictEqual(response.status, 400);
});

test("PATCH status should reject invalid status", async () => {
    const response = await request(app)
        .patch("/api/tasks/64b000000000000000000001/status")
        .set("Authorization", `Bearer ${generateToken("user")}`)
        .send({ status: "Completed" });

    assert.strictEqual(response.status, 400);
});

test("PATCH status should reject additional fields", async () => {
    const response = await request(app)
        .patch("/api/tasks/64b000000000000000000001/status")
        .set("Authorization", `Bearer ${generateToken("user")}`)
        .send({
            status: "Done",
            priority: "High"
        });

    assert.strictEqual(response.status, 400);
});

// Test 14: User should not delete tasks
test("DELETE /api/tasks/:id should reject normal user", async () => {
    const response = await request(app)
        .delete("/api/tasks/64b000000000000000000001")
        .set("Authorization", `Bearer ${generateToken("user")}`);

    assert.strictEqual(response.status, 403);
});

// Test 15: User should not add progress comments
test("POST comments should reject normal user", async () => {
    const response = await request(app)
        .post("/api/tasks/64b000000000000000000001/comments")
        .set("Authorization", `Bearer ${generateToken("user")}`)
        .send({ text: "Unauthorized comment" });

    assert.strictEqual(response.status, 403);
});

// Test 16: Invalid task ID should be rejected
test("GET /api/tasks/:id should reject invalid ID", async () => {
    const response = await request(app)
        .get("/api/tasks/invalid-id")
        .set("Authorization", `Bearer ${generateToken("user")}`);

    assert.strictEqual(response.status, 400);
});

// Test 17: Update should reject invalid task ID
test("PUT /api/tasks/:id should reject invalid ID", async () => {
    const response = await request(app)
        .put("/api/tasks/invalid-id")
        .set("Authorization", `Bearer ${generateToken("management")}`)
        .send({ status: "Done" });

    assert.strictEqual(response.status, 400);
});

// Test 18: Delete should reject invalid task ID
test("DELETE /api/tasks/:id should reject invalid ID", async () => {
    const response = await request(app)
        .delete("/api/tasks/invalid-id")
        .set("Authorization", `Bearer ${generateToken("management")}`);

    assert.strictEqual(response.status, 400);
});

// Test 19: Update should reject invalid status
test("PUT /api/tasks should reject invalid status", async () => {
    const response = await request(app)
        .put("/api/tasks/64b000000000000000000001")
        .set("Authorization", `Bearer ${generateToken("management")}`)
        .send({ status: "Completed" });

    assert.strictEqual(response.status, 400);
});

// Test 20: Update should reject invalid priority
test("PUT /api/tasks should reject invalid priority", async () => {
    const response = await request(app)
        .put("/api/tasks/64b000000000000000000001")
        .set("Authorization", `Bearer ${generateToken("management")}`)
        .send({ priority: "Urgent" });

    assert.strictEqual(response.status, 400);
});

// Test 21: Comment should reject invalid task ID
test("POST comments should reject invalid task ID", async () => {
    const response = await request(app)
        .post("/api/tasks/invalid-id/comments")
        .set("Authorization", `Bearer ${generateToken("management")}`)
        .send({ text: "Testing invalid task ID" });

    assert.strictEqual(response.status, 400);
});
