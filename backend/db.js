const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'warehouse_rfid',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+07:00', // Thailand timezone
    charset: 'utf8mb4'
});

// Test connection on startup
pool.getConnection()
    .then(async (conn) => {
        console.log('✅ MySQL Connected to:', process.env.DB_NAME);
        
        // Auto-migration: Ensure capacity column exists
        try {
            await conn.query('ALTER TABLE locations ADD COLUMN capacity INT DEFAULT 100');
            console.log('✅ Added capacity column to locations table');
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') {
                console.error('⚠️ DB Migration info:', err.message);
            }
        }
        
        conn.release();
    })
    .catch(err => {
        console.error('❌ MySQL connection error:', err.message);
    });

module.exports = pool;
