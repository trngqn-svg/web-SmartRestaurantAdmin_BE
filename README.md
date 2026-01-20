<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="100" alt="NestJS Logo" />
</p>

# Smart Restaurant Admin - Backend

Backend API cho hệ thống quản lý nhà hàng thông minh, xây dựng với NestJS và MongoDB.

## 🚀 Công nghệ sử dụng

- **NestJS 11.0.1** - Node.js framework
- **MongoDB** - Database (với Mongoose)
- **JWT** - Authentication & Token signing
- **bcrypt** - Password hashing
- **QRCode** - Tạo mã QR
- **PDFKit** - Tạo file PDF
- **Archiver** - Tạo file ZIP

## 📋 Yêu cầu cài đặt

- Node.js >= 18.x
- MongoDB >= 6.x (đang chạy trên localhost:27017)
- npm hoặc yarn

## ⚙️ Cài đặt

### 1. Clone project hoặc vào thư mục backend:

```bash
cd web-smart-restaurant-admin-be
```

### 2. Cài đặt dependencies:

```bash
npm install
```

### 3. Tạo file `.env` trong thư mục gốc:

```env
# Database
MONGO_URI=mongodb://localhost:27017/smart-restaurant

# JWT Secrets
JWT_ACCESS_SECRET=your-access-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
JWT_SECRET=your-jwt-secret-for-qr-tokens

# Token Expiration
ACCESS_TOKEN_EXPIRE=15m
REFRESH_TOKEN_EXPIRE=7d

# Server
PORT=3000

# Frontend URL (for CORS)
VITE_APP_URL=http://localhost:5173
```

### 4. Khởi động MongoDB:

Đảm bảo MongoDB đang chạy trên máy:

```bash
# Windows: MongoDB thường tự khởi động
# hoặc dùng MongoDB Compass để start

# Linux/Mac:
mongod
```

## 🏃 Chạy ứng dụng

### Development mode (watch mode):

```bash
npm run start:dev
```

### Production mode:

```bash
npm run build
npm run start:prod
```

Server sẽ chạy tại: `http://localhost:3000`

## 📡 API Endpoints

-

### Authentication (Xác thực)

Quản lý đăng nhập, làm mới token, đăng xuất cho admin và nhân viên.

- `POST /api/admin/auth/login` - Đăng nhập

  **Request:**

  ```json
  { "username": "admin", "password": "admin123" }
  ```

  **Response:**

  ```json
  { "accessToken": "...", "refreshToken": "..." }
  ```

- `POST /api/admin/auth/refresh` - Làm mới token
- `POST /api/admin/auth/logout` - Đăng xuất

### Accounts (Quản lý tài khoản)

Tạo, sửa, vô hiệu hóa/kích hoạt tài khoản admin, nhân viên, bếp.

- `GET /api/admin/accounts` - Lấy danh sách tài khoản
- `POST /api/admin/accounts` - Tạo tài khoản mới

  **Request:**

  ```json
  { "username": "staff1", "password": "123456", "role": "staff" }
  ```

- `PATCH /api/admin/accounts/:id` - Cập nhật thông tin tài khoản
- `PATCH /api/admin/accounts/disable/:id` - Vô hiệu hóa tài khoản
- `PATCH /api/admin/accounts/enable/:id` - Kích hoạt lại tài khoản

### Table Management (Quản lý bàn)

Tạo, sửa, đổi trạng thái, sinh mã QR cho bàn.

- `GET /api/admin/tables` - Lấy danh sách bàn
- `POST /api/admin/tables` - Tạo bàn mới
- `GET /api/admin/tables/:id` - Chi tiết bàn
- `PUT /api/admin/tables/:id` - Cập nhật thông tin bàn
- `PATCH /api/admin/tables/:id/status` - Đổi trạng thái bàn

### QR Code Operations (Mã QR)

Sinh, tải, tái tạo mã QR cho bàn.

- `POST /api/admin/tables/:id/qr/generate` - Tạo QR code cho bàn
- `GET /api/admin/tables/:id/qr/download?format=png|pdf` - Tải QR code
- `GET /api/admin/tables/qr/download-all` - Tải tất cả QR (ZIP)
- `POST /api/admin/tables/qr/regenerate-all` - Tạo lại tất cả QR code

### Menu Management (Quản lý thực đơn)

Quản lý món ăn, danh mục, nhóm tùy chọn, ảnh món.

- `GET /api/admin/menu/items` - Lấy danh sách món ăn
- `POST /api/admin/menu/items` - Thêm món ăn mới

  **Request:**

  ```json
  { "name": "Cơm chiên", "price": 35000, "categoryId": "..." }
  ```

- `GET /api/admin/menu/items/:id` - Chi tiết món ăn
- `PUT /api/admin/menu/items/:id` - Cập nhật món ăn
- `DELETE /api/admin/menu/items/:id` - Xóa món ăn
- `POST /api/admin/menu/items/:id/modifier-groups` - Gán nhóm tùy chọn cho món

