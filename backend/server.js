// server.js (Production-ready, files-based storage)
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

// 1) ENV → json config fallback
const envDataDir = process.env.DATA_DIR;     // ж: /var/app/dataMall
const configPath  = path.join(__dirname, "config", "current-env.json");
let fileCfg = {};
try {
  fileCfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch (_) { /* optional */ }

const DATA_DIR = path.resolve(envDataDir || fileCfg.DATA_DIR || "data");

// 2) Server basics
const app = express();
const PORT = process.env.PORT || 4000;

// 3) CORS зөвшөөрөл (frontend origins-оо ENV-ээр заа)
const ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: ORIGINS.length ? ORIGINS : true,
  credentials: true,
}));
app.use(express.json());

console.log("📁 DATA_DIR:", DATA_DIR);
console.log("🌍 ALLOWED_ORIGINS:", ORIGINS.join(", ") || "(all)");

// 4) Туслах – файл унших
function serveJson(filename, errorMessage) {
  return (req, res) => {
    const filePath = path.join(DATA_DIR, filename);
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) return res.status(500).json({ message: errorMessage });
      try {
        res.json(JSON.parse(data));
      } catch {
        res.status(500).json({ message: `${filename} parse алдаа` });
      }
    });
  };
}

// 5) READ endpoints
app.get("/api/currency",  serveJson("Currency.json",  "Currency.json унших алдаа"));
app.get("/api/account",   serveJson("Account.json",   "Account.json унших алдаа"));
app.get("/api/branch",    serveJson("Branch.json",    "Branch.json унших алдаа"));
app.get("/api/glaccount", serveJson("GLAccount.json", "GLAccount.json унших алдаа"));
app.get("/api/glcategory",serveJson("GLCatergory.json","GLCatergory.json унших алдаа"));
app.get("/api/cf",        serveJson("CF.json",        "CF.json унших алдаа"));
app.get("/api/customer",  serveJson("Customer.json",  "Customer.json унших алдаа"));
app.get("/api/settings",  serveJson("Settings.json",  "Settings.json унших алдаа"));

// 6) WRITE helpers
const createJsonRecord = (fileName, generateRecord, uniqueField) => (req, res) => {
  const filePath = path.join(DATA_DIR, fileName);
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) return res.status(500).json({ type: "server", message: `${fileName} унших алдаа` });

    let records = [];
    try { records = JSON.parse(data); } 
    catch { return res.status(500).json({ type: "server", message: `${fileName} parse алдаа` }); }

    const newRecord = generateRecord(req.body, records);
    if (uniqueField && records.some(r => r[uniqueField] === newRecord[uniqueField])) {
      return res.status(409).json({ type: "validation", message: `${uniqueField} давхардсан` });
    }

    records.push(newRecord);
    fs.writeFile(filePath, JSON.stringify(records, null, 2), "utf8", (wErr) => {
      if (wErr) return res.status(500).json({ type: "server", message: "Хадгалах алдаа" });
      res.status(201).json({ type: "success", message: `${fileName} нэмэгдлээ`, data: newRecord });
    });
  });
};

const updateJsonRecord = (fileName, matchFn, updateFn) => (req, res) => {
  const filePath = path.join(DATA_DIR, fileName);
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) return res.status(500).json({ type: "server", message: `${fileName} унших алдаа` });

    let records;
    try { records = JSON.parse(data); }
    catch { return res.status(500).json({ type: "server", message: `${fileName} parse алдаа` }); }

    const idx = records.findIndex(item => matchFn(item, req));
    if (idx === -1) return res.status(404).json({ type: "not_found", message: "Бичлэг олдсонгүй" });

    records[idx] = updateFn(records[idx], req);

    fs.writeFile(filePath, JSON.stringify(records, null, 2), "utf8", (wErr) => {
      if (wErr) return res.status(500).json({ type: "server", message: `${fileName} хадгалах алдаа` });
      res.status(200).json({ type: "success", message: `${fileName} шинэчлэгдлээ`, data: records[idx] });
    });
  });
};

// 7) WRITE endpoints
app.post("/api/settings", createJsonRecord("Settings.json", (body, recs) => ({
  id: (recs.length + 1).toString(),
  tab: body.tab, name: body.name, value: body.value, create_date: new Date().toISOString(),
}), "name"));

app.post("/api/account", createJsonRecord("Account.json", (body, recs) => ({
  id: (recs.length + 1).toString(),
  "Дансны дугаар": body["Дансны дугаар"],
  "Дансны нэр": body["Дансны нэр"],
  "Валют": body["Валют"],
  "Салбар": body["Салбар"],
  "Нээсэн огноо": new Date().toLocaleString("en-GB"),
}), "Дансны дугаар"));

app.post("/api/customer", createJsonRecord("Customer.json", (body, recs) => ({
  id: (recs.length + 1).toString(),
  name: body.name, status: body.status,
  create_date: new Date().toLocaleString("en-GB"),
}), "name"));

app.put("/api/settings/:id", updateJsonRecord(
  "Settings.json",
  (item, req) => item.id === req.params.id,
  (item, req) => {
    if (req.body.name  !== undefined) item.name  = req.body.name;
    if (req.body.value !== undefined) item.value = req.body.value;
    item.update_date = new Date().toISOString();
    return item;
  }
));

app.put("/api/gl-tooluurchange", updateJsonRecord(
  "GLAccount.json",
  (item, req) => item["Дансны дугаар"] === req.body.edd,
  (item) => { item["Тоолуур"] = (parseInt(item["Тоолуур"] || "0") + 1).toString(); return item; }
));

// 8) Proxy (node v18+ global fetch ok)
app.get("/api/merchant/:id", async (req, res) => {
  try {
    const r = await fetch(`https://www.opendatalab.mn/search/${req.params.id}`);
    res.send(await r.text());
  } catch (e) {
    res.status(500).json({ error: "Proxy fetch failed", detail: e.message });
  }
});

// 9) Start
app.listen(PORT, () => console.log(`✅ API running on port ${PORT}`));
