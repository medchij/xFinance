const express = require("express");
const router = express.Router();
const db = require("../db");
const fetch = require("node-fetch");
const jwt = require("jsonwebtoken");

// Helper: JWT-аас хэрэглэгчийн ID авах
function getUserIdFromToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.decode(token);
    return decoded?.id || null;
  } catch (e) {
    console.error('JWT decode алдаа:', e);
    return null;
  }
}

// Helper: settings хүснэгтээс компаниар тохиргоо авах (companyId заавал)
async function getSettingValue(companyId, key) {
  if (!companyId) {
    throw new Error("company_id шаардлагатай (x-company-id header эсвэл company_id query)");
  }
  const query = `
    SELECT value
    FROM settings
    WHERE company_id = $1 AND name = $2
    LIMIT 1
  `;
  const result = await db.query(query, [companyId, key]);
  if (result.rows && result.rows.length > 0) {
    return result.rows[0].value;
  }
  throw new Error(`'${key}' тохиргоо олдсонгүй (company_id=${companyId})`);
}

// Helper: NESSESSION болон API config-ийг settings-с унших (companyId заавал)
async function getPolarisConfig(userId, companyId) {
  if (!userId) {
    throw new Error("Нэвтрэх шаардлагатай");
  }
  if (!companyId) {
    throw new Error("company_id шаардлагатай (x-company-id header эсвэл company_id query)");
  }

  const nesSession = await getSettingValue(companyId, 'polaris_nessession');
  const apiUrl = await getSettingValue(companyId, 'polaris_api_url');
  const origin = await getSettingValue(companyId, 'polaris_origin');
  const referer = await getSettingValue(companyId, 'polaris_referer');
  const role = await getSettingValue(companyId, 'polaris_role');
  const companyCode = await getSettingValue(companyId, 'polaris_company');

  return {
    nesSession,
    apiUrl,
    origin,
    referer,
    role,
    company: companyCode,
  };
}

// Helper: Polaris API руу хүсэлт илгээх
async function callPolarisApi(config, operation, requestBody) {
  const { nesSession, apiUrl, origin, referer, company, role } = config;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Cookie: `NESSESSION=${nesSession}`,
      Op: operation,
      origin,
      company,
      referer,
      Role: role,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Polaris API алдаа: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

// company_id-г бүх Polaris хүсэлтэд нэг дор баталгаажуулна
router.use((req, res, next) => {
  const companyId = req.query.company_id || req.headers['x-company-id'];

  if (!companyId) {
    return res.status(400).json({ error: 'company_id is required as a query parameter or x-company-id header.' });
  }

  req.company_id = companyId;
  next();
});

// Polaris NES API proxy endpoint - Зээлийн мэдээлэл
router.post("/loan-data", async (req, res) => {
  try {
    const { loanNumber } = req.body;
    const companyId = req.company_id;

    if (!loanNumber) {
      return res.status(400).json({ error: "Зээлийн дугаар шаардлагатай" });
    }

    const userId = getUserIdFromToken(req.headers['authorization']);
    if (!userId) {
      return res.status(401).json({ error: "Нэвтрэх шаардлагатай" });
    }

    const polarisConfig = await getPolarisConfig(userId, companyId);

    console.log("🔍 Polaris API хүсэлт:", {
      loanNumber,
      userId,
      companyId,
      nesSession: polarisConfig.nesSession.substring(0, 20) + "...",
      apiUrl: polarisConfig.apiUrl,
      company: polarisConfig.company,
    });

    const data = await callPolarisApi(polarisConfig, "13080106", [loanNumber]);
    res.json(data);
  } catch (error) {
    console.error("Polaris loan-data алдаа:", error);
    res.status(error.message.includes("нессession") ? 404 : 500).json({
      error: error.message || "Серверийн алдаа",
    });
  }
});

// Polaris NES API - Зээлийн жагсаалт татах endpoint
router.post("/loan-list", async (req, res) => {
  try {
    const { status = ['O', 'N'], prodType = ['LOAN', 'LINE'], page = 0, pageSize = 25 } = req.body;
    const companyId = req.company_id;

    const userId = getUserIdFromToken(req.headers['authorization']);
    if (!userId) {
      return res.status(401).json({ error: "Нэвтрэх шаардлагатай" });
    }

    const polarisConfig = await getPolarisConfig(userId, companyId);

    console.log("🔍 Polaris зээлийн жагсаалт хүсэлт:", {
      userId,
      status,
      prodType,
      page,
      pageSize,
      companyId,
      apiUrl: polarisConfig.apiUrl,
      company: polarisConfig.company,
      nesSession: polarisConfig.nesSession.substring(0, 20) + "...",
    });

    // Request body бэлтгэх
    const filterConditions = [
      {
        "_iField": "STATUS",
        "_iOperation": "IN",
        "_inValues": status
      },
      {
        "_iField": "PROD_TYPE",
        "_iOperation": "IN",
        "_inValues": prodType
      }
    ];

    const requestBody = [filterConditions, page, pageSize];
    const data = await callPolarisApi(polarisConfig, "13080100", requestBody);
    res.json(data);
  } catch (error) {
    console.error("Polaris loan-list алдаа:", error);
    res.status(error.message.includes("нессession") ? 404 : 500).json({
      error: error.message || "Серверийн алдаа",
    });
  }
});

// Polaris NES API - Харилцагчийн жагсаалт татах endpoint
router.post("/customer-list", async (req, res) => {
  try {
    const { status = ['1'], page = 0, pageSize = 1000 } = req.body;
    const companyId = req.company_id;

    const userId = getUserIdFromToken(req.headers['authorization']);
    if (!userId) {
      return res.status(401).json({ error: "Нэвтрэх шаардлагатай" });
    }

    const polarisConfig = await getPolarisConfig(userId, companyId);

    console.log("🔍 Polaris харилцагчийн жагсаалт хүсэлт:", {
      userId,
      status,
      page,
      pageSize,
      companyId,
      apiUrl: polarisConfig.apiUrl,
      company: polarisConfig.company,
      nesSession: polarisConfig.nesSession.substring(0, 20) + "...",
    });

    const filterConditions = [
      {
        "_iField": "STATUS",
        "_iOperation": "IN",
        "_iType": 1,
        "_inValues": status,
      }
    ];

    const requestBody = [filterConditions, page, pageSize];
    const data = await callPolarisApi(polarisConfig, "10201000", requestBody);
    res.json(data);
  } catch (error) {
    console.error("Polaris customer-list алдаа:", error);
    res.status(error.message.includes("нессession") ? 404 : 500).json({
      error: error.message || "Серверийн алдаа",
    });
  }
});

module.exports = router;
