# 📦 Smart Warehouse RFID System

ระบบจัดการคลังสินค้าอัตโนมัติด้วยเทคโนโลยี RFID ร่วมกับ Raspberry Pi สำหรับการติดตามสถานะสินค้า การรับเข้า เบิกออก และการจัดการคลังสินค้าแบบเรียลไทม์

ลิ้งค์canva https://canva.link/h63moy6i17g34f6 
---

## 💻 1. เทคโนโลยีและระบบที่เกี่ยวข้อง (Tech Stack & Tools)

| หมวดหมู่ | เทคโนโลยีที่ใช้ |
|---|---|
| **Frontend** | HTML, CSS (Vanilla), JavaScript |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL |
| **Hardware** | Raspberry Pi, RFID Reader |
| **DevOps/Infra** | Docker, Docker Compose |
| **API & Auth** | JWT (JSON Web Token), API Key, bcrypt |

---

## ⚙️ 2. ฟังก์ชันหรือระบบการทำงานของระบบ (System Feature)

*   **การจัดการพนักงาน (Employee Management)**
    *   เพิ่ม แก้ไข ลบ ข้อมูลพนักงาน
    *   จัดการสิทธิ์การเข้าใช้งานระบบ (Admin, Operator)
*   **การจัดการคลังสินค้าและอุปกรณ์ (Inventory Management)**
    *   จัดการข้อมูลสินค้า (SKU, ชื่อสินค้า, ราคา, Reorder Point)
    *   จัดการโซนและชั้นวางสินค้า (Locations & Shelf ID)
    *   จัดการรหัส Tag RFID (ผูก Tag เข้ากับสินค้าและตำแหน่ง)
*   **การจัดการซัพพลายเออร์และลูกค้า (Supplier & Customer Management)**
    *   บันทึกและจัดการข้อมูลบริษัทผู้จัดหาสินค้า (Suppliers)
    *   บันทึกและจัดการข้อมูลลูกค้า (Customers)
*   **การจัดการรายการรับ-เบิก (Transaction & Movement History)**
    *   บันทึกประวัติการรับเข้า (IN) และเบิกออก (OUT) ของสินค้าแต่ละชิ้น
    *   ประวัติอัปเดตอัตโนมัติเมื่อมีการสแกน RFID ผ่านจุดสแกน
*   **การรายงานและแดชบอร์ด (Reporting & Dashboard)**
    *   แสดงผลรวมสินค้าคงคลัง ข้อมูลการเคลื่อนไหวแบบ Real-time
    *   ระบบมอนิเตอร์การสแกน RFID แบบสดๆ (Live Monitor)

---

## ✨ 3. จุดเด่น หรือ ฟีเจอร์ที่น่าสนใจ (Highlight Feature)

*   **Real-time RFID Integration**: มี API รองรับการส่งข้อมูลจาก Raspberry Pi เพื่ออัปเดตสถานะสินค้า (In-Stock, Moving, Shipped) ทันที
*   **Automated Inventory Calculation**: คำนวณจำนวนสินค้าคงเหลืออัตโนมัติจากประวัติ Transaction ด้วย SQL View หมดปัญหาข้อมูลไม่ตรงกัน
*   **Live Updates**: แดชบอร์ดจะรีเฟรชข้อมูลอัตโนมัติทุก 15 วินาที และหน้า RFID Monitor อัปเดตทุก 5 วินาที
*   **Low Stock Alerts**: ระบบมีการแจ้งเตือนเมื่อระดับสินค้าคงเหลือต่ำกว่า Reorder Point
*   **Auto Document Generation**: สร้างใบสั่งซื้อ (PO) หรือใบส่งสินค้า (Shipment) อัตโนมัติเมื่อมี Transaction เกิดขึ้น
*   **Docker Ready**: ติดตั้งง่ายและพร้อมใช้งานทันทีผ่าน Docker Compose ครบจบในคำสั่งเดียว

---

## 🚀 4. การติดตั้งและใช้งานระบบ (How to run the system)

