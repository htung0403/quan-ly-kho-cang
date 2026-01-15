# EBH Upgraded System
## Quản Lý Vật Tư Xây Dựng & Vận Tải

Hệ thống quản lý toàn diện cho ngành xây dựng và logistics, với khả năng số hóa quy trình từ văn phòng đến hiện trường.

---

## 🏗️ Kiến trúc Hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                        EBH SYSTEM                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FRONTEND (React + TypeScript + TailwindCSS)                    │
│  ├── Dashboard (Tổng quan)                                      │
│  ├── Quản lý Dự án                                              │
│  ├── Quản lý Hàng hóa (với tỷ trọng linh hoạt)                 │
│  ├── Quản lý Kho                                                │
│  ├── Quản lý Đội xe                                             │
│  ├── Nhập mua (Input: Tấn → Auto: m³)                          │
│  ├── Xuất bán (Input: m³ → Auto: Tấn)                          │
│  └── Báo cáo (Tồn kho, Vận tải, Lãi/Lỗ)                        │
│                                                                  │
│  BACKEND (Node.js + Express + Supabase)                         │
│  ├── Auth (JWT + bcrypt)                                        │
│  ├── RBAC (Role-Based Access Control)                           │
│  ├── RESTful API                                                │
│  └── Business Logic (Auto conversion Tấn ↔ m³)                 │
│                                                                  │
│  DATABASE (PostgreSQL via Supabase)                             │
│  ├── users, roles, project_users                                │
│  ├── projects, materials, warehouses, vehicles                  │
│  ├── purchase_receipts, export_receipts                         │
│  ├── transport_logs, inventory_snapshots                        │
│  └── material_density_history                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Cấu trúc Thư mục

```
job-kho-cang/
├── ebh-frontend/                # React Frontend
│   ├── src/
│   │   ├── components/          # UI Components
│   │   │   ├── ui/              # Reusable UI (Button, Input, Card...)
│   │   │   └── layout/          # Layout (Sidebar, Header, MainLayout)
│   │   ├── contexts/            # React Contexts (Auth, Toast)
│   │   ├── lib/                 # Utilities (api, utils)
│   │   ├── pages/               # Page components
│   │   ├── types/               # TypeScript types
│   │   ├── App.tsx              # Main App with routing
│   │   └── index.css            # Global styles + TailwindCSS
│   ├── package.json
│   └── vite.config.ts
│
└── server/                      # Express Backend
    ├── src/
    │   ├── config/              # Configuration
    │   ├── database/            # Supabase client, SQL schema
    │   ├── middleware/          # Auth, Error handling
    │   ├── routes/              # API routes
    │   └── index.ts             # Entry point
    ├── package.json
    └── .env.example
```

---

## 🚀 Bắt đầu

### 1. Yêu cầu hệ thống

- Node.js >= 20.x
- npm >= 10.x
- Supabase account (free tier OK)

### 2. Cài đặt Frontend

```bash
cd ebh-frontend
npm install
npm run dev
```

Frontend sẽ chạy tại: http://localhost:3000

### 3. Cài đặt Backend

```bash
cd server
npm install

# Copy file cấu hình
cp .env.example .env
# Sửa các giá trị trong .env

npm run dev
```

Backend sẽ chạy tại: http://localhost:5000

### 4. Thiết lập Database (Supabase)

