
require("dotenv").config();

const dns = require("dns");

if (!process.env.VERCEL) {
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
}

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User");
const Task = require("./models/Task");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

// MongoDB connection
let dbConnectionPromise;

async function connectDB() {
    if (mongoose.connection.readyState === 1) {
        return;
    }

    if (!dbConnectionPromise) {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is missing.");
        }

        dbConnectionPromise = mongoose.connect(process.env.MONGODB_URI)
            .then(function() {
                console.log("MongoDB connected successfully!");
            })
            .catch(function(error) {
                dbConnectionPromise = null;
                throw error;
            });
    }

    await dbConnectionPromise;
}

// Ensure database is connected before handling API requests
app.use(async function(req, res, next) {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.log("MongoDB connection error:", error.message);

        res.status(503).json({
            message: "Database connection failed."
        });
    }
});

// Root route
app.get("/", function(req, res) {
    res.send("Task Management API is running.");
});

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Access token required."
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, function(error, user) {
        if (error) {
            return res.status(403).json({
                message: "Invalid or expired token."
            });
        }

        req.user = user;
        next();
    });
}

// Role authorization middleware
function authorizeRoles(...allowedRoles) {
    return function(req, res, next) {
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Access denied."
            });
        }

        next();
    };
}

// Get user profile
app.get(
    "/api/profile",
    authenticateToken,
    function(req, res) {
        res.status(200).json({
            message: "Protected route accessed successfully!",
            user: req.user
        });
    }
);

// Admin test route
app.get(
    "/api/admin-test",
    authenticateToken,
    authorizeRoles("admin"),
    function(req, res) {
        res.status(200).json({
            message: "Admin access granted!"
        });
    }
);

// Create user
app.post("/api/users", async function(req, res) {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "Name, email and password are required."
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: name,
            email: email,
            password: hashedPassword,
            role: role || "user"
        });

        await newUser.save();

        res.status(201).json({
            message: "User created successfully!",
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (error) {
        console.log("USER CREATION ERROR:", error);

        res.status(500).json({
            message: "Failed to create user."
        });
    }
});

// Get all users (admin only)

app.get(
    "/api/users",
    authenticateToken,
    authorizeRoles("management", "admin"),
    async function(req, res) {

        try {
            const users = await User.find({
                role: "user"
            }).select("-password");

            res.status(200).json({
                message: "Users fetched successfully!",
                users: users
            });

        } catch (error) {
            console.log("USER FETCH ERROR:", error);

            res.status(500).json({
                message: "Failed to fetch users."
            });
        }

    }
);


// User login
app.post("/api/login", async function(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required."
        });
    }

    try {
        const user = await User.findOne({
            email: email
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            {
                id: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        res.status(200).json({
            message: "Login successful!",
            token: token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.log("LOGIN ERROR:", error);

        res.status(500).json({
            message: "Login failed."
        });
    }
});

// Create task
app.post(
    "/api/tasks",
    authenticateToken,
    authorizeRoles("management", "admin"),
    async function(req, res) {
        const {
            title,
            description,
            assignedTo,
            priority,
            dueDate
        } = req.body;

        if (!title || !description || !assignedTo) {
            return res.status(400).json({
                message: "Title, description and assignedTo are required."
            });
        }

        try {
            const newTask = new Task({
                title: title,
                description: description,
                assignedTo: assignedTo,
                priority: priority || "Medium",
                dueDate: dueDate
            });

            await newTask.save();

            res.status(201).json({
                message: "Task created successfully!",
                task: newTask
            });
        } catch (error) {
            console.log("TASK CREATION ERROR:", error);

            res.status(500).json({
                message: "Failed to create task."
            });
        }
    }
);

// Get tasks
app.get(
    "/api/tasks",
    authenticateToken,
    async function(req, res) {
        try {
            let tasks;

            if (req.user.role === "user") {
                tasks = await Task.find({
                    assignedTo: req.user.id
                }).populate("assignedTo", "name email");
            } else {
                tasks = await Task.find().populate(
                    "assignedTo",
                    "name email"
                );
            }

            res.status(200).json({
                message: "Tasks fetched successfully!",
                tasks: tasks
            });
        } catch (error) {
            console.log("TASK FETCH ERROR:", error);

            res.status(500).json({
                message: "Failed to fetch tasks."
            });
        }
    }
);

// Get task by ID
app.get(
    "/api/tasks/:id",
    authenticateToken,
    async function(req, res) {
        try {
            const task = await Task.findById(req.params.id).populate(
                "assignedTo",
                "name email"
            );

            if (!task) {
                return res.status(404).json({
                    message: "Task not found."
                });
            }

            if (
                req.user.role === "user" &&
                (!task.assignedTo ||
                    task.assignedTo._id.toString() !== req.user.id)
            ) {
                return res.status(403).json({
                    message: "Access denied."
                });
            }

            res.status(200).json({
                message: "Task fetched successfully!",
                task: task
            });
        } catch (error) {
            console.log("TASK FETCH ERROR:", error);

            res.status(500).json({
                message: "Failed to fetch task."
            });
        }
    }
);

// Update task
app.put(
    "/api/tasks/:id",
    authenticateToken,
    authorizeRoles("management", "admin"),
    async function(req, res) {
        const {
            title,
            description,
            assignedTo,
            priority,
            status,
            dueDate
        } = req.body;

        try {
            const task = await Task.findById(req.params.id);

            if (!task) {
                return res.status(404).json({
                    message: "Task not found."
                });
            }

            if (title !== undefined) task.title = title;
            if (description !== undefined) task.description = description;
            if (assignedTo !== undefined) task.assignedTo = assignedTo;
            if (priority !== undefined) task.priority = priority;
            if (status !== undefined) task.status = status;
            if (dueDate !== undefined) task.dueDate = dueDate;

            await task.save();

            res.status(200).json({
                message: "Task updated successfully!",
                task: task
            });
        } catch (error) {
            console.log("TASK UPDATE ERROR:", error);

            res.status(500).json({
                message: "Failed to update task."
            });
        }
    }
);

// Delete task
app.delete(
    "/api/tasks/:id",
    authenticateToken,
    authorizeRoles("management", "admin"),
    async function(req, res) {
        try {
            const task = await Task.findById(req.params.id);

            if (!task) {
                return res.status(404).json({
                    message: "Task not found."
                });
            }

            await Task.findByIdAndDelete(req.params.id);

            res.status(200).json({
                message: "Task deleted successfully!"
            });
        } catch (error) {
            console.log("TASK DELETE ERROR:", error);

            res.status(500).json({
                message: "Failed to delete task."
            });
        }
    }
);

// Local server startup
if (require.main === module) {
    connectDB()
        .then(function() {
            app.listen(3001, function() {
                console.log("Server is running on port 3001");
            });
        })
        .catch(function(error) {
            console.log("MongoDB connection error:", error.message);
        });
}

module.exports = app;
