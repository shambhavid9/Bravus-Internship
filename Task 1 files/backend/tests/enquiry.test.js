
const { test } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");

const createApp = require("../app");

function createMockEnquiry(shouldFail = false) {
    return class MockEnquiry {
        constructor(data) {
            this.data = data;
        }

        async save() {
            if (shouldFail) {
                throw new Error("Database save failed");
            }
            return this.data;
        }
    };
}

// Test 1: Valid enquiry
test("Valid enquiry should return 200", async () => {
    const app = createApp(createMockEnquiry());

    const response = await request(app)
        .post("/api/enquiries")
        .send({
            name: "Test User",
            email: "test@example.com",
            message: "This is a test enquiry."
        });

    assert.strictEqual(response.status, 200);
});

// Test 2: Missing fields
test("Missing fields should return 400", async () => {
    const app = createApp(createMockEnquiry());

    const response = await request(app)
        .post("/api/enquiries")
        .send({
            name: "Test User",
            email: "test@example.com"
        });

    assert.strictEqual(response.status, 400);
});

// Test 3: Invalid email
test("Invalid email should return 400", async () => {
    const app = createApp(createMockEnquiry());

    const response = await request(app)
        .post("/api/enquiries")
        .send({
            name: "Test User",
            email: "invalid-email",
            message: "Testing invalid email."
        });

    assert.strictEqual(response.status, 400);
});

// Test 4: Database failure
test("Database failure should return 500", async () => {
    const app = createApp(createMockEnquiry(true));

    const response = await request(app)
        .post("/api/enquiries")
        .send({
            name: "Test User",
            email: "test@example.com",
            message: "Testing database failure."
        });

    assert.strictEqual(response.status, 500);
});
