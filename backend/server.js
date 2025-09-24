const express = require("express");
const cors = require("cors");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const serverless = require("serverless-http"); // ⬅️ Нэмсэн

const configPath = path.join(__dirname, "config", "current-env.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

const app = express();
const PORT = process.env.PORT || 4000;
app.use(cors());
app.use(express.json());

const dataDir = path.resolve(
  process.env.DATA_DIR || // Vercel → Dashboard Env
    config.DATA_DIR || // config/current-env.json
    "backend/dataNany" // default fallback
);

console.log("📁 DATA_DIR:", dataDir);

// ---------------- Туслах функц ----------------
const jsonFile = (name) => path.join(dataDir, name);

function serveJson(filename, errorMessage) {
  return (req, res) => {
    const filePath = jsonFile(filename);
    console.log("🔎 Serving JSON:", filePath); // ⬅️ энд log нэмлээ
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) return res.status(500).send(errorMessage);
      res.json(JSON.parse(data));
    });
  };
}

const createJsonRecord = (fileName, generateRecord, uniqueField) => async (req, res) => {
  try {
    const filePath = jsonFile(fileName);
    let records = [];

    try {
      const txt = await fsp.readFile(filePath, "utf8");
      records = JSON.parse(txt);
    } catch (_) {}

    const newRecord = generateRecord(req.body, records);

    if (uniqueField) {
      const exists = records.find((r) => r[uniqueField] === newRecord[uniqueField]);
      if (exists) {
        return res.status(409).json({ type: "validation", message: `${uniqueField} давхардсан байна` });
      }
    }

    records.push(newRecord);

    // Prod дээр file write хадгалагдахгүй
    if (process.env.VERCEL) {
      return res.json({ warning: "Prod дээр write хадгалагдахгүй", data: newRecord });
    }

    await fsp.writeFile(filePath, JSON.stringify(records, null, 2), "utf8");
    res.status(201).json({ type: "success", message: `${fileName} нэмэгдлээ`, data: newRecord });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateJsonRecord = (fileName, matchFn, updateFn) => async (req, res) => {
  try {
    const filePath = jsonFile(fileName);
    let records = [];

    try {
      const txt = await fsp.readFile(filePath, "utf8");
      records = JSON.parse(txt);
    } catch (e) {
      return res.status(500).json({ type: "server", message: `${fileName} уншихад алдаа` });
    }

    const idx = records.findIndex((item) => matchFn(item, req));
    if (idx === -1) {
      return res.status(404).json({ type: "not_found", message: "Тухайн бичлэг олдсонгүй" });
    }

    const updated = updateFn(records[idx], req);
    records[idx] = updated;

    if (process.env.VERCEL) {
      return res.json({ warning: "Prod дээр write хадгалагдахгүй", data: updated });
    }

    await fsp.writeFile(filePath, JSON.stringify(records, null, 2), "utf8");
    res.json({ type: "success", message: `${fileName} шинэчлэгдлээ`, data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------- API ----------------
// Env хадгалах (Dev-д л ажиллана)
app.post("/api/save-env", async (req, res) => {
  if (process.env.VERCEL) return res.status(405).json({ error: "Prod дээр хадгалалт хаалттай" });

  const updatedEnv = req.body;
  try {
    await fsp.writeFile(configPath, JSON.stringify(updatedEnv, null, 2), "utf8");
    res.json({ message: "✅ DATA_DIR хадгалагдлаа", data: updatedEnv });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET JSON
app.get("/api/currency", serveJson("Currency.json", "Currency.json уншихад алдаа"));
app.get("/api/account", serveJson("Account.json", "Account.json уншихад алдаа"));
app.get("/api/branch", serveJson("Branch.json", "Branch.json уншихад алдаа"));
app.get("/api/glaccount", serveJson("GLAccount.json", "GLAccount.json уншихад алдаа"));
app.get("/api/glcategory", serveJson("GLCatergory.json", "GLCatergory.json уншихад алдаа"));
app.get("/api/cf", serveJson("CF.json", "CF.json уншихад алдаа"));
app.get("/api/customer", serveJson("Customer.json", "Customer.json уншихад алдаа"));
app.get("/api/settings", serveJson("Settings.json", "Settings.json уншихад алдаа"));

// Proxy жишээ
app.get("/api/merchant/:id", async (req, res) => {
  try {
    const r = await fetch(`https://www.opendatalab.mn/search/${req.params.id}`);
    const html = await r.text();
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: "Proxy fetch failed", detail: err.message });
  }
});

// POST JSON
app.post(
  "/api/settings",
  createJsonRecord(
    "Settings.json",
    (body, records) => ({
      id: (records.length + 1).toString(),
      tab: body.tab,
      name: body.name,
      value: body.value,
      create_date: new Date().toISOString(),
    }),
    "name"
  )
);

app.post(
  "/api/account",
  createJsonRecord(
    "Account.json",
    (body, records) => ({
      id: (records.length + 1).toString(),
      "Дансны дугаар": body["Дансны дугаар"],
      "Дансны нэр": body["Дансны нэр"],
      Валют: body["Валют"],
      Салбар: body["Салбар"],
      "Нээсэн огноо": new Date().toLocaleString("en-GB"),
    }),
    "Дансны дугаар"
  )
);

app.post(
  "/api/customer",
  createJsonRecord(
    "Customer.json",
    (body, records) => ({
      id: (records.length + 1).toString(),
      name: body.name,
      create_date: new Date().toLocaleString("en-GB"),
      status: body.status,
    }),
    "name"
  )
);

// PUT JSON
app.put(
  "/api/settings/:id",
  updateJsonRecord(
    "Settings.json",
    (item, req) => item.id === req.params.id,
    (item, req) => {
      if (req.body.name !== undefined) item.name = req.body.name;
      if (req.body.value !== undefined) item.value = req.body.value;
      item.update_date = new Date().toISOString();
      return item;
    }
  )
);

app.put(
  "/api/gl-tooluurchange",
  updateJsonRecord(
    "GLAccount.json",
    (item, req) => item["Дансны дугаар"] === req.body.edd,
    (item, req) => {
      item["Тоолуур"] = (parseInt(item["Тоолуур"] || "0") + 1).toString();
      return item;
    }
  )
);

if (!process.env.VERCEL) {
  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log(`✅ Local http://localhost:${port}`));
}

// Vercel-д зориулсан handler
module.exports = serverless(app);
