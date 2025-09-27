const { query } = require('./db.js');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).end('Method Not Allowed');
    }

    const { company_id } = req.query;

    if (!company_id) {
        return res.status(400).json({ message: 'company_id is required' });
    }

    try {
        const { rows } = await query(`SELECT * FROM ${company_id}_customer`);
        res.status(200).json(rows);
    } catch (error) {
        console.error(`Error fetching from ${company_id}_customer:`, error);
        res.status(500).json({ message: `Failed to fetch customers for company ${company_id}` });
    }
};
