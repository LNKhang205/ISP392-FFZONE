# BẢNG ĐẶC TẢ CHI TIẾT API DỰ ÁN FFZONE

Tài liệu này đặc tả chi tiết toàn bộ các điểm cuối API (Endpoints) thực tế đang hoạt động trong dự án **FFZONE**, được trình bày dưới dạng bảng cấu trúc 10 cột theo chuẩn thiết kế Excel của bạn.

---

## 🔐 1. Thông tin chung về Xác thực (JWT)
* **Header bắt buộc cho các API cần đăng nhập:** `Authorization: Bearer <JWT_TOKEN>`
* **Môi trường Test OTP:** Mã OTP khôi phục mật khẩu sẽ được in ra tại **Console Log** của Backend Server.

---

## 📊 2. Bảng Đặc Tả API Theo Từng Module

### 🔑 2.1. Module Xác thực (`/api/auth`)

| Router | Endpoint | Mô tả | Method | Input (req.body / params) | Output (res.body) | Middleware / Role | Errors (Unhappy path) | Notes | Packages |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **/api/auth** | `/register` | Tạo tài khoản mới | POST | `RegisterRequest` (body):<br>- `fullName` (string)<br>- `email` (string)<br>- `phone` (string)<br>- `password` (string) | `AuthResponse` (JSON):<br>- `token` (string)<br>- `tokenType` (string)<br>- `user` (`AccountResponse`) | Public | - Email đã sử dụng (409)<br>- SĐT đã sử dụng (409)<br>- Thiếu trường bắt buộc (400)<br>- Email sai định dạng (400)<br>- Mật khẩu < 6 ký tự (400) | Mật khẩu được mã hóa BCrypt.<br>Vai trò mặc định gán là `USER`. Tự động login sau khi đăng ký thành công. | Spring Security, BCrypt, Hibernate Validator |
| **/api/auth** | `/login` | Đăng nhập hệ thống | POST | `LoginRequest` (body):<br>- `email` (string)<br>- `password` (string) | `AuthResponse` (JSON):<br>- `token` (string)<br>- `tokenType` (string)<br>- `user` (`AccountResponse`) | Public | - Sai email hoặc mật khẩu (400)<br>- Tài khoản bị khóa (403)<br>- Đăng nhập Google nhưng dùng mật khẩu (400) | Sinh JWT Access Token có thời hạn sử dụng. | Spring Security, JWT, BCrypt |
| **/api/auth** | `/me` | Lấy profile tài khoản đang đăng nhập | GET | (Không có - lấy từ JWT) | `AccountResponse` (JSON):<br>- `id`, `fullName`, `email`, `phone`, `role`, `avatarUrl`, `isActive`, `createdAt`, `provider`, `gender`, `dateOfBirth` | JWT Filter (`ROLE_USER`, `ROLE_STAFF`, `ROLE_OWNER`, `ROLE_IT_ADMIN`) | - Token hết hạn (401)<br>- Token không hợp lệ (401)<br>- Tài khoản không tồn tại (404) | Dùng hiển thị thông tin cá nhân và kiểm tra vai trò người dùng sau khi login. | Spring Security, JWT |
| **/api/auth** | `/logout` | Đăng xuất hệ thống | POST | (Không có - lấy từ JWT) | `{"message": "Đăng xuất thành công"}` | JWT Filter (Yêu cầu đăng nhập) | - Token hết hạn/không hợp lệ (401) | JWT là stateless. API ghi nhận log đăng xuất bên phía Backend. | Spring Security, JWT |
| **/api/auth** | `/forgot-password` | Gửi yêu cầu lấy lại mật khẩu | POST | `ForgotPasswordRequest` (body):<br>- `email` (string) | `{"message": "OTP khôi phục mật khẩu đã được gửi, vui lòng kiểm tra console"}` | Public | - Email không tồn tại (404)<br>- Email sai định dạng (400)<br>- Tài khoản liên kết Google (400) | Sinh OTP ngẫu nhiên 6 chữ số lưu trong bộ nhớ (hết hạn sau 10 phút) và in ra Console. | OtpService (In-memory Map) |
| **/api/auth** | `/reset-password` | Đặt lại mật khẩu bằng mã OTP | POST | `ResetPasswordRequest` (body):<br>- `email` (string)<br>- `otp` (string)<br>- `newPassword` (string) | `{"message": "Đặt lại mật khẩu thành công"}` | Public | - OTP sai (400)<br>- OTP hết hạn (400)<br>- Email không tồn tại (404) | Mật khẩu mới được mã hóa BCrypt. OTP bị xóa ngay sau khi xác thực thành công. | OtpService, BCrypt |

---

### 👤 2.2. Module Tài khoản (`/api/accounts`)

