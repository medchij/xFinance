// api/server.js
/* eslint-disable no-undef */
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const fetch = require("node-fetch");

// ----- Paths (Serverless-д найдвартай байх байдлаар) -----
const FN_DIR = __dirname;                        // e.g. /var/task
const BACKEND_DIR = path.join(FN_DIR, "backend"); // includeFiles: backend/** → /var/task/backend
const CONFIG_PATH = path.join(BACKEND_DIR, "config", "current-env.json");

// current-env.json → { "DATA_DIR": "backend/dataNany" } эсвэл "dataNany"/"dataMall" гэх мэт
function loadConfigSafe() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return { DATA_DIR: "backend/dataNany" }; // fallback
  }
}

// DATA_DIR-ийг backend доторх абсолют зам руу тогтмолчлох
function resolveDataDir() {
  const cfg = loadConfigSafe();
  // Хэрэв "backend/..." гэж эхэлсэн бол шууд FN_DIR-тэй join хийе
  if (cfg.DATA_DIR && cfg.DATA_DIR.startsWith("backend")) {
    return path.join(FN_DIR, cfg.DATA_DIR);
  }
  // Зөвхөн "dataNany" гэх мэт өгөгдсөн бол backend доторх хавтсыг заая
  const name = cfg.DATA_DIR || "dataNany";
  return path.join(BACKEND_DIR, name);
}

const DATA_DIR = resolveDataDir();

// ----- Express app -----
const app = express();
app.use(cors());
app.use(express.json());

// Нийтлэг унших helper
async function readJsonFile(filePath) {
  const txt = await fsp.readFile(filePath, "utf8");
  return JSON.parse(txt);
}

// Нийтлэг endpoint helper (GET JSON serve)
function serveJson(filename, humanName) {
  return async (req, res) => {
    try {
      const filePath = path.join(DATA_DIR, filename);
      const data = await readJsonFile(filePath);
      res.status(200).json(data);
    } catch (err) {
      console.error(`[SERVER] ${filename} уншихад алдаа:`, err);
      res.status(500).json({
        message: `${humanName || filename} уншихад алдаа`,
        error: err.message,
      });
    }
  };
}

// ---- Config & Health ----
app.get("/api/ping", (req, res) => res.json({ pong: true }));
app.get("/api/env", (req, res) => {
  res.json({
    DATA_DIR,
    CONFIG_PATH,
    cwd: process.cwd(),
    fn_dir: FN_DIR,
    backend_dir: BACKEND_DIR,
  });
});

// ---- Read endpoints ----
app.get("/api/currency", serveJson("Currency.json", "Currency.json"));
app.get("/api/account", serveJson("Account.json", "Account.json"));
app.get("/api/branch", serveJson("Branch.json", "Branch.json"));
app.get("/api/glaccount", serveJson("GLAccount.json", "GLAccount.json"));
app.get("/api/glcategory", serveJson("GLCatergory.json", "GLCatergory.json"));
app.get("/api/cf", serveJson("CF.json", "CF.json"));
app.get("/api/customer", serveJson("Customer.json", "Customer.json"));
app.get("/api/settings", serveJson("Settings.json", "Settings.json"));

// ---- Write helpers (жишээ хуулбарласан — хүсвэл POST/PUT-уудыг нэмж болно) ----
function createJsonRecord(fileName, generateRecord, uniqueField) {
  return async (req, res) => {
    const filePath = path.join(DATA_DIR, fileName);
    try {
      const raw = await fsp.readFile(filePath, "utf8");
      const records = JSON.parse(raw || "[]");
      const newRec = generateRecord(req.body, records);

      if (uniqueField) {
        const dup = records.find((r) => r[uniqueField] === newRec[uniqueField]);
        if (dup) {
          return res.status(409).json({ type: "validation", message: `${uniqueField} давхардсан байна` });
        }
      }

      records.push(newRec);
      await fsp.writeFile(filePath, JSON.stringify(records, null, 2), "utf8");
      res.status(201).json({ type: "success", message: `${fileName} амжилттай нэмэгдлээ`, data: newRec });
    } catch (err) {
      console.error(`[SERVER] ${fileName} хадгалах үед алдаа:`, err);
      res.status(500).json({ type: "server", message: "Хадгалах үед алдаа", error: err.message });
    }
  };
}

app.post(
  "/api/settings",
  createJsonRecord("Settings.json", (body, records) => ({
    id: (records.length + 1).toString(),
    tab: body.tab,
    name: body.name,
    value: body.value,
    create_date: new Date().toISOString(),
  }), "name")
);

app.post(
  "/api/account",
  createJsonRecord("Account.json", (body, records) => ({
    id: (records.length + 1).toString(),
    "Дансны дугаар": body["Дансны дугаар"],
    "Дансны нэр": body["Дансны нэр"],
    "Валют": body["Валют"],
    "Салбар": body["Салбар"],
    "Нээсэн огноо": new Date().toLocaleString("en-GB"),
  }), "Дансны дугаар")
);

app.post(
  "/api/customer",
  createJsonRecord("Customer.json", (body, records) => ({
    id: (records.length + 1).toString(),
    name: body.name,
    create_date: new Date().toLocaleString("en-GB"),
    status: body.status,
  }), "name")
);

// ---- Proxy sample ----
app.get("/api/merchant/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const r = await fetch(`https://www.opendatalab.mn/search/${id}`);
    const html = await r.text();
    res.status(200).send(html);
  } catch (err) {
    res.status(500).json({ error: "Proxy fetch failed", detail: err.message });
  }
});

// ---- Export as Vercel function handler ----
module.exports = app;
