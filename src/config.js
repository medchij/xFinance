/**
 * config.js
 * 
 * Аппликэйшний гол тохиргоог агуулна, ялангуяа API-ийн BASE_URL-г.
 */

// API_URL-г орчны хувьсагч (environment variable) болох REACT_APP_API_URL-аас авахыг оролдоно.
// Энэ нь production орчинд build хийхдээ серверийн хаягийг зааж өгөхөд ашиглагдана.
const apiUrlFromEnv = (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) || "";

// Хэрэв орчны хувьсагч тодорхойлогдоогүй бол локал хөгжүүлэлтийн орчинд ашиглах
// Express серверийн хаягийг заана.
const localApiUrl = 'http://localhost:3001';

/**
 * BASE_URL нь API хүсэлт явуулах үндсэн хаяг болно.
 * - Хэрэв REACT_APP_API_URL орчны хувьсагч байгаа бол түүнийг ашиглана.
 * - Байхгүй бол локал хөгжүүлэлтийн `localApiUrl`-г ашиглана.
 */
export const BASE_URL = apiUrlFromEnv.replace(/\/+$/, "") || localApiUrl;