### ทางเลือกที่ 1: รันผ่าน Docker (แนะนำ)
1. เปิด Terminal และเข้าไปที่โฟลเดอร์โปรเจค
2. รันคำสั่ง `docker-compose up -d`
3. ระบบจะทำงานโดยอัตโนมัติ สามารถเข้าใช้งานได้ทันที

### ทางเลือกที่ 2: รันแบบ Manual
1. **เตรียมฐานข้อมูล:** นำไฟล์ `database/schema.sql` ไป Execute ใน MySQL เพื่อสร้างตารางและข้อมูลเริ่มต้น
2. **ตั้งค่า Environment:** เข้าไปแก้ไขไฟล์ `backend/.env` ให้ตรงกับฐานข้อมูลของคุณ:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=password # <-- ให้อาจารย์ใส่รหัสผ่าน MySQL ของเครื่องอาจารย์
   DB_NAME=warehouse_rfid
   JWT_SECRET=warehouse_rfid_super_secret_key_2026
   RFID_API_KEY=rpi_warehouse_rfid_key_2026
   PORT=3000

   ```
3. **เปิดเซิร์ฟเวอร์:** เปิด Terminal เข้าไปที่โฟลเดอร์ `backend` แล้วรัน:
   ```bash
   node server.js
   ```
4. **การเข้าใช้งาน:** เปิด Web Browser และเข้าไปที่ `http://localhost:3000`

---

## 🔐 5. ข้อมูลเข้าสู่ระบบ (Login Information)

| ชื่อผู้ใช้ (Username) | รหัสผ่าน (Password) | บทบาท (Role) |
|---|---|---|
| `admin` | `password` | Administrator |
| `operator1` | `password` | Operator |

*(หมายเหตุ: รหัสผ่านถูกเข้ารหัสความปลอดภัยด้วย bcrypt ไว้ในฐานข้อมูล)*

---

## 📡 6. การเชื่อมต่อ Raspberry Pi (Raspberry Pi Integration)

ระบบนี้มี Endpoint ไว้สำหรับรับข้อมูลการสแกนจาก Raspberry Pi

**Endpoint URL:**
```http
POST http://SERVER_IP:3000/api/rfid/scan
Header: 
  x-api-key: rpi_warehouse_rfid_key_2026
  Content-Type: application/json
```

**ตัวอย่าง Payload (JSON):**
```json
{
  "tag_code": "RFID-001",
  "status": "In-Stock",
  "reader_id": "READER-A",
  "signal_strength": -55,
  "location_hint": "Zone-A"
}
```
*(สถานะ `status` ที่รองรับ: `In-Stock`, `Moving`, `Shipped`)*

**ตัวอย่างโค้ด Python สำหรับ Raspberry Pi:**
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
    except Exception as e:
        print(f"❌ Error: {e}")

# ทดสอบส่งข้อมูล
send_rfid_scan("RFID-A01-001", "In-Stock", "READER-IN")
```

---

## 📁 7. โครงสร้างโปรเจค (Project Structure)

```text
rfid test/
├── backend/               # โฟลเดอร์สำหรับ API Server (Node.js)
│   ├── server.js          # จุดเริ่มต้นของแอปพลิเคชัน
│   ├── db.js              # ไฟล์เชื่อมต่อฐานข้อมูล MySQL
│   ├── .env               # ไฟล์ตั้งค่าตัวแปรระบบ
│   ├── middleware/        # ตัวกลางตรวจสอบสิทธิ์ (JWT, API Key)
│   └── routes/            # จัดการ API Endpoints (Products, RFID, etc.)
├── frontend/              # โฟลเดอร์สำหรับหน้าเว็บไซต์ (HTML/CSS/JS)
│   ├── index.html         # หน้า Login
│   ├── dashboard.html     # หน้า Dashboard สรุปผล
│   ├── rfid-monitor.html  # หน้าแสดงผลการสแกนแบบสดๆ
│   └── ...                # หน้าจัดการอื่นๆ
├── database/              # ไฟล์ฐานข้อมูล
│   └── schema.sql         # โครงสร้างตารางและข้อมูลเริ่มต้น
└── docker-compose.yml     # ไฟล์สำหรับรันด้วย Docker
```