| Router | Endpoint | Mô tả | Method | Input (req.body / params) | Output (res.body) | Middleware / Role | Errors (Unhappy path) | Notes | Packages |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **/api/accounts** | `/` | Lấy tất cả tài khoản | GET | (Không có) | `List<AccountResponse>` | `ROLE_IT_ADMIN` | - Không có quyền (403)<br>- Chưa đăng nhập (401) | Phục vụ màn hình quản trị quản lý user. | Spring Security, JPA |
| **/api/accounts** | `/{id}` | Lấy chi tiết tài khoản theo ID | GET | - `id` (UUID path) | `AccountResponse` | `ROLE_IT_ADMIN` | - Không tìm thấy (404)<br>- Sai định dạng UUID (400) | Lấy thông tin tài khoản bất kỳ bằng ID. | Spring Security |
| **/api/accounts** | `/` | Admin tạo mới tài khoản | POST | `AccountRequest` (body):<br>- `username`, `password`, `email`, `fullName`, `phone`, `role` | `AccountResponse` | `ROLE_IT_ADMIN` | - Trùng email/SĐT (409)<br>- Thiếu trường bắt buộc (400) | Trả về Status `201 Created`. Cho phép Admin tạo tài khoản gán quyền STAFF/OWNER. | Spring Security, BCrypt |
| **/api/accounts** | `/{id}` | Admin cập nhật tài khoản | PUT | - `id` (UUID path)<br>- `AccountRequest` (body) | `AccountResponse` | `ROLE_IT_ADMIN` | - Không tìm thấy (404)<br>- Trùng email/SĐT của user khác (409) | Admin chỉnh sửa thông tin hoặc thay đổi quyền của tài khoản khác. | Spring Security |
| **/api/accounts** | `/{id}` | Vô hiệu hóa tài khoản | DELETE | - `id` (UUID path) | (Không trả về body) | `ROLE_IT_ADMIN` | - Không tìm thấy (404) | Trả về Status `204 No Content`. | Spring Security |
| **/api/accounts** | `/me/profile` | Tự cập nhật hồ sơ cá nhân | PUT | `UpdateProfileRequest` (body):<br>- `fullName`, `phone`, `email` | `AccountResponse` | Đã đăng nhập (Mọi role) | - Chưa đăng nhập (401)<br>- Trùng email/SĐT (409) | Người dùng tự sửa thông tin của mình. Không được sửa `role` hoặc `isActive`. | Spring Security |
| **/api/accounts** | `/me/password` | Tự thay đổi mật khẩu | PUT | `ChangePasswordRequest` (body):<br>- `oldPassword`, `newPassword` | (Không trả về body) | Đã đăng nhập (Mọi role) | - Mật khẩu cũ không đúng (400)<br>- Mật khẩu mới < 6 ký tự (400) | Trả về Status `204 No Content`. | Spring Security, BCrypt |
| **/api/accounts** | `/me/avatar` | Tải lên ảnh đại diện | POST | - `file` (Multipart file param) | `AccountResponse` | Đã đăng nhập (Mọi role) | - File rỗng (400)<br>- Lỗi tải file (500) | Upload và lưu trữ ảnh avatar cục bộ trong thư mục server. | Spring Security, File IO |

---

### 🏟️ 2.3. Module Sân Bóng (`/api/fields`)

| Router | Endpoint | Mô tả | Method | Input (req.body / params) | Output (res.body) | Middleware / Role | Errors (Unhappy path) | Notes | Packages |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **/api/fields** | `/` | Lấy danh sách tất cả sân bóng | GET | (Không có) | `List<FieldResponse>` | Public | (Không có) | Trả về cả các sân đang bị ẩn hoặc bảo trì. | JPA |
| **/api/fields** | `/active` | Lấy danh sách sân đang hoạt động | GET | (Không có) | `List<FieldResponse>` | Public | (Không có) | Dùng hiển thị trên trang chủ để khách hàng đặt sân. | JPA |
| **/api/fields** | `/{id}` | Lấy chi tiết một sân bóng | GET | - `id` (UUID path) | `FieldResponse` | Public | - Không tìm thấy sân (404) | Hiển thị thông tin mô tả chi tiết của sân. | JPA |
| **/api/fields** | `/` | Tạo mới một sân bóng | POST | `FieldRequest` (body):<br>- `name`, `address`, `description`, `active` | `FieldResponse` | `ROLE_IT_ADMIN` | - Thiếu dữ liệu (400) | Trả về Status `201 Created`. | Spring Security, JPA |
| **/api/fields** | `/{id}` | Cập nhật thông tin sân bóng | PUT | - `id` (UUID path)<br>- `FieldRequest` (body) | `FieldResponse` | `ROLE_IT_ADMIN` | - Không tìm thấy sân (404) | Chỉ Admin hệ thống mới có quyền chỉnh sửa. | Spring Security |
| **/api/fields** | `/{id}` | Xóa sân bóng | DELETE | - `id` (UUID path) | (Không trả về body) | `ROLE_IT_ADMIN` | - Không tìm thấy sân (404) | Trả về Status `204 No Content`. | Spring Security |

