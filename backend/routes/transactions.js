const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// GET /api/transactions - List transactions with joins
router.get('/', verifyToken, async (req, res) => {
    try {
        const { type, limit = 100, offset = 0, search } = req.query;
        let query = `
            SELECT t.*,
                   p.name AS product_name, p.sku,
                   rt.tag_code,
                   u.full_name AS employee_name,
                   fl.zone_code AS from_zone, fl.shelf_id AS from_shelf,
                   tl.zone_code AS to_zone, tl.shelf_id AS to_shelf
            FROM transactions t
            LEFT JOIN products p ON t.product_id = p.id
            LEFT JOIN rfid_tags rt ON t.rfid_tag_id = rt.id
            LEFT JOIN users u ON t.employee_id = u.id
            LEFT JOIN locations fl ON t.from_location_id = fl.id
            LEFT JOIN locations tl ON t.to_location_id = tl.id
            WHERE 1 = 1
        `;
        const params = [];
        if (type) { query += ' AND t.type = ?'; params.push(type); }
        if (search) {
            query += ' AND (t.po_number LIKE ? OR p.name LIKE ? OR p.sku LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        const [rows] = await db.query(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/transactions - Create manual transaction
router.post('/', verifyToken, async (req, res) => {
    const { po_number, type, product_id, quantity, rfid_tag_id, from_location_id, to_location_id, notes } = req.body;
    if (!type || !product_id) return res.status(400).json({ success: false, message: 'Type and product required' });
    try {
        const [result] = await db.query(`
            INSERT INTO transactions (po_number, type, product_id, quantity, rfid_tag_id, from_location_id, to_location_id, employee_id, notes, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')
        `, [po_number, type, product_id, quantity || 1, rfid_tag_id, from_location_id, to_location_id, req.user.id, notes]);

        // Update location count if applicable
        if (to_location_id && type === 'IN') {
            await db.query('UPDATE locations SET current_count = current_count + ? WHERE id = ?', [quantity || 1, to_location_id]);
        }
        if (from_location_id && type === 'OUT') {
            await db.query('UPDATE locations SET current_count = GREATEST(current_count - ?, 0) WHERE id = ?', [quantity || 1, from_location_id]);
        }

        res.status(201).json({ success: true, data: { id: result.insertId }, message: 'บันทึกรายการสำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
