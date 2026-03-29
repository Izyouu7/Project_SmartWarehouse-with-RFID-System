const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// GET /api/employees
router.get('/', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM employees ORDER BY name');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/employees
router.post('/', verifyToken, async (req, res) => {
    const { employee_id, name, role } = req.body;
    if (!employee_id || !name) return res.status(400).json({ success: false, message: 'employee_id and name required' });
    try {
        await db.query('INSERT INTO employees (employee_id, name, role) VALUES (?, ?, ?)', [employee_id, name, role]);
        res.status(201).json({ success: true, message: 'เพิ่มพนักงานสำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/employees/:id
router.put('/:id', verifyToken, async (req, res) => {
    const { name, role } = req.body;
    try {
        await db.query('UPDATE employees SET name = ?, role = ? WHERE employee_id = ?', [name, role, req.params.id]);
        res.json({ success: true, message: 'อัปเดตพนักงานสำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/employees/:id
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await db.query('DELETE FROM employees WHERE employee_id = ?', [req.params.id]);
        res.json({ success: true, message: 'ลบพนักงานสำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
