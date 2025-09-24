export default function handler(req, res) {
  const host = req.headers.host || "";
  res.status(200).json({
    BASE_URL: process.env.REACT_APP_API_URL || `https://${host}`,
    DATA_DIR: process.env.DATA_DIR || "dataNany",
    NODE_ENV: process.env.NODE_ENV || "production",
  });
}
