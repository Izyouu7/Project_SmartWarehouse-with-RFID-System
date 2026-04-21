const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// GET /api/locations
router.get('/', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM locations ORDER BY zone_id, shelf_id');
        
        // Fetch all items currently in stock on the shelves
        const [items] = await db.query(`
            SELECT 
                rt.shelf_id,
                rt.tag_id, 
                p.name AS product_name,
                COALESCE(SUM(CASE WHEN t.transaction_type = 'IN'  THEN t.quantity ELSE 0 END), 0)
              - COALESCE(SUM(CASE WHEN t.transaction_type = 'OUT' THEN t.quantity ELSE 0 END), 0) AS current_qty
            FROM rfid_tags rt
            LEFT JOIN products p ON rt.product_id = p.product_id
            LEFT JOIN transactions t ON rt.tag_id = t.tag_id
            WHERE rt.shelf_id IS NOT NULL
            GROUP BY rt.shelf_id, rt.tag_id, p.name
            HAVING current_qty > 0
        `);

        // Mapping items into their respective shelves
        rows.forEach(loc => {
            loc.capacity = loc.capacity || 100; // fallback
            loc.items = items.filter(i => i.shelf_id === loc.shelf_id);
            loc.used_capacity = loc.items.reduce((sum, item) => sum + parseInt(item.current_qty), 0);
        });

        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/locations
router.post('/', verifyToken, async (req, res) => {
    const { shelf_id, zone_id, capacity } = req.body;
    if (!shelf_id || !zone_id) return res.status(400).json({ success: false, message: 'shelf_id and zone_id required' });
    try {
        await db.query('INSERT INTO locations (shelf_id, zone_id, capacity) VALUES (?, ?, ?)', [shelf_id, zone_id, capacity || 100]);
        res.status(201).json({ success: true, message: 'เพิ่มชั้นวางสำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/locations/:id
router.put('/:id', verifyToken, async (req, res) => {
    const { zone_id, capacity } = req.body;
    try {
        await db.query('UPDATE locations SET zone_id = ?, capacity = ? WHERE shelf_id = ?', [zone_id, capacity || 100, req.params.id]);
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
