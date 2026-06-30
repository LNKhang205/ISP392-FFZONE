# ĐẶC TẢ TÀI LIỆU API DỰ ÁN FFZONE

Tài liệu này đặc tả chi tiết toàn bộ các điểm cuối API (Endpoints) thực tế đang hoạt động trong mã nguồn Spring Boot Backend của dự án **FFZONE**.

---

## 🔐 1. Xác thực & Phân quyền (Authentication & Authorization)
* **Cơ chế xác thực:** Sử dụng JSON Web Token (JWT).
* **Cách truyền Token:** Đính kèm trong HTTP Header của request:
  ```http
  Authorization: Bearer <your_jwt_token>
  ```
* **Các vai trò (Roles) trong hệ thống:**
  * `ROLE_CUSTOMER` (Người dùng đặt sân)
  * `ROLE_STAFF` (Nhân viên sân bóng)
  * `ROLE_OWNER` (Chủ sân bóng)
  * `ROLE_IT_ADMIN` (Quản trị viên hệ thống)

---

## 📂 2. Danh sách Endpoint Chi tiết Theo Module

### 🔑 2.1. Module Xác thực (`/api/auth`)
Tất cả các API trong module này đều là **Public** (không cần đăng nhập).

#### `POST /api/auth/login`
* **Mô tả:** Đăng nhập hệ thống bằng tài khoản mật khẩu.
* **Request Body (`LoginRequest`):**
  ```json
  {
    "username": "customer1",
    "password": "password123"
  }
  ```
* **Response Body (`AuthResponse`):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "username": "customer1",
    "role": "ROLE_CUSTOMER"
  }
  ```

#### `POST /api/auth/register`
* **Mô tả:** Đăng ký tài khoản người dùng mới (Mặc định có vai trò `ROLE_CUSTOMER`).
* **Request Body (`RegisterRequest`):**
  ```json
  {
    "username": "newuser",
    "password": "password123",
    "email": "user@example.com",
    "fullName": "Nguyen Van A",
    "phone": "0987654321"
  }
  ```
* **Response Body (`AuthResponse`):** Trả về token và thông tin đăng nhập ngay sau khi đăng ký thành công.

#### `GET /api/auth/me`
* **Mô tả:** Lấy thông tin chi tiết của tài khoản hiện đang đăng nhập qua JWT Token.
* **Yêu cầu xác thực:** Yêu cầu đăng nhập.
* **Response Body (`AccountResponse`):**
  ```json
  {
    "id": "uuid-string",
    "username": "customer1",
    "email": "customer1@gmail.com",
    "fullName": "Nguyen Van A",
    "phone": "0987654321",
    "role": "ROLE_CUSTOMER",
    "avatarUrl": "/uploads/avatars/abc.jpg",
    "active": true
  }
  ```

---

### 👤 2.2. Module Tài khoản (`/api/accounts`)

#### `GET /api/accounts`
* **Mô tả:** Lấy danh sách toàn bộ tài khoản trong hệ thống.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN`
* **Response Body:** `List<AccountResponse>`

#### `GET /api/accounts/{id}`
* **Mô tả:** Lấy thông tin chi tiết tài khoản theo ID.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN`
* **Response Body:** `AccountResponse`

#### `POST /api/accounts`
* **Mô tả:** Admin tạo mới tài khoản (chủ động gán vai trò bất kỳ).
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN`
* **Request Body (`AccountRequest`):**
  ```json
  {
    "username": "staff1",
    "password": "password123",
    "email": "staff1@ffzone.com",
    "fullName": "Nhân viên A",
    "phone": "0912345678",
    "role": "ROLE_STAFF"
  }
  ```
* **Response Body:** `AccountResponse` (HTTP Status `201 Created`)

#### `PUT /api/accounts/{id}`
* **Mô tả:** Admin chỉnh sửa thông tin tài khoản của bất kỳ user nào.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN`
* **Request Body (`AccountRequest`):** (Thông tin cập nhật)
* **Response Body:** `AccountResponse`

#### `DELETE /api/accounts/{id}`
* **Mô tả:** Vô hiệu hóa (deactivate) tài khoản theo ID.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN`
* **Response:** Không trả về body (HTTP Status `204 No Content`).

