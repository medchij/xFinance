// config.js
const isBrowser = typeof window !== "undefined";
const isLocalHost = isBrowser && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);

const envUrl =
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) || "";

export const BASE_URL = isLocalHost
  ? "http://localhost:4000" // 🔴 локалд үргэлж энэ
  : (window.__XFINANCE_API_URL ||
     (envUrl ? envUrl.replace(/\/+$/, "") : (isBrowser ? window.location.origin : "")));