1. Tạo project mới trên [Supabase](https://supabase.com)
2. Vào SQL Editor, chạy nội dung file `server/src/database/schema.sql`
3. Copy URL và API Key vào file `.env`

---

## 📊 Database Schema

### Bảng chính

| Bảng | Mô tả |
|------|-------|
| `users` | Người dùng hệ thống |
| `roles` | Vai trò (admin, accountant, warehouse, logistics, field_worker) |
| `projects` | Dự án xây dựng |
| `project_users` | Phân quyền user theo dự án |
| `materials` | Danh mục hàng hóa |
| `material_density_history` | Lịch sử thay đổi tỷ trọng |
| `warehouses` | Danh sách kho |
| `vehicles` | Danh sách xe vận chuyển |
| `purchase_receipts` | Phiếu nhập mua |
| `export_receipts` | Phiếu xuất bán |
| `transport_logs` | Chi tiết chuyến xe |
| `inventory_snapshots` | Chụp tồn kho định kỳ |

### Logic quy đổi đơn vị

```
Nhập mua:  m³ = Tấn ÷ Tỷ trọng
Xuất bán:  Tấn = m³ × Tỷ trọng

Ví dụ:
- Nhập 15 Tấn đá hộc (tỷ trọng 1.5) → 15 ÷ 1.5 = 10 m³
- Xuất 10 m³ đá hộc (tỷ trọng 1.5) → 10 × 1.5 = 15 Tấn
```

---

## 🔐 API Endpoints

### Authentication
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/register` | Đăng ký |
| POST | `/api/auth/refresh` | Làm mới token |
| GET | `/api/auth/me` | Thông tin user hiện tại |
| POST | `/api/auth/logout` | Đăng xuất |

### Materials
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/materials` | Danh sách hàng hóa |
| GET | `/api/materials/:id` | Chi tiết hàng hóa |
| POST | `/api/materials` | Thêm hàng hóa |
| PUT | `/api/materials/:id` | Cập nhật hàng hóa |
| DELETE | `/api/materials/:id` | Xóa hàng hóa (soft) |
| GET | `/api/materials/:id/density-history` | Lịch sử tỷ trọng |

### Purchases (Nhập mua)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/purchases` | Danh sách phiếu nhập |
| GET | `/api/purchases/:id` | Chi tiết phiếu nhập |
| POST | `/api/purchases` | Tạo phiếu nhập |
| PUT | `/api/purchases/:id` | Cập nhật phiếu nhập |
| DELETE | `/api/purchases/:id` | Xóa phiếu nhập (soft) |
| GET | `/api/purchases/stats/today` | Thống kê hôm nay |

### Reports
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/reports/dashboard` | Tổng quan dashboard |
| GET | `/api/reports/inventory` | Báo cáo tồn kho |
| GET | `/api/reports/transport` | Báo cáo vận tải |
| GET | `/api/reports/project-profit` | Báo cáo lãi/lỗ dự án |

---

## 🛡️ Phân quyền (RBAC)

| Role | Quyền truy cập |
|------|----------------|
| `admin` | Toàn quyền (`*`) |
| `accountant` | Đọc tất cả, viết báo cáo |
| `warehouse` | Quản lý kho, nhập/xuất |
| `logistics` | Quản lý xe, vận chuyển |
| `field_worker` | Nhập phiếu mua tại hiện trường |

### Phân quyền theo Dự án
- Mỗi user được gán vào các dự án cụ thể
- User chỉ thấy dữ liệu của dự án được cấp
- Admin thấy tất cả dự án

---

## 🎨 UI/UX Features

- **Mobile-first responsive design**
- **Real-time unit conversion** (Tấn ↔ m³)
- **Dashboard với thống kê trực quan**
- **Table với filter, search, pagination**
- **Toast notifications cho feedback**
- **Modal forms cho CRUD operations**
- **Dark-ready color palette**

---

## 🚢 Deployment

### Frontend (Vercel)

```bash
cd ebh-frontend
npm run build
# Deploy to Vercel
npx vercel --prod
```

### Backend (Railway/Render)

```bash
cd server
npm run build
# Deploy to Railway or Render
```

### Environment Variables (Production)

```env
# Frontend (.env)
VITE_API_URL=https://your-backend-url.com/api

# Backend (.env)
NODE_ENV=production
PORT=5000
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=very-long-random-string
JWT_REFRESH_SECRET=another-long-random-string
CORS_ORIGIN=https://your-frontend-url.com
```

---

## 📝 Workflow Nghiệp vụ

### Bước 1: Khởi tạo (Admin)
1. Khai báo Hàng hóa + Tỷ trọng
2. Khai báo Kho
3. Khai báo Đội xe
4. Tạo Dự án
5. Phân quyền User → Dự án

### Bước 2: Nhập mua (NV Hiện trường)
1. Đăng nhập mobile
2. Chọn Kho, Hàng hóa, Dự án
3. Nhập số Tấn
4. Hệ thống tự động tính m³
5. Lưu phiếu → Cập nhật tồn kho

### Bước 3: Xuất bán (Kho/Logistics)
1. Chọn Dự án, Hàng hóa, Xe
2. Nhập số m³ xuất
3. Hệ thống tính Tấn, trừ tồn
4. Ghi log chuyến xe

### Bước 4: Báo cáo (Sếp/Kế toán)
1. Xem tồn kho theo Tấn & m³
2. Xem báo cáo vận tải
3. Xem lãi/lỗ theo dự án

---

## 📄 License

MIT License

---

## 🤝 Liên hệ

Developed for EBH Construction & Logistics