#### `PUT /api/accounts/me/profile`
* **Mô tả:** Người dùng hiện tại tự cập nhật thông tin cá nhân.
* **Yêu cầu xác thực:** Yêu cầu đăng nhập.
* **Request Body (`UpdateProfileRequest`):**
  ```json
  {
    "fullName": "Nguyen Van A Cập Nhật",
    "phone": "0988888888",
    "email": "newemail@example.com"
  }
  ```
* **Response Body:** `AccountResponse`

#### `PUT /api/accounts/me/password`
* **Mô tả:** Người dùng hiện tại tự đổi mật khẩu.
* **Yêu cầu xác thực:** Yêu cầu đăng nhập.
* **Request Body (`ChangePasswordRequest`):**
  ```json
  {
    "oldPassword": "oldpassword123",
    "newPassword": "newpassword123"
  }
  ```
* **Response:** Không trả về body (HTTP Status `204 No Content`).

#### `POST /api/accounts/me/avatar`
* **Mô tả:** Người dùng tải lên ảnh đại diện của mình.
* **Yêu cầu xác thực:** Yêu cầu đăng nhập.
* **Content-Type:** `multipart/form-data`
* **Request Params:**
  * `file`: MultipartFile (Tập tin ảnh).
* **Response Body:** `AccountResponse`

---

### 🏟️ 2.3. Module Sân Bóng (`/api/fields`)

#### `GET /api/fields`
* **Mô tả:** Lấy danh sách toàn bộ sân bóng (gồm cả ẩn/hiện).
* **Yêu cầu xác thực:** **Public**
* **Response Body:** `List<FieldResponse>`
  ```json
  [
    {
      "id": "uuid-string",
      "name": "Sân bóng A",
      "address": "123 Đường ABC",
      "description": "Sân cỏ nhân tạo chất lượng cao",
      "thumbnailUrl": "/uploads/fields/thumb.jpg",
      "active": true
    }
  ]
  ```

#### `GET /api/fields/active`
* **Mô tả:** Lấy danh sách các sân đang hoạt động (Hiển thị trang chủ).
* **Yêu cầu xác thực:** **Public**
* **Response Body:** `List<FieldResponse>`

#### `GET /api/fields/{id}`
* **Mô tả:** Xem chi tiết sân bóng theo ID.
* **Yêu cầu xác thực:** **Public**
* **Response Body:** `FieldResponse`

#### `POST /api/fields`
* **Mô tả:** Tạo mới một sân bóng.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN`
* **Request Body (`FieldRequest`):**
  ```json
  {
    "name": "Sân số 5",
    "address": "456 Đường XYZ",
    "description": "Sân 7 người mới nâng cấp",
    "active": true
  }
  ```
* **Response Body:** `FieldResponse` (HTTP Status `201 Created`)

#### `PUT /api/fields/{id}`
* **Mô tả:** Cập nhật thông tin chi tiết sân bóng.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN`
* **Request Body (`FieldRequest`):** (Thông tin cập nhật)
* **Response Body:** `FieldResponse`

#### `DELETE /api/fields/{id}`
* **Mô tả:** Xóa sân bóng.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN`
* **Response:** Không trả về body (HTTP Status `204 No Content`).

---

### 🖼️ 2.4. Module Hình Ảnh Sân Bóng (`/api/field-images`)

#### `GET /api/field-images/field/{fieldId}`
* **Mô tả:** Lấy toàn bộ danh sách hình ảnh của một sân bóng.
* **Yêu cầu xác thực:** **Public**
* **Response Body:** `List<FieldImageResponse>`
  ```json
  [
    {
      "id": "uuid-string",
      "fieldId": "uuid-field-id",
      "imageUrl": "/uploads/fields/pic1.jpg",
      "thumbnail": false
    }
  ]
  ```

#### `POST /api/field-images/upload/{fieldId}`
* **Mô tả:** Tải lên hình ảnh cho sân bóng.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN` hoặc `ROLE_OWNER`
* **Content-Type:** `multipart/form-data`
* **Request Params:**
  * `file`: MultipartFile (Tập tin ảnh).
  * `isThumbnail`: Boolean (Mặc định `false`, nếu `true` sẽ chọn làm ảnh chính của sân).
