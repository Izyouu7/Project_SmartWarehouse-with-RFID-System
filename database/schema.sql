-- Smart Warehouse RFID System Database Schema
-- Created: 2026-03-09

CREATE DATABASE IF NOT EXISTS warehouse_rfid CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE warehouse_rfid;

-- =====================================================
-- Table: users (ผู้ใช้ระบบ)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role ENUM('admin', 'operator', 'viewer') DEFAULT 'operator',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- Table: products (ข้อมูลสินค้า)
-- รหัสสินค้า (SKU), ชื่อสินค้า, จำนวนขั้นต่ำที่ต้องสั่งซื้อ (Reorder Point), ราคา
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    reorder_point INT DEFAULT 10,
    price DECIMAL(10, 2) DEFAULT 0.00,
    unit VARCHAR(20) DEFAULT 'pcs',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- Table: locations (ข้อมูลตำแหน่งจัดเก็บ)
-- รหัสโซน, รหัสชั้นวาง (Shelf ID), ความจุที่รับได้
-- =====================================================
CREATE TABLE IF NOT EXISTS locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zone_code VARCHAR(20) NOT NULL,
    shelf_id VARCHAR(20) NOT NULL,
    description VARCHAR(200),
    capacity INT DEFAULT 100,
    current_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_zone_shelf (zone_code, shelf_id)
);

-- =====================================================
-- Table: rfid_tags (ข้อมูลแท็ก RFID และสถานะ)
-- รหัส RFID Tag, สถานะปัจจุบัน (In-Stock/Moving/Shipped)
-- =====================================================
CREATE TABLE IF NOT EXISTS rfid_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tag_code VARCHAR(100) NOT NULL UNIQUE,
    product_id INT,
    location_id INT,
    status ENUM('In-Stock', 'Moving', 'Shipped', 'Unknown') DEFAULT 'Unknown',
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    signal_strength INT DEFAULT 0,
    reader_id VARCHAR(50) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

-- =====================================================
-- Table: transactions (ข้อมูลการรับเข้าและเบิกออก)
-- ใบสั่งซื้อ (PO), ใบเบิกสินค้า, วันเวลาที่สินค้าเข้า-ออก, พนักงานที่รับผิดชอบ
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    po_number VARCHAR(50),
    type ENUM('IN', 'OUT') NOT NULL,
    product_id INT,
    rfid_tag_id INT,
    quantity INT DEFAULT 1,
    from_location_id INT,
    to_location_id INT,
    employee_id INT,
    notes TEXT,
    source ENUM('manual', 'rfid_scan', 'system') DEFAULT 'manual',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (rfid_tag_id) REFERENCES rfid_tags(id) ON DELETE SET NULL,
    FOREIGN KEY (from_location_id) REFERENCES locations(id) ON DELETE SET NULL,
    FOREIGN KEY (to_location_id) REFERENCES locations(id) ON DELETE SET NULL,
    FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- Table: rfid_scan_logs (ประวัติการสแกน RFID ทั้งหมด)
-- =====================================================
CREATE TABLE IF NOT EXISTS rfid_scan_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tag_code VARCHAR(100) NOT NULL,
    status VARCHAR(50),
    location_hint VARCHAR(100),
    reader_id VARCHAR(50),
    signal_strength INT DEFAULT 0,
    raw_data JSON,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tag_code (tag_code),
    INDEX idx_scanned_at (scanned_at)
);

-- =====================================================
-- Seed Data: Default admin user
-- Password: admin123 (bcrypt hashed)
-- =====================================================
INSERT INTO users (username, password_hash, full_name, role) VALUES
('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin'),
('operator1', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'พนักงาน คลังสินค้า', 'operator')
ON DUPLICATE KEY UPDATE id=id;

