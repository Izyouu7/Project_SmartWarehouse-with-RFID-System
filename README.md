# 🏭 Smart Warehouse RFID System

ระบบจัดการคลังสินค้าด้วย RFID พร้อม Raspberry Pi Integration

## โครงสร้างโปรเจค

```
rfid test/
├── backend/               # Node.js + Express API Server
│   ├── server.js          # Entry point
│   ├── db.js              # MySQL connection
│   ├── .env               # Config (แก้ DB password ด้วย)
│   ├── middleware/auth.js  # JWT + API Key middleware
│   └── routes/
│       ├── auth.js        # Login/logout
│       ├── products.js    # CRUD สินค้า
│       ├── locations.js   # CRUD โซน/ชั้นวาง
│       ├── rfid.js        # RFID scan endpoint (Raspberry Pi)
│       ├── transactions.js # รับ-เบิก สินค้า
│       └── dashboard.js   # Dashboard stats
├── frontend/              # HTML + CSS + Vanilla JS
│   ├── index.html         # Login
│   ├── dashboard.html     # Dashboard
│   ├── inventory.html     # จัดการสินค้า
│   ├── rfid-monitor.html  # RFID Live Monitor
│   ├── transactions.html  # รายการรับ-เบิก
│   ├── locations.html     # โซนและชั้นวาง
│   ├── css/style.css      # Design system
│   └── js/api.js          # API utilities
└── database/schema.sql    # MySQL schema + seed data
```

---

## ⚙️ การติดตั้ง

### 1. ติดตั้ง MySQL และสร้างฐานข้อมูล

```bash
mysql -u root -p < database/schema.sql
```

### 2. แก้ไข `.env`

```bash
# backend/.env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YourMySQLPassword   ← แก้ตรงนี้
DB_NAME=warehouse_rfid
JWT_SECRET=warehouse_rfid_super_secret_key_2026
RFID_API_KEY=rpi_warehouse_rfid_key_2026
PORT=3000
```

### 3. รันเซิร์ฟเวอร์

```bash
cd backend
brew services start mysql      
node server.js
```

### 4. เปิดเบราว์เซอร์/database

http://localhost/phpmyadmin
```
http://localhost:3000
```

---

## 🔐 ข้อมูลเข้าสู่ระบบ (Default)

| ชื่อผู้ใช้ | รหัสผ่าน | บทบาท |
|------------|----------|-------|
| `admin` | `password` | Administrator |
| `operator1` | `password` | Operator |

---

## 📡 Raspberry Pi Integration

### Endpoint สำหรับส่งข้อมูล RFID

```
POST http://SERVER_IP:3000/api/rfid/scan
Header: x-api-key: rpi_warehouse_rfid_key_2026
Content-Type: application/json
```

### JSON Body

```json
{
  "tag_code": "RFID-001",
  "status": "In-Stock",
  "reader_id": "READER-A",
  "signal_strength": -55,
  "location_hint": "Zone-A"
}
```

> `status` ต้องเป็น: `In-Stock`, `Moving`, หรือ `Shipped`

### ตัวอย่าง Python (Raspberry Pi)

```python
import requests
import time

SERVER_URL = "http://192.168.1.100:3000/api/rfid/scan"
API_KEY = "rpi_warehouse_rfid_key_2026"

def send_rfid_scan(tag_code, status, reader_id="RPI-1"):
    try:
        res = requests.post(SERVER_URL,
            headers={
                "x-api-key": API_KEY,
                "Content-Type": "application/json"
            },
            json={
                "tag_code": tag_code,
                "status": status,
                "reader_id": reader_id,
                "signal_strength": -60,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            },
            timeout=5
        )
        print(f"✅ Sent {tag_code} ({status}): {res.status_code}")
        return res.json()
    except Exception as e:
        print(f"❌ Error: {e}")

# Test
send_rfid_scan("RFID-A01-001", "In-Stock", "READER-A")
send_rfid_scan("RFID-B01-003", "Moving", "READER-GATE")
send_rfid_scan("RFID-OUT-001", "Shipped", "READER-EXIT")
```

---

## 🗄️ โครงสร้างฐานข้อมูล

| ตาราง | ข้อมูล |
|-------|--------|
| `users` | ผู้ใช้ระบบ, role, password hash |
| `products` | SKU, ชื่อสินค้า, Reorder Point, ราคา |
| `locations` | รหัสโซน, Shelf ID, ความจุ |
| `rfid_tags` | Tag Code, product, location, สถานะ |
| `transactions` | PO, ประเภท IN/OUT, วันเวลา, พนักงาน |
| `rfid_scan_logs` | บันทึกการสแกนทั้งหมดพร้อม raw data |

---

## 🔄 Auto-Features

- **Status Change → Auto Transaction**: เมื่อ RFID tag เปลี่ยนสถานะ ระบบสร้างรายการ transaction อัตโนมัติ
- **Dashboard Auto-refresh**: อัพเดทข้อมูลทุก 15 วินาที
- **RFID Monitor Live**: อัพเดทการสแกนใหม่ทุก 5 วินาที
- **Low Stock Alert**: แจ้งเตือนสินค้าที่ต่ำกว่า Reorder Point