* **Response Body:** `FieldImageResponse`

#### `PUT /api/field-images/{imageId}/thumbnail`
* **Mô tả:** Thiết lập hình ảnh cụ thể làm ảnh đại diện chính (Thumbnail) cho sân.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN` hoặc `ROLE_OWNER`
* **Response Body:** `FieldImageResponse`

#### `DELETE /api/field-images/{imageId}`
* **Mô tả:** Xóa ảnh sân bóng theo ID ảnh.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN` hoặc `ROLE_OWNER`
* **Response:** Không trả về body (HTTP Status `204 No Content`).

---

### 💵 2.5. Module Bảng Giá Sân (`/api/field-pricings`)
*Lưu ý: Base path thực tế là `/api/field-pricings` (số nhiều), tài liệu ghi số ít `/api/field-pricing`.*

#### `GET /api/field-pricings/field/{fieldId}`
* **Mô tả:** Lấy bảng giá áp dụng cho 1 sân cụ thể (Dùng tính giá trên trang đặt sân).
* **Yêu cầu xác thực:** **Public**
* **Response Body:** `List<FieldPricingResponse>`

#### `GET /api/field-pricings/{id}`
* **Mô tả:** Xem chi tiết 1 cấu hình giá theo ID.
* **Yêu cầu xác thực:** **Public**
* **Response Body:** `FieldPricingResponse`

#### `GET /api/field-pricings`
* **Mô tả:** Admin xem tổng quan toàn bộ cấu hình giá của hệ thống.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN`
* **Response Body:** `List<FieldPricingResponse>`

#### `GET /api/field-pricings/holidays/current`
* **Mô tả:** Lấy các đợt giá ngày lễ đang hoặc sắp diễn ra trong 30 ngày tới để hiển thị thông báo.
* **Yêu cầu xác thực:** **Public**
* **Response Body:** `List<FieldPricingResponse>`

#### `GET /api/field-pricings/holidays`
* **Mô tả:** Lấy danh sách cấu hình giá áp dụng cho các ngày lễ hiện tại.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN`
* **Response Body:** `List<FieldPricingResponse>`

#### `POST /api/field-pricings`
* **Mô tả:** Tạo mới 1 bản ghi cấu hình giá đơn lẻ.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN`
* **Request Body (`FieldPricingRequest`):**
  ```json
  {
    "fieldId": "uuid-field-id",
    "dayOfWeek": "WEEKDAY",
    "startTime": "17:00:00",
    "endTime": "18:30:00",
    "price": 250000,
    "effectiveFrom": "2026-01-01",
    "effectiveTo": "2026-12-31"
  }
  ```
* **Response Body:** `FieldPricingResponse`

#### `POST /api/field-pricings/field/{fieldId}`
* **Mô tả:** Cài đặt nhanh giá ngày thường & cuối tuần cho một sân. Tự động sinh ra 2 bản ghi: `WEEKDAY` và `WEEKEND` (weekend = weekday × 1.25).
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN`
* **Request Body (`FieldPricingRequest`):**
  ```json
  {
    "price": 200000,
    "startTime": "06:00:00",
    "endTime": "22:00:00"
  }
  ```
* **Response Body:** `List<FieldPricingResponse>`

#### `POST /api/field-pricings/holiday/bulk`
* **Mô tả:** Áp dụng biểu giá ngày lễ cho nhiều sân bóng cùng lúc.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN`
* **Request Body (`FieldPricingRequest`):** (Chứa list `fieldIds` và thông tin giá ngày lễ).
* **Response Body:** `List<FieldPricingResponse>`

#### `POST /api/field-pricings/bulk-apply`
* **Mô tả:** Áp dụng hàng loạt biểu giá ngày thường & cuối tuần cho nhiều sân bóng.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN`
* **Request Body (`FieldPricingRequest`):**
  ```json
  {
    "fieldIds": ["uuid-field1", "uuid-field2"],
    "price": 200000,
    "effectiveFrom": "2026-01-01"
  }
  ```
