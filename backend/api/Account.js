const fs = require("fs");
const path = require("path");

export default function handler(req, res) {
  try {
    const dataDir = process.env.DATA_DIR || "data"; // Vercel env variable ашиглана
    const filePath = path.join(process.cwd(), dataDir, "Account.json");
    const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
    res.status(200).json(json);
  } catch (err) {
    res.status(500).json({ message: "Account.json уншихад алдаа гарлаа" });
  }
}
