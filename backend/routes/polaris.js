const express = require("express");
const router = express.Router();
const db = require("../db");
const fetch = require("node-fetch");
const jwt = require("jsonwebtoken");

// Polaris NES API proxy endpoint
router.post("/loan-data", async (req, res) => {
  try {
    const { loanNumber } = req.body;

    if (!loanNumber) {
      return res.status(400).json({ error: "Зээлийн дугаар шаардлагатай" });
    }

    // JWT-аас хэрэглэгчийн ID авах
    const authHeader = req.headers['authorization'];
    let userId = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.decode(token);
        userId = decoded && decoded.id ? decoded.id : null;
      } catch (e) {
        console.error('JWT decode алдаа:', e);
      }
    }

    if (!userId) {
      return res.status(401).json({ error: "Нэвтрэх шаардлагатай" });
    }

    // user_settings-аас NESSESSION cookie авах
    const userSettingsQuery = `
      SELECT setting_value 
      FROM user_settings 
      WHERE user_id = $1 AND setting_key = $2
    `;

    const settingsResult = await db.query(userSettingsQuery, [userId, 'polaris_nessession']);

    if (!settingsResult.rows || settingsResult.rows.length === 0) {
      return res.status(404).json({
        error: `Хэрэглэгчийн тохиргоонд 'polaris_nessession' байхгүй байна. Profile хуудаснаас нэмнэ үү.`,
      });
    }

    const nesSession = settingsResult.rows[0].setting_value;

    console.log("🔍 Polaris API хүсэлт:", {
      loanNumber,
      userId,
      nesSession: nesSession.substring(0, 20) + "...",
    });

    // Polaris API руу хүсэлт илгээх
    const response = await fetch("https://cloud2.nes.mn/nes.s.Web/NesFront", {
      method: "POST",
      headers: {
        Cookie: `NESSESSION=${nesSession}`,
        Op: "13080106",
        origin: "https://cloud2.nes.mn",
        company: "1221",
        Role: "1",
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify([loanNumber]),
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Polaris API алдаа: ${response.status} ${response.statusText}`,
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Polaris API алдаа:", error);
    res.status(500).json({
      error: "Серверийн алдаа",
      message: error.message,
    });
  }
});

module.exports = router;
