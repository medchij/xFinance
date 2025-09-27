const { query } = require('./db.js');

module.exports = async (req, res) => {
  // Allow only GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Fetch all companies from the 'companies' table
    const { rows } = await query('SELECT id, name FROM companies ORDER BY name');
    
    // Send the list of companies as a JSON response
    res.status(200).json(rows);

  } catch (error) {
    console.error('API Error (companies):', error);
    // Send a generic server error response
    res.status(500).json({ message: 'Failed to fetch companies.' });
  }
};
