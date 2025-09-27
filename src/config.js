/**
 * config.js
 * 
 * Аппликэйшний гол тохиргоог агуулна, ялангуяа API-ийн BASE_URL-г.
 */

// --- DEBUGGING: Vercel орчны хувьсагчийг шалгах --- 
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("Raw REACT_APP_API_URL from process.env:", process.env.REACT_APP_API_URL);
// --- END DEBUGGING ---

// API_URL-г орчны хувьсагч (environment variable) болох REACT_APP_API_URL-аас авахыг оролдоно.
const apiUrlFromEnv = (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) || "";
console.log("Parsed apiUrlFromEnv:", apiUrlFromEnv);

// Хэрэв орчны хувьсагч тодорхойлогдоогүй бол локал хөгжүүлэлтийн орчинд ашиглах
// Express серверийн хаягийг заана.
const localApiUrl = 'http://localhost:3001';

/**
 * BASE_URL нь API хүсэлт явуулах үндсэн хаяг болно.
 */
export const BASE_URL = apiUrlFromEnv.replace(/\/+$/, "") || localApiUrl;

console.log("Final BASE_URL:", BASE_URL);