* **Response Body:** `Integer` (Số lượng bản ghi giá được tạo).

#### `PUT /api/field-pricings/holiday/update-dates`
* **Mô tả:** Cập nhật khoảng thời gian áp dụng của một dịp lễ hiện có (không cần tạo mới).
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN`
* **Request Body (`FieldPricingRequest`):**
  ```json
  {
    "holidayName": "Tết Nguyên Đán 2026",
    "effectiveFrom": "2026-02-15",
    "effectiveTo": "2026-02-22"
  }
  ```
* **Response Body:** `Integer` (Số bản ghi bị thay đổi).

#### `POST /api/field-pricings/sync-all-slots`
* **Mô tả:** Đồng bộ lại giá của toàn bộ các khung giờ sân trống (`AVAILABLE`) theo bảng giá hiện hành.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN`
* **Response Body:** `Integer` (Số slot được cập nhật lại giá).

#### `PUT /api/field-pricings/{id}`
* **Mô tả:** Cập nhật thông tin của 1 cấu hình giá đơn lẻ theo ID.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN`
* **Response Body:** `FieldPricingResponse`

#### `DELETE /api/field-pricings/{id}`
* **Mô tả:** Xóa 1 cấu hình giá.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN`
* **Response:** Không trả về body (HTTP Status `204 No Content`).

---

### ⏰ 2.6. Module Khung Giờ Sân (`/api/field-slots`)

#### `GET /api/field-slots/{id}`
* **Mô tả:** Lấy thông tin chi tiết của 1 slot.
* **Yêu cầu xác thực:** **Public**
* **Response Body:** `FieldSlotResponse`
  ```json
  {
    "id": "uuid-slot-id",
    "fieldId": "uuid-field-id",
    "date": "2026-07-01",
    "startTime": "17:00:00",
    "endTime": "18:30:00",
    "price": 250000,
    "status": "AVAILABLE"
  }
  ```

#### `GET /api/field-slots/field/{fieldId}`
* **Mô tả:** Lấy danh sách tất cả các slot (gồm cả đặt/trống) của một sân trong ngày chỉ định.
* **Yêu cầu xác thực:** **Public**
* **Query Params:**
  * `date`: LocalDate (Định dạng `YYYY-MM-DD`).
* **Response Body:** `List<FieldSlotResponse>`

#### `GET /api/field-slots/field/{fieldId}/available`
* **Mô tả:** Chỉ lấy danh sách các slot **còn trống** (`AVAILABLE`) của một sân trong ngày chỉ định để đặt sân.
* **Yêu cầu xác thực:** **Public**
* **Query Params:**
  * `date`: LocalDate (Định dạng `YYYY-MM-DD`).
* **Response Body:** `List<FieldSlotResponse>`

#### `GET /api/field-slots/date`
* **Mô tả:** Lấy tất cả slot của toàn hệ thống trong ngày chỉ định.
* **Yêu cầu xác thực:** **Public**
* **Query Params:**
  * `date`: LocalDate (Định dạng `YYYY-MM-DD`).
* **Response Body:** `List<FieldSlotResponse>`

#### `GET /api/field-slots/field/{fieldId}/range`
* **Mô tả:** Lấy slot của 1 sân theo khoảng ngày chỉ định.
* **Yêu cầu xác thực:** **Public**
* **Query Params:**
  * `from`: LocalDate (Ngày bắt đầu).
  * `to`: LocalDate (Ngày kết thúc).
* **Response Body:** `List<FieldSlotResponse>`

