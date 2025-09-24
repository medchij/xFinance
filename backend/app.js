
// ... бусад маршрут ...
// backend/app.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

// ... бүх config, jsonFile, resolveDataDir, routes энд орно ...

const app = express();
app.use(cors());
app.use(express.json());

// 🔽 Routes (GET/POST/PUT)
// app.get(...), app.post(...), app.put(...) — бүгд энд
// ⬇ Энэ хэсэгт нэм
app.get("/api/ping", (req, res) => {
  res.json({ message: "✅ Vercel дээр API ажиллаж байна" });
});
module.exports = app; // ✅ Локал болон serverless-д reuse
