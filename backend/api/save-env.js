export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  // Vercel serverless: persistent file write боломжгүй.
  // Production-д тохиргоо хадгалах бол Vercel KV/Blob/Postgres ашиглана.
  // Түр зуур /tmp-д бичиж болно, гэхдээ deploy хооронд хадгалагдахгүй.

  return res.status(501).json({
    message: "Not Implemented on Vercel. Use Environment Variables or KV/DB.",
  });
}