---

### 🖼️ 2.4. Module Hình Ảnh Sân Bóng (`/api/field-images`)

| Router | Endpoint | Mô tả | Method | Input (req.body / params) | Output (res.body) | Middleware / Role | Errors (Unhappy path) | Notes | Packages |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **/api/field-images** | `/field/{fieldId}` | Lấy tất cả ảnh của một sân bóng | GET | - `fieldId` (UUID path) | `List<FieldImageResponse>` | Public | (Không có) | Trả về danh sách URL ảnh thuộc sân. | JPA |
| **/api/field-images** | `/upload/{fieldId}` | Tải lên hình ảnh cho sân bóng | POST | - `fieldId` (UUID path)<br>- `file` (Multipart file param)<br>- `isThumbnail` (Boolean query, mặc định false) | `FieldImageResponse` | `ROLE_IT_ADMIN` hoặc `ROLE_OWNER` | - Sân bóng không tồn tại (404)<br>- File tải lên trống (400) | Trả về Status `201 Created`. Nếu `isThumbnail` = true, ảnh này sẽ thành ảnh đại diện chính của sân. | Spring Security, File IO |
| **/api/field-images** | `/{imageId}/thumbnail` | Đặt ảnh này làm ảnh chính (Thumbnail) | PUT | - `imageId` (UUID path) | `FieldImageResponse` | `ROLE_IT_ADMIN` hoặc `ROLE_OWNER` | - Ảnh không tồn tại (404) | Đặt `is_thumbnail` của ảnh thành true và cập nhật các ảnh khác của sân đó thành false. | Spring Security |
| **/api/field-images** | `/{imageId}` | Xóa hình ảnh | DELETE | - `imageId` (UUID path) | (Không trả về body) | `ROLE_IT_ADMIN` hoặc `ROLE_OWNER` | - Ảnh không tồn tại (404) | Trả về Status `204 No Content` và tự động xóa tệp vật lý trên ổ cứng server. | Spring Security, File IO |

---

### 💵 2.5. Bảng Giá Sân (`/api/field-pricings`)

| Router | Endpoint | Mô tả | Method | Input (req.body / params) | Output (res.body) | Middleware / Role | Errors (Unhappy path) | Notes | Packages |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **/api/field-pricings** | `/field/{fieldId}` | Lấy bảng giá của 1 sân cụ thể | GET | - `fieldId` (UUID path) | `List<FieldPricingResponse>` | Public | (Không có) | Dùng để tính toán giá của khung giờ đặt sân. | JPA |
| **/api/field-pricings** | `/{id}` | Xem chi tiết 1 cấu hình giá | GET | - `id` (UUID path) | `FieldPricingResponse` | Public | - Không tìm thấy (404) | Xem chi tiết khung giờ và đơn giá áp dụng. | JPA |
| **/api/field-pricings** | `/` | Tạo cấu hình giá đơn lẻ | POST | `FieldPricingRequest` (body) | `FieldPricingResponse` | `ROLE_IT_ADMIN` | - Khoảng giờ không hợp lệ (400) | Trả về Status `201 Created`. | Spring Security |
| **/api/field-pricings** | `/{id}` | Cập nhật cấu hình giá đơn lẻ | PUT | - `id` (UUID path)<br>- `FieldPricingRequest` (body) | `FieldPricingResponse` | `ROLE_IT_ADMIN` | - Không tìm thấy (404) | Chỉnh sửa khoảng giờ hoặc đơn giá. | Spring Security |
| **/api/field-pricings** | `/{id}` | Xóa cấu hình giá | DELETE | - `id` (UUID path) | (Không trả về body) | `ROLE_IT_ADMIN` | - Không tìm thấy (404) | Trả về Status `204 No Content`. | Spring Security |
| **/api/field-pricings** | `/` | Admin lấy tất cả biểu giá | GET | (Không có) | `List<FieldPricingResponse>` | `ROLE_IT_ADMIN` | - Không có quyền (403) | Phục vụ màn hình quản trị giá. | Spring Security |
| **/api/field-pricings** | `/holidays/current` | Lấy các đợt giá ngày lễ sắp diễn ra | GET | (Không có) | `List<FieldPricingResponse>` | Public | (Không có) | Phục vụ hiển thị banner thông báo giá ngày lễ. | JPA |
| **/api/field-pricings** | `/holidays` | Lấy tất cả cấu hình giá ngày lễ | GET | (Không có) | `List<FieldPricingResponse>` | `ROLE_IT_ADMIN` | - Không có quyền (403) | Lấy danh sách các bản ghi giá ngày lễ. | Spring Security |
| **/api/field-pricings** | `/field/{fieldId}` | Cài đặt nhanh giá ngày thường & cuối tuần | POST | - `fieldId` (UUID path)<br>- `FieldPricingRequest` (body): `{ price, startTime, endTime }` | `List<FieldPricingResponse>` | `ROLE_IT_ADMIN` | - Sân bóng không tồn tại (404) | Tự sinh ra 2 bản ghi: WEEKDAY (bằng giá nhập) và WEEKEND (giá nhập x 1.25). | Spring Security |
| **/api/field-pricings** | `/holiday/bulk` | Áp dụng giá ngày lễ cho nhiều sân | POST | `FieldPricingRequest` (body): chứa danh sách `fieldIds`, `holidayName`, `effectiveFrom`, `effectiveTo`, `price` | `List<FieldPricingResponse>` | `ROLE_IT_ADMIN` | - Danh sách sân trống (400) | Ghi nhận giá ngày lễ hàng loạt. | Spring Security |
| **/api/field-pricings** | `/bulk-apply` | Áp dụng giá thường hàng loạt cho nhiều sân | POST | `FieldPricingRequest` (body): chứa `fieldIds`, `price`, `effectiveFrom` | `Integer` (Số bản ghi được tạo) | `ROLE_IT_ADMIN` | - Lỗi dữ liệu (400) | Tạo nhanh biểu giá ngày thường & cuối tuần cho nhiều sân. | Spring Security |
| **/api/field-pricings** | `/holiday/update-dates` | Cập nhật ngày áp dụng dịp lễ | PUT | `FieldPricingRequest` (body): `{ holidayName, effectiveFrom, effectiveTo }` | `Integer` (Số bản ghi thay đổi) | `ROLE_IT_ADMIN` | - Dịp lễ không tồn tại (404) | Đổi lịch ngày lễ mà không cần tạo mới cấu hình giá. | Spring Security |
| **/api/field-pricings** | `/sync-all-slots` | Đồng bộ giá sân trống theo biểu giá hiện tại | POST | (Không có) | `Integer` (Số slot được đồng bộ) | `ROLE_IT_ADMIN` | (Không có) | Cập nhật lại giá cho toàn bộ slot `AVAILABLE` tránh bị lệch giá cũ. | Spring Security |

