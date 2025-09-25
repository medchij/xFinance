const express = require("express");
const cors = require("cors");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const serverless = require("serverless-http");

// ---------------- 🔧 Config ----------------
const CONFIG_PATH = path.join(__dirname, "../backend/config/current-env.json");


function readConfigSafe() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function resolveDataDir() {
  const cfg = readConfigSafe();
  const raw = process.env.DATA_DIR || cfg.DATA_DIR || "../backend/dataNany";
  return raw.startsWith(".")
    ? path.resolve(__dirname, "../", raw)
    : path.resolve(process.cwd(), raw);
}

const jsonFile = (name) => path.join(resolveDataDir(), name);

// ---------------- 🚀 Express ----------------
const app = express();
app.use(cors());
app.use(express.json());

// ---------------- 📁 Serve JSON ----------------
function serveJson(filename, errorMessage) {
  return async (req, res) => {
    try {
      const filePath = jsonFile(filename);
      console.log("📤 Serving:", filePath);
      const data = await fsp.readFile(filePath, "utf8");
      res.json(JSON.parse(data));
    } catch (err) {
      console.error("❌", err.message);
      res.status(500).json({ message: errorMessage, error: err.message });
    }
  };
}

// 🧪 Ping
app.get("/api/ping", (req, res) => {
  const dir = resolveDataDir();
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  res.json({
    dir,
    exists: fs.existsSync(dir),
    files,
    hasAccount: fs.existsSync(jsonFile("Account.json")),
  });
});

// 🧾 JSON Serve Routes
app.get("/api/currency", serveJson("Currency.json", "Currency.json уншихад алдаа"));
app.get("/api/account", serveJson("Account.json", "Account.json уншихад алдаа"));
app.get("/api/branch", serveJson("Branch.json", "Branch.json уншихад алдаа"));
app.get("/api/glaccount", serveJson("GLAccount.json", "GLAccount.json уншихад алдаа"));
app.get("/api/glcategory", serveJson("GLCatergory.json", "GLCatergory.json уншихад алдаа"));
app.get("/api/cf", serveJson("CF.json", "CF.json уншихад алдаа"));
app.get("/api/customer", serveJson("Customer.json", "Customer.json уншихад алдаа"));
app.get("/api/settings", serveJson("Settings.json", "Settings.json уншихад алдаа"));

// Vercel-д зориулсан export
module.exports = serverless(app);
