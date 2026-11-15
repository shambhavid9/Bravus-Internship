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