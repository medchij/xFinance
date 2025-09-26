// config.js
const isBrowser = typeof window !== "undefined";
const hostname = isBrowser ? window.location.hostname : "";
const isLocalHost = /^localhost$|^127(\.\d+){3}$/.test(hostname);

const envUrl =
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) || "";

/**
 * BASE_URL сонгох логик:
 *  - Локал орчинд (localhost, 127.0.0.1) → http://localhost:4000
 *  - Хэрэв window.__XFINANCE_API_URL заагдсан бол тэр
 *  - Хэрэв envUrl (REACT_APP_API_URL) байвал тэр
 *  - Эцсийн fallback → window.location.origin (production domain)
 */
export const BASE_URL = isLocalHost
  ? "http://localhost:4000"
  : (
      (isBrowser && window.__XFINANCE_API_URL) ||
      (envUrl ? envUrl.replace(/\/+$/, "") : (isBrowser ? window.location.origin : ""))
    );