---

### ⏰ 2.6. Module Khung Giờ Sân (`/api/field-slots`)

| Router | Endpoint | Mô tả | Method | Input (req.body / params) | Output (res.body) | Middleware / Role | Errors (Unhappy path) | Notes | Packages |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **/api/field-slots** | `/{id}` | Lấy thông tin chi tiết một slot | GET | - `id` (UUID path) | `FieldSlotResponse` | Public | - Không tìm thấy slot (404) | Xem trạng thái trống/đã đặt và đơn giá của khung giờ cụ thể. | JPA |
| **/api/field-slots** | `/field/{fieldId}` | Lấy toàn bộ slot của sân theo ngày | GET | - `fieldId` (UUID path)<br>- `date` (Query param: YYYY-MM-DD) | `List<FieldSlotResponse>` | Public | - Sai định dạng ngày (400) | Trả về cả các slot trống và đã được đặt. | JPA |
| **/api/field-slots** | `/field/{fieldId}/available` | Chỉ lấy slot trống của sân trong ngày | GET | - `fieldId` (UUID path)<br>- `date` (Query param: YYYY-MM-DD) | `List<FieldSlotResponse>` | Public | (Không có) | Dùng cho khách hàng lựa chọn giờ khi thực hiện đặt sân. | JPA |
| **/api/field-slots** | `/date` | Lấy tất cả slot hệ thống theo ngày | GET | - `date` (Query param: YYYY-MM-DD) | `List<FieldSlotResponse>` | Public | - Thiếu tham số date (400) | Phục vụ màn hình xem tổng quan lịch đặt của toàn hệ thống. | JPA |
| **/api/field-slots** | `/field/{fieldId}/range` | Lấy slot của sân theo khoảng ngày | GET | - `fieldId` (UUID path)<br>- `from` (Query param)<br>- `to` (Query param) | `List<FieldSlotResponse>` | Public | - Khoảng ngày không hợp lệ (400) | Phục vụ xem lịch đặt sân trung hạn. | JPA |
| **/api/field-slots** | `/apply-holiday` | Áp dụng phụ thu ngày lễ cho slots | POST | `ApplyHolidayRequest` (body): `{ fieldIds, from, to, adjustmentPercent }` | `Integer` (Số slot bị đổi giá) | `ROLE_IT_ADMIN` | - Lỗi dữ liệu (400) | Tự động tăng giá các slot trống trong khoảng ngày lễ theo phần trăm phụ thu. | Spring Security |

---

### 📝 2.7. Module Đặt Sân (`/api/bookings`)

