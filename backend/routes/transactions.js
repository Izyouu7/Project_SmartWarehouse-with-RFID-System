const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// GET /api/transactions
router.get('/', verifyToken, async (req, res) => {
    try {
        const { type, limit = 100, offset = 0, search } = req.query;
        let query = `
            SELECT t.*,
                   rt.product_id,
                   p.name          AS product_name,
                   e.name          AS employee_name,
                   po.supplier_id,
                   s.name          AS supplier_name,
                   sh.customer_id,
                   c.name          AS customer_name
            FROM transactions t
            LEFT JOIN rfid_tags rt        ON t.tag_id       = rt.tag_id
            LEFT JOIN products  p         ON rt.product_id  = p.product_id
            LEFT JOIN employees e         ON t.employee_id  = e.employee_id
            LEFT JOIN purchase_orders po  ON t.po_id        = po.po_id
            LEFT JOIN suppliers s         ON po.supplier_id = s.supplier_id
            LEFT JOIN shipments sh        ON t.shipment_id  = sh.shipment_id
            LEFT JOIN customers c         ON sh.customer_id = c.customer_id
            WHERE 1 = 1
        `;
        const params = [];
        if (type) { query += ' AND t.transaction_type = ?'; params.push(type); }
        if (search) {
            query += ' AND (t.po_id LIKE ? OR t.shipment_id LIKE ? OR p.name LIKE ? OR s.name LIKE ? OR c.name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        query += ' ORDER BY t.datetime DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        const [rows] = await db.query(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/transactions
router.post('/', verifyToken, requireAdmin, async (req, res) => {
    let { transaction_type, quantity, employee_id, tag_id, po_id, shipment_id,
          supplier_id, customer_id, product_id, product_name, auto_tag } = req.body;
    if (!transaction_type) return res.status(400).json({ success: false, message: 'transaction_type required' });
    if (transaction_type === 'IN'  && !supplier_id && !po_id)       return res.status(400).json({ success: false, message: 'IN transaction ต้องระบุ supplier_id' });
    if (transaction_type === 'OUT' && !customer_id && !shipment_id) return res.status(400).json({ success: false, message: 'OUT transaction ต้องระบุ customer_id' });

    try {
        // Auto-create PO สำหรับ IN
        if (transaction_type === 'IN' && supplier_id && !po_id) {
            po_id = 'PO' + Date.now().toString().slice(-8);
            await db.query('INSERT INTO purchase_orders (po_id, supplier_id) VALUES (?, ?)', [po_id, supplier_id]);
        }

        // Auto-create Shipment สำหรับ OUT
        if (transaction_type === 'OUT' && customer_id && !shipment_id) {
            shipment_id = 'SH' + Date.now().toString().slice(-6);
            await db.query('INSERT INTO shipments (shipment_id, customer_id) VALUES (?, ?)', [shipment_id, customer_id]);
        }

        // Auto-generate RFID Tag สำหรับ IN
        if (transaction_type === 'IN' && auto_tag && !tag_id) {
            // ถ้าส่ง product_name มา → สร้าง product ใหม่ด้วย
            if (product_name && !product_id) {
                product_id = 'PRD' + Date.now().toString().slice(-7);
                await db.query(
                    'INSERT INTO products (product_id, name, reorder_point) VALUES (?, ?, ?)',
                    [product_id, product_name, 0]
                );
            }
            if (product_id) {
                tag_id = 'TAG' + Date.now().toString().slice(-5);
                await db.query(
                    'INSERT INTO rfid_tags (tag_id, product_id, status, last_update) VALUES (?, ?, ?, NOW())',
                    [tag_id, product_id, 'Pending']   // Pending = รอ RFID scan ยืนยัน shelf
                );
            }
        }

        const [result] = await db.query(`
            INSERT INTO transactions (transaction_type, quantity, employee_id, tag_id, po_id, shipment_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [transaction_type, quantity || 1, employee_id || null, tag_id || null, po_id || null, shipment_id || null]);

        // อัปเดตสถานะ RFID tag (กรณี tag มีอยู่แล้ว ไม่ได้ auto-generate)
        if (tag_id && !auto_tag) {
            const newStatus = transaction_type === 'IN' ? 'In-Stock' : 'Wait-Scan';
            await db.query('UPDATE rfid_tags SET status = ?, last_update = NOW() WHERE tag_id = ?', [newStatus, tag_id]);
        }

        res.status(201).json({
            success: true,
            data: { id: result.insertId, po_id, shipment_id, tag_id },
            message: `บันทึกสำเร็จ${tag_id ? ' | Tag: ' + tag_id : ''}${po_id ? ' | PO: ' + po_id : ''}${shipment_id ? ' | SH: ' + shipment_id : ''}`
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
