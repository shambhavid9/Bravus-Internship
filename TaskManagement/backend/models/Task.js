const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true
    },

    description: {
        type: String,
        required: true
    },

    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    priority: {
        type: String,
        enum: ["Low", "Medium", "High"],
        default: "Medium"
    },

    status: {
        type: String,
        enum: ["To Do", "In Progress", "In Review", "Done"],
        default: "To Do"
    },

    dueDate: {
        type: Date
    }

}, {
    timestamps: true
});

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;