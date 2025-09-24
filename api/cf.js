const fs = require("fs");
const path = require("path");
module.exports = (req, res) => {
  try {
    const dir = process.env.DATA_DIR || "backend/dataNany";
    const file = path.join(process.cwd(), dir, "CF.json");
    res.status(200).json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch (e) {
    res.status(500).json({ message: "CF.json уншихад алдаа", error: e.message });
  }
};