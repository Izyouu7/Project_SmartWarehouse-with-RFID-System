const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, verifyApiKey } = require('../middleware/auth');

// GET /api/rfid/tags — ดู RFID tags ทั้งหมด
router.get('/tags', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT rt.*, p.name AS product_name, l.zone_id,
                   COALESCE(SUM(CASE WHEN t.transaction_type = 'IN'  THEN t.quantity ELSE 0 END), 0)
                 - COALESCE(SUM(CASE WHEN t.transaction_type = 'OUT' THEN t.quantity ELSE 0 END), 0) AS current_qty
            FROM rfid_tags rt
            LEFT JOIN products  p ON rt.product_id = p.product_id
            LEFT JOIN locations l ON rt.shelf_id   = l.shelf_id
            LEFT JOIN transactions t ON rt.tag_id = t.tag_id
            GROUP BY rt.tag_id, p.product_id, p.name, l.shelf_id, l.zone_id
            ORDER BY rt.last_update DESC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/rfid/tags/:id
router.get('/tags/:id', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT rt.*, p.name AS product_name, l.zone_id
            FROM rfid_tags rt
            LEFT JOIN products  p ON rt.product_id = p.product_id
            LEFT JOIN locations l ON rt.shelf_id   = l.shelf_id
            WHERE rt.tag_id = ?
        `, [req.params.id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'ไม่พบ Tag' });
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/rfid/tags — เพิ่ม RFID Tag ใหม่
router.post('/tags', verifyToken, async (req, res) => {
    const { tag_id, product_id, shelf_id, status } = req.body;
    if (!tag_id) return res.status(400).json({ success: false, message: 'tag_id required' });
    try {
        await db.query(
            'INSERT INTO rfid_tags (tag_id, product_id, shelf_id, status, last_update) VALUES (?, ?, ?, ?, NOW())',
            [tag_id, product_id || null, shelf_id || null, status || 'Unknown']
        );
        res.status(201).json({ success: true, message: 'เพิ่ม RFID Tag สำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/rfid/scan — รับข้อมูลจาก Raspberry Pi
// ใช้ API Key แทน JWT
router.post('/scan', verifyApiKey, async (req, res) => {
    const { tag_id, shelf_id, action } = req.body;
    if (!tag_id) return res.status(400).json({ success: false, message: 'tag_id required' });
    try {
        const [existing] = await db.query('SELECT * FROM rfid_tags WHERE tag_id = ?', [tag_id]);
        if (!existing.length) {
            // Tag ใหม่ที่ยังไม่อยู่ในระบบ → สร้างเป็น Unknown
            await db.query(
                'INSERT INTO rfid_tags (tag_id, shelf_id, status, last_update) VALUES (?, ?, ?, NOW())',
                [tag_id, shelf_id || null, 'Unknown']
            );
            return res.json({ success: true, message: 'พบ Tag ใหม่ บันทึกเป็น Unknown', tag_id });
        }

        // Tag มีอยู่แล้ว — คำนวณ status ใหม่
        const currentStatus = existing[0].status;
        let newStatus = currentStatus;
        let finalShelfId = existing[0].shelf_id;

        if (action === 'OUT') {
            newStatus = 'Shipped';
            finalShelfId = null; // นำของออกจากชั้น
        } else if (action === 'IN') {
            newStatus = 'In-Stock';
            if (shelf_id) finalShelfId = shelf_id;
        } else if (shelf_id) {
            // มี shelf_id → ยืนยันตำแหน่งแล้ว
            if (currentStatus === 'Pending' || currentStatus === 'Unknown') {
                newStatus = 'In-Stock';
            }
            finalShelfId = shelf_id;
        }

        // Check Capacity before placing on shelf
        if (finalShelfId && (newStatus === 'In-Stock' || newStatus === 'Moving')) {
            const [locRows] = await db.query(`
                SELECT capacity FROM locations WHERE shelf_id = ?
            `, [finalShelfId]);
            
            if (locRows.length) {
                const capacity = locRows[0].capacity || 100;
                
                // Get used capacity of the shelf (excluding the tag being processed if it's already there)
                const [usedRows] = await db.query(`
                    SELECT SUM(current_qty) AS current_qty FROM (
                        SELECT 
                            COALESCE(SUM(CASE WHEN t.transaction_type = 'IN' THEN t.quantity ELSE 0 END), 0) -
                            COALESCE(SUM(CASE WHEN t.transaction_type = 'OUT' THEN t.quantity ELSE 0 END), 0) AS current_qty
                        FROM rfid_tags rt
                        LEFT JOIN transactions t ON rt.tag_id = t.tag_id
                        WHERE rt.shelf_id = ? AND rt.tag_id != ?
                        GROUP BY rt.tag_id
                        HAVING current_qty > 0
                    ) sub
                `, [finalShelfId, tag_id]);
                
                const usedCapacity = usedRows[0] ? parseInt(usedRows[0].current_qty || 0) : 0;
                
                // Get qty of the incoming tag
                const [tagRows] = await db.query(`
                    SELECT 
                        COALESCE(SUM(CASE WHEN transaction_type = 'IN' THEN quantity ELSE 0 END), 0) -
                        COALESCE(SUM(CASE WHEN transaction_type = 'OUT' THEN quantity ELSE 0 END), 0) AS qty
                    FROM transactions WHERE tag_id = ?
                `, [tag_id]);
                
                const tagQty = tagRows[0] ? Math.max(parseInt(tagRows[0].qty || 1), 1) : 1; // Default to 1 if no transactions
                
                if (usedCapacity + tagQty > capacity) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `❌ ชั้นวาง ${finalShelfId} เต็มแล้ว! (จุได้ ${capacity}, ใช้ไป ${usedCapacity}, ต้องการนำเข้า ${tagQty})` 
                    });
                }
            }
        }

        await db.query(
            'UPDATE rfid_tags SET status = ?, shelf_id = ?, last_update = NOW() WHERE tag_id = ?',
            [newStatus, finalShelfId, tag_id]
        );

        const msg = shelf_id && currentStatus === 'Pending'
            ? `Tag ${tag_id} ยืนยันตำแหน่ง shelf ${shelf_id} → In-Stock`
            : `อัปเดต Tag ${tag_id} สำเร็จ`;
        res.json({ success: true, message: msg, tag_id, status: newStatus, shelf_id });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
