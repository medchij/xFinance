import { BASE_URL } from "../config";
import { getAuthToken } from "../config/token";
import { ActivityTracker } from "./utils/activityTracker";
import logger from "./utils/logger";
import performanceMonitor from "./utils/performanceMonitor";

// Initialize activity tracker for API helpers
const activityTracker = ActivityTracker.getInstance();

export async function withLoading(setLoading, setMessage, fn, functionName = null) {
  try {
    setLoading(true);

    const output = await fn();

    // Only handle HTTP responses for actual API calls
    if (output?.response && typeof output.response.ok !== "undefined") {
      if (!output.response.ok) {
        const text = await output.response.text();
        const errorMsg = "❌ Серверийн алдаа: " + text;
        throw new Error(errorMsg);
      }
    }

    return output;
  } catch (error) {
    const errorMsg = "❌ Алдаа гарлаа: " + (error?.message || error);

    // Logger-д алдааг бичих
    logger.error("withLoading функц дээр алдаа гарлаа", {
      error: error?.message || error,
      errorType: error?.name || "Unknown",
      functionName: functionName || "anonymous",
      stack: error?.stack,
    });

    setMessage(errorMsg);
    throw error;
  } finally {
    setLoading(false);
  }
}

// ЗАСВАР: externalAPI.js-д ашиглахын тулд company_id-аар дууддаг хувилбарыг сэргээв.
export async function loadSettings(company_id) {
  if (!company_id) throw new Error("⚠️ Тохиргоог ачаалахын тулд компани ID шаардлагатай.");
  
  const startTime = performance.now();
  const url = `${BASE_URL}/api/settings?company_id=${company_id}`;
  
  try {
    const res = await fetch(url);
    const duration = performance.now() - startTime;
    
    performanceMonitor.trackApiCall(url, 'GET', duration, res.status);
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "⚠️ Тохиргоог татаж чадсангүй.");
    }
    return await res.json();
  } catch (error) {
    const duration = performance.now() - startTime;
    performanceMonitor.trackApiCall(url, 'GET', duration, null, error.message);
    throw error;
  }
}

export function getSettingValue(settings, name) {
  return settings.find((s) => s.name === name)?.value || "";
}
export function getSettingId(settings, name) {
  return settings.find((s) => s.name === name)?.id || "";
}

// Excel огноог нормчлох туслах функц
export function normalizeExcelDate(value, label) {
  if (!value || (typeof value !== "number" && typeof value !== "string")) {
    throw new Error(`📅 ${label} нүдэнд огноо оруулна уу (2025-01-30 эсвэл Excel огнооны format)`);
  }
  if (typeof value === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    const dateObj = new Date(excelEpoch.getTime() + value * 86400000);
    value = dateObj.toISOString().split("T")[0];
  }
  if (typeof value === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`📅 ${label} буруу байна. YYYY-MM-DD хэлбэртэй байвал зохимжтой.`);
  }
  return value.toString().trim();
}

// 15-с дээш цифртэй тоог Excel-д текстээр хадгалах
export function formatLargeNumber(cell) {
  if (typeof cell === "number" && cell.toString().length > 15) {
    return "'" + cell.toString();
  }
  if (typeof cell === "string" && /^\d{16,}$/.test(cell)) {
    return "'" + cell;
  }
  return cell;
}

// (Сонголт) skipRight параметр: баруун талын n баганыг үл тооцох
export async function hideEmptyColumns(setMessage, skipRight = 14) {
  try {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const usedRange = sheet.getUsedRange();
      usedRange.load(["rowCount", "columnCount"]);
      await context.sync();

      const rowCount = usedRange.rowCount;
      const columnCount = Math.max(0, usedRange.columnCount - (skipRight || 0));
      console.log(`📊 Хэрэглэгдэж буй муж: ${rowCount} мөр, ${columnCount} багана (баруунаас алгассан: ${skipRight})`);

      for (let i = 0; i < columnCount; i++) {
        const colRange = sheet.getRangeByIndexes(0, i, rowCount, 1);
        colRange.load("values");
        await context.sync();

        const values = colRange.values.flat();
        const isEmpty = values.every((val) => val === null || val === "");
        if (isEmpty) colRange.columnHidden = true;
      }

      await context.sync();
      if (setMessage) setMessage("✅ Хоосон баганууд амжилттай нууж дууслаа.");
    });
  } catch (error) {
    console.error("❌ Хоосон багана нуухад алдаа гарлаа:", error);
    if (setMessage) setMessage("❌ Алдаа: " + error.message);
  }
}

// 🎨 Санамсаргүй өнгө үүсгэх (async биш)
export function getRandomPastelColor() {
  const r = Math.floor(180 + Math.random() * 60);
  const g = Math.floor(180 + Math.random() * 60);
  const b = Math.floor(180 + Math.random() * 60);
  return "#" + r.toString(16).padStart(2, "0") + g.toString(16).padStart(2, "0") + b.toString(16).padStart(2, "0");
}

export function handleHttpError(response, result) {
  const statusCode = result?.status?.code;
  const httpCode = response.status;
  const msg = result?.status?.message || result?.message || result?.error || `Серверийн хариу амжилтгүй: ${httpCode}`;

  if (httpCode === 401 || statusCode === 401) {
    throw new Error("Token хүчингүй эсвэл хугацаа нь дууссан байна. Дахин нэвтэрнэ үү.");
  }
  if (httpCode === 404 || statusCode === 404) {
    throw new Error(`Дата олдсонгүй: ${msg}`);
  }
  if (httpCode === 400 || statusCode === 400) {
    throw new Error(`Алдаатай хүсэлт: ${msg}`);
  }

  throw new Error(msg); // илүү зайгүй
}

// ✅ 3) Давхардалгүй хадгалах — set ашиглана
export async function saveSetting(key, value) {
  return await Excel.run(async (context) => {
    const settings = context.workbook.settings;
    settings.set(key, value); // add биш — set (байхгүй бол үүсгэнэ, байвал шинэчилнэ)
    await context.sync();
  });
}

/**
 * Хэрэглэгчийн тохиргоо татах (user_settings table)
 * @param {string} settingKey - Тохиргооны түлхүүр (жишээ: "car_token")
 * @returns {Promise<string|null>} - Тохиргооны утга эсвэл null
 */
export async function getUserSetting(settingKey) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("🔒 Нэвтрэх шаардлагатай. Token олдсонгүй.");
    }

    const response = await fetch(`${BASE_URL}/api/user-settings`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const settings = await response.json();
    return settings[settingKey] || null;
  } catch (error) {
    logger.error("getUserSetting функц дээр алдаа гарлаа", {
      error: error?.message || error,
      settingKey,
    });
    throw error;
  }
}

/**
 * Хэрэглэгчийн тохиргоо хадгалах (user_settings table)
 * @param {string} settingKey - Тохиргооны түлхүүр
 * @param {string} settingValue - Тохиргооны утга
 * @returns {Promise<Object>} - Хадгалагдсан тохиргоо
 */
export async function saveUserSetting(settingKey, settingValue) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("🔒 Нэвтрэх шаардлагатай. Token олдсонгүй.");
    }

    const response = await fetch(`${BASE_URL}/api/user-settings`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        setting_key: settingKey,
        setting_value: settingValue,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    logger.info("Хэрэглэгчийн тохиргоо амжилттай хадгалагдлаа", { settingKey });
    return result;
  } catch (error) {
    logger.error("saveUserSetting функц дээр алдаа гарлаа", {
      error: error?.message || error,
      settingKey,
    });
    throw error;
  }
}
