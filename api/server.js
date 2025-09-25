const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const serverless = require("serverless-http");

// 🔍 Файлын замыг тохируулах
const FN_DIR = __dirname;
const BACKEND_DIR = path.join(FN_DIR, "backend");
const DATA_DIR = path.join(BACKEND_DIR, "dataNany"); // эсвэл config-аас уншиж болно

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Test route
app.get("/api/ping", (req, res) => {
  res.json({ pong: true });
});

// ✅ Жишээ: Customer.json унших
app.get("/api/customer", (req, res) => {
  const filePath = path.join(DATA_DIR, "Customer.json");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) return res.status(500).json({ message: "Customer.json уншихад алдаа", error: err.message });
    res.json(JSON.parse(data));
  });
});

module.exports = serverless(app);
