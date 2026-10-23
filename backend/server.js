require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Enquiry = require("./models/Enquiry");

const app = express();

mongoose.connect(process.env.MONGODB_URI)
      .then(function() {
        console.log("Mongo connected successfully!");
      })
      .catch(function(error) {
        console.log("MongoDB connection error:", error);
      });

app.use(cors({
    origin: "http://127.0.0.1:5500"
}));

app.use(express.json());

app.get("/", function(req, res) {
    res.send("Bravvus backend is working!");
});

app.post("/api/enquiries", async function(req, res) {

    const { name, email, message } = req.body;

    console.log("EMAIL RECEIVED:", email);

    // Check empty fields
    if (!name || !email || !message) {
        return res.status(400).json({
            message: "Name, email and message are required."
        });
    }

    // Check email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        console.log("INVALID EMAIL");

        return res.status(400).json({
            message: "Please enter a valid email address."
        });
    }

    console.log("VALID EMAIL");

    try {
        const newEnquiry = new Enquiry({
            name: name,
            email: email,
            message: message
        });

        await newEnquiry.save();

        console.log("ENQUIRY SAVED TO DATABASE");

        return res.status(200).json({
            message: "Enquiry received successfully!"
        });

    } catch (error) {
        console.log("DATABASE ERROR:", error);

        return res.status(500).json({
            message: "Failed to save enquiry."
        });
    }
});

app.listen(3001, function() {
    console.log("Server is running on port 3001");
});