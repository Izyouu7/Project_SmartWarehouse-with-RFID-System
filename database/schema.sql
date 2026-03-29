-- Smart Warehouse RFID System — Rental Warehouse Schema
-- Updated: 2026-03-29

CREATE DATABASE IF NOT EXISTS warehouse_rfid CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE warehouse_rfid;

-- =====================================================
-- Table: users (สำหรับ Login ระบบ)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(100),
    role          ENUM('admin', 'operator', 'viewer') DEFAULT 'operator',
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- Table: suppliers (บริษัทผู้จัดหาสินค้า — นำสินค้าเข้า)
-- =====================================================
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id CHAR(5) PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    phone       CHAR(10)
);

-- =====================================================
-- Table: customers (ลูกค้า — นำสินค้าออก)
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    customer_id CHAR(8) PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    phone       CHAR(10)
);

-- =====================================================
-- Table: employees (พนักงานคลังสินค้า)
-- =====================================================
CREATE TABLE IF NOT EXISTS employees (
    employee_id CHAR(5) PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    role        VARCHAR(20)
);

-- =====================================================
-- Table: products (ข้อมูลสินค้า)
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
    product_id    CHAR(10) PRIMARY KEY,
    name          VARCHAR(50) NOT NULL,
    unit          VARCHAR(20) DEFAULT 'ชิ้น',
    reorder_point INT DEFAULT 10,
    price         DECIMAL(10, 2) DEFAULT 0.00
);

-- =====================================================
-- Table: locations (ตำแหน่งชั้นวาง)
-- =====================================================
CREATE TABLE IF NOT EXISTS locations (
    shelf_id CHAR(6) PRIMARY KEY,
    zone_id  CHAR(8)
);

-- =====================================================
-- Table: rfid_tags (แท็ก RFID และสถานะปัจจุบัน)
-- =====================================================
CREATE TABLE IF NOT EXISTS rfid_tags (
    tag_id      CHAR(8) PRIMARY KEY,
    product_id  CHAR(10),
    shelf_id    CHAR(6),
    status      ENUM('Pending', 'In-Stock', 'Moving', 'Shipped', 'Unknown') DEFAULT 'Unknown',
    last_update DATETIME,

    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL,
    FOREIGN KEY (shelf_id)   REFERENCES locations(shelf_id)  ON DELETE SET NULL
);

-- =====================================================
-- Table: purchase_orders (ใบสั่งซื้อ — สินค้าเข้า IN)
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    po_id       CHAR(10) PRIMARY KEY,
    supplier_id CHAR(5),
    order_date  DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE SET NULL
);

-- =====================================================
-- Table: shipments (ใบส่งสินค้า — สินค้าออก OUT)
-- =====================================================
CREATE TABLE IF NOT EXISTS shipments (
    shipment_id CHAR(8) PRIMARY KEY,
    customer_id CHAR(8),
    ship_date   DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE SET NULL
);

-- =====================================================
-- Table: transactions (รายการรับเข้า / เบิกออก)
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id   INT AUTO_INCREMENT PRIMARY KEY,
    transaction_type ENUM('IN', 'OUT') NOT NULL,
    datetime         DATETIME DEFAULT CURRENT_TIMESTAMP,
    quantity         INT DEFAULT 1,
    employee_id      CHAR(5),
    tag_id           CHAR(8),
    po_id            CHAR(10),
    shipment_id      CHAR(8),

    FOREIGN KEY (employee_id)  REFERENCES employees(employee_id)       ON DELETE SET NULL,
    FOREIGN KEY (tag_id)       REFERENCES rfid_tags(tag_id)            ON DELETE SET NULL,
    FOREIGN KEY (po_id)        REFERENCES purchase_orders(po_id)       ON DELETE SET NULL,
    FOREIGN KEY (shipment_id)  REFERENCES shipments(shipment_id)       ON DELETE SET NULL,

    -- IN ต้องมี po_id / OUT ต้องมี shipment_id / ไม่มีทั้งคู่ก็ได้ (RFID auto)
    CONSTRAINT chk_transaction_logic CHECK (
        (po_id IS NOT NULL AND shipment_id IS NULL)
        OR (po_id IS NULL AND shipment_id IS NOT NULL)
        OR (po_id IS NULL AND shipment_id IS NULL)
    )
);

