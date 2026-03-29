const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// GET /api/shipments
router.get('/', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT sh.*, c.name AS customer_name
            FROM shipments sh
            LEFT JOIN customers c ON sh.customer_id = c.customer_id
            ORDER BY sh.ship_date DESC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/shipments
router.post('/', verifyToken, async (req, res) => {
    const { shipment_id, customer_id, ship_date } = req.body;
    if (!shipment_id || !customer_id) return res.status(400).json({ success: false, message: 'shipment_id and customer_id required' });
    try {
        await db.query(
            'INSERT INTO shipments (shipment_id, customer_id, ship_date) VALUES (?, ?, ?)',
            [shipment_id, customer_id, ship_date || new Date()]
        );
        res.status(201).json({ success: true, message: 'สร้าง Shipment สำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/shipments/:id
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await db.query('DELETE FROM shipments WHERE shipment_id = ?', [req.params.id]);
        res.json({ success: true, message: 'ลบ Shipment สำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
