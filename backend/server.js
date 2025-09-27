const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");
const { db } = require("@vercel/postgres");
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Middleware to check for company_id
const requireCompanyId = (req, res, next) => {
    if (!req.query.company_id) {
        return res.status(400).json({ message: "company_id параметрийг заавал дамжуулна уу." });
    }
    next();
};

// Generic function to create a GET endpoint
function createGetEndpoint(app, endpoint, tableName, options = {}) {
    app.get(`/api/${endpoint}`, requireCompanyId, async (req, res) => {
        const { company_id } = req.query;
        const { columns = '*', orderBy = 'id' } = options;
        try {
            const query = `SELECT ${columns} FROM ${tableName} WHERE company_id = $1 ORDER BY ${orderBy};`;
            const { rows } = await db.query(query, [company_id]);
            const result = options.formatter ? options.formatter(rows) : rows;
            res.json(result);
        } catch (err) {
            console.error(`❌ Error fetching ${tableName} for ${company_id}:`, err.message);
            res.status(500).json({ message: `DB-ээс ${tableName} уншихад алдаа гарлаа`, error: err.message });
        }
    });
}

// --- CORE GET ENDPOINTS ---
app.get("/api/companies", async (req, res) => {
    try {
        const { rows } = await db.sql`SELECT id, name FROM companies ORDER BY name;`;
        res.json(rows);
    } catch (err) {
        console.error("❌ Error fetching companies:", err.message);
        res.status(500).json({ message: "DB-ээс компани уншихад алдаа гарлаа", error: err.message });
    }
});

createGetEndpoint(app, 'branch', 'branches', { formatter: r => r.map(i => ({...i, id: i.original_id})) });
createGetEndpoint(app, 'currency', 'currencies', { formatter: r => r.map(i => ({...i, id: i.original_id})) });
createGetEndpoint(app, 'customer', 'customers', { formatter: r => r.map(i => ({...i, id: i.original_id})) });
createGetEndpoint(app, 'glcategory', 'gl_categories', { formatter: r => r.map(i => ({...i, id: i.original_id})) });
createGetEndpoint(app, 'cf', 'cf_items', { formatter: r => r.map(i => ({...i, id: i.original_id})) });
createGetEndpoint(app, 'settings', 'settings', { orderBy: 'name' }); // Returns full record including DB id

createGetEndpoint(app, 'account', 'accounts', {
    formatter: rows => rows.map(r => ({ ...r, "id": r.id.toString(), "Дансны дугаар": r.account_number, "Дансны нэр": r.account_name, "Валют": r.currency, "Салбар": r.branch, "Нээсэн огноо": r.created_at ? new Date(r.created_at).toLocaleString("en-GB") : null}))
});
createGetEndpoint(app, 'glaccount', 'gl_accounts', {
    formatter: rows => rows.map(r => ({ ...r, "id": r.original_id, "Дансны дугаар": r.account_number, "Дансны нэр": r.account_name, "Дансны ангилал": r.category_name, "Валют": r.currency, "Тоолуур": r.counter.toString()}))
});


// --- POST/CREATE ENDPOINTS ---
app.post("/api/account", requireCompanyId, async (req, res) => { /* ...existing code... */ });

app.post("/api/settings", requireCompanyId, async (req, res) => {
    const { company_id } = req.query;
    const { name, value, tab } = req.body;
    if (!name || !value || !tab) {
        return res.status(400).json({ message: "Нэр, утга, таб бүгд шаардлагатай." });
    }
    try {
        const { rows } = await db.sql`
            INSERT INTO settings (company_id, name, value, tab, create_date)
            VALUES (${company_id}, ${name}, ${value}, ${tab}, NOW())
            RETURNING *; 
        `;
        res.status(201).json({ message: "Тохиргоо нэмэгдлээ", data: rows[0] });
    } catch (err) {
        if (err.code === '23505') {
             return res.status(409).json({ message: `'${name}' нэртэй тохиргоо аль хэдийн байна.` });
        }
        console.error(`❌ Error inserting setting for ${company_id}:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- PUT/UPDATE ENDPOINTS ---
app.put("/api/settings/:id", requireCompanyId, async (req, res) => {
    const { company_id } = req.query;
    const { id } = req.params;
    const { value } = req.body;

    if (value === undefined) {
        return res.status(400).json({ message: "'value' талбар шаардлагатай." });
    }

    try {
        const { rows } = await db.sql`
            UPDATE settings
            SET value = ${value}
            WHERE id = ${id} AND company_id = ${company_id}
            RETURNING *;
        `;

        if (rows.length === 0) {
            return res.status(404).json({ message: "Тохиргоо олдсонгүй эсвэл засах эрх байхгүй." });
        }
        res.json({ message: "Амжилттай шинэчлэгдлээ", data: rows[0] });
    } catch (err) {
        console.error(`❌ Error updating setting ${id} for ${company_id}:`, err.message);
        res.status(500).json({ error: "Серверийн алдаа", details: err.message });
    }
});

// SERVER AND HANDLER
if (!process.env.VERCEL) {
  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log(`✅ Local server running at http://localhost:${port}`));
}

module.exports = serverless(app);
