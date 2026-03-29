const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, verifyApiKey } = require('../middleware/auth');

// GET /api/rfid/tags — ดู RFID tags ทั้งหมด
router.get('/tags', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT rt.*, p.name AS product_name, l.zone_id
            FROM rfid_tags rt
            LEFT JOIN products  p ON rt.product_id = p.product_id
            LEFT JOIN locations l ON rt.shelf_id   = l.shelf_id
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
    const { tag_id, shelf_id } = req.body;
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

        if (shelf_id) {
            // มี shelf_id → ยืนยันตำแหน่งแล้ว
            // Pending → In-Stock, Unknown → In-Stock, อื่นๆ คงเดิม
            if (currentStatus === 'Pending' || currentStatus === 'Unknown') {
                newStatus = 'In-Stock';
            }
        }

        await db.query(
            'UPDATE rfid_tags SET status = ?, shelf_id = ?, last_update = NOW() WHERE tag_id = ?',
            [newStatus, shelf_id || existing[0].shelf_id, tag_id]
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
