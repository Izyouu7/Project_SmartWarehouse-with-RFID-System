const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// GET /api/products - List all products with RFID tag counts
router.get('/', verifyToken, async (req, res) => {
    try {
        const { search, status } = req.query;
        let query = `
            SELECT 
                p.*,
                COUNT(rt.id) AS total_tags,
                SUM(CASE WHEN rt.status = 'In-Stock' THEN 1 ELSE 0 END) AS in_stock,
                SUM(CASE WHEN rt.status = 'Moving' THEN 1 ELSE 0 END) AS moving,
                SUM(CASE WHEN rt.status = 'Shipped' THEN 1 ELSE 0 END) AS shipped
            FROM products p
            LEFT JOIN rfid_tags rt ON p.id = rt.product_id
            WHERE p.is_active = 1
        `;
        const params = [];
        if (search) {
            query += ' AND (p.sku LIKE ? OR p.name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        query += ' GROUP BY p.id ORDER BY p.created_at DESC';
        const [rows] = await db.query(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/products/:id - Get single product
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/products - Create product
router.post('/', verifyToken, async (req, res) => {
    const { sku, name, description, reorder_point, price, unit } = req.body;
    if (!sku || !name) return res.status(400).json({ success: false, message: 'SKU and name required' });
    try {
        const [result] = await db.query(
            'INSERT INTO products (sku, name, description, reorder_point, price, unit) VALUES (?, ?, ?, ?, ?, ?)',
            [sku, name, description, reorder_point || 10, price || 0, unit || 'pcs']
        );
        res.status(201).json({ success: true, data: { id: result.insertId }, message: 'เพิ่มสินค้าสำเร็จ' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'SKU already exists' });
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/products/:id - Update product
router.put('/:id', verifyToken, async (req, res) => {
    const { name, description, reorder_point, price, unit } = req.body;
    try {
        await db.query(
            'UPDATE products SET name=?, description=?, reorder_point=?, price=?, unit=? WHERE id=?',
            [name, description, reorder_point, price, unit, req.params.id]
        );
        res.json({ success: true, message: 'อัพเดทสินค้าสำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/products/:id - Soft delete
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await db.query('UPDATE products SET is_active = 0 WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'ลบสินค้าสำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
