const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// GET /api/dashboard/stats
router.get('/stats', verifyToken, async (req, res) => {
    try {
        const [[productCount]] = await db.query('SELECT COUNT(*) AS total FROM products WHERE is_active=1');
        const [[tagStats]] = await db.query(`
            SELECT
                COUNT(*) AS total_tags,
                SUM(CASE WHEN status='In-Stock' THEN 1 ELSE 0 END) AS in_stock,
                SUM(CASE WHEN status='Moving' THEN 1 ELSE 0 END) AS moving,
                SUM(CASE WHEN status='Shipped' THEN 1 ELSE 0 END) AS shipped,
                SUM(CASE WHEN status='Unknown' THEN 1 ELSE 0 END) AS unknown_tags
            FROM rfid_tags WHERE is_active=1
        `);
        const [[txToday]] = await db.query(`
            SELECT COUNT(*) AS count FROM transactions 
            WHERE DATE(created_at) = CURDATE()
        `);
        const [[locStats]] = await db.query(`
            SELECT COUNT(*) AS total, SUM(current_count) AS total_items FROM locations WHERE is_active=1
        `);

        // Recent scans
        const [recentScans] = await db.query(`
            SELECT rsl.tag_code, rsl.status, rsl.reader_id, rsl.scanned_at,
                   p.name AS product_name, p.sku
            FROM rfid_scan_logs rsl
            LEFT JOIN rfid_tags rt ON rsl.tag_code = rt.tag_code
            LEFT JOIN products p ON rt.product_id = p.id
            ORDER BY rsl.scanned_at DESC LIMIT 10
        `);

        // Low stock products (total RFID in stock < reorder_point)
        const [lowStock] = await db.query(`
            SELECT p.sku, p.name, p.reorder_point,
                   COUNT(CASE WHEN rt.status='In-Stock' THEN 1 END) AS current_stock
            FROM products p
            LEFT JOIN rfid_tags rt ON p.id = rt.product_id
            WHERE p.is_active = 1
            GROUP BY p.id
            HAVING current_stock <= p.reorder_point
            LIMIT 5
        `);

        // Transactions per day (last 7 days)
        const [txTrend] = await db.query(`
            SELECT DATE(created_at) AS date, type, COUNT(*) AS count
            FROM transactions
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at), type
            ORDER BY date ASC
        `);

        res.json({
            success: true,
            data: {
                products: productCount.total,
                tags: tagStats,
                transactions_today: txToday.count,
                locations: locStats,
                recent_scans: recentScans,
                low_stock: lowStock,
                tx_trend: txTrend
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
