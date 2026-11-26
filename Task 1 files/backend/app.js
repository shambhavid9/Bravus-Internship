
function createApp(Enquiry) {
    const express = require("express");
    const cors = require("cors");

    const app = express();

   app.use(cors({
    origin: [
        "http://127.0.0.1:5500",
        "http://127.0.0.1:5501",
        "https://bravus-complete-website-ipxm0vjd9-sd-9633.vercel.app"
    ]
}));
    app.use(express.json());

    app.get("/", function(req, res) {
        res.send("Bravvus backend is working!");
    });

    app.post("/api/enquiries", async function(req, res) {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({
                message: "Name, email and message are required."
            });
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {
            return res.status(400).json({
                message: "Please enter a valid email address."
            });
        }

        try {
            const newEnquiry = new Enquiry({
                name: name,
                email: email,
                message: message
            });

            await newEnquiry.save();

            return res.status(200).json({
                message: "Enquiry received successfully!"
            });
        } catch (error) {
            return res.status(500).json({
                message: "Failed to save enquiry."
            });
        }
    });

    return app;
}

module.exports = createApp;
