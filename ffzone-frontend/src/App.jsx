import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import HomePage from './pages/public/HomePage'
import FieldListPage from './pages/public/FieldListPage'
import FieldDetailPage from './pages/public/FieldDetailPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import NotFoundPage from './pages/public/NotFoundPage'
import BookingPage from './pages/public/BookingPage'
import StaffDashboard from './pages/staff/StaffDashboard'
import OwnerDashboard from './pages/owner/OwnerDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'

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
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

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
