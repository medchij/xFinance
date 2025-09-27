const { query } = require('./db.js');

module.exports = async (req, res) => {
  const { company_id } = req.query;

  if (!company_id) {
    return res.status(400).json({ message: 'company_id is required' });
  }

  // Use a switch statement to handle different HTTP methods
  switch (req.method) {
    case 'GET':
      await handleGet(req, res, company_id);
      break;
    case 'POST':
      await handlePost(req, res, company_id);
      break;
    case 'PUT':
      await handlePut(req, res, company_id);
      break;
    default:
      // If the method is not supported, send a 405 Method Not Allowed
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

// Handles GET requests to fetch settings
const handleGet = async (req, res, company_id) => {
  try {
    const { rows } = await query(`SELECT * FROM ${company_id}_settings ORDER BY tab, name`);
    res.status(200).json(rows);
  } catch (error) {
    console.error(`Error fetching settings for ${company_id}:`, error);
    res.status(500).json({ message: 'Failed to fetch settings.' });
  }
};

// Handles POST requests to add a new setting
const handlePost = async (req, res, company_id) => {
  const { name, value, tab } = req.body;

  if (!name || !value || !tab) {
    return res.status(400).json({ message: 'name, value, and tab are required fields' });
  }

  try {
    const { rows } = await query(
      `INSERT INTO ${company_id}_settings (name, value, tab) VALUES ($1, $2, $3) RETURNING *`,
      [name, value, tab]
    );
    res.status(201).json(rows[0]); // Return the newly created setting
  } catch (error) {
    console.error(`Error adding setting for ${company_id}:`, error);
    res.status(500).json({ message: 'Failed to add new setting.' });
  }
};

// Handles PUT requests to update an existing setting
const handlePut = async (req, res, company_id) => {
  // Extract the ID from the query parameters, not from the path
  const { id } = req.query;
  const { value } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'Setting ID is required in query parameter' });
  }
  if (value === undefined) {
    return res.status(400).json({ message: 'value is a required field in the body' });
  }

  try {
    const { rows } = await query(
      `UPDATE ${company_id}_settings SET value = $1 WHERE id = $2 RETURNING *`,
      [value, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: `Setting with ID ${id} not found.` });
    }

    res.status(200).json(rows[0]); // Return the updated setting
  } catch (error) {
    console.error(`Error updating setting ${id} for ${company_id}:`, error);
    res.status(500).json({ message: `Failed to update setting.` });
  }
};
