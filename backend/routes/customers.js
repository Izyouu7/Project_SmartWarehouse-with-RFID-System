const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// GET /api/customers
router.get('/', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM customers ORDER BY name');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/customers
router.post('/', verifyToken, async (req, res) => {
    const { name, phone } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    try {
        // Auto-generate customer_id: C0000001, C0000002, ...
        const [rows] = await db.query("SELECT customer_id FROM customers WHERE customer_id REGEXP '^C[0-9]{7}$' ORDER BY customer_id DESC LIMIT 1");
        let nextNum = 1;
        if (rows.length > 0) {
            nextNum = parseInt(rows[0].customer_id.slice(1)) + 1;
        }
        const customer_id = 'C' + String(nextNum).padStart(7, '0');
        await db.query('INSERT INTO customers (customer_id, name, phone) VALUES (?, ?, ?)', [customer_id, name, phone]);
        res.status(201).json({ success: true, message: 'เพิ่ม Customer สำเร็จ', customer_id });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/customers/:id
router.put('/:id', verifyToken, async (req, res) => {
    const { name, phone } = req.body;
    try {
        await db.query('UPDATE customers SET name = ?, phone = ? WHERE customer_id = ?', [name, phone, req.params.id]);
        res.json({ success: true, message: 'อัปเดต Customer สำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/customers/:id
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await db.query('DELETE FROM customers WHERE customer_id = ?', [req.params.id]);
        res.json({ success: true, message: 'ลบ Customer สำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
