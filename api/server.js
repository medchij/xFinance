const express = require("express");
const serverless = require("serverless-http");
const fs = require("fs");
const path = require("path");

const FN_DIR = __dirname;                    // /var/task/api/
const BACKEND_DIR = path.join(FN_DIR, "../backend");
const DATA_DIR = path.join(BACKEND_DIR, "dataNany");

const app = express();
app.use(express.json());

// GET: /api/customer
app.get("/api/customer", (req, res) => {
  const filePath = path.join(DATA_DIR, "Customer.json");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) return res.status(500).json({ message: "Customer.json уншихад алдаа", error: err.message });
    res.json(JSON.parse(data));
  });
});

// Ping test
app.get("/api/ping", (req, res) => {
  res.json({ pong: true });
});

module.exports = app;
module.exports.handler = serverless(app);
