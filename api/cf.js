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
        // ЗАСВАР: SQL query-г зөв хүснэгт (cf_items) рүү, company_id-г ашиглан шүүдэг болгов.
        const { rows } = await query('SELECT * FROM cf_items WHERE company_id = $1', [company_id]);
        res.status(200).json(rows);
    } catch (error) {
        console.error(`Error fetching from cf_items for company ${company_id}:`, error);
        res.status(500).json({ message: `Failed to fetch CF items for company ${company_id}` });
    }
};
