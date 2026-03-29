const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// GET /api/purchase-orders
router.get('/', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT po.*, s.name AS supplier_name
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
            ORDER BY po.order_date DESC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/purchase-orders
router.post('/', verifyToken, async (req, res) => {
    const { po_id, supplier_id, order_date } = req.body;
    if (!po_id || !supplier_id) return res.status(400).json({ success: false, message: 'po_id and supplier_id required' });
    try {
        await db.query(
            'INSERT INTO purchase_orders (po_id, supplier_id, order_date) VALUES (?, ?, ?)',
            [po_id, supplier_id, order_date || new Date()]
        );
        res.status(201).json({ success: true, message: 'สร้าง PO สำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/purchase-orders/:id
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await db.query('DELETE FROM purchase_orders WHERE po_id = ?', [req.params.id]);
        res.json({ success: true, message: 'ลบ PO สำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
