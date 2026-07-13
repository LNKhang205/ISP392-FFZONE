# 2.2. Installation Instruction & Configuration Guide

This document provides a comprehensive guide to set up, configure, and run the **FFZone** venue booking application, which consists of a Spring Boot backend, a React (Vite) frontend, and a PostgreSQL database.

---

## 2.2.1. Prerequisites
Before beginning the installation, ensure the following software is installed on your system:
* **Java Development Kit (JDK)**: Version 17 or higher.
* **Node.js**: Version 18.x or higher (includes npm package manager).
* **PostgreSQL**: Version 16 or higher.
* **pgAdmin**: For PostgreSQL database administration and management.
* **Visual Studio Code**: The IDE used for both Backend and Frontend development.
  * *Recommended VS Code Extensions*: Extension Pack for Java, Spring Boot Extension Pack.

---

## 2.2.2. Database Setup
Follow the steps below to configure and populate the PostgreSQL database using **pgAdmin**:

### 2.2.2.1. Create Database and User
1. Open **pgAdmin** and connect to your local PostgreSQL server.
2. Right-click on the server node and open the **Query Tool**.
3. Copy and run the following SQL commands to create a dedicated user and database for the application:
   ```sql
   -- Create a new database user
   CREATE USER ffzone WITH PASSWORD '123456';

   -- Create a database owned by the new user
   CREATE DATABASE ffzone OWNER ffzone;

   -- Grant all privileges to the user on the database
   GRANT ALL PRIVILEGES ON DATABASE ffzone TO ffzone;
   ```

### 2.2.2.2. Initialize Schema and Seed Data
Để thiết lập cấu trúc các bảng và nạp dữ liệu mẫu ban đầu cho hệ thống, thực hiện chạy tệp tin `ffzone_schema.sql` nằm ở thư mục gốc của dự án bằng một trong hai cách sau:

* **Cách 1: Sử dụng giao diện dòng lệnh psql**
  ```bash
  psql -U ffzone -d ffzone -f d:/CODE/FILE/ISP392/ffzone_schema.sql
  ```

* **Cách 2: Sử dụng công cụ quản lý đồ họa (pgAdmin / DBeaver)**
  1. Kết nối vào cơ sở dữ liệu `ffzone`.
  2. Mở trình biên soạn SQL (SQL Query Tool).
  3. Mở và chạy toàn bộ nội dung trong tệp tin [ffzone_schema.sql](file:///d:/CODE/FILE/ISP392/ffzone_schema.sql).

Sau khi thực hiện thành công, cơ sở dữ liệu sẽ tự động có đầy đủ cấu trúc bảng, khóa ngoại, các tài khoản thử nghiệm của các role (`USER`, `STAFF`, `OWNER`, `IT_ADMIN`), các biểu giá mẫu và dịch vụ đi kèm.

---

## 2.2.3. Backend Configuration & Startup
The Backend service is built using Spring Boot and runs on port **8080**.

### 2.2.3.1. Configure application.properties
Open the `ffzone-backend` project folder in **Visual Studio Code**. Navigate to `application.properties` under `src/main/resources/` and configure the following parameters:

1. **PostgreSQL Database Connection**:
   ```properties
   spring.datasource.url=jdbc:postgresql://localhost:5432/ffzone
   spring.datasource.username=ffzone
   spring.datasource.password=123456
   ```
2. **JWT Security Configuration**:
   ```properties
   # Key token security
   app.jwt.secret=ffzone-super-secret-key-2026-must-be-at-least-256-bits-long
   app.jwt.expiration-ms=86400000
   ```
3. **Google OAuth2 Client Credentials**:
   ```properties
   spring.security.oauth2.client.registration.google.client-id=YOUR_GOOGLE_CLIENT_ID
   spring.security.oauth2.client.registration.google.client-secret=YOUR_GOOGLE_CLIENT_SECRET
   ```
4. **VNPay Sandbox Gateway**:
   ```properties
   vnpay.tmn-code=5BDZWBY7
   vnpay.hash-secret=FURCSD1104XLUF07UKYXPTTDJXV1DVVK
   vnpay.pay-url=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
   vnpay.backend-return-url=http://localhost:8080/api/payments/vnpay-return
   vnpay.frontend-result-url=http://localhost:5173/payment-result
   vnpay.ipn-url=https://<your-ngrok-subdomain>.ngrok-free.dev/api/payments/vnpay-ipn
   ```
5. **Gmail SMTP Mailer Configuration**:
   ```properties
   spring.mail.host=smtp.gmail.com
   spring.mail.port=587
   spring.mail.username=your-email@gmail.com
   spring.mail.password=your-app-password-16-chars
   ```

### 2.2.3.2. Run the Backend Server
There are two ways to launch the Backend using **Visual Studio Code**:

* **Method 1: Using the Terminal (Recommended)**
  1. Open the built-in terminal in VS Code (`Ctrl + ~`).
  2. Ensure you are in the `ffzone-backend` directory and run the Maven wrapper command:
     ```powershell
     .\mvnw.cmd clean spring-boot:run
     ```

* **Method 2: Using the Java Extension Pack**
  1. Install the **Extension Pack for Java** extension in VS Code.
  2. Open the main file `FfzoneBackendApplication.java` under `src/main/java/com/ffzone/ffzone_backend/`.
  3. Click the **Run** text link that appears directly above the `main` method.

The Backend will start listening at: `http://localhost:8080`.

---

## 2.2.4. Frontend Configuration & Startup
The Frontend application is built with React and Vite, running on port **5173**.

### 2.2.4.1. Open Frontend Project
Open the `ffzone-frontend` folder inside **Visual Studio Code**.

### 2.2.4.2. Install Dependencies
Open the built-in terminal in VS Code and run the following command to download and install the required npm packages:
```bash
npm install
```

### 2.2.4.3. Configure Environment Variables
By default, the application connects to the API at `http://localhost:8080/api`. If you need to customize this endpoint, create a `.env` file in the root of the `ffzone-frontend` folder and add:
```env
VITE_API_URL=http://localhost:8080/api
```

### 2.2.4.4. Start Development Server
Run the following command in the terminal to launch the React development server:
```bash
npm run dev
```
Once started, the application can be accessed via your web browser at:
👉 **`http://localhost:5173`**

---

## 2.2.5. Post-Installation Verification
Perform the following steps to verify that the application has been set up successfully:
1. **Home Page**: Open `http://localhost:5173` and verify that the venue landing page loads correctly and displays soccer fields fetched from the database.
2. **Authentication**: Register a new user account, login, and verify that the account details are saved in the `account` table.
3. **Password Recovery**: Request an OTP code for password recovery and verify that the generated OTP code prints out in the VS Code terminal/run console.
4. **Checkout & Payment**: Add a booking with rental services, proceed to checkout, and verify that you are redirected to the VNPay Sandbox test payment gateway.
