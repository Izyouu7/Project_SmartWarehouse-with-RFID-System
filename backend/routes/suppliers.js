const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// GET /api/suppliers
router.get('/', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM suppliers ORDER BY name');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/suppliers
router.post('/', verifyToken, async (req, res) => {
    const { supplier_id, name, phone } = req.body;
    if (!supplier_id || !name) return res.status(400).json({ success: false, message: 'supplier_id and name required' });
    try {
        await db.query('INSERT INTO suppliers (supplier_id, name, phone) VALUES (?, ?, ?)', [supplier_id, name, phone]);
        res.status(201).json({ success: true, message: 'เพิ่ม Supplier สำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/suppliers/:id
router.put('/:id', verifyToken, async (req, res) => {
    const { name, phone } = req.body;
    try {
        await db.query('UPDATE suppliers SET name = ?, phone = ? WHERE supplier_id = ?', [name, phone, req.params.id]);
        res.json({ success: true, message: 'อัปเดต Supplier สำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/suppliers/:id
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await db.query('DELETE FROM suppliers WHERE supplier_id = ?', [req.params.id]);
        res.json({ success: true, message: 'ลบ Supplier สำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
