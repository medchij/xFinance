// config.js
// ✅ Төвлөрсөн тохиргоо

// API-ийн үндсэн зам (.env.production → REACT_APP_API_URL)
export const BASE_URL =
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL)
    ? process.env.REACT_APP_API_URL.replace(/\/+$/, "")
    : "http://localhost:4000";

// ✅ fetch wrapper (timeout + abort)
export async function fetchWithTimeout(input, init = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}
