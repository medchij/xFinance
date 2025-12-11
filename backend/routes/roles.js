const express = require('express');
const router = express.Router();
const { query, pool } = require('../db');

// GET all roles
router.get('/', async (req, res) => {
    try {
        const { rows } = await query('SELECT * FROM roles ORDER BY name');
        res.json(rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// POST a new role
router.post('/', async (req, res) => {
    const { name, description } = req.body;
    if (!name) {
        return res.status(400).json({ msg: 'Role name is required' });
    }

    try {
        const { rows } = await query(
            'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *',
            [name, description]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err.message);
        if (err.code === '23505') { // Unique constraint violation
            return res.status(400).json({ msg: 'Role with that name already exists' });
        }
        res.status(500).send('Server error');
    }
});

// PUT (update) a role
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name) {
        return res.status(400).json({ msg: 'Role name is required' });
    }

    try {
        const { rows } = await query(
            'UPDATE roles SET name = $1, description = $2 WHERE id = $3 RETURNING *',
            [name, description, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ msg: 'Role not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err.message);
        if (err.code === '23505') {
            return res.status(400).json({ msg: 'Role with that name already exists' });
        }
        res.status(500).send('Server error');
    }
});

// DELETE a role
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // We should also handle deletions from role_permissions table (cascade)
        const { rowCount } = await query('DELETE FROM roles WHERE id = $1', [id]);

        if (rowCount === 0) {
            return res.status(404).json({ msg: 'Role not found' });
        }

        res.json({ msg: 'Role deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// --- Role-Actions Management ---

// GET actions for a specific role
router.get('/:roleId/actions', async (req, res) => {
    const { roleId } = req.params;
    try {
        const { rows } = await query(
            `SELECT a.code, a.name, a.description, a.category
             FROM actions a
             INNER JOIN role_actions ra ON a.code = ra.action_code
             WHERE ra.role_id = $1
             ORDER BY a.code`,
            [roleId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// POST (assign/update) actions for a role
router.post('/:roleId/actions', async (req, res) => {
    const { roleId } = req.params;
    const { actionCodes } = req.body; // Expecting an array of action codes

    if (!Array.isArray(actionCodes)) {
        return res.status(400).json({ msg: 'actionCodes must be an array' });
    }

    try {
        // 1. Delete existing actions for the role
        await query('DELETE FROM role_actions WHERE role_id = $1', [roleId]);

        // 2. Insert new actions
        for (const code of actionCodes) {
            await query(
                'INSERT INTO role_actions (role_id, action_code) VALUES ($1, $2)',
                [roleId, code]
            );
        }

        res.status(200).json({ msg: 'Actions updated successfully' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
