const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: '*', // Allow all origins in dev; restrict in production
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/rfid', require('./routes/rfid'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Smart Warehouse RFID API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Serve frontend for all other routes (SPA fallback)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Smart Warehouse RFID Server running on http://localhost:${PORT}`);
    console.log(`📡 RFID Scan Endpoint: POST http://localhost:${PORT}/api/rfid/scan`);
    console.log(`   Header: x-api-key: ${process.env.RFID_API_KEY || 'rpi_warehouse_rfid_key_2026'}`);
    console.log(`\n📋 API Endpoints:`);
    console.log(`   POST   /api/auth/login`);
    console.log(`   GET    /api/dashboard/stats`);
    console.log(`   GET    /api/products`);
    console.log(`   GET    /api/locations`);
    console.log(`   GET    /api/rfid/tags`);
    console.log(`   GET    /api/rfid/recent`);
    console.log(`   GET    /api/transactions`);
    console.log(`\n🖥️  Frontend: http://localhost:${PORT}/`);
});
