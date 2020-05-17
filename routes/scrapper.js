// importing required routes
const express = require("express");

// declaring router instance
const router = express.Router();

// importing controllers
const gaanaScrapper = require("../controllers/gaanaScrapper");

// declaring routes
router.get("/gaana", gaanaScrapper.getGaanaSongs);

// exporting router
module.exports = router;
