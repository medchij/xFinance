const fs = require("fs");
const path = require("path");

module.exports = (req, res) => {
  try {
    const dir = process.env.DATA_DIR || "backend/dataNany";
    const file = path.join(process.cwd(), dir, "Customer.json");
    const data = fs.readFileSync(file, "utf8");
    res.status(200).json(JSON.parse(data));
  } catch (e) {
    res.status(500).json({
      message: "Customer.json уншихад алдаа",
      error: e.message,
    });
  }
};