-- =====================================================
-- Seed Data: Default admin user
-- Password: admin123 (bcrypt hashed)
-- =====================================================
INSERT INTO users (username, password_hash, full_name, role) VALUES
('admin',     '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin'),
('operator1', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'พนักงาน คลังสินค้า',    'operator')
ON DUPLICATE KEY UPDATE id = id;

-- =====================================================
-- Seed Data: Suppliers
-- =====================================================
INSERT INTO suppliers (supplier_id, name, phone) VALUES
('S0001', 'บริษัท อิเล็กทรอนิกส์ไทย จำกัด', '0812345678'),
('S0002', 'บริษัท อาร์เอฟไอดี โซลูชัน จำกัด', '0898765432')
ON DUPLICATE KEY UPDATE name = name;

-- =====================================================
-- Seed Data: Customers
-- =====================================================
INSERT INTO customers (customer_id, name, phone) VALUES
('C0000001', 'บริษัท เทคสตาร์ จำกัด',      '0811112222'),
('C0000002', 'บริษัท อินโนเวท คอร์ป จำกัด', '0833334444')
ON DUPLICATE KEY UPDATE name = name;

-- =====================================================
-- Seed Data: Employees
-- =====================================================
INSERT INTO employees (employee_id, name, role) VALUES
('E0001', 'สมชาย ใจดี',   'operator'),
('E0002', 'สมหญิง รักงาน', 'operator')
ON DUPLICATE KEY UPDATE name = name;

-- =====================================================
-- Seed Data: Products
-- =====================================================
INSERT INTO products (product_id, name, reorder_point, price) VALUES
('PRD0000001', 'สายไฟ AWG 22 (100m)',       5,  350.00),
('PRD0000002', 'บอร์ด Raspberry Pi 4B',     3, 1850.00),
('PRD0000003', 'แท็ก RFID UHF Passive',    50,   15.00),
('PRD0000004', 'กล่องพลาสติก ABS ขนาด A4', 20,  120.00),
('PRD0000005', 'อะแดปเตอร์ 12V 5A',        10,  280.00)
ON DUPLICATE KEY UPDATE name = name;

-- =====================================================
-- Seed Data: Locations
-- =====================================================
INSERT INTO locations (shelf_id, zone_id) VALUES
('A-01', 'ZONE-A'),
('A-02', 'ZONE-A'),
('B-01', 'ZONE-B'),
('B-02', 'ZONE-B'),
('C-01', 'ZONE-C')
ON DUPLICATE KEY UPDATE zone_id = zone_id;

-- =====================================================
-- Seed Data: RFID Tags
-- =====================================================
INSERT INTO rfid_tags (tag_id, product_id, shelf_id, status, last_update) VALUES
('TAG00001', 'PRD0000001', 'A-01', 'In-Stock', NOW()),
('TAG00002', 'PRD0000001', 'A-01', 'In-Stock', NOW()),
('TAG00003', 'PRD0000002', 'A-02', 'In-Stock', NOW()),
('TAG00004', 'PRD0000003', 'B-01', 'In-Stock', NOW()),
('TAG00005', 'PRD0000005', NULL,   'Shipped',  NOW())
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- =====================================================
-- Seed Data: Purchase Orders
-- =====================================================
INSERT INTO purchase_orders (po_id, supplier_id, order_date) VALUES
('PO2026001', 'S0001', '2026-03-01 09:00:00'),
('PO2026002', 'S0002', '2026-03-15 10:30:00')
ON DUPLICATE KEY UPDATE po_id = po_id;

-- =====================================================
-- Seed Data: Shipments
-- =====================================================
INSERT INTO shipments (shipment_id, customer_id, ship_date) VALUES
('SH000001', 'C0000001', '2026-03-20 14:00:00'),
('SH000002', 'C0000002', '2026-03-25 11:00:00')
ON DUPLICATE KEY UPDATE shipment_id = shipment_id;

-- =====================================================
-- Seed Data: Transactions
-- =====================================================
INSERT INTO transactions (transaction_type, quantity, employee_id, tag_id, po_id, shipment_id) VALUES
('IN',  10, 'E0001', 'TAG00001', 'PO2026001', NULL),
('IN',   5, 'E0001', 'TAG00003', 'PO2026002', NULL),
('OUT',  3, 'E0002', 'TAG00005', NULL, 'SH000001')
ON DUPLICATE KEY UPDATE transaction_id = transaction_id;
