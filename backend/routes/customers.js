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
    const { customer_id, name, phone } = req.body;
    if (!customer_id || !name) return res.status(400).json({ success: false, message: 'customer_id and name required' });
    try {
        await db.query('INSERT INTO customers (customer_id, name, phone) VALUES (?, ?, ?)', [customer_id, name, phone]);
        res.status(201).json({ success: true, message: 'เพิ่ม Customer สำเร็จ' });
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