#### Categories (Danh mục)

Quản lý danh mục món ăn.

- `GET /api/admin/menu/categories` - Lấy danh mục
- `POST /api/admin/menu/categories` - Thêm danh mục
- `PUT /api/admin/menu/categories/:id` - Sửa danh mục
- `DELETE /api/admin/menu/categories/:id` - Xóa danh mục
- `PATCH /api/admin/menu/categories/:id/status` - Đổi trạng thái danh mục

#### Modifiers (Tùy chọn món)

Quản lý nhóm tùy chọn, option cho món ăn.

- `GET /api/admin/menu/modifier-groups` - Lấy danh sách nhóm tùy chọn
- `POST /api/admin/menu/modifier-groups` - Thêm nhóm tùy chọn
- `GET /api/admin/menu/modifier-groups/:id` - Chi tiết nhóm tùy chọn
- `PUT /api/admin/menu/modifier-groups/:id` - Sửa nhóm tùy chọn
- `DELETE /api/admin/menu/modifier-groups/:id` - Xóa nhóm tùy chọn
- `GET /api/admin/menu/modifier-groups/:id/options` - Lấy danh sách option của nhóm
- `POST /api/admin/menu/modifier-groups/:id/options` - Thêm option vào nhóm
- `PUT /api/admin/menu/modifier-options/:id` - Sửa option
- `DELETE /api/admin/menu/modifier-options/:id` - Xóa option

#### Photos (Ảnh món ăn)

Quản lý ảnh cho từng món ăn.

- `GET /api/admin/menu/items/:id/photos` - Lấy danh sách ảnh món
- `POST /api/admin/menu/items/:id/photos` - Thêm ảnh cho món
- `DELETE /api/admin/menu/items/:id/photos/:photoId` - Xóa ảnh
- `PATCH /api/admin/menu/items/:id/photos/:photoId/primary` - Đặt ảnh chính

### Orders (Quản lý đơn hàng)

Lấy danh sách đơn hàng, theo dõi trạng thái.

- `GET /api/admin/orders` - Lấy danh sách đơn hàng

### Reports (Báo cáo)

Tổng hợp, xuất báo cáo doanh thu, món bán chạy.

- `GET /admin/reports/overview` - Báo cáo tổng quan
- `GET /admin/reports/export.csv` - Xuất báo cáo CSV
- `GET /admin/reports/export.pdf` - Xuất báo cáo PDF

### Dashboard

Thống kê tổng quan hệ thống.

- `GET /admin/dashboard/overview` - Thống kê tổng quan

### Item Reviews (Đánh giá món ăn)

Khách hàng đánh giá, xem/xóa review món ăn.

- `POST /api/customer/item-reviews` - Thêm đánh giá món ăn

  **Request:**

  ```json
  { "itemId": "...", "rating": 5, "comment": "Ngon!" }
  ```

- `GET /api/customer/menu/:id/reviews` - Lấy danh sách đánh giá của món
- `DELETE /api/customer/item-reviews/:reviewId` - Xóa đánh giá

- `POST /api/admin/auth/login` - Đăng nhập
- `POST /api/admin/auth/refresh` - Làm mới token
- `POST /api/admin/auth/logout` - Đăng xuất

### Accounts (Quản lý tài khoản)

- `GET /api/admin/accounts` - Lấy danh sách tài khoản
- `POST /api/admin/accounts` - Tạo tài khoản mới (admin, staff, kitchen)
- `PATCH /api/admin/accounts/:id` - Cập nhật thông tin tài khoản
- `PATCH /api/admin/accounts/disable/:id` - Vô hiệu hóa tài khoản
- `PATCH /api/admin/accounts/enable/:id` - Kích hoạt lại tài khoản

### Table Management (Quản lý bàn)

- `GET /api/admin/tables` - Lấy danh sách bàn
- `POST /api/admin/tables` - Tạo bàn mới
- `GET /api/admin/tables/:id` - Chi tiết bàn
- `PUT /api/admin/tables/:id` - Cập nhật thông tin bàn
- `PATCH /api/admin/tables/:id/status` - Đổi trạng thái bàn

### QR Code Operations (Mã QR)

- `POST /api/admin/tables/:id/qr/generate` - Tạo QR code cho bàn
- `GET /api/admin/tables/:id/qr/download?format=png|pdf` - Tải QR code
- `GET /api/admin/tables/qr/download-all` - Tải tất cả QR (ZIP)
- `POST /api/admin/tables/qr/regenerate-all` - Tạo lại tất cả QR code

### Menu Management (Quản lý thực đơn)

- `GET /api/admin/menu/items` - Lấy danh sách món ăn
- `POST /api/admin/menu/items` - Thêm món ăn mới
- `GET /api/admin/menu/items/:id` - Chi tiết món ăn
- `PUT /api/admin/menu/items/:id` - Cập nhật món ăn
- `DELETE /api/admin/menu/items/:id` - Xóa món ăn
- `POST /api/admin/menu/items/:id/modifier-groups` - Gán nhóm tùy chọn cho món