| Router | Endpoint | Mô tả | Method | Input (req.body / params) | Output (res.body) | Middleware / Role | Errors (Unhappy path) | Notes | Packages |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **/api/bookings** | `/` | Tạo đơn đặt sân bóng mới | POST | `CreateBookingRequest` (body):<br>- `fieldSlotIds` (List UUID)<br>- `voucherCode` (string, optional) | `BookingResponse` | Đã đăng nhập (Mọi role) | - Slot đã bị người khác đặt (400)<br>- Voucher hết hạn/không hợp lệ (400) | Đơn hàng được tạo ở trạng thái `PENDING_PAYMENT` chờ thanh toán. | Spring Security, JPA |
| **/api/bookings** | `/me` | Khách hàng xem lịch sử đặt sân cá nhân | GET | (Không có - lấy từ JWT) | `List<BookingResponse>` | Đã đăng nhập (`ROLE_USER`) | - Chưa đăng nhập (401) | Chỉ hiển thị các booking thuộc về tài khoản đang đăng nhập. | Spring Security |
| **/api/bookings** | `/` | Lấy toàn bộ đơn đặt sân hệ thống | GET | (Không có) | `List<BookingResponse>` | `ROLE_STAFF` / `ROLE_OWNER` / `ROLE_IT_ADMIN` | - Không có quyền (403) | Phục vụ màn hình quản lý đơn hàng của nhân viên và quản trị viên. | Spring Security |
| **/api/bookings** | `/{id}` | Xem chi tiết đơn đặt sân theo ID | GET | - `id` (UUID path) | `BookingResponse` | Đã đăng nhập (Mọi role) | - Không tìm thấy đơn (404) | Trả về đầy đủ thông tin đơn hàng, danh sách slot đặt và dịch vụ đi kèm. | Spring Security |
| **/api/bookings** | `/code/{code}` | Tìm đơn đặt sân bằng mã code | GET | - `code` (String path: BK-XXXXXX) | `BookingResponse` | Đã đăng nhập (Mọi role) | - Không tìm thấy đơn (404) | Phục vụ nhân viên check-in nhanh khi khách đến sân bóng. | Spring Security |
| **/api/bookings** | `/{id}/cancel` | Hủy đặt sân | POST | - `id` (UUID path)<br>- `reason` (body JSON, optional) | `BookingResponse` | Đã đăng nhập (Mọi role) | - Đơn hàng đã hoàn thành/quá giờ hủy (400) | Trạng thái chuyển sang `CANCELLED`. Tự sinh bản ghi hoàn tiền nếu đơn đã thanh toán. | Spring Security |
| **/api/bookings** | `/{id}/add-services-at-venue` | Đặt thêm dịch vụ trực tiếp tại sân | POST | - `id` (UUID path)<br>- `items` (body JSON): `{ serviceId, quantity }` | `AddVenueServiceResult` (JSON): `{ bookingId, bookingCode, payAmount }` | Đã đăng nhập (Mọi role) | - Booking không ở trạng thái hoạt động (400) | Trả về số tiền cần trả thêm và tạo giao dịch để FE dẫn sang link VNPay. | Spring Security |

---

### 🛒 2.8. Module Dịch Vụ Đơn Đặt Sân (`/api/bookings/{bookingId}/services`)

| Router | Endpoint | Mô tả | Method | Input (req.body / params) | Output (res.body) | Middleware / Role | Errors (Unhappy path) | Notes | Packages |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **/api/bookings/{bookingId}/services** | `/` | Lấy danh sách dịch vụ của booking | GET | - `bookingId` (UUID path) | `List<BookingServiceResponse>` | Đã đăng nhập (Mọi role) | - Không tìm thấy booking (404) | Trả về danh sách chi tiết các dịch vụ thuê kèm của đơn hàng. | Spring Security |
| **/api/bookings/{bookingId}/services** | `/checkout-cart` | Chuyển dịch vụ từ giỏ hàng vào booking | POST | - `bookingId` (UUID path) | `List<BookingServiceResponse>` | Đã đăng nhập (Mọi role) | - Giỏ hàng trống (400)<br>- Đơn đặt sân không ở trạng thái hợp lệ (400) | Chuyển toàn bộ giỏ hàng dịch vụ cá nhân vào đơn đặt sân này và làm trống giỏ hàng. | Spring Security |
| **/api/bookings/{bookingId}/services** | `/` | Thêm lẻ dịch vụ vào đơn hàng | POST | - `bookingId` (UUID path)<br>- `AddToCartRequest` (body) | `List<BookingServiceResponse>` | Đã đăng nhập (Mọi role) | - Dịch vụ không tồn tại (404) | Thêm trực tiếp dịch vụ (như nước uống) vào đơn đặt sân đã có sẵn. | Spring Security |
| **/api/bookings/{bookingId}/services** | `/{bookingServiceId}` | Xóa dịch vụ khỏi đơn đặt sân | DELETE | - `bookingId` (UUID path)<br>- `bookingServiceId` (UUID path) | (Không trả về body) | Đã đăng nhập (Mọi role) | - Không tìm thấy dịch vụ trong đơn (404) | Trả về Status `204 No Content`. | Spring Security |

