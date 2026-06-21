import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import HomePage from './pages/public/HomePage'
import FieldListPage from './pages/public/FieldListPage'
import FieldDetailPage from './pages/public/FieldDetailPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import OAuth2CallbackPage from './pages/auth/OAuth2CallbackPage'
import NotFoundPage from './pages/public/NotFoundPage'
import BookingPage from './pages/public/BookingPage'
import ServicesPage from './pages/public/ServicesPage'
import StaffDashboard from './pages/staff/StaffDashboard'
import OwnerDashboard from './pages/owner/OwnerDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import ProfilePage from './pages/user/ProfilePage'
import ChangePasswordPage from './pages/user/ChangePasswordPage'
import CartPage from './pages/user/CartPage'
import BookingConfirmPage from './pages/public/BookingConfirmPage'
import PaymentResultPage from './pages/public/PaymentResultPage'
import MyBookingsPage from './pages/user/MyBookingsPage'

function RequireAuth({ children }) {
  const { isLoggedIn } = useAuth()
  const location = useLocation()
  if (!isLoggedIn) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return children
}

function RequireRole({ children, roles }) {
  const { user, isLoggedIn } = useAuth()
  const location = useLocation()
  if (!isLoggedIn) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (!roles.includes(user?.role)) return <Navigate to="/" replace />
  return children
}

function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
      <Route path="/fields" element={<PublicLayout><FieldListPage /></PublicLayout>} />
      <Route path="/fields/:id" element={<PublicLayout><FieldDetailPage /></PublicLayout>} />
      <Route path="/booking" element={<PublicLayout><BookingPage /></PublicLayout>} />
      <Route path="/services" element={<PublicLayout><ServicesPage /></PublicLayout>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Payment result — VNPay redirect trình duyệt về đây, không cần Navbar/Footer */}
      <Route path="/payment-result" element={<PaymentResultPage />} />

      {/* Booking confirm — CUSTOMER only (chọn voucher, dịch vụ, thanh toán) */}
      <Route path="/booking/confirm" element={
        <RequireRole roles={['USER']}>
          <PublicLayout><BookingConfirmPage /></PublicLayout>
        </RequireRole>
      } />

      {/* My bookings — CUSTOMER only */}
      <Route path="/profile/bookings" element={
        <RequireRole roles={['USER']}>
          <PublicLayout><MyBookingsPage /></PublicLayout>
        </RequireRole>
      } />

      {/* Cart — CUSTOMER only */}
      <Route path="/cart" element={
        <RequireRole roles={['USER']}>
          <PublicLayout><CartPage /></PublicLayout>
        </RequireRole>
      } />

      {/* My Profile / Change Password — CUSTOMER only */}
      <Route path="/profile" element={
        <RequireRole roles={['USER']}>
          <PublicLayout><ProfilePage /></PublicLayout>
        </RequireRole>
      } />
      <Route path="/profile/change-password" element={
        <RequireRole roles={['USER']}>
          <PublicLayout><ChangePasswordPage /></PublicLayout>
        </RequireRole>
      } />

      {/* Google OAuth2 callback — no Navbar/Footer */}
      <Route path="/oauth2/callback" element={<OAuth2CallbackPage />} />

      {/* Staff dashboard */}
      <Route path="/staff/*" element={
        <RequireRole roles={['STAFF']}>
          <StaffDashboard />
        </RequireRole>
      } />

      {/* Owner dashboard */}
      <Route path="/owner/*" element={
        <RequireRole roles={['OWNER']}>
          <OwnerDashboard />
        </RequireRole>
      } />

      {/* IT Admin dashboard */}
      <Route path="/admin/*" element={
        <RequireRole roles={['IT_ADMIN']}>
          <AdminDashboard />
        </RequireRole>
      } />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
