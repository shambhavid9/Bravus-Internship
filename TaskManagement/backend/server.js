
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

// Ensure database is connected before API requests
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

// Create user (public registration always creates User role)
app.post("/api/users", async function(req, res) {
    const { name, email, password } = req.body;

    if (
        typeof name !== "string" ||
        !name.trim() ||
        typeof email !== "string" ||
        !email.trim() ||
        typeof password !== "string" ||
        !password
    ) {
        return res.status(400).json({
            message: "Name, email and password are required."
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: name.trim(),
            email: email.trim(),
            password: hashedPassword,
            role: "user"
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

        if (error.code === 11000) {
            return res.status(409).json({
                message: "An account with this email already exists."
            });
        }

        res.status(500).json({
            message: "Failed to create user."
        });
    }
});

// Get users (Management and Admin)
app.get(
    "/api/users",
    authenticateToken,
    authorizeRoles("management", "admin"),
    async function(req, res) {
        try {
            let users;

            if (req.user.role === "admin") {
                users = await User.find().select("-password");
            } else {
                users = await User.find({
                    role: "user"
                }).select("-password");
            }

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

// Update user role (Admin only)
app.put(
    "/api/users/:id/role",
    authenticateToken,
    authorizeRoles("admin"),
    async function(req, res) {
        const { role } = req.body;

        const validRoles = ["user", "management", "admin"];

        if (!validRoles.includes(role)) {
            return res.status(400).json({
                message: "Invalid role. Use user, management or admin."
            });
        }

        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid user ID."
            });
        }

        try {
            const user = await User.findById(req.params.id);

            if (!user) {
                return res.status(404).json({
                    message: "User not found."
                });
            }

            if (
                user._id.toString() === req.user.id &&
                role !== "admin"
            ) {
                return res.status(403).json({
                    message: "You cannot change your own admin role."
                });
            }

            user.role = role;

            await user.save();

            res.status(200).json({
                message: "User role updated successfully!",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (error) {
            console.log("ROLE UPDATE ERROR:", error);

            res.status(500).json({
                message: "Failed to update user role."
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

// Create task (Management and Admin)
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

        if (
            typeof title !== "string" ||
            !title.trim() ||
            typeof description !== "string" ||
            !description.trim() ||
            !assignedTo
        ) {
            return res.status(400).json({
                message: "Title, description and assignedTo are required."
            });
        }

        const validPriorities = ["Low", "Medium", "High"];

        if (
            priority !== undefined &&
            !validPriorities.includes(priority)
        ) {
            return res.status(400).json({
                message: "Invalid priority. Use Low, Medium or High."
            });
        }

        if (
            dueDate !== undefined &&
            dueDate !== null &&
            dueDate !== "" &&
            isNaN(Date.parse(dueDate))
        ) {
            return res.status(400).json({
                message: "Invalid due date."
            });
        }

        if (!mongoose.isValidObjectId(assignedTo)) {
            return res.status(400).json({
                message: "Invalid assigned user ID."
            });
        }

        try {
            const assignedUser = await User.findById(assignedTo);

            if (!assignedUser) {
                return res.status(404).json({
                    message: "Assigned user not found."
                });
            }

            const newTask = new Task({
                title: title.trim(),
                description: description.trim(),
                assignedTo: assignedTo,
                priority: priority || "Medium",
                dueDate: dueDate || undefined
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
                })
                    .populate("assignedTo", "name email")
                    .populate("comments.createdBy", "name email")
                    .populate("activity.changedBy", "name email");
            } else {
                tasks = await Task.find()
                    .populate("assignedTo", "name email")
                    .populate("comments.createdBy", "name email")
                    .populate("activity.changedBy", "name email");
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
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid task ID."
            });
        }

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

// Update task (Management and Admin)
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

        const validPriorities = ["Low", "Medium", "High"];
        const validStatuses = ["To Do", "In Progress", "In Review", "Done"];

        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid task ID."
            });
        }

        if (
            title !== undefined &&
            (typeof title !== "string" || !title.trim())
        ) {
            return res.status(400).json({
                message: "Title cannot be empty."
            });
        }

        if (
            description !== undefined &&
            (typeof description !== "string" || !description.trim())
        ) {
            return res.status(400).json({
                message: "Description cannot be empty."
            });
        }

        if (
            priority !== undefined &&
            !validPriorities.includes(priority)
        ) {
            return res.status(400).json({
                message: "Invalid priority. Use Low, Medium or High."
            });
        }

        if (
            status !== undefined &&
            !validStatuses.includes(status)
        ) {
            return res.status(400).json({
                message: "Invalid status. Use To Do, In Progress, In Review or Done."
            });
        }

        if (
            dueDate !== undefined &&
            dueDate !== null &&
            dueDate !== "" &&
            isNaN(Date.parse(dueDate))
        ) {
            return res.status(400).json({
                message: "Invalid due date."
            });
        }

        if (
            assignedTo !== undefined &&
            !mongoose.isValidObjectId(assignedTo)
        ) {
            return res.status(400).json({
                message: "Invalid assigned user ID."
            });
        }

        try {
            const task = await Task.findById(req.params.id);

            if (!task) {
                return res.status(404).json({
                    message: "Task not found."
                });
            }

            if (title !== undefined) {
                task.title = title.trim();
            }

            if (description !== undefined) {
                task.description = description.trim();
            }

            if (assignedTo !== undefined) {
                const assignedUser = await User.findById(assignedTo);

                if (!assignedUser) {
                    return res.status(404).json({
                        message: "Assigned user not found."
                    });
                }

                task.assignedTo = assignedTo;
            }

            if (priority !== undefined) {
                task.priority = priority;
            }

           if (status !== undefined && status !== task.status) {
    task.activity.push({
        fromStatus: task.status,
        toStatus: status,
        changedBy: req.user.id
    });

    task.status = status;
}

            if (dueDate !== undefined) {
                task.dueDate = dueDate === "" ? null : dueDate;
            }

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

// Delete task (Management and Admin)
app.delete(
    "/api/tasks/:id",
    authenticateToken,
    authorizeRoles("management", "admin"),
    async function(req, res) {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid task ID."
            });
        }

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


// Add progress comment (Management and Admin)
app.post(
    "/api/tasks/:id/comments",
    authenticateToken,
    authorizeRoles("management", "admin"),
    async function(req, res) {
        const { text } = req.body;

        if (typeof text !== "string" || !text.trim()) {
            return res.status(400).json({
                message: "Comment cannot be empty."
            });
        }

        if (text.trim().length > 500) {
            return res.status(400).json({
                message: "Comment cannot exceed 500 characters."
            });
        }

        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid task ID."
            });
        }

        try {
            const task = await Task.findById(req.params.id);

            if (!task) {
                return res.status(404).json({
                    message: "Task not found."
                });
            }

            task.comments.push({
                text: text.trim(),
                createdBy: req.user.id
            });

            await task.save();

            await task.populate("comments.createdBy", "name email");

            res.status(201).json({
                message: "Progress note added successfully!",
                comments: task.comments
            });

        } catch (error) {
            console.log("COMMENT ERROR:", error);

            res.status(500).json({
                message: "Failed to add progress note."
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
