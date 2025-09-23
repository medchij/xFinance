// config.js
export const BASE_URL =
  (typeof window !== "undefined" && window.__XFINANCE_API_URL) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL.replace(/\/+$/, "")
    : "https://x-finance-tau.vercel.app");


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
