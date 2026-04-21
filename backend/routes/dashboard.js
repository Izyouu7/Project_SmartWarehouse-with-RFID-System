const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// GET /api/dashboard/stats
router.get('/stats', verifyToken, async (req, res) => {
    try {
        const [[{ total_products }]]   = await db.query('SELECT COUNT(*) AS total_products FROM products');
        const [[{ total_tags }]]       = await db.query('SELECT COUNT(*) AS total_tags FROM rfid_tags');
        const [[{ in_stock }]]         = await db.query("SELECT COUNT(*) AS in_stock FROM rfid_tags WHERE status = 'In-Stock'");
        const [[{ wait_scan }]]        = await db.query("SELECT COUNT(*) AS wait_scan FROM rfid_tags WHERE status = 'Wait-Scan'");
        const [[{ shipped }]]          = await db.query("SELECT COUNT(*) AS shipped FROM rfid_tags WHERE status = 'Shipped'");
        const [[{ total_suppliers }]]  = await db.query('SELECT COUNT(*) AS total_suppliers FROM suppliers');
        const [[{ total_customers }]]  = await db.query('SELECT COUNT(*) AS total_customers FROM customers');
        const [[{ tx_today }]]         = await db.query(
            "SELECT COUNT(*) AS tx_today FROM transactions WHERE DATE(datetime) = CURDATE()"
        );
        const [recent_transactions]    = await db.query(`
            SELECT t.transaction_id, t.transaction_type, t.quantity, t.datetime,
                   p.name AS product_name,
                   e.name AS employee_name,
                   s.name AS supplier_name,
                   c.name AS customer_name
            FROM transactions t
            LEFT JOIN rfid_tags rt       ON t.tag_id      = rt.tag_id
            LEFT JOIN products  p        ON rt.product_id = p.product_id
            LEFT JOIN employees e        ON t.employee_id = e.employee_id
            LEFT JOIN purchase_orders po ON t.po_id       = po.po_id
            LEFT JOIN suppliers s        ON po.supplier_id= s.supplier_id
            LEFT JOIN shipments sh       ON t.shipment_id = sh.shipment_id
            LEFT JOIN customers c        ON sh.customer_id= c.customer_id
            ORDER BY t.datetime DESC LIMIT 5
        `);

        res.json({
            success: true,
            data: {
                total_products,
                total_tags,
                in_stock,
                wait_scan,
                shipped,
                total_suppliers,
                total_customers,
                tx_today,
                recent_transactions
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
