const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// GET /api/locations - List all zones/shelves
router.get('/', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT l.*, 
                COUNT(rt.id) AS tag_count,
                ROUND((l.current_count / l.capacity) * 100, 1) AS utilization_pct
            FROM locations l
            LEFT JOIN rfid_tags rt ON l.id = rt.location_id AND rt.status = 'In-Stock'
            WHERE l.is_active = 1
            GROUP BY l.id
            ORDER BY l.zone_code, l.shelf_id
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/locations - Create location
router.post('/', verifyToken, async (req, res) => {
    const { zone_code, shelf_id, description, capacity } = req.body;
    if (!zone_code || !shelf_id) return res.status(400).json({ success: false, message: 'Zone and shelf ID required' });
    try {
        const [result] = await db.query(
            'INSERT INTO locations (zone_code, shelf_id, description, capacity) VALUES (?, ?, ?, ?)',
            [zone_code.toUpperCase(), shelf_id.toUpperCase(), description, capacity || 100]
        );
        res.status(201).json({ success: true, data: { id: result.insertId }, message: 'เพิ่มตำแหน่งสำเร็จ' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Location already exists' });
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/locations/:id - Update location
router.put('/:id', verifyToken, async (req, res) => {
    const { description, capacity } = req.body;
    try {
        await db.query('UPDATE locations SET description=?, capacity=? WHERE id=?', [description, capacity, req.params.id]);
        res.json({ success: true, message: 'อัพเดทตำแหน่งสำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/locations/:id - Soft delete
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await db.query('UPDATE locations SET is_active = 0 WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'ลบตำแหน่งสำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
