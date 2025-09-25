const path = require("path");
const fs = require("fs");
const express = require("express");
const serverless = require("serverless-http");

const app = express();
const dataDir = path.join(process.cwd(), "backend/dataNany");

app.get("/api/customer", (req, res) => {
  const filePath = path.join(dataDir, "Customer.json");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(JSON.parse(data));
  });
});

module.exports = app;
module.exports.handler = serverless(app);