---

### 🛒 2.9. Module Giỏ Hàng Dịch Vụ (`/api/cart`)

| Router | Endpoint | Mô tả | Method | Input (req.body / params) | Output (res.body) | Middleware / Role | Errors (Unhappy path) | Notes | Packages |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **/api/cart** | `/` | Lấy giỏ hàng dịch vụ cá nhân | GET | (Không có - lấy từ JWT) | `CartResponse` | Đã đăng nhập (Mọi role) | - Chưa đăng nhập (401) | Lấy danh sách sản phẩm dịch vụ đang chờ đặt kèm của người dùng đăng nhập. | Spring Security |
| **/api/cart** | `/items` | Thêm dịch vụ vào giỏ hàng | POST | `AddToCartRequest` (body): `{ serviceId, quantity }` | `CartResponse` | Đã đăng nhập (Mọi role) | - Dịch vụ không tồn tại (404)<br>- Số lượng không hợp lệ (400) | Cộng dồn số lượng nếu dịch vụ đã có sẵn trong giỏ. | Spring Security |
| **/api/cart** | `/items/{itemId}` | Thay đổi số lượng sản phẩm trong giỏ | PUT | - `itemId` (UUID path)<br>- `quantity` (Query param) | `CartResponse` | Đã đăng nhập (Mọi role) | - Item không tồn tại (404)<br>- Số lượng <= 0 (400) | Cập nhật lại số lượng chính xác của item trong giỏ. | Spring Security |
| **/api/cart** | `/items/{itemId}` | Xóa sản phẩm khỏi giỏ | DELETE | - `itemId` (UUID path) | `CartResponse` | Đã đăng nhập (Mọi role) | - Item không tồn tại (404) | Xóa bỏ hoàn toàn 1 dòng dịch vụ khỏi giỏ hàng. | Spring Security |
| **/api/cart** | `/` | Xóa sạch giỏ hàng | DELETE | (Không có - lấy từ JWT) | (Không trả về body) | Đã đăng nhập (Mọi role) | - Chưa đăng nhập (401) | Trả về Status `204 No Content`. Làm trống toàn bộ giỏ hàng. | Spring Security |

---

### 🎟️ 2.10. Module Mã Giảm Giá (`/api/vouchers`)

| Router | Endpoint | Mô tả | Method | Input (req.body / params) | Output (res.body) | Middleware / Role | Errors (Unhappy path) | Notes | Packages |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **/api/vouchers** | `/` | Lấy toàn bộ mã giảm giá | GET | (Không có) | `List<VoucherResponse>` | `ROLE_IT_ADMIN` hoặc `ROLE_OWNER` | - Không có quyền (403) | Phục vụ danh sách quản trị mã giảm giá. | Spring Security |
| **/api/vouchers** | `/available` | Lấy danh sách voucher có thể thu thập | GET | (Không có) | `List<VoucherResponse>` | Public | (Không có) | Chỉ trả về các voucher còn hạn sử dụng và chưa phát hành hết số lượng. | JPA |
| **/api/vouchers** | `/{id}` | Lấy chi tiết một mã giảm giá | GET | - `id` (UUID path) | `VoucherResponse` | `ROLE_IT_ADMIN` hoặc `ROLE_OWNER` | - Không tìm thấy (404) | Xem chi tiết giá trị giảm và điều kiện áp dụng. | Spring Security |
| **/api/vouchers** | `/` | Tạo mã giảm giá mới | POST | `VoucherRequest` (body): `{ code, discountValue, quantity, startDate, endDate }` | `VoucherResponse` | `ROLE_IT_ADMIN` hoặc `ROLE_OWNER` | - Mã code đã tồn tại (409)<br>- Lỗi logic ngày tháng (400) | Trả về Status `201 Created`. | Spring Security |
| **/api/vouchers** | `/{id}` | Cập nhật mã giảm giá | PUT | - `id` (UUID path)<br>- `VoucherRequest` (body) | `VoucherResponse` | `ROLE_IT_ADMIN` hoặc `ROLE_OWNER` | - Không tìm thấy (404) | Chỉnh sửa số lượng, giá trị giảm hoặc ngày áp dụng. | Spring Security |
| **/api/vouchers** | `/{id}` | Hủy kích hoạt mã giảm giá | DELETE | - `id` (UUID path) | (Không trả về body) | `ROLE_IT_ADMIN` hoặc `ROLE_OWNER` | - Không tìm thấy (404) | Trả về Status `204 No Content`. | Spring Security |

---

### 🎟️ 2.11. Module Nhận Mã Giảm Giá (`/api/user-vouchers`)

