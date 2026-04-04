const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
require('dotenv').config();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    try {
        const [rows] = await db.query(
            'SELECT * FROM employees WHERE username = ?',
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        }

        const user = rows[0];
        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
            return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        }

        const token = jwt.sign(
            { id: user.employee_id, username: user.username, role: user.role, full_name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
        );

        res.json({
            success: true,
            message: 'เข้าสู่ระบบสำเร็จ',
            token,
            user: {
                id: user.employee_id,
                username: user.username,
                full_name: user.name,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { name, username, password, role } = req.body;

    if (!name || !username || !password || !role) {
        return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบทุกช่อง' });
    }

    if (!['admin', 'operator'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Role ไม่ถูกต้อง' });
    }

    try {
        // ตรวจสอบ username ซ้ำ
        const [existing] = await db.query('SELECT employee_id FROM employees WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' });
        }

        // Auto generate employee_id (E0001, E0002, ...)
        const [lastRow] = await db.query('SELECT employee_id FROM employees ORDER BY employee_id DESC LIMIT 1');
        let nextId = 'E0001';
        if (lastRow.length > 0) {
            const lastNum = parseInt(lastRow[0].employee_id.replace('E', ''), 10);
            nextId = 'E' + String(lastNum + 1).padStart(4, '0');
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        await db.query(
            'INSERT INTO employees (employee_id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)',
            [nextId, name, username, password_hash, role]
        );

        res.status(201).json({ success: true, message: 'ลงทะเบียนสำเร็จ กรุณาเข้าสู่ระบบ', employee_id: nextId });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


// GET /api/auth/me - Verify token and get current user info
router.get('/me', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ success: true, user: decoded });
    } catch {
        res.status(403).json({ success: false, message: 'Token expired' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    res.json({ success: true, message: 'ออกจากระบบสำเร็จ' });
});

module.exports = router;
