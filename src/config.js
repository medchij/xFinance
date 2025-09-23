// config.js
export const BASE_URL =
  (typeof window !== "undefined" && window.__XFINANCE_API_URL) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL.replace(/\/+$/, "")
    : "http://localhost:4000");




