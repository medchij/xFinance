//require("dotenv").config(); 


const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "config", "current-env.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());

// ✅ Data directory замыг нэг хувьсагчид хадгалах
const dataDir = path.resolve(config.DATA_DIR || "data");
console.log("📁 DATA_DIR from config:", config.DATA_DIR);
console.log("📁 Full resolved path:", dataDir);

// ✅ GET: JSON файлууд
function serveJson(filename, errorMessage) {
  return (req, res) => {
    const filePath = path.join(dataDir, filename);
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) return res.status(500).send(errorMessage);
      res.json(JSON.parse(data));
    });
  };
}


app.post("/api/save-env", (req, res) => {
  const updatedEnv = req.body; // { DATA_DIR: "./dataMall" }
  const configPath = path.join(__dirname, "config", "current-env.json");

  fs.writeFile(configPath, JSON.stringify(updatedEnv, null, 2), (err) => {
    if (err) {
      console.error("❌ config хадгалахад алдаа:", err);
      return res.status(500).json({ message: "Алдаа гарлаа" });
    }

    console.log("📁 DATA_DIR шинэчлэгдлээ:", updatedEnv.DATA_DIR);
    res.json({ message: "✅ DATA_DIR амжилттай хадгалагдлаа" });
  });
});

/// ✅ GET: JSON файлуудыг API-ээр хүргэх
app.get("/api/currency", serveJson("Currency.json", "Currency.json уншихад алдаа гарлаа"));
app.get("/api/account", serveJson("Account.json", "Account.json уншихад алдаа гарлаа"));
app.get("/api/branch", serveJson("Branch.json", "Branch.json уншихад алдаа гарлаа"));
app.get("/api/glaccount", serveJson("GLAccount.json", "GLAccount.json уншихад алдаа гарлаа"));
app.get("/api/glcategory", serveJson("GLCatergory.json", "GLCatergory.json уншихад алдаа гарлаа"));
app.get("/api/cf", serveJson("CF.json", "CF.json уншихад алдаа гарлаа"));
app.get("/api/customer", serveJson("Customer.json", "Customer.json уншихад алдаа гарлаа"));
app.get("/api/settings", serveJson("Settings.json", "Settings.json уншихад алдаа гарлаа"));

// ✅ DRY: JSON нэмэх
const createJsonRecord = (fileName, generateRecord, uniqueField) => (req, res) => {
  const filePath = path.join(dataDir, fileName);

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error(`[SERVER] ${fileName} уншиж чадсангүй`, err);
      return res.status(500).json({ type: "server", message: `${fileName} уншиж чадсангүй` });
    }

    let records = [];
    try {
      records = JSON.parse(data);
    } catch (parseErr) {
      console.error(`[SERVER] ${fileName} parse хийхэд алдаа гарлаа`, parseErr);
      return res.status(500).json({ type: "server", message: `${fileName} задлахад алдаа гарлаа` });
    }

    const newRecord = generateRecord(req.body, records);

    if (uniqueField) {
      const alreadyExists = records.find((r) => r[uniqueField] === newRecord[uniqueField]);
      if (alreadyExists) {
        return res.status(409).json({ type: "validation", message: `${uniqueField} давхардсан байна` });
      }
    }

    records.push(newRecord);

    fs.writeFile(filePath, JSON.stringify(records, null, 2), "utf8", (writeErr) => {
      if (writeErr) {
        console.error(`[SERVER] ${fileName} хадгалах үед алдаа гарлаа`, writeErr);
        return res.status(500).json({ type: "server", message: "Хадгалах үед алдаа гарлаа" });
      }
      res.status(201).json({
        type: "success",
        message: `${fileName} амжилттай нэмэгдлээ`,
        data: newRecord,
      });
    });
  });
};
app.get("/api/merchant/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const response = await fetch(`https://www.opendatalab.mn/search/${id}`);
    const html = await response.text();
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: "Proxy fetch failed", detail: err.message });
  }
});



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
// ✅ POST: Account
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

// ✅ POST: Customer
app.post(
  "/api/customer",
  createJsonRecord("Customer.json", (body, records) => ({
    id: (records.length + 1).toString(),
    name: body.name,
    create_date: new Date().toLocaleString("en-GB"),
    status: body.status,
  }), "name")
);

// ✅ PUT: Тоолуур шинэчлэх
const updateJsonRecord = (fileName, matchFn, updateFn) => (req, res) => {
  const filePath = path.join(dataDir, fileName);

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error(`[SERVER] ${fileName} уншихад алдаа:`, err);
      return res.status(500).json({ type: "server", message: `${fileName} уншихад алдаа` });
    }

    let records;
    try {
      records = JSON.parse(data);
    } catch (parseErr) {
      return res.status(500).json({ type: "server", message: `${fileName} parse хийхэд алдаа гарлаа` });
    }

    const index = records.findIndex((item) => matchFn(item, req));
    if (index === -1) {
      return res.status(404).json({ type: "not_found", message: "Тухайн бичлэг олдсонгүй" });
    }

    const updatedRecord = updateFn(records[index], req);
    records[index] = updatedRecord;

    fs.writeFile(filePath, JSON.stringify(records, null, 2), "utf8", (writeErr) => {
      if (writeErr) {
        console.error(`[SERVER] ${fileName} хадгалах үед алдаа:`, writeErr);
        return res.status(500).json({ type: "server", message: `${fileName} хадгалах үед алдаа` });
      }

      res.status(200).json({
        type: "success",
        message: `${fileName} амжилттай шинэчлэгдлээ`,
        data: updatedRecord,
      });
    });
  });
};

// ✅ PUT /api/settings/:id
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

// ✅ PUT /api/gl-tooluurchange
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

app.listen(port, () => {
  console.log(`✅ Backend server running at http://localhost:${port}`);
});
