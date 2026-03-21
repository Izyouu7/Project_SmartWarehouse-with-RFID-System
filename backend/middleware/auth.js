const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware to verify JWT token for user routes
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
};

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
};

// Middleware to verify Raspberry Pi API Key for RFID scan endpoint
const verifyApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.RFID_API_KEY) {
        // Also allow JWT-authenticated users
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user = decoded;
                return next();
            } catch (err) { /* ignore */ }
        }
        return res.status(401).json({ success: false, message: 'Invalid API key' });
    }
    req.source = 'raspberry_pi';
    next();
};

module.exports = { verifyToken, requireAdmin, verifyApiKey };
