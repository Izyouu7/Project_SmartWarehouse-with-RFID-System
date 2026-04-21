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
        try {
            const [columns] = await conn.query("SHOW COLUMNS FROM locations LIKE 'capacity'");
            if (!columns.length) {
                console.log("Auto-migrating: Adding 'capacity' column to 'locations' table...");
                await conn.query("ALTER TABLE locations ADD COLUMN capacity INT DEFAULT 100");
                console.log("Migration successful.");
            }
            
            const [tagCols] = await conn.query("SHOW COLUMNS FROM rfid_tags LIKE 'last_scanned_by'");
            if (!tagCols.length) {
                console.log("Auto-migrating: Adding 'last_scanned_by' column to 'rfid_tags' table...");
                await conn.query("ALTER TABLE rfid_tags ADD COLUMN last_scanned_by CHAR(5) DEFAULT NULL");
                await conn.query("ALTER TABLE rfid_tags ADD FOREIGN KEY (last_scanned_by) REFERENCES employees(employee_id) ON DELETE SET NULL");
                console.log("Migration successful.");
            }

            // Migration: Update status ENUM to include 'Wait-Scan'
            console.log("Auto-migrating: checking status ENUM...");
            await conn.query("ALTER TABLE rfid_tags MODIFY COLUMN status ENUM('Pending', 'In-Stock', 'Wait-Scan', 'Moving', 'Shipped', 'Unknown') DEFAULT 'Unknown'");
            
            const [tagsToUpdate] = await conn.query("SELECT COUNT(*) as count FROM rfid_tags WHERE status = 'Moving'");
            if (tagsToUpdate[0].count > 0) {
                console.log(`Auto-migrating: updating ${tagsToUpdate[0].count} tags from Moving to Wait-Scan...`);
                await conn.query("UPDATE rfid_tags SET status = 'Wait-Scan' WHERE status = 'Moving'");
            }
            console.log("Status ENUM check/update complete.");
        } catch (error) {
            console.error("Auto-migration failed:", error.message);
        } finally {
            conn.release();
        }
    })
    .catch(err => {
        console.error('❌ MySQL connection error:', err.message);
    });

module.exports = pool;