#### `POST /api/field-slots/apply-holiday`
* **Mô tả:** Áp dụng phụ thu/điều chỉnh giá ngày lễ trực tiếp lên các slot đã được tạo sẵn trong cơ sở dữ liệu.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN`
* **Request Body:**
  ```json
  {
    "fieldIds": ["uuid-field1"],
    "from": "2026-02-15",
    "to": "2026-02-22",
    "adjustmentPercent": 30.00
  }
  ```
* **Response Body:** `Integer` (Số lượng slot đã được điều chỉnh giá thành công).

---

### 📝 2.7. Module Đặt Sân (`/api/bookings`)

#### `POST /api/bookings`
* **Mô tả:** Tạo đơn đặt sân bóng mới (chọn khung giờ và áp dụng voucher).
* **Yêu cầu xác thực:** Yêu cầu đăng nhập.
* **Request Body (`CreateBookingRequest`):**
  ```json
  {
    "fieldSlotIds": ["uuid-slot-1", "uuid-slot-2"],
    "voucherCode": "UUDAI10K"
  }
  ```
* **Response Body (`BookingResponse`):**
  ```json
  {
    "id": "uuid-booking-id",
    "code": "BK-123456",
    "accountId": "uuid-user-id",
    "totalAmount": 500000,
    "discountAmount": 10000,
    "finalAmount": 490000,
    "status": "PENDING",
    "createdAt": "2026-06-30T10:00:00"
  }
  ```

#### `GET /api/bookings/me`
* **Mô tả:** Khách hàng xem lịch sử đặt sân của cá nhân mình.
* **Yêu cầu xác thực:** Yêu cầu đăng nhập.
* **Response Body:** `List<BookingResponse>`

#### `GET /api/bookings`
* **Mô tả:** Xem toàn bộ danh sách đặt sân của hệ thống (phục vụ dashboard).
* **Yêu cầu xác thực:** Yêu cầu đăng nhập (`ROLE_STAFF` / `ROLE_OWNER` / `ROLE_IT_ADMIN`).
* **Response Body:** `List<BookingResponse>`

#### `GET /api/bookings/{id}`
* **Mô tả:** Xem chi tiết đơn đặt sân theo ID đơn.
* **Yêu cầu xác thực:** Yêu cầu đăng nhập.
* **Response Body:** `BookingResponse`

#### `GET /api/bookings/code/{code}`
* **Mô tả:** Tìm kiếm đơn đặt sân bằng mã code (`BK-XXXXXX`) để kiểm tra hoặc check-in tại sân.
* **Yêu cầu xác thực:** Yêu cầu đăng nhập.
* **Response Body:** `BookingResponse`

#### `POST /api/bookings/{id}/cancel`
* **Mô tả:** Hủy đặt sân bóng. Hệ thống sẽ tự động sinh yêu cầu hoàn tiền nếu đủ điều kiện quy định.
* **Yêu cầu xác thực:** Yêu cầu đăng nhập.
* **Request Body (Không bắt buộc):**
  ```json
  {
    "reason": "Tôi bận việc đột xuất"
  }
  ```
* **Response Body:** `BookingResponse` (Trạng thái đơn chuyển sang `CANCELLED`).

#### `POST /api/bookings/{id}/add-services-at-venue`
* **Mô tả:** Gọi đặt thêm dịch vụ (nước uống, thuê áo đấu...) trực tiếp tại sân bóng khi đã nhận sân. Trả về số tiền cần thanh toán phát sinh và tạo Payment URL.
* **Yêu cầu xác thực:** Yêu cầu đăng nhập.
* **Request Body:**
  ```json
  {
    "items": [
      { "serviceId": "uuid-nuoc-suoi", "quantity": 5 }
    ],
    "voucherCode": "DICHVU5"
  }
  ```
* **Response Body:**
  ```json
  {
    "bookingId": "uuid-booking-id",
    "bookingCode": "BK-123456",
    "payAmount": 50000
  }
  ```

---

### 🛒 2.8. Module Dịch vụ Đơn Đặt Sân (`/api/bookings/{bookingId}/services`)

#### `GET /api/bookings/{bookingId}/services`
* **Mô tả:** Lấy danh sách dịch vụ đi kèm của đơn đặt sân.
* **Yêu cầu xác thực:** Yêu cầu đăng nhập.
* **Response Body:** `List<BookingServiceResponse>`

#### `POST /api/bookings/{bookingId}/services/checkout-cart`
* **Mô tả:** Thanh toán và chuyển toàn bộ các dịch vụ từ giỏ hàng (Cart) của người dùng đính kèm vào Booking này, đồng thời làm trống giỏ hàng.
* **Yêu cầu xác thực:** Yêu cầu đăng nhập.
* **Response Body:** `List<BookingServiceResponse>`

#### `POST /api/bookings/{bookingId}/services`
* **Mô tả:** Thêm trực tiếp 1 dịch vụ vào đơn đặt sân đã có.
* **Yêu cầu xác thực:** Yêu cầu đăng nhập.
* **Request Body (`AddToCartRequest`):**
  ```json
  {
    "serviceId": "uuid-service-id",
    "quantity": 1
  }
  ```
* **Response Body:** `List<BookingServiceResponse>`

#### `DELETE /api/bookings/{bookingId}/services/{bookingServiceId}`
* **Mô tả:** Xóa một dịch vụ ra khỏi đơn đặt sân.
* **Yêu cầu xác thực:** Yêu cầu đăng nhập.
* **Response:** Không trả về body (HTTP Status `204 No Content`).

---

### 🛒 2.9. Module Giỏ Hàng Dịch Vụ (`/api/cart`)

#### `GET /api/cart`
* **Mô tả:** Lấy thông tin giỏ hàng dịch vụ của người dùng hiện tại.
* **Yêu cầu xác thực:** Yêu cầu đăng nhập.
* **Response Body (`CartResponse`):**

#### `POST /api/cart/items`
* **Mô tả:** Thêm dịch vụ vào giỏ hàng.
* **Yêu cầu xác thực:** Yêu cầu đăng nhập.
* **Request Body (`AddToCartRequest`):**
  ```json
  {
    "serviceId": "uuid-service-id",
    "quantity": 2
  }
  ```
* **Response Body:** `CartResponse`

#### `PUT /api/cart/items/{itemId}`
* **Mô tả:** Điều chỉnh số lượng của sản phẩm cụ thể trong giỏ hàng.
* **Yêu cầu xác thực:** Yêu cầu đăng nhập.
* **Query Params:**
  * `quantity`: Integer (Số lượng mới thiết lập).
* **Response Body:** `CartResponse`

#### `DELETE /api/cart/items/{itemId}`
* **Mô tả:** Xóa một dịch vụ khỏi giỏ hàng.
* **Yêu cầu xác thực:** Yêu cầu đăng nhập.
* **Response Body:** `CartResponse`

#### `DELETE /api/cart`
* **Mô tả:** Xóa sạch toàn bộ giỏ hàng của người dùng hiện tại.
* **Yêu cầu xác thực:** Yêu cầu đăng nhập.
* **Response:** Không trả về body (HTTP Status `204 No Content`).

---

### 🎟️ 2.10. Module Mã Giảm Giá (`/api/vouchers`)

#### `GET /api/vouchers`
* **Mô tả:** Lấy danh sách toàn bộ mã giảm giá.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN` hoặc `ROLE_OWNER`
* **Response Body:** `List<VoucherResponse>`

