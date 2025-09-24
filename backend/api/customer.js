import fs from "fs";
import path from "path";

export default function handler(req, res) {
  try {
    const dataDir = process.env.DATA_DIR || "dataNany";
    const filePath = path.join(process.cwd(), dataDir, "Customer.json");
    const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
    res.status(200).json(json);
  } catch (err) {
    res.status(500).json({ message: "Customer.json уншихад алдаа гарлаа", error: err.message });
  }
}
