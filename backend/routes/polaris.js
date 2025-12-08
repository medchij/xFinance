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

// Helper: user_settings-аас NESSESSION авах
async function getNesSession(userId) {
  const query = `
    SELECT setting_value 
    FROM user_settings 
    WHERE user_id = $1 AND setting_key = $2
  `;

  const result = await db.query(query, [userId, 'polaris_nessession']);

  if (!result.rows || result.rows.length === 0) {
    throw new Error("Хэрэглэгчийн тохиргоонд 'polaris_nessession' байхгүй байна. Profile хуудаснаас нэмнэ үү.");
  }

  return result.rows[0].setting_value;
}

// Helper: Polaris API руу хүсэлт илгээх
async function callPolarisApi(nesSession, operation, requestBody) {
  const response = await fetch("https://cloud2.nes.mn/nes.s.Web/NesFront", {
    method: "POST",
    headers: {
      Cookie: `NESSESSION=${nesSession}`,
      Op: operation,
      origin: "https://cloud2.nes.mn",
      company: "1221",
      referer: "https://cloud2.nes.mn/",
      Role: "1",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Polaris API алдаа: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

// Polaris NES API proxy endpoint - Зээлийн мэдээлэл
router.post("/loan-data", async (req, res) => {
  try {
    const { loanNumber } = req.body;

    if (!loanNumber) {
      return res.status(400).json({ error: "Зээлийн дугаар шаардлагатай" });
    }

    const userId = getUserIdFromToken(req.headers['authorization']);
    if (!userId) {
      return res.status(401).json({ error: "Нэвтрэх шаардлагатай" });
    }

    const nesSession = await getNesSession(userId);

    console.log("🔍 Polaris API хүсэлт:", {
      loanNumber,
      userId,
      nesSession: nesSession.substring(0, 20) + "...",
    });

    const data = await callPolarisApi(nesSession, "13080106", [loanNumber]);
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
    const { status = ['O', 'N'], branchCode = '122101', prodType = ['LOAN', 'LINE'], page = 0, pageSize = 25 } = req.body;

    const userId = getUserIdFromToken(req.headers['authorization']);
    if (!userId) {
      return res.status(401).json({ error: "Нэвтрэх шаардлагатай" });
    }

    const nesSession = await getNesSession(userId);

    console.log("🔍 Polaris зээлийн жагсаалт хүсэлт:", {
      userId,
      status,
      branchCode,
      prodType,
      page,
      pageSize,
      nesSession: nesSession.substring(0, 20) + "...",
    });

    // Request body бэлтгэх
    const filterConditions = [
      {
        "_iField": "STATUS",
        "_iOperation": "IN",
        "_inValues": status
      },
      {
        "_iField": "BRCH_CODE",
        "_iOperation": "=",
        "_iValue": branchCode
      },
      {
        "_iField": "PROD_TYPE",
        "_iOperation": "IN",
        "_inValues": prodType
      }
    ];

    const requestBody = [filterConditions, page, pageSize];
    const data = await callPolarisApi(nesSession, "13080100", requestBody);
    res.json(data);
  } catch (error) {
    console.error("Polaris loan-list алдаа:", error);
    res.status(error.message.includes("нессession") ? 404 : 500).json({
      error: error.message || "Серверийн алдаа",
    });
  }
});

module.exports = router;