#### `GET /api/vouchers/available`
* **Mô tả:** Lấy danh sách voucher đang hoạt động và còn số lượng phát hành để người dùng thu thập.
* **Yêu cầu xác thực:** **Public**
* **Response Body:** `List<VoucherResponse>`

#### `GET /api/vouchers/{id}`
* **Mô tả:** Xem thông tin chi tiết một mã giảm giá.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN` hoặc `ROLE_OWNER`
* **Response Body:** `VoucherResponse`

#### `POST /api/vouchers`
* **Mô tả:** Tạo mã giảm giá mới.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN` hoặc `ROLE_OWNER`
* **Request Body (`VoucherRequest`):**
  ```json
  {
    "code": "MAYGIA50",
    "discountValue": 50000,
    "minAmount": 300000,
    "startDate": "2026-07-01T00:00:00",
    "endDate": "2026-07-31T23:59:59",
    "quantity": 100
  }
  ```
* **Response Body:** `VoucherResponse`

#### `PUT /api/vouchers/{id}`
* **Mô tả:** Cập nhật thông tin mã giảm giá.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN` hoặc `ROLE_OWNER`
* **Request Body (`VoucherRequest`):** (Thông tin cập nhật)
* **Response Body:** `VoucherResponse`

#### `DELETE /api/vouchers/{id}`
* **Mô tả:** Hủy kích hoạt (Deactivate) mã giảm giá.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN` hoặc `ROLE_OWNER`
* **Response:** Không trả về body (HTTP Status `204 No Content`).