-- =====================================================
-- Seed Data: Sample products
-- =====================================================
INSERT INTO products (sku, name, description, reorder_point, price, unit) VALUES
('SKU-001', 'สายไฟ AWG 22 (100m)', 'สายไฟมาตรฐาน AWG 22 ความยาว 100 เมตร', 5, 350.00, 'ม้วน'),
('SKU-002', 'บอร์ด Raspberry Pi 4B', 'Raspberry Pi 4 Model B 4GB RAM', 3, 1850.00, 'ชิ้น'),
('SKU-003', 'แท็ก RFID UHF Passive', 'RFID Tag UHF 860-960 MHz Passive', 50, 15.00, 'ชิ้น'),
('SKU-004', 'กล่องพลาสติก ABS ขนาด A4', 'กล่องพลาสติก ABS กันน้ำ ขนาด A4', 20, 120.00, 'ชิ้น'),
('SKU-005', 'อะแดปเตอร์ 12V 5A', 'Power Adapter 12V 5A DC', 10, 280.00, 'ตัว'),
('SKU-006', 'เซ็นเซอร์ IR ระยะไกล', 'Infrared Sensor Module Long Range', 15, 45.00, 'ชิ้น'),
('SKU-007', 'ชั้นวางเหล็ก 5 ชั้น', 'ชั้นวางเหล็กสีเทา 5 ชั้น 180x90cm', 2, 2500.00, 'ตัว'),
('SKU-008', 'เทปกาวสองหน้า (10m)', 'เทปกาวสองหน้าอุตสาหกรรม 10 เมตร', 30, 55.00, 'ม้วน')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- =====================================================
-- Seed Data: Sample locations
-- =====================================================
INSERT INTO locations (zone_code, shelf_id, description, capacity, current_count) VALUES
('A', 'A-01', 'โซน A ชั้นที่ 1 - สินค้าอิเล็กทรอนิกส์', 50, 12),
('A', 'A-02', 'โซน A ชั้นที่ 2 - สินค้าอิเล็กทรอนิกส์', 50, 8),
('A', 'A-03', 'โซน A ชั้นที่ 3 - สินค้าอิเล็กทรอนิกส์', 50, 0),
('B', 'B-01', 'โซน B ชั้นที่ 1 - อะไหล่ทั่วไป', 100, 45),
('B', 'B-02', 'โซน B ชั้นที่ 2 - อะไหล่ทั่วไป', 100, 30),
('C', 'C-01', 'โซน C ชั้นที่ 1 - สินค้าขนาดใหญ่', 20, 5),
('C', 'C-02', 'โซน C ชั้นที่ 2 - สินค้าขนาดใหญ่', 20, 3),
('D', 'D-01', 'โซน D - พื้นที่พักสินค้าชั่วคราว', 200, 0)
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- =====================================================
-- Seed Data: Sample RFID tags
-- =====================================================
INSERT INTO rfid_tags (tag_code, product_id, location_id, status, reader_id) VALUES
('RFID-A01-001', 1, 1, 'In-Stock', 'READER-A'),
('RFID-A01-002', 1, 1, 'In-Stock', 'READER-A'),
('RFID-A02-001', 2, 2, 'In-Stock', 'READER-A'),
('RFID-B01-001', 3, 4, 'In-Stock', 'READER-B'),
('RFID-B01-002', 3, 4, 'In-Stock', 'READER-B'),
('RFID-B01-003', 4, 4, 'Moving', 'READER-B'),
('RFID-C01-001', 7, 6, 'In-Stock', 'READER-C'),
('RFID-OUT-001', 5, NULL, 'Shipped', 'READER-D'),
('RFID-OUT-002', 6, NULL, 'Shipped', 'READER-D'),
('RFID-NEW-001', 8, NULL, 'Unknown', NULL)
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- =====================================================
-- Seed Data: Sample transactions
-- =====================================================
INSERT INTO transactions (po_number, type, product_id, quantity, employee_id, notes, source) VALUES
('PO-2026-001', 'IN', 1, 10, 1, 'รับสินค้าจาก Supplier A', 'manual'),
('PO-2026-002', 'IN', 2, 5, 1, 'รับสินค้าจาก Supplier B', 'manual'),
('PO-2026-003', 'IN', 3, 100, 2, 'รับสินค้า RFID Tags ล็อตใหม่', 'manual'),
('OUT-2026-001', 'OUT', 5, 3, 2, 'เบิกสินค้าสำหรับโปรเจค RPI-01', 'manual'),
('OUT-2026-002', 'OUT', 6, 5, 2, 'เบิกสำหรับฝ่ายซ่อมบำรุง', 'rfid_scan');
