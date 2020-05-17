// importing required packages
const express = require("express");

// declaring middleware
const app = express();
app.use(express.json());

// getting routers
const scrapperRoute = require("./routes/scrapper");

// setting routes
app.use("/fetchsongs", scrapperRoute);

// setting port
const port = 2454;

// starting server on port
app.listen(port);
console.log("Scrapper server started on port", port);
