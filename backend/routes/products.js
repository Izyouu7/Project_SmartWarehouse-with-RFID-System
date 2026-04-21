const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// GET /api/products
router.get('/', verifyToken, async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT p.*,
                    COALESCE(SUM(CASE WHEN t.transaction_type = 'IN' AND (rt.status IS NULL OR rt.status NOT IN ('Pending', 'Unknown')) THEN t.quantity ELSE 0 END), 0)
                  - COALESCE(SUM(CASE WHEN t.transaction_type = 'OUT' AND (rt.status IS NULL OR rt.status = 'Shipped') THEN t.quantity ELSE 0 END), 0)
                    AS stock_count
            FROM products p
            LEFT JOIN rfid_tags rt  ON rt.product_id = p.product_id
            LEFT JOIN transactions t ON t.tag_id      = rt.tag_id
        `;
        const params = [];
        if (search) {
            query += ' WHERE p.name LIKE ? OR p.product_id LIKE ?';
            params.push(`%${search}%`, `%${search}%`);
        }
        query += ' GROUP BY p.product_id HAVING stock_count > 0 ORDER BY p.name';
        const [rows] = await db.query(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/products/:id
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM products WHERE product_id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'ไม่พบสินค้า' });
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/products
router.post('/', verifyToken, async (req, res) => {
    const { product_id, name, reorder_point } = req.body;
    if (!product_id || !name) return res.status(400).json({ success: false, message: 'product_id and name required' });
    try {
        await db.query(
            'INSERT INTO products (product_id, name, reorder_point) VALUES (?, ?, ?)',
            [product_id, name, reorder_point || 10]
        );
        res.status(201).json({ success: true, message: 'เพิ่มสินค้าสำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/products/:id
router.put('/:id', verifyToken, async (req, res) => {
    const { name, reorder_point } = req.body;
    try {
        await db.query(
            'UPDATE products SET name = ?, reorder_point = ? WHERE product_id = ?',
            [name, reorder_point, req.params.id]
        );
        res.json({ success: true, message: 'อัปเดตสินค้าสำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/products/:id
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await db.query('DELETE FROM products WHERE product_id = ?', [req.params.id]);
        res.json({ success: true, message: 'ลบสินค้าสำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
