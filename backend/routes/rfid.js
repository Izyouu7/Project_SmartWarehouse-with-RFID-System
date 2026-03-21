const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, verifyApiKey } = require('../middleware/auth');

// POST /api/rfid/scan - PRIMARY ENDPOINT for Raspberry Pi
// Raspberry Pi sends: { tag_code, status, reader_id, signal_strength, location_hint }
router.post('/scan', verifyApiKey, async (req, res) => {
    const { tag_code, status, reader_id, signal_strength, location_hint, timestamp } = req.body;

    if (!tag_code) {
        return res.status(400).json({ success: false, message: 'tag_code is required' });
    }

    const newStatus = ['In-Stock', 'Moving', 'Shipped'].includes(status) ? status : 'Unknown';
    const scanTime = timestamp ? new Date(timestamp) : new Date();

    try {
        // 1. Log raw scan
        await db.query(`
            INSERT INTO rfid_scan_logs (tag_code, status, location_hint, reader_id, signal_strength, raw_data, scanned_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [tag_code, newStatus, location_hint, reader_id, signal_strength || 0, JSON.stringify(req.body), scanTime]);

        // 2. Check if tag exists
        const [existing] = await db.query('SELECT id, status FROM rfid_tags WHERE tag_code = ?', [tag_code]);

        let tagId;
        if (existing.length > 0) {
            // Update existing tag
            tagId = existing[0].id;
            await db.query(`
                UPDATE rfid_tags 
                SET status = ?, last_seen = ?, reader_id = ?, signal_strength = ?
                WHERE tag_code = ?
            `, [newStatus, scanTime, reader_id, signal_strength || 0, tag_code]);
        } else {
            // Register unknown new tag
            const [insertResult] = await db.query(`
                INSERT INTO rfid_tags (tag_code, status, last_seen, reader_id, signal_strength)
                VALUES (?, ?, ?, ?, ?)
            `, [tag_code, newStatus, scanTime, reader_id, signal_strength || 0]);
            tagId = insertResult.insertId;
        }

        // 3. If status changed to "Shipped" or "Moving", auto-create transaction
        if (existing.length > 0 && existing[0].status !== newStatus) {
            const [tagInfo] = await db.query('SELECT product_id FROM rfid_tags WHERE id = ?', [tagId]);
            if (tagInfo.length > 0 && tagInfo[0].product_id) {
                const txType = newStatus === 'Shipped' ? 'OUT' : 'IN';
                await db.query(`
                    INSERT INTO transactions (type, product_id, rfid_tag_id, quantity, notes, source)
                    VALUES (?, ?, ?, 1, ?, 'rfid_scan')
                `, [txType, tagInfo[0].product_id, tagId, `Auto: ${existing[0].status} → ${newStatus} via ${reader_id || 'RFID'}`]);
            }
        }

        // 4. Get updated tag info to return
        const [updatedTag] = await db.query(`
            SELECT rt.*, p.name AS product_name, p.sku,
                   l.zone_code, l.shelf_id
            FROM rfid_tags rt
            LEFT JOIN products p ON rt.product_id = p.id
            LEFT JOIN locations l ON rt.location_id = l.id
            WHERE rt.id = ?
        `, [tagId]);

        res.json({
            success: true,
            message: 'Scan logged successfully',
            data: updatedTag[0]
        });
    } catch (err) {
        console.error('RFID scan error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/rfid/tags - List all RFID tags with product info
router.get('/tags', verifyToken, async (req, res) => {
    try {
        const { status, search } = req.query;
        let query = `
            SELECT rt.*, p.name AS product_name, p.sku,
                   l.zone_code, l.shelf_id
            FROM rfid_tags rt
            LEFT JOIN products p ON rt.product_id = p.id
            LEFT JOIN locations l ON rt.location_id = l.id
            WHERE rt.is_active = 1
        `;
        const params = [];
        if (status) {
            query += ' AND rt.status = ?';
            params.push(status);
        }
        if (search) {
            query += ' AND (rt.tag_code LIKE ? OR p.name LIKE ? OR p.sku LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        query += ' ORDER BY rt.last_seen DESC';
        const [rows] = await db.query(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/rfid/recent - Recent scan logs (for live feed)
router.get('/recent', verifyToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const [rows] = await db.query(`
            SELECT rsl.*, rt.product_id, p.name AS product_name, p.sku
            FROM rfid_scan_logs rsl
            LEFT JOIN rfid_tags rt ON rsl.tag_code = rt.tag_code
            LEFT JOIN products p ON rt.product_id = p.id
            ORDER BY rsl.scanned_at DESC
            LIMIT ?
        `, [limit]);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/rfid/tags/:id - Update tag (assign to product/location)
router.put('/tags/:id', verifyToken, async (req, res) => {
    const { product_id, location_id, status } = req.body;
    try {
        await db.query(
            'UPDATE rfid_tags SET product_id=?, location_id=?, status=? WHERE id=?',
            [product_id, location_id, status, req.params.id]
        );
        res.json({ success: true, message: 'อัพเดทแท็กสำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