| Router | Endpoint | Mô tả | Method | Input (req.body / params) | Output (res.body) | Middleware / Role | Errors (Unhappy path) | Notes | Packages |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **/api/user-vouchers** | `/claim/{voucherId}` | Thu thập voucher về ví cá nhân | POST | - `voucherId` (UUID path)<br>(Lấy `userId` từ token JWT) | `UserVoucherResponse` | `ROLE_USER` | - Đã nhận voucher này rồi (409)<br>- Voucher đã hết lượt nhận (400) | Lưu liên kết sở hữu giữa tài khoản cá nhân và voucher. | Spring Security |
| **/api/user-vouchers** | `/my` | Lấy danh sách ví voucher cá nhân | GET | (Không có - lấy từ JWT) | `List<UserVoucherResponse>` | `ROLE_USER` | - Chưa đăng nhập (401) | Lấy danh sách các voucher đã thu thập của chính tài khoản đăng nhập. | Spring Security |

---

### 💳 2.12. Module Thanh Toán VNPay (`/api/payments`)

| Router | Endpoint | Mô tả | Method | Input (req.body / params) | Output (res.body) | Middleware / Role | Errors (Unhappy path) | Notes | Packages |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **/api/payments** | `/{bookingId}/create-url` | Tạo link chuyển hướng thanh toán VNPay | POST | - `bookingId` (UUID path) | `PaymentUrlResponse` (JSON): chứa `paymentUrl` để redirect trình duyệt | Đã đăng nhập (Mọi role) | - Đơn đặt sân không tồn tại (404)<br>- Đơn đã được thanh toán rồi (400) | Gửi thông tin đơn hàng lên cổng VNPay sandbox để sinh link nhập thẻ ngân hàng. | Spring Security |
| **/api/payments** | `/vnpay-return` | Cổng VNPay callback trình duyệt của user | GET | Các query params trả về từ VNPay (vnp_ResponseCode, vnp_SecureHash...) | (Không trả về body) | Public | (Tự động redirect kể cả khi thất bại) | Backend xác minh chữ ký giao dịch rồi gửi tín hiệu chuyển hướng (HTTP 302 Redirect) trình duyệt của user về trang kết quả của FE kèm trạng thái `success` hoặc `failed`. | HttpServletResponse Redirect |
| **/api/payments** | `/vnpay-ipn` | Cổng VNPay gọi ngầm cập nhật giao dịch chính thức | GET | Các query params giao dịch tự động của VNPay | `{"RspCode": "00", "Message": "Confirm Success"}` (Chuẩn JSON của VNPay) | Public | - Sai chữ ký xác thực (IPN trả về RspCode 97)<br>- Đơn đặt sân đã cập nhật trước đó (RspCode 02) | Endpoint quan trọng nhất: Nhận tín hiệu an toàn từ server VNPay để chính thức đổi trạng thái Booking thành `CONFIRMED` và Payment thành `PAID`. | VNPay IPN Controller |

---

### 💸 2.13. Module Hoàn Tiền (`/api/refunds`)

| Router | Endpoint | Mô tả | Method | Input (req.body / params) | Output (res.body) | Middleware / Role | Errors (Unhappy path) | Notes | Packages |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **/api/refunds** | `/pending` | Lấy danh sách yêu cầu hoàn tiền đang chờ duyệt | GET | (Không có) | `List<RefundResponse>` | `ROLE_STAFF` / `ROLE_OWNER` / `ROLE_IT_ADMIN` | - Không có quyền (403) | Phục vụ nhân viên sân bóng theo dõi các đơn hàng bị hủy cần trả tiền lại cho khách. | Spring Security |
| **/api/refunds** | `/` | Lấy toàn bộ lịch sử hoàn tiền | GET | (Không có) | `List<RefundResponse>` | `ROLE_STAFF` / `ROLE_OWNER` / `ROLE_IT_ADMIN` | - Không có quyền (403) | Xem tất cả các yêu cầu hoàn tiền (gồm cả đã hoàn thành/từ chối). | Spring Security |
| **/api/refunds** | `/booking/{bookingId}` | Lấy chi tiết hoàn tiền theo đơn đặt sân | GET | - `bookingId` (UUID path) | `RefundResponse` | `ROLE_STAFF` / `ROLE_OWNER` / `ROLE_IT_ADMIN` | - Không tìm thấy (404) | Xem thông tin số tiền hoàn và trạng thái hoàn tiền của 1 booking cụ thể. | Spring Security |
| **/api/refunds** | `/{id}/complete` | Xác nhận đã hoàn tiền thủ công | POST | - `id` (UUID path - ID phiếu hoàn)<br>- `note` (body JSON, optional) | `RefundResponse` | `ROLE_STAFF` / `ROLE_OWNER` / `ROLE_IT_ADMIN` | - Phiếu hoàn tiền không tồn tại (404) | Nhân viên xác nhận đã thực hiện chuyển khoản ngân hàng trả lại tiền ngoài thực tế cho khách thành công. Trạng thái chuyển thành `COMPLETED`. | Spring Security |
| **/api/refunds** | `/{id}/reject` | Từ chối yêu cầu hoàn tiền | POST | - `id` (UUID path)<br>- `note` (body JSON: lý do từ chối) | `RefundResponse` | `ROLE_STAFF` / `ROLE_OWNER` / `ROLE_IT_ADMIN` | - Phiếu hoàn tiền không tồn tại (404)<br>- Thiếu lý do từ chối (400) | Trạng thái chuyển thành `REJECTED`. | Spring Security |