---

### 🎟️ 2.11. Module Nhận Mã Giảm Giá (`/api/user-vouchers`)

#### `POST /api/user-vouchers/claim/{voucherId}`
* **Mô tả:** Người dùng hiện tại thu thập (claim) mã giảm giá về tài khoản.
* **Yêu cầu xác thực:** `ROLE_USER`
* **Response Body:** `UserVoucherResponse`

#### `GET /api/user-vouchers/my`
* **Mô tả:** Lấy danh sách các mã giảm giá cá nhân đang sở hữu của tài khoản hiện tại.
* **Yêu cầu xác thực:** `ROLE_USER`
* **Response Body:** `List<UserVoucherResponse>`

---

### 💳 2.12. Module Thanh Toán VNPay (`/api/payments`)

#### `POST /api/payments/{bookingId}/create-url`
* **Mô tả:** Tạo và lấy liên kết (URL) để chuyển hướng người dùng sang trang cổng thanh toán VNPay.
* **Yêu cầu xác thực:** Yêu cầu đăng nhập.
* **Response Body (`PaymentUrlResponse`):**
  ```json
  {
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?..."
  }
  ```

#### `GET /api/payments/vnpay-return`
* **Mô tả:** Nơi VNPay chuyển hướng trình duyệt của người dùng quay trở lại sau khi thanh toán xong. Xử lý logic kiểm tra chữ ký số, xác định trạng thái giao dịch rồi Redirect (302) trực tiếp về Frontend kèm query parameters kết quả.
* **Yêu cầu xác thực:** **Public**
* **Response:** Trả về HTTP Code `302 Redirect` tới URL kết quả của Frontend (ví dụ: `http://localhost:5173/payment-result?status=success&bookingCode=BK-123456`).

#### `GET /api/payments/vnpay-ipn`
* **Mô tả:** Endpoint cổng IPN (Server-to-Server) của VNPay gọi trực tiếp về Backend để đồng bộ giao dịch chính thức. Set trạng thái Payment là `PAID` và Booking là `CONFIRMED`.
* **Yêu cầu xác thực:** **Public**
* **Response Body:** Định dạng JSON phản hồi đúng chuẩn cổng VNPay:
  ```json
  {
    "RspCode": "00",
    "Message": "Confirm Success"
  }
  ```

---

### 💸 2.13. Module Hoàn Tiền (`/api/refunds`)
Tất cả các API này yêu cầu vai trò: `ROLE_STAFF`, `ROLE_OWNER` hoặc `ROLE_IT_ADMIN`.

#### `GET /api/refunds/pending`
* **Mô tả:** Lấy danh sách các yêu cầu hoàn tiền đang ở trạng thái chờ duyệt (Pending) của khách hàng để nhân viên xử lý chuyển khoản thủ công.
* **Response Body:** `List<RefundResponse>`

#### `GET /api/refunds`
* **Mô tả:** Xem toàn bộ lịch sử danh sách hoàn tiền.
* **Response Body:** `List<RefundResponse>`

#### `GET /api/refunds/booking/{bookingId}`
* **Mô tả:** Lấy thông tin chi tiết phiếu hoàn tiền theo ID Booking.
* **Response Body:** `RefundResponse`

