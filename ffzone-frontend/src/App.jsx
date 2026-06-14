import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";

// Public pages
import HomePage from "./pages/public/HomePage";
import FieldListPage from "./pages/public/FieldListPage";
import NotFoundPage from "./pages/public/NotFoundPage";

// Auth pages
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";

// User booking pages  ← MỚI
import FieldDetailPage from "./pages/user/FieldDetailPage";
import BookingConfirmPage from "./pages/user/BookingConfirmPage";
import MyBookingsPage from "./pages/user/MyBookingsPage";
import BookingPage from "./pages/user/BookingPage";
// Dashboard pages
import StaffDashboard from "./pages/staff/StaffDashboard";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

function RequireAuth({ children }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  if (!isLoggedIn)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

function RequireRole({ children, roles }) {
  const { user, isLoggedIn } = useAuth();
  const location = useLocation();
  if (!isLoggedIn)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}

function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      {/* ── Public ─────────────────────────────────────────────── */}
      <Route
        path="/"
        element={
          <PublicLayout>
            <HomePage />
          </PublicLayout>
        }
      />
      <Route
        path="/fields"
        element={
          <PublicLayout>
            <FieldListPage />
          </PublicLayout>
        }
      />

      {/* ── Field detail + booking (Guest có thể xem, User mới đặt được) ── */}
      <Route
        path="/fields/:id"
        element={
          <PublicLayout>
            <FieldDetailPage />
          </PublicLayout>
        }
      />

      {/* ── Auth ───────────────────────────────────────────────── */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* ── User: booking flow ────────────────────────────────── */}
      <Route
        path="/booking-confirm/:id"
        element={
          <RequireAuth>
            <PublicLayout>
              <BookingConfirmPage />
            </PublicLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/my-bookings"
        element={
          <RequireAuth>
            <PublicLayout>
              <MyBookingsPage />
            </PublicLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/booking"
        element={
          <PublicLayout>
            <BookingPage />
          </PublicLayout>
        }
      />

      {/* ── Staff ─────────────────────────────────────────────── */}
      <Route
        path="/staff/*"
        element={
          <RequireRole roles={["STAFF"]}>
            <StaffDashboard />
          </RequireRole>
        }
      />

      {/* ── Owner ─────────────────────────────────────────────── */}
      <Route
        path="/owner/*"
        element={
          <RequireRole roles={["OWNER"]}>
            <OwnerDashboard />
          </RequireRole>
        }
      />

      {/* ── IT Admin ──────────────────────────────────────────── */}
      <Route
        path="/admin/*"
        element={
          <RequireRole roles={["IT_ADMIN"]}>
            <AdminDashboard />
          </RequireRole>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