---

### 📊 2.14. Module Dashboard Chủ Sân (`/api/owner`)

| Router | Endpoint | Mô tả | Method | Input (req.body / params) | Output (res.body) | Middleware / Role | Errors (Unhappy path) | Notes | Packages |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **/api/owner** | `/dashboard` | Lấy dữ liệu báo cáo doanh thu | GET | - `period` (Query param: `today`, `week`, `month`. Mặc định: `month`) | `OwnerDashboardResponse` (JSON): chứa tổng doanh thu, số lượng booking thành công và các mốc số liệu biểu đồ. | `ROLE_OWNER` hoặc `ROLE_IT_ADMIN` | - Không có quyền (403) | Phục vụ màn hình Dashboard trực quan của chủ sân bóng. | Spring Security |

---

### 🥤 2.15. Module Quản Lý Dịch Vụ Sân (`/api/services`)

| Router | Endpoint | Mô tả | Method | Input (req.body / params) | Output (res.body) | Middleware / Role | Errors (Unhappy path) | Notes | Packages |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **/api/services** | `/` | Lấy danh sách tất cả dịch vụ | GET | (Không có) | `List<ServiceResponse>` | Public | (Không có) | Trả về toàn bộ dịch vụ (bao gồm cả các dịch vụ đang tạm ngưng bán). | JPA |
| **/api/services** | `/active` | Lấy danh sách dịch vụ đang bán | GET | (Không có) | `List<ServiceResponse>` | Public | (Không có) | Dùng hiển thị cho khách hàng thuê đồ/nước uống khi đặt sân. | JPA |
| **/api/services** | `/category/{category}` | Lấy danh sách dịch vụ theo phân loại | GET | - `category` (String path: BALL_RENTAL, BIB_RENTAL...) | `List<ServiceResponse>` | Public | - Phân loại không hợp lệ (400) | Lọc dịch vụ theo từng nhóm cụ thể. | JPA |
| **/api/services** | `/{id}` | Lấy thông tin chi tiết dịch vụ | GET | - `id` (UUID path) | `ServiceResponse` | Public | - Không tìm thấy dịch vụ (404) | Xem chi tiết giá thuê và thông tin mô tả dịch vụ. | JPA |
| **/api/services** | `/` | Tạo dịch vụ mới | POST | `ServiceRequest` (body): `{ name, category, price, active }` | `ServiceResponse` | `ROLE_IT_ADMIN` hoặc `ROLE_OWNER` | - Thiếu dữ liệu bắt buộc (400) | Trả về Status `201 Created`. | Spring Security |
| **/api/services** | `/{id}` | Cập nhật thông tin dịch vụ | PUT | - `id` (UUID path)<br>- `ServiceRequest` (body) | `ServiceResponse` | `ROLE_IT_ADMIN` hoặc `ROLE_OWNER` | - Không tìm thấy dịch vụ (404) | Chỉnh sửa tên, phân loại hoặc đơn giá dịch vụ. | Spring Security |
| **/api/services** | `/{id}/image` | Tải lên hình ảnh mô tả dịch vụ | POST | - `id` (UUID path)<br>- `file` (Multipart file param) | `ServiceResponse` | `ROLE_IT_ADMIN` hoặc `ROLE_OWNER` | - Dịch vụ không tồn tại (404)<br>- Tệp ảnh trống (400) | Upload và lưu trữ ảnh dịch vụ cục bộ trên thư mục server. | Spring Security, File IO |
| **/api/services** | `/{id}/toggle` | Bật/tắt nhanh trạng thái dịch vụ | PATCH | - `id` (UUID path) | `ServiceResponse` | `ROLE_IT_ADMIN` hoặc `ROLE_OWNER` | - Dịch vụ không tồn tại (404) | Cho phép kích hoạt nhanh hoặc tạm ngưng cung cấp dịch vụ mà không cần xóa bản ghi. | Spring Security |
| **/api/services** | `/{id}` | Xóa dịch vụ | DELETE | - `id` (UUID path) | (Không trả về body) | `ROLE_IT_ADMIN` hoặc `ROLE_OWNER` | - Dịch vụ không tồn tại (404) | Trả về Status `204 No Content`. | Spring Security |
