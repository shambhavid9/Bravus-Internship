const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
    origin: "http://127.0.0.1:5500"
}));

app.use(express.json());

app.get("/", function(req, res) {
    res.send("Bravvus backend is working!");
});

app.post("/api/enquiries", function(req, res) {

  
    const { name, email, message } = req.body;

    console.log("EMAIL RECEIVED:" , email)

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
    console.log(req.body);

    return res.status(200).json({
        message: "Enquiry received successfully!"
    });
});

app.listen(3001, function() {
    console.log("Server is running on port 3001");
});