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
    const { name, phone } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    try {
        // Auto-generate supplier_id: S0001, S0002, ...
        const [rows] = await db.query("SELECT supplier_id FROM suppliers WHERE supplier_id REGEXP '^S[0-9]{4}$' ORDER BY supplier_id DESC LIMIT 1");
        let nextNum = 1;
        if (rows.length > 0) {
            nextNum = parseInt(rows[0].supplier_id.slice(1)) + 1;
        }
        const supplier_id = 'S' + String(nextNum).padStart(4, '0');
        await db.query('INSERT INTO suppliers (supplier_id, name, phone) VALUES (?, ?, ?)', [supplier_id, name, phone]);
        res.status(201).json({ success: true, message: 'เพิ่ม Supplier สำเร็จ', supplier_id });
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