#### `POST /api/refunds/{id}/complete`
* **Mô tả:** Nhân viên xác nhận đã chuyển khoản hoàn tiền thành công cho khách hàng ở bên ngoài thực tế. Trạng thái phiếu chuyển thành `COMPLETED`.
* **Request Body (Không bắt buộc):**
  ```json
  {
    "note": "Đã chuyển khoản qua Vietcombank"
  }
  ```
* **Response Body:** `RefundResponse`

#### `POST /api/refunds/{id}/reject`
* **Mô tả:** Nhân viên từ chối duyệt yêu cầu hoàn tiền của khách. Trạng thái chuyển thành `REJECTED`.
* **Request Body:**
  ```json
  {
    "note": "Lý do từ chối..."
  }
  ```
* **Response Body:** `RefundResponse`

---

### 📊 2.14. Module Dashboard Chủ Sân (`/api/owner`)

#### `GET /api/owner/dashboard`
* **Mô tả:** Lấy số liệu thống kê doanh thu, tỷ lệ đặt sân phục vụ màn hình Dashboard của Chủ sân / Quản trị viên.
* **Yêu cầu xác thực:** `ROLE_OWNER` hoặc `ROLE_IT_ADMIN`
* **Query Params:**
  * `period`: String (Các tùy chọn: `today`, `week`, `month`. Mặc định là `month`).
* **Response Body (`OwnerDashboardResponse`):**

---

### 🥤 2.15. Module Quản Lý Dịch Vụ Sân (`/api/services`)

#### `GET /api/services`
* **Mô tả:** Lấy danh sách toàn bộ dịch vụ (nước uống, thuê đồ...).
* **Yêu cầu xác thực:** **Public**
* **Response Body:** `List<ServiceResponse>`

#### `GET /api/services/active`
* **Mô tả:** Lấy danh sách dịch vụ đang được bán (Active).
* **Yêu cầu xác thực:** **Public**
* **Response Body:** `List<ServiceResponse>`

#### `GET /api/services/category/{category}`
* **Mô tả:** Lấy danh sách dịch vụ theo phân loại cụ thể.
* **Yêu cầu xác thực:** **Public**
* **Response Body:** `List<ServiceResponse>`

#### `GET /api/services/{id}`
* **Mô tả:** Lấy thông tin chi tiết của 1 dịch vụ.
* **Yêu cầu xác thực:** **Public**
* **Response Body:** `ServiceResponse`

#### `POST /api/services`
* **Mô tả:** Tạo dịch vụ mới.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN` hoặc `ROLE_OWNER`
* **Request Body (`ServiceRequest`):**
  ```json
  {
    "name": "Nước tăng lực Sting",
    "category": "DRINK",
    "price": 15000,
    "active": true
  }
  ```
* **Response Body:** `ServiceResponse`

#### `PUT /api/services/{id}`
* **Mô tả:** Cập nhật thông tin dịch vụ.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN` hoặc `ROLE_OWNER`
* **Request Body (`ServiceRequest`):** (Thông tin cập nhật)
* **Response Body:** `ServiceResponse`

#### `POST /api/services/{id}/image`
* **Mô tả:** Tải lên ảnh minh họa cho dịch vụ.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN` hoặc `ROLE_OWNER`
* **Content-Type:** `multipart/form-data`
* **Request Params:**
  * `file`: MultipartFile (Tập tin ảnh).
* **Response Body:** `ServiceResponse`

#### `PATCH /api/services/{id}/toggle`
* **Mô tả:** Bật hoặc tắt nhanh trạng thái hoạt động (active/inactive) của dịch vụ.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN` hoặc `ROLE_OWNER`
* **Response Body:** `ServiceResponse`

#### `DELETE /api/services/{id}`
* **Mô tả:** Xóa hoàn toàn dịch vụ.
* **Yêu cầu xác thực:** `ROLE_IT_ADMIN` hoặc `ROLE_OWNER`
* **Response:** Không trả về body (HTTP Status `204 No Content`).
