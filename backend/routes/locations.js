const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// GET /api/locations
router.get('/', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM locations ORDER BY zone_id, shelf_id');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/locations
router.post('/', verifyToken, async (req, res) => {
    const { shelf_id, zone_id } = req.body;
    if (!shelf_id || !zone_id) return res.status(400).json({ success: false, message: 'shelf_id and zone_id required' });
    try {
        await db.query('INSERT INTO locations (shelf_id, zone_id) VALUES (?, ?)', [shelf_id, zone_id]);
        res.status(201).json({ success: true, message: 'เพิ่มชั้นวางสำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/locations/:id
router.put('/:id', verifyToken, async (req, res) => {
    const { zone_id } = req.body;
    try {
        await db.query('UPDATE locations SET zone_id = ? WHERE shelf_id = ?', [zone_id, req.params.id]);
        res.json({ success: true, message: 'อัปเดตชั้นวางสำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/locations/:id
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await db.query('DELETE FROM locations WHERE shelf_id = ?', [req.params.id]);
        res.json({ success: true, message: 'ลบชั้นวางสำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
