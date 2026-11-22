require("dotenv").config();

const mongoose = require("mongoose");
const dns = require("dns");

const Enquiry = require("./models/Enquiry");
const createApp = require("./app");

// Use Google DNS locally to resolve MongoDB SRV records
if (process.env.NODE_ENV !== "production") {
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
}

const PORT = process.env.PORT || 4000;

const mongoUri = process.env.MONGODB_URI;

console.log("MongoDB URI diagnostic:", {
    exists: Boolean(mongoUri),
    length: mongoUri ? mongoUri.length : 0,
    validScheme: typeof mongoUri === "string" &&
        /^mongodb(\+srv)?:\/\//.test(mongoUri.trim()),
    hasOuterQuotes: typeof mongoUri === "string" &&
        /^["']|["']$/.test(mongoUri.trim())
});

mongoose.connect(mongoUri)
    .then(function() {
        console.log("Mongo connected successfully!");

        const app = createApp(Enquiry);

        app.listen(PORT, function() {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(function(error) {
        console.log("MongoDB connection error:", error);
        process.exit(1);
    });