#### Categories (Danh mục)

- `GET /api/admin/menu/categories` - Lấy danh mục
- `POST /api/admin/menu/categories` - Thêm danh mục
- `PUT /api/admin/menu/categories/:id` - Sửa danh mục
- `DELETE /api/admin/menu/categories/:id` - Xóa danh mục
- `PATCH /api/admin/menu/categories/:id/status` - Đổi trạng thái danh mục

#### Modifiers (Tùy chọn món)

- `GET /api/admin/menu/modifier-groups` - Lấy danh sách nhóm tùy chọn
- `POST /api/admin/menu/modifier-groups` - Thêm nhóm tùy chọn
- `GET /api/admin/menu/modifier-groups/:id` - Chi tiết nhóm tùy chọn
- `PUT /api/admin/menu/modifier-groups/:id` - Sửa nhóm tùy chọn
- `DELETE /api/admin/menu/modifier-groups/:id` - Xóa nhóm tùy chọn
- `GET /api/admin/menu/modifier-groups/:id/options` - Lấy danh sách option của nhóm
- `POST /api/admin/menu/modifier-groups/:id/options` - Thêm option vào nhóm
- `PUT /api/admin/menu/modifier-options/:id` - Sửa option
- `DELETE /api/admin/menu/modifier-options/:id` - Xóa option

#### Photos (Ảnh món ăn)

- `GET /api/admin/menu/items/:id/photos` - Lấy danh sách ảnh món
- `POST /api/admin/menu/items/:id/photos` - Thêm ảnh cho món
- `DELETE /api/admin/menu/items/:id/photos/:photoId` - Xóa ảnh
- `PATCH /api/admin/menu/items/:id/photos/:photoId/primary` - Đặt ảnh chính

### Orders (Quản lý đơn hàng)

- `GET /api/admin/orders` - Lấy danh sách đơn hàng

### Reports (Báo cáo)

- `GET /admin/reports/overview` - Báo cáo tổng quan
- `GET /admin/reports/export.csv` - Xuất báo cáo CSV
- `GET /admin/reports/export.pdf` - Xuất báo cáo PDF

### Dashboard

- `GET /admin/dashboard/overview` - Thống kê tổng quan

### Item Reviews (Đánh giá món ăn)

- `POST /api/customer/item-reviews` - Thêm đánh giá món ăn
- `GET /api/customer/menu/:id/reviews` - Lấy danh sách đánh giá của món
- `DELETE /api/customer/item-reviews/:reviewId` - Xóa đánh giá

## 🗂️ Cấu trúc thư mục

```
src/
├── accounts/         # Quản lý tài khoản (admin, staff, kitchen)
│   ├── accounts.controller.ts
│   ├── accounts.module.ts
│   ├── accounts.service.ts
│   └── account.schema.ts
├── auth/             # Xác thực, đăng nhập, JWT
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   ├── auth.service.ts
│   └── dto/
├── bills/            # Quản lý hóa đơn
├── common/           # Các thành phần chung (decorators, guards, strategies, types, utils)
├── config/           # Cấu hình môi trường, biến env
├── dashboard/        # Dashboard thống kê
├── menu/             # Quản lý thực đơn (items, categories, modifiers, photos)
│   ├── items/
│   ├── categories/
│   ├── modifiers/
│   ├── photos/
│   └── review/
├── orders/           # Quản lý đơn hàng
├── payments/         # Quản lý thanh toán
├── reports/          # Báo cáo
├── tables/           # Quản lý bàn
│   ├── table.controller.ts
│   ├── table.module.ts
│   ├── tables.service.ts
│   └── table.schema.ts
├── table-sessions/   # Quản lý phiên đặt bàn
├── users/            # Quản lý người dùng
├── app.module.ts     # Root module
└── main.ts           # Entry point
```

## 🔐 Tạo Admin đầu tiên

Sau khi khởi động server, tạo admin bằng API:

```bash
curl -X POST http://localhost:3000/api/admin/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

Hoặc dùng Postman/Thunder Client với body:

```json
{
  "username": "admin",
  "password": "admin123"
}
```

## 📝 Ghi chú

- **JWT Tokens**: Access token có hạn 15 phút, refresh token 7 ngày
- **QR Code**: Mã QR có chứa JWT token với thời hạn 30 ngày
- **CORS**: Đã bật CORS cho frontend (localhost:5173)
- **Cookie**: Refresh token được lưu trong httpOnly cookie

## 🐛 Troubleshooting

### Lỗi kết nối MongoDB:

```
MongooseError: connect ECONNREFUSED
```

**Giải pháp**: Kiểm tra MongoDB đã chạy chưa, kiểm tra `MONGO_URI` trong `.env`

### Lỗi PowerShell execution policy:

```
PSSecurityException: Running scripts is disabled
```

**Giải pháp**:

```bash
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port 3000 đã được sử dụng:

**Giải pháp**: Đổi `PORT` trong file `.env` hoặc kill process đang dùng port 3000
