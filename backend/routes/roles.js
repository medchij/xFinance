const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET all roles
router.get('/', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM roles ORDER BY name');
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
        const { rows } = await db.query(
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
        const { rows } = await db.query(
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
        const { rowCount } = await db.query('DELETE FROM roles WHERE id = $1', [id]);

        if (rowCount === 0) {
            return res.status(404).json({ msg: 'Role not found' });
        }

        res.json({ msg: 'Role deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// --- Role-Permission Management ---

// GET permissions for a specific role
router.get('/:roleId/permissions', async (req, res) => {
    const { roleId } = req.params;
    try {
        const { rows } = await db.query(
            'SELECT permission_id FROM role_permissions WHERE role_id = $1',
            [roleId]
        );
        const permissionIds = rows.map(r => r.permission_id);
        res.json({ permissionIds });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// POST (assign/update) permissions for a role
router.post('/:roleId/permissions', async (req, res) => {
    const { roleId } = req.params;
    const { permissionIds } = req.body; // Expecting an array of permission IDs

    if (!Array.isArray(permissionIds)) {
        return res.status(400).json({ msg: 'permissionIds must be an array' });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN'); // Start transaction

        // 1. Delete existing permissions for the role
        await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

        // 2. Insert new permissions
        if (permissionIds.length > 0) {
            const values = permissionIds.map(permId => `(${parseInt(roleId, 10)}, ${parseInt(permId, 10)})`).join(',');
            const query = `INSERT INTO role_permissions (role_id, permission_id) VALUES ${values}`;
            await client.query(query);
        }

        await client.query('COMMIT'); // Commit transaction
        res.status(200).json({ msg: 'Permissions updated successfully' });

    } catch (err) {
        await client.query('ROLLBACK'); // Rollback on error
        console.error(err.message);
        res.status(500).send('Server error');
    } finally {
        client.release(); // Release client back to the pool
    }
});

module.exports = router;
